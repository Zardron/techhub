import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Plan from "@/database/plan.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get all plans
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

        const plans = await Plan.find().sort({ price: 1 });

        const formattedPlans = plans.map((plan: any) => ({
            id: plan._id.toString(),
            name: plan.name,
            description: plan.description,
            price: plan.price,
            annualPrice: plan.annualPrice,
            currency: plan.currency,
            billingCycle: plan.billingCycle,
            features: plan.features,
            limits: plan.limits,
            isActive: plan.isActive,
            isPopular: plan.isPopular,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
        }));

        return handleSuccessResponse("Plans retrieved successfully", {
            plans: formattedPlans,
            count: formattedPlans.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Create a new plan
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

        // Only admins can create plans
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            name,
            description,
            price,
            annualPrice,
            currency,
            billingCycle,
            features,
            limits,
            isActive,
            isPopular,
        } = body;

        if (!name || !price) {
            return NextResponse.json(
                { message: "Name and price are required" },
                { status: 400 }
            );
        }

        const plan = await Plan.create({
            name,
            description,
            price,
            annualPrice,
            currency: currency || 'php',
            billingCycle: billingCycle || 'monthly',
            features: features || {},
            limits: limits || {},
            isActive: isActive !== undefined ? isActive : true,
            isPopular: isPopular || false,
        });

        return handleSuccessResponse("Plan created successfully", {
            plan: {
                id: plan._id.toString(),
                name: plan.name,
                price: plan.price,
                isActive: plan.isActive,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

