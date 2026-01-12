import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Booking from "@/database/booking.model";
import Ticket from "@/database/ticket.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { bookingId } = await params;
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

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return NextResponse.json(
                { message: "Booking not found" },
                { status: 404 }
            );
        }

        const ticket = await Ticket.findOne({ bookingId: booking._id });
        const event = await Event.findById(booking.eventId);

        if (!event) {
            return NextResponse.json(
                { message: "Event not found" },
                { status: 404 }
            );
        }

        // Verify booking belongs to user OR user is organizer/admin of the event
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

        if (!ticket) {
            return NextResponse.json(
                { message: "Ticket not found for this booking" },
                { status: 404 }
            );
        }

        return handleSuccessResponse("Ticket retrieved successfully", {
            ticket: {
                id: ticket._id.toString(),
                ticketNumber: ticket.ticketNumber,
                qrCode: ticket.qrCode,
                status: ticket.status,
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
                user: {
                    name: user.name,
                    email: user.email,
                    avatar: (user as any).avatar,
                },
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

