import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Ticket from "@/database/ticket.model";
import Booking from "@/database/booking.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Public ticket verification (no authentication required)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ ticketNumber: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { ticketNumber } = await params;

        if (!ticketNumber) {
            return NextResponse.json(
                { message: "Ticket number is required" },
                { status: 400 }
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

        // Return public ticket information
        return handleSuccessResponse("Ticket verified successfully", {
            ticket: {
                ticketNumber: ticket.ticketNumber,
                status: ticket.status,
                checkedInAt: ticket.checkedInAt,
            },
            event: {
                title: event.title,
                date: event.date,
                time: event.time,
                location: event.location,
                venue: event.venue,
                image: event.image,
                mode: event.mode,
                organizer: event.organizer,
            },
            attendee: {
                name: bookingUser?.name || booking.email?.split('@')[0] || 'Guest',
                email: booking.email,
                avatar: bookingUser?.avatar,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
