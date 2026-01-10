import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import OrganizerApplication from "@/database/organizer-application.model";
import Organizer from "@/database/organizer.model";
import Plan from "@/database/plan.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get organizer applications (for users: their own, for admins: all)
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

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        // Build query
        const query: any = {};
        if (user.role !== 'admin') {
            // Regular users can only see their own applications
            query.userId = user._id;
        }
        if (status) {
            query.status = status;
        }

        const applications = await OrganizerApplication.find(query)
            .populate('userId', 'name email')
            .populate('reviewedBy', 'name email')
            .populate('planId', 'name price')
            .sort({ createdAt: -1 });

        const formattedApplications = applications.map((app: any) => ({
            id: app._id.toString(),
            userId: app.userId._id.toString(),
            userName: app.userId.name,
            userEmail: app.userId.email,
            organizerName: app.organizerName,
            companyName: app.companyName,
            description: app.description,
            website: app.website,
            phone: app.phone,
            address: app.address,
            planId: app.planId ? app.planId.toString() : null,
            status: app.status,
            reviewedBy: app.reviewedBy ? {
                id: app.reviewedBy._id.toString(),
                name: app.reviewedBy.name,
                email: app.reviewedBy.email,
            } : null,
            reviewedAt: app.reviewedAt,
            rejectionReason: app.rejectionReason,
            createdAt: app.createdAt,
            updatedAt: app.updatedAt,
        }));

        return handleSuccessResponse("Applications retrieved successfully", {
            applications: formattedApplications,
            count: formattedApplications.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Submit organizer application
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

        // Check if user is already an organizer
        if (user.role === 'organizer') {
            return NextResponse.json(
                { message: "You are already an organizer" },
                { status: 400 }
            );
        }

        // Check if user has a pending application
        const existingApplication = await OrganizerApplication.findOne({
            userId: user._id,
            status: 'pending',
        });

        if (existingApplication) {
            return NextResponse.json(
                { message: "You already have a pending application" },
                { status: 400 }
            );
        }

        const { organizerName, companyName, description, website, phone, address, planId } = await req.json();

        // Validate required fields
        if (!organizerName || !organizerName.trim()) {
            return NextResponse.json(
                { message: "Organizer name is required" },
                { status: 400 }
            );
        }

        if (!description || !description.trim()) {
            return NextResponse.json(
                { message: "Description is required" },
                { status: 400 }
            );
        }

        // Validate planId if provided
        if (planId) {
            const plan = await Plan.findById(planId);
            if (!plan || !plan.isActive) {
                return NextResponse.json(
                    { message: "Invalid or inactive plan selected" },
                    { status: 400 }
                );
            }
        }

        // Check if organizer name is already taken
        const existingOrganizer = await Organizer.findOne({
            name: organizerName.trim(),
            deleted: { $ne: true }
        });

        if (existingOrganizer) {
            return NextResponse.json(
                { message: "Organizer name is already taken" },
                { status: 409 }
            );
        }

        // Create application
        const application = await OrganizerApplication.create({
            userId: user._id,
            organizerName: organizerName.trim(),
            companyName: companyName?.trim(),
            description: description.trim(),
            website: website?.trim(),
            phone: phone?.trim(),
            address: address?.trim(),
            planId: planId || undefined,
            status: 'pending',
        });

        return handleSuccessResponse("Application submitted successfully", {
            application: {
                id: application._id.toString(),
                organizerName: application.organizerName,
                status: application.status,
                createdAt: application.createdAt,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

