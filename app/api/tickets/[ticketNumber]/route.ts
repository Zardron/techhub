import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Ticket from "@/database/ticket.model";
import Booking from "@/database/booking.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ ticketNumber: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { ticketNumber } = await params;
        const tokenPayload = verifyToken(req);

        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

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

        const ticket = await Ticket.findOne({ ticketNumber })
            .populate({
                path: 'bookingId',
                populate: [
                    {
                        path: 'eventId',
                        model: 'Event',
                    },
                    {
                        path: 'userId',
                        model: 'User',
                        select: 'name email avatar',
                    },
                ],
            });

        if (!ticket) {
            return NextResponse.json(
                { message: "Ticket not found" },
                { status: 404 }
            );
        }

        const booking = ticket.bookingId as any;
        const event = booking?.eventId;
        const bookingUser = booking?.userId as any;

        if (!event) {
            return NextResponse.json(
                { message: "Event not found for this ticket" },
                { status: 404 }
            );
        }

        // Verify ticket belongs to user OR user is organizer/admin of the event
        const isTicketOwner = booking.email === user.email;
        const isAdmin = user.role === 'admin';
        
        // Check if user is organizer of the event
        // Handle both cases: event.organizerId can point to user._id OR user.organizerId
        let isOrganizer = false;
        if (user.role === 'organizer' && event.organizerId) {
            const eventOrganizerId = event.organizerId.toString();
            const userId = user._id.toString();
            const userOrganizerId = user.organizerId?.toString();
            
            // Check if event belongs to user (either via user._id or user.organizerId)
            isOrganizer = eventOrganizerId === userId || (userOrganizerId && eventOrganizerId === userOrganizerId);
        }

        if (!isTicketOwner && !isOrganizer && !isAdmin) {
            return NextResponse.json(
                { message: "You don't have access to this ticket" },
                { status: 403 }
            );
        }

        return handleSuccessResponse("Ticket retrieved successfully", {
            ticket: {
                id: ticket._id.toString(),
                ticketNumber: ticket.ticketNumber,
                qrCode: ticket.qrCode,
                status: ticket.status,
                checkedInAt: ticket.checkedInAt,
                bookingId: booking._id.toString(),
                event: {
                    title: event.title,
                    date: event.date,
                    time: event.time,
                    location: event.location,
                    venue: event.venue,
                    image: event.image,
                },
                booking: {
                    createdAt: booking.createdAt,
                },
                user: {
                    name: bookingUser?.name || booking.email?.split('@')[0] || 'Guest',
                    email: booking.email,
                    avatar: bookingUser?.avatar,
                },
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

