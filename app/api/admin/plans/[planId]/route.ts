import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Plan from "@/database/plan.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// PATCH - Update a plan
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ planId: string }> }
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

        // Only admins can update plans
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const { planId } = await params;
        const body = await req.json();

        const plan = await Plan.findById(planId);

        if (!plan) {
            return NextResponse.json(
                { message: "Plan not found" },
                { status: 404 }
            );
        }

        // Update fields
        if (body.name) plan.name = body.name;
        if (body.description !== undefined) plan.description = body.description;
        if (body.price !== undefined) plan.price = body.price;
        if (body.annualPrice !== undefined) plan.annualPrice = body.annualPrice;
        if (body.currency) plan.currency = body.currency;
        if (body.billingCycle) plan.billingCycle = body.billingCycle;
        if (body.features) plan.features = { ...plan.features, ...body.features };
        if (body.limits) plan.limits = { ...plan.limits, ...body.limits };
        if (body.isActive !== undefined) plan.isActive = body.isActive;
        if (body.isPopular !== undefined) plan.isPopular = body.isPopular;

        await plan.save();

        return handleSuccessResponse("Plan updated successfully", {
            plan: {
                id: plan._id.toString(),
                name: plan.name,
                price: plan.price,
                isActive: plan.isActive,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE - Delete a plan
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ planId: string }> }
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

        // Only admins can delete plans
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const { planId } = await params;

        const plan = await Plan.findById(planId);

        if (!plan) {
            return NextResponse.json(
                { message: "Plan not found" },
                { status: 404 }
            );
        }

        // Check if plan has active subscriptions
        const Subscription = (await import("@/database/subscription.model")).default;
        const activeSubscriptions = await Subscription.countDocuments({
            planId: plan._id,
            status: { $in: ['active', 'trialing'] }
        });

        if (activeSubscriptions > 0) {
            return NextResponse.json(
                { message: `Cannot delete plan with ${activeSubscriptions} active subscription(s). Deactivate it instead.` },
                { status: 400 }
            );
        }

        await Plan.findByIdAndDelete(planId);

        return handleSuccessResponse("Plan deleted successfully", {});
    } catch (error) {
        return handleApiError(error);
    }
}

