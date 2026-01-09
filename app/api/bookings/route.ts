import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/database/booking.model";
import Event from "@/database/event.model";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import { formatDateToReadable, formatDateTo12Hour } from "@/lib/formatters";

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        // Verify token
        const tokenPayload = verifyToken(req);

        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized - Invalid or missing token" },
                { status: 401 }
            );
        }

        // Get user to get their email (exclude soft-deleted users)
        const user = await User.findOne({ 
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Find all bookings for this user's email
        const bookings = await Booking.find({ email: user.email })
            .populate('eventId')
            .sort({ createdAt: -1 });

        // Format bookings with event details
        const formattedBookings = bookings.map((booking: any) => ({
            id: booking._id.toString(),
            eventId: booking.eventId._id.toString(),
            event: {
                id: booking.eventId._id.toString(),
                title: booking.eventId.title,
                slug: booking.eventId.slug,
                date: booking.eventId.date,
                time: booking.eventId.time,
                venue: booking.eventId.venue,
                location: booking.eventId.location,
                image: booking.eventId.image,
                mode: booking.eventId.mode,
            },
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
        }));

        return handleSuccessResponse("Bookings retrieved successfully", { bookings: formattedBookings });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        // Verify token
        const tokenPayload = verifyToken(req);

        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized - Invalid or missing token" },
                { status: 401 }
            );
        }

        // Get user to get their email (exclude soft-deleted users)
        const user = await User.findOne({ 
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Get event slug from request body
        const body = await req.json();
        const { eventSlug } = body;

        if (!eventSlug) {
            return NextResponse.json(
                { message: "Event slug is required" },
                { status: 400 }
            );
        }

        // Find event by slug
        const event = await Event.findOne({ slug: eventSlug });

        if (!event) {
            return NextResponse.json(
                { message: "Event not found" },
                { status: 404 }
            );
        }

        // Check if user already booked this event
        const existingBooking = await Booking.findOne({
            eventId: event._id,
            email: user.email
        });

        if (existingBooking) {
            return NextResponse.json(
                { message: "You have already booked this event" },
                { status: 400 }
            );
        }

        // Check capacity
        if (event.capacity) {
            const bookingCount = await Booking.countDocuments({ eventId: event._id });
            if (bookingCount >= event.capacity) {
                // Check if waitlist is enabled
                if (event.waitlistEnabled) {
                    const Waitlist = (await import("@/database/waitlist.model")).default;
                    const existingWaitlist = await Waitlist.findOne({
                        email: user.email,
                        eventId: event._id,
                    });

                    if (!existingWaitlist) {
                        const waitlistCount = await Waitlist.countDocuments({ eventId: event._id });
                        await Waitlist.create({
                            email: user.email,
                            eventId: event._id,
                            position: waitlistCount + 1,
                        });
                    }

                    return NextResponse.json(
                        { message: "Event is sold out. You have been added to the waitlist." },
                        { status: 200 }
                    );
                } else {
                    return NextResponse.json(
                        { message: "Event is sold out" },
                        { status: 400 }
                    );
                }
            }
        }

        // Check if event requires payment
        const body = await req.json();
        const { paymentIntentId, promoCode } = body;

        if (!event.isFree && event.price && !paymentIntentId) {
            return NextResponse.json(
                { message: "Payment required for this event" },
                { status: 400 }
            );
        }

        // Verify payment if required
        let transaction = null;
        if (paymentIntentId && !event.isFree) {
            const Transaction = (await import("@/database/transaction.model")).default;
            const { stripe } = await import("@/lib/stripe");
            const { calculateRevenue } = await import("@/lib/tickets");

            // Verify payment intent
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status !== 'succeeded') {
                return NextResponse.json(
                    { message: "Payment not completed" },
                    { status: 400 }
                );
            }

            // Calculate fees
            const { platformFee, organizerRevenue } = calculateRevenue(event.price || 0);
            let discountAmount = 0;

            // Apply promo code discount if used
            if (promoCode) {
                const PromoCode = (await import("@/database/promocode.model")).default;
                const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() });
                if (promo) {
                    if (promo.discountType === 'percentage') {
                        discountAmount = Math.round((event.price || 0) * (promo.discountValue / 100));
                        if (promo.maxDiscountAmount) {
                            discountAmount = Math.min(discountAmount, promo.maxDiscountAmount);
                        }
                    } else {
                        discountAmount = promo.discountValue;
                    }
                    promo.usedCount += 1;
                    await promo.save();
                }
            }

            const finalAmount = (event.price || 0) - discountAmount;
            const { platformFee: finalPlatformFee, organizerRevenue: finalOrganizerRevenue } = calculateRevenue(finalAmount);

            // Create transaction
            transaction = await Transaction.create({
                bookingId: null, // Will be set after booking creation
                userId: user._id,
                eventId: event._id,
                amount: finalAmount,
                currency: event.currency || 'usd',
                status: 'completed',
                paymentMethod: 'card',
                stripePaymentIntentId: paymentIntentId,
                stripeChargeId: paymentIntent.latest_charge as string,
                discountAmount,
                platformFee: finalPlatformFee,
                organizerRevenue: finalOrganizerRevenue,
                promoCodeId: promoCode ? (await import("@/database/promocode.model")).default.findOne({ code: promoCode.toUpperCase() }).then(p => p?._id) : undefined,
            });
        }

        // Create booking
        const booking = new Booking({
            eventId: event._id,
            email: user.email
        });

        await booking.save();

        // Update transaction with booking ID
        if (transaction) {
            transaction.bookingId = booking._id;
            await transaction.save();
        }

        // Generate ticket
        const Ticket = (await import("@/database/ticket.model")).default;
        const { generateTicketNumber, generateQRCode } = await import("@/lib/tickets");
        
        const ticketNumber = generateTicketNumber();
        const qrCode = await generateQRCode(ticketNumber, booking._id.toString());

        const ticket = await Ticket.create({
            bookingId: booking._id,
            ticketNumber,
            qrCode,
            status: 'active',
        });

        // Create notification
        const Notification = (await import("@/database/notification.model")).default;
        await Notification.create({
            userId: user._id,
            type: 'booking_confirmation',
            title: 'Booking Confirmed',
            message: `Your booking for ${event.title} has been confirmed. Ticket: ${ticketNumber}`,
            link: `/bookings`,
            metadata: {
                eventId: event._id.toString(),
                bookingId: booking._id.toString(),
                ticketNumber,
            },
        });

        // Send email notification
        try {
            const { sendEmail, emailTemplates } = await import("@/lib/email");
            
            const emailContent = emailTemplates.bookingConfirmation(
                event.title,
                formatDateToReadable(event.date),
                formatDateTo12Hour(event.time),
                ticketNumber
            );

            await sendEmail({
                to: user.email,
                subject: emailContent.subject,
                html: emailContent.html,
            });
        } catch (emailError) {
            console.error('Failed to send booking confirmation email:', emailError);
            // Don't fail the booking if email fails
        }

        // Update event available tickets
        if (event.capacity) {
            event.availableTickets = Math.max(0, (event.availableTickets || event.capacity) - 1);
            await event.save();
        }

        return handleSuccessResponse("Booking created successfully", {
            booking: {
                id: booking._id.toString(),
                eventId: event._id.toString(),
                email: booking.email,
                createdAt: booking.createdAt,
            },
            ticket: {
                id: ticket._id.toString(),
                ticketNumber: ticket.ticketNumber,
                qrCode: ticket.qrCode,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

