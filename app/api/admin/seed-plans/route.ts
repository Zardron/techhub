import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Plan from "@/database/plan.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        // Verify admin access
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

        if (!user || user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const plans = [
            {
                name: 'Free',
                description: 'Perfect for getting started with event management',
                price: 0,
                currency: 'php',
                billingCycle: 'monthly',
                features: {
                    maxEvents: 3,
                    maxBookingsPerEvent: 50,
                    analytics: false,
                    customBranding: false,
                    prioritySupport: false,
                    apiAccess: false,
                    whiteLabel: false,
                },
                limits: {
                    eventsPerMonth: 3,
                    bookingsPerMonth: 150,
                },
                isActive: true,
            },
            {
                name: 'Basic',
                description: 'For growing event organizers',
                price: 150000, // ₱1,500/month in centavos
                annualPrice: 1500000, // ₱15,000/year (2 months free)
                currency: 'php',
                billingCycle: 'monthly',
                features: {
                    maxEvents: 20,
                    maxBookingsPerEvent: 500,
                    analytics: true,
                    customBranding: false,
                    prioritySupport: false,
                    apiAccess: false,
                    whiteLabel: false,
                },
                limits: {
                    eventsPerMonth: 20,
                    bookingsPerMonth: 10000,
                },
                isActive: true,
            },
            {
                name: 'Pro',
                description: 'For professional event organizers',
                price: 500000, // ₱5,000/month in centavos
                annualPrice: 5000000, // ₱50,000/year (2 months free)
                currency: 'php',
                billingCycle: 'monthly',
                features: {
                    maxEvents: null, // unlimited
                    maxBookingsPerEvent: null, // unlimited
                    analytics: true,
                    customBranding: true,
                    prioritySupport: true,
                    apiAccess: true,
                    whiteLabel: false,
                    dedicatedAccountManager: false,
                    slaGuarantee: false,
                    customIntegrations: false,
                    advancedSecurity: false,
                    teamManagement: false,
                    advancedReporting: false,
                },
                limits: {
                    eventsPerMonth: null,
                    bookingsPerMonth: null,
                },
                isActive: true,
                isPopular: true,
            },
            {
                name: 'Enterprise',
                description: 'Custom solutions for large organizations',
                price: 0, // Custom pricing
                currency: 'php',
                billingCycle: 'monthly',
                features: {
                    maxEvents: null,
                    maxBookingsPerEvent: null,
                    analytics: true,
                    customBranding: true,
                    prioritySupport: true,
                    apiAccess: true,
                    whiteLabel: true,
                    dedicatedAccountManager: true,
                    slaGuarantee: true,
                    customIntegrations: true,
                    advancedSecurity: true,
                    teamManagement: true,
                    advancedReporting: true,
                },
                limits: {},
                isActive: true,
            },
        ];

        const seededPlans = [];
        for (const planData of plans) {
            const plan = await Plan.findOneAndUpdate(
                { name: planData.name },
                planData,
                { upsert: true, new: true }
            );
            seededPlans.push({
                id: plan._id.toString(),
                name: plan.name,
            });
        }

        return handleSuccessResponse("Plans seeded successfully", {
            plans: seededPlans,
            message: "All pricing plans have been created/updated in the database."
        });
    } catch (error) {
        return handleApiError(error);
    }
}

