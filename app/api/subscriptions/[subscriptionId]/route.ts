import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Subscription from "@/database/subscription.model";
import { cancelStripeSubscription, updateStripeSubscription } from "@/lib/stripe";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// DELETE - Cancel subscription
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ subscriptionId: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { subscriptionId } = await params;
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

        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            userId: user._id,
        });

        if (!subscription) {
            return NextResponse.json(
                { message: "Subscription not found" },
                { status: 404 }
            );
        }

        if (subscription.status === 'canceled') {
            return NextResponse.json(
                { message: "Subscription is already canceled" },
                { status: 400 }
            );
        }

        // Cancel at period end (soft cancel)
        if (subscription.stripeSubscriptionId) {
            await cancelStripeSubscription(subscription.stripeSubscriptionId, false);
        }

        subscription.cancelAtPeriodEnd = true;
        await subscription.save();

        return handleSuccessResponse("Subscription will be canceled at period end", {
            subscription: {
                id: subscription._id.toString(),
                status: subscription.status,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH - Update subscription (change plan)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ subscriptionId: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { subscriptionId } = await params;
        const { planId, newPriceId } = await req.json();
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

        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            userId: user._id,
        }).populate('planId');

        if (!subscription) {
            return NextResponse.json(
                { message: "Subscription not found" },
                { status: 404 }
            );
        }

        if (!subscription.stripeSubscriptionId || !newPriceId) {
            return NextResponse.json(
                { message: "Invalid subscription or price ID" },
                { status: 400 }
            );
        }

        // Update Stripe subscription
        await updateStripeSubscription(subscription.stripeSubscriptionId, newPriceId);

        // Update database
        if (planId) {
            subscription.planId = planId as any;
        }
        await subscription.save();

        return handleSuccessResponse("Subscription updated successfully", {
            subscription: {
                id: subscription._id.toString(),
                status: subscription.status,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

