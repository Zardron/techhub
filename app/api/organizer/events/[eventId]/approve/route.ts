import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// POST - Submit event for approval
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
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

        const { eventId } = await params;

        const event = await Event.findById(eventId);

        if (!event) {
            return NextResponse.json(
                { message: "Event not found" },
                { status: 404 }
            );
        }

        // Verify event belongs to organizer (unless admin)
        if (user.role !== 'admin' && event.organizerId?.toString() !== user._id.toString()) {
            return NextResponse.json(
                { message: "Forbidden - You don't own this event" },
                { status: 403 }
            );
        }

        // Only draft events can be submitted for approval
        if (event.status !== 'draft') {
            return NextResponse.json(
                { message: `Event is already ${event.status}. Only draft events can be submitted for approval.` },
                { status: 400 }
            );
        }

        // Change status to pending_approval
        event.status = 'pending_approval';
        await event.save();

        return handleSuccessResponse("Event submitted for approval", {
            event: {
                id: event._id.toString(),
                title: event.title,
                status: event.status,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

