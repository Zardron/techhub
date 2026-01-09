import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import Booking from "@/database/booking.model";
import Ticket from "@/database/ticket.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

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

        if (user.role !== 'organizer' && user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        let events;
        if (eventId) {
            const event = await Event.findById(eventId);
            if (!event) {
                return NextResponse.json(
                    { message: "Event not found" },
                    { status: 404 }
                );
            }
            if (user.role === 'organizer' && event.organizerId?.toString() !== user._id.toString()) {
                return NextResponse.json(
                    { message: "Forbidden - You don't own this event" },
                    { status: 403 }
                );
            }
            events = [event];
        } else {
            events = await Event.find({ organizerId: user._id });
        }

        const eventIds = events.map(e => e._id);

        // Get all bookings for these events
        const bookings = await Booking.find({
            eventId: { $in: eventIds }
        }).sort({ createdAt: -1 });

        // Get tickets for these bookings
        const bookingIds = bookings.map(b => b._id);
        const tickets = await Ticket.find({
            bookingId: { $in: bookingIds }
        });

        // Create a map of bookingId -> ticket
        const ticketMap = new Map();
        tickets.forEach(ticket => {
            ticketMap.set(ticket.bookingId.toString(), ticket);
        });

        // Format attendees
        const attendees = bookings.map(booking => {
            const ticket = ticketMap.get(booking._id.toString());
            return {
                id: booking._id.toString(),
                email: booking.email,
                ticketNumber: ticket?.ticketNumber,
                ticketStatus: ticket?.status || 'active',
                bookedAt: booking.createdAt,
            };
        });

        return handleSuccessResponse("Attendees retrieved successfully", { attendees });
    } catch (error) {
        return handleApiError(error);
    }
}

