import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get events (admin only, with optional status filter)
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

        // Only admins can access this
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        // Build query
        const query: any = {};
        if (status) {
            query.status = status;
        }

        // Get events
        const events = await Event.find(query)
            .populate('organizerId', 'name email')
            .sort({ createdAt: -1 });

        // Format events
        const formattedEvents = events.map((event: any) => ({
            id: event._id.toString(),
            title: event.title,
            slug: event.slug,
            description: event.description,
            image: event.image,
            date: event.date,
            time: event.time,
            location: event.location,
            mode: event.mode,
            status: event.status,
            organizer: event.organizerId ? {
                id: event.organizerId._id.toString(),
                name: event.organizerId.name,
                email: event.organizerId.email,
            } : null,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
        }));

        return handleSuccessResponse("Events retrieved successfully", {
            events: formattedEvents,
            count: formattedEvents.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

