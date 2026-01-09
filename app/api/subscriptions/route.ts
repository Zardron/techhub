import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Subscription from "@/database/subscription.model";
import Plan from "@/database/plan.model";
import { stripe, createStripeCustomer, createStripeSubscription } from "@/lib/stripe";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get user's current subscription
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

        const subscription = await Subscription.findOne({
            userId: user._id,
            status: { $in: ['active', 'trialing'] }
        }).populate('planId');

        if (!subscription) {
            return handleSuccessResponse("No active subscription", { subscription: null });
        }

        return handleSuccessResponse("Subscription retrieved", {
            subscription: {
                id: subscription._id.toString(),
                status: subscription.status,
                plan: subscription.planId,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Create a new subscription
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

        // Only organizers can have subscriptions
        if (user.role !== 'organizer') {
            return NextResponse.json(
                { message: "Only organizers can subscribe to plans" },
                { status: 403 }
            );
        }

        const { planId, paymentMethodId } = await req.json();

        if (!planId) {
            return NextResponse.json(
                { message: "Plan ID is required" },
                { status: 400 }
            );
        }

        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return NextResponse.json(
                { message: "Invalid or inactive plan" },
                { status: 400 }
            );
        }

        // Check if user already has an active subscription
        const existingSubscription = await Subscription.findOne({
            userId: user._id,
            status: { $in: ['active', 'trialing'] }
        });

        if (existingSubscription) {
            return NextResponse.json(
                { message: "User already has an active subscription" },
                { status: 400 }
            );
        }

        // Create or retrieve Stripe customer
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await createStripeCustomer(user.email, user.name, {
                userId: user._id.toString(),
            });
            stripeCustomerId = customer.id;
            // Store stripeCustomerId in user model
            user.stripeCustomerId = stripeCustomerId;
            await user.save();
        }

        // Create Stripe subscription
        // Note: You'll need to create Stripe Price objects for each plan
        // For now, we'll assume you have a priceId stored in the plan or metadata
        const priceId = plan.metadata?.stripePriceId || process.env[`STRIPE_PRICE_${plan.name.toUpperCase()}`];
        
        if (!priceId) {
            return NextResponse.json(
                { message: "Stripe price ID not configured for this plan" },
                { status: 500 }
            );
        }

        const stripeSubscription = await createStripeSubscription(
            stripeCustomerId,
            priceId,
            {
                userId: user._id.toString(),
                planId: plan._id.toString(),
            }
        );

        // Create subscription in database
        const subscription = await Subscription.create({
            userId: user._id,
            planId: plan._id,
            status: stripeSubscription.status === 'active' ? 'active' : 'trialing',
            stripeSubscriptionId: stripeSubscription.id,
            stripeCustomerId,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
        });

        return handleSuccessResponse("Subscription created successfully", {
            subscription: {
                id: subscription._id.toString(),
                status: subscription.status,
                plan: plan,
                clientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent?.client_secret,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

