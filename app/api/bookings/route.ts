import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Booking } from "@/database/booking.model";
import Event from "@/database/event.model";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

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

        // Get user to get their email
        const user = await User.findById(tokenPayload.id);

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

        // Get user to get their email
        const user = await User.findById(tokenPayload.id);

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

        // Create booking
        const booking = new Booking({
            eventId: event._id,
            email: user.email
        });

        await booking.save();

        return handleSuccessResponse("Booking created successfully", {
            booking: {
                id: booking._id.toString(),
                eventId: event._id.toString(),
                email: booking.email,
                createdAt: booking.createdAt,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

