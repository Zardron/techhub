import { NextRequest, NextResponse } from "next/server";
import { stripe, verifyWebhookSignature } from "@/lib/stripe";
import connectDB from "@/lib/mongodb";
import Subscription from "@/database/subscription.model";
import Payment from "@/database/payment.model";
import User from "@/database/user.model";
import { handleApiError } from "@/lib/utils";

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        const body = await req.text();
        const signature = req.headers.get("stripe-signature");

        if (!signature) {
            return NextResponse.json(
                { message: "Missing stripe-signature header" },
                { status: 400 }
            );
        }

        let event;
        try {
            event = verifyWebhookSignature(body, signature);
        } catch (error: any) {
            console.error("Webhook signature verification failed:", error.message);
            return NextResponse.json(
                { message: `Webhook signature verification failed: ${error.message}` },
                { status: 400 }
            );
        }

        // Handle different event types
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object as any);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as any);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object as any);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object as any);
                break;

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object as any);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object as any);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return handleApiError(error);
    }
}

async function handleSubscriptionUpdate(subscription: any) {
    const stripeSubscriptionId = subscription.id;
    const stripeCustomerId = subscription.customer as string;
    const status = subscription.status;

    // Find subscription by Stripe subscription ID
    let dbSubscription = await Subscription.findOne({ stripeSubscriptionId });

    if (!dbSubscription) {
        // Find user by Stripe customer ID
        const user = await User.findOne({ 
            $or: [
                { email: subscription.customer_email },
                // You might want to store stripeCustomerId in User model
            ]
        });

        if (!user) {
            console.error(`User not found for customer: ${stripeCustomerId}`);
            return;
        }

        // Create new subscription
        dbSubscription = await Subscription.create({
            userId: user._id,
            planId: subscription.metadata?.planId || null, // You'll need to map price to plan
            status: mapStripeStatus(status),
            stripeSubscriptionId,
            stripeCustomerId,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        });
    } else {
        // Update existing subscription
        dbSubscription.status = mapStripeStatus(status);
        dbSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        dbSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        dbSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        if (subscription.canceled_at) {
            dbSubscription.canceledAt = new Date(subscription.canceled_at * 1000);
        }
        await dbSubscription.save();
    }
}

async function handleSubscriptionDeleted(subscription: any) {
    const stripeSubscriptionId = subscription.id;
    
    const dbSubscription = await Subscription.findOne({ stripeSubscriptionId });
    if (dbSubscription) {
        dbSubscription.status = 'canceled';
        dbSubscription.canceledAt = new Date();
        await dbSubscription.save();
    }
}

async function handlePaymentSucceeded(paymentIntent: any) {
    // Handle one-time payment success
    const metadata = paymentIntent.metadata;
    
    if (metadata.bookingId) {
        // Update transaction status
        const Transaction = (await import("@/database/transaction.model")).default;
        const transaction = await Transaction.findOne({
            stripePaymentIntentId: paymentIntent.id,
        });

        if (transaction) {
            transaction.status = 'completed';
            await transaction.save();
        }
    }
}

async function handlePaymentFailed(paymentIntent: any) {
    const Transaction = (await import("@/database/transaction.model")).default;
    const transaction = await Transaction.findOne({
        stripePaymentIntentId: paymentIntent.id,
    });

    if (transaction) {
        transaction.status = 'failed';
        await transaction.save();
    }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
    const stripeSubscriptionId = invoice.subscription as string;
    const amount = invoice.amount_paid;
    const currency = invoice.currency;

    const subscription = await Subscription.findOne({ stripeSubscriptionId });
    if (!subscription) {
        console.error(`Subscription not found: ${stripeSubscriptionId}`);
        return;
    }

    // Create payment record
    await Payment.create({
        subscriptionId: subscription._id,
        userId: subscription.userId,
        amount,
        currency: currency.toUpperCase(),
        status: 'succeeded',
        paymentMethod: 'card',
        stripeChargeId: invoice.charge as string,
        description: `Subscription payment for ${invoice.period_start} - ${invoice.period_end}`,
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
    });
}

async function handleInvoicePaymentFailed(invoice: any) {
    const stripeSubscriptionId = invoice.subscription as string;
    
    const subscription = await Subscription.findOne({ stripeSubscriptionId });
    if (subscription) {
        subscription.status = 'past_due';
        await subscription.save();
    }
}

function mapStripeStatus(stripeStatus: string): 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' {
    const statusMap: Record<string, 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired'> = {
        'active': 'active',
        'canceled': 'canceled',
        'past_due': 'past_due',
        'trialing': 'trialing',
        'incomplete': 'incomplete',
        'incomplete_expired': 'incomplete_expired',
    };
    
    return statusMap[stripeStatus] || 'incomplete';
}

