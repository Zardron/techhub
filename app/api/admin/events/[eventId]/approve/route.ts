import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// POST - Approve event
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

        // Only admins can approve events
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
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

        // Only pending_approval events can be approved
        if (event.status !== 'pending_approval') {
            return NextResponse.json(
                { message: `Event is ${event.status}. Only pending approval events can be approved.` },
                { status: 400 }
            );
        }

        // Approve event
        event.status = 'published';
        event.publishedAt = new Date();
        event.approvedAt = new Date();
        event.approvedBy = user._id;
        await event.save();

        return handleSuccessResponse("Event approved and published", {
            event: {
                id: event._id.toString(),
                title: event.title,
                status: event.status,
                publishedAt: event.publishedAt,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE - Reject event
export async function DELETE(
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

        // Only admins can reject events
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const { eventId } = await params;
        const { searchParams } = new URL(req.url);
        const reason = searchParams.get('reason') || 'Event rejected by admin';

        const event = await Event.findById(eventId);

        if (!event) {
            return NextResponse.json(
                { message: "Event not found" },
                { status: 404 }
            );
        }

        // Only pending_approval events can be rejected
        if (event.status !== 'pending_approval') {
            return NextResponse.json(
                { message: `Event is ${event.status}. Only pending approval events can be rejected.` },
                { status: 400 }
            );
        }

        // Reject event (change back to draft)
        event.status = 'draft';
        await event.save();

        // TODO: Send notification to organizer about rejection

        return handleSuccessResponse("Event rejected", {
            event: {
                id: event._id.toString(),
                title: event.title,
                status: event.status,
                reason,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

