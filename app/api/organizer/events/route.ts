import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import { handleImageUpload } from "@/lib/cloudinary";

// GET - Get organizer's events
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

        const events = await Event.find({
            organizerId: user._id
        }).sort({ createdAt: -1 });

        const eventsData = events.map(event => ({
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
            capacity: event.capacity,
            availableTickets: event.availableTickets,
            isFree: event.isFree,
            price: event.price,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
        }));

        return handleSuccessResponse("Events retrieved successfully", { events: eventsData });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Create a new event (organizer)
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

        if (user.role !== 'organizer' && user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        const formData = await req.formData();
        const eventData = Object.fromEntries(formData.entries());

        // Handle image upload
        const imageSource = formData.get('imageSource') as string;
        let imageUrl: string;

        if (imageSource === 'url') {
            const providedUrl = formData.get('imageUrl') as string;
            if (!providedUrl || typeof providedUrl !== 'string' || providedUrl.trim().length === 0) {
                return NextResponse.json(
                    { message: 'Image URL is required' },
                    { status: 400 }
                );
            }
            try {
                new URL(providedUrl.trim());
                imageUrl = providedUrl.trim();
            } catch {
                return NextResponse.json(
                    { message: 'Invalid image URL format' },
                    { status: 400 }
                );
            }
        } else {
            const file = formData.get('image') as File;
            if (!file || !(file instanceof File)) {
                return NextResponse.json(
                    { message: 'Image file is required' },
                    { status: 400 }
                );
            }
            const uploadResult = await handleImageUpload(file, 'TechEventX');
            if (!uploadResult.success) {
                return uploadResult.response;
            }
            imageUrl = uploadResult.url;
        }

        const tags = JSON.parse(formData.get('tags') as string || '[]');
        const agenda = JSON.parse(formData.get('agenda') as string || '[]');
        const capacity = formData.get('capacity') ? parseInt(formData.get('capacity') as string) : undefined;
        const isFree = formData.get('isFree') === 'true';
        const price = formData.get('price') ? parseInt(formData.get('price') as string) : undefined;

        const event = await Event.create({
            ...eventData,
            image: imageUrl,
            tags,
            agenda,
            organizerId: user._id,
            organizer: user.name, // Keep for backward compatibility
            capacity,
            isFree,
            price: isFree ? undefined : price,
            currency: 'usd',
            status: 'draft', // Start as draft
            waitlistEnabled: formData.get('waitlistEnabled') === 'true',
        });

        return handleSuccessResponse('Event created successfully', { event }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

