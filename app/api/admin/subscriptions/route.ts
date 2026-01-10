import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Subscription from "@/database/subscription.model";
import Plan from "@/database/plan.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get all subscriptions (admin only)
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
        const organizerId = searchParams.get('organizerId');

        // Build query
        const query: any = {};
        if (status) {
            query.status = status;
        }

        // If organizerId is provided, filter by that organizer
        if (organizerId) {
            const organizer = await User.findOne({
                _id: organizerId,
                role: 'organizer',
                deleted: { $ne: true }
            });

            if (!organizer) {
                return NextResponse.json(
                    { message: "Organizer not found" },
                    { status: 404 }
                );
            }

            query.userId = organizer._id;
        }

        // Get subscriptions with populated data
        const subscriptions = await Subscription.find(query)
            .populate('userId', 'name email role')
            .populate('planId')
            .sort({ createdAt: -1 });

        // Format subscriptions
        const formattedSubscriptions = subscriptions.map((sub: any) => ({
            id: sub._id.toString(),
            userId: sub.userId._id.toString(),
            user: {
                id: sub.userId._id.toString(),
                name: sub.userId.name,
                email: sub.userId.email,
                role: sub.userId.role,
            },
            plan: {
                id: sub.planId._id.toString(),
                name: sub.planId.name,
                price: sub.planId.price,
                currency: sub.planId.currency,
            },
            status: sub.status,
            stripeSubscriptionId: sub.stripeSubscriptionId,
            stripeCustomerId: sub.stripeCustomerId,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            canceledAt: sub.canceledAt,
            trialEnd: sub.trialEnd,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
        }));

        // Calculate statistics
        const stats = {
            total: subscriptions.length,
            active: subscriptions.filter((s: any) => s.status === 'active').length,
            trialing: subscriptions.filter((s: any) => s.status === 'trialing').length,
            canceled: subscriptions.filter((s: any) => s.status === 'canceled').length,
            pastDue: subscriptions.filter((s: any) => s.status === 'past_due').length,
        };

        return handleSuccessResponse("Subscriptions retrieved successfully", {
            subscriptions: formattedSubscriptions,
            stats,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

