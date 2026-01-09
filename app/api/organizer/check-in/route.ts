import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Ticket from "@/database/ticket.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// POST - Check in a ticket
export async function POST(req: NextRequest): Promise<NextResponse> {
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

        // Only organizers and admins can check in
        if (user.role !== 'organizer' && user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        const { ticketNumber } = await req.json();

        if (!ticketNumber) {
            return NextResponse.json(
                { message: "Ticket number is required" },
                { status: 400 }
            );
        }

        const ticket = await Ticket.findOne({ ticketNumber })
            .populate({
                path: 'bookingId',
                populate: {
                    path: 'eventId',
                    model: 'Event',
                },
            });

        if (!ticket) {
            return NextResponse.json(
                { message: "Ticket not found" },
                { status: 404 }
            );
        }

        // Verify organizer owns the event
        const event = (ticket.bookingId as any)?.eventId;
        if (!event) {
            return NextResponse.json(
                { message: "Event not found for this ticket" },
                { status: 404 }
            );
        }

        if (user.role === 'organizer' && event.organizerId?.toString() !== user._id.toString()) {
            return NextResponse.json(
                { message: "You don't have permission to check in tickets for this event" },
                { status: 403 }
            );
        }

        if (ticket.status === 'used') {
            return NextResponse.json(
                { message: "Ticket has already been used" },
                { status: 400 }
            );
        }

        if (ticket.status === 'cancelled') {
            return NextResponse.json(
                { message: "Ticket has been cancelled" },
                { status: 400 }
            );
        }

        // Check in the ticket
        ticket.status = 'used';
        ticket.checkedInAt = new Date();
        ticket.checkedInBy = user._id;
        await ticket.save();

        return handleSuccessResponse("Ticket checked in successfully", {
            ticket: {
                id: ticket._id.toString(),
                ticketNumber: ticket.ticketNumber,
                status: ticket.status,
                checkedInAt: ticket.checkedInAt,
            },
            event: {
                title: event.title,
                date: event.date,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

