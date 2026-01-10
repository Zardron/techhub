import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// POST - Duplicate an event
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
        const { title, date, time } = await req.json().catch(() => ({}));

        // Find original event
        const originalEvent = await Event.findById(eventId);

        if (!originalEvent) {
            return NextResponse.json(
                { message: "Event not found" },
                { status: 404 }
            );
        }

        // Verify ownership
        if (user.role === 'organizer' && originalEvent.organizerId?.toString() !== user._id.toString()) {
            return NextResponse.json(
                { message: "Forbidden - You don't own this event" },
                { status: 403 }
            );
        }

        // Create duplicate event
        const duplicateData: any = {
            title: title || `${originalEvent.title} (Copy)`,
            description: originalEvent.description,
            image: originalEvent.image,
            location: originalEvent.location,
            venue: originalEvent.venue,
            date: date || originalEvent.date,
            time: time || originalEvent.time,
            mode: originalEvent.mode,
            audience: originalEvent.audience,
            agenda: originalEvent.agenda,
            organizerId: originalEvent.organizerId,
            tags: originalEvent.tags,
            pricing: originalEvent.pricing,
            price: originalEvent.price,
            isFree: originalEvent.isFree,
            capacity: originalEvent.capacity,
            availableTickets: originalEvent.capacity,
            status: 'draft', // Always start as draft
            approvalStatus: 'pending_approval',
        };

        // Generate new slug
        const baseSlug = duplicateData.title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        let slug = baseSlug;
        let counter = 1;
        
        while (await Event.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        duplicateData.slug = slug;

        const duplicatedEvent = await Event.create(duplicateData);

        return handleSuccessResponse("Event duplicated successfully", {
            event: {
                id: duplicatedEvent._id.toString(),
                title: duplicatedEvent.title,
                slug: duplicatedEvent.slug,
                status: duplicatedEvent.status,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

