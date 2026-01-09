import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Plan from "@/database/plan.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// Auto-seed plans if they don't exist
async function seedPlansIfEmpty() {
    const planCount = await Plan.countDocuments({ isActive: true });
    
    if (planCount === 0) {
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

        for (const planData of plans) {
            await Plan.findOneAndUpdate(
                { name: planData.name },
                planData,
                { upsert: true, new: true }
            );
        }
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        // Auto-seed plans if database is empty
        await seedPlansIfEmpty();

        // Find all active plans, or all plans if none are marked active
        // Also handle case where isActive might be undefined/null
        let plans = await Plan.find({ 
            $or: [
                { isActive: true },
                { isActive: { $exists: false } },
                { isActive: null }
            ]
        });
        
        // If still no plans found, get all plans
        if (plans.length === 0) {
            plans = await Plan.find({});
        }

        // Define order for plans: Free, Basic, Pro, Enterprise
        const planOrder = ['Free', 'Basic', 'Pro', 'Enterprise'];
        
        // Sort plans by predefined order, then by price
        plans.sort((a, b) => {
            const aIndex = planOrder.indexOf(a.name);
            const bIndex = planOrder.indexOf(b.name);
            
            // If both are in the order list, sort by index
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
            }
            // If only one is in the list, prioritize it
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            // If neither is in the list, sort by price
            return (a.price || 0) - (b.price || 0);
        });

        const plansData = plans.map(plan => ({
            id: plan._id.toString(),
            name: plan.name,
            description: plan.description || '',
            price: plan.price || 0,
            annualPrice: plan.annualPrice || null,
            currency: plan.currency || 'php',
            billingCycle: plan.billingCycle || 'monthly',
            features: {
                maxEvents: plan.features?.maxEvents ?? null,
                maxBookingsPerEvent: plan.features?.maxBookingsPerEvent ?? null,
                analytics: plan.features?.analytics ?? false,
                customBranding: plan.features?.customBranding ?? false,
                prioritySupport: plan.features?.prioritySupport ?? false,
                apiAccess: plan.features?.apiAccess ?? false,
                whiteLabel: plan.features?.whiteLabel ?? false,
                dedicatedAccountManager: plan.features?.dedicatedAccountManager ?? false,
                slaGuarantee: plan.features?.slaGuarantee ?? false,
                customIntegrations: plan.features?.customIntegrations ?? false,
                advancedSecurity: plan.features?.advancedSecurity ?? false,
                teamManagement: plan.features?.teamManagement ?? false,
                advancedReporting: plan.features?.advancedReporting ?? false,
            },
            limits: plan.limits || {},
            isPopular: plan.isPopular || false,
        }));

        return handleSuccessResponse("Plans retrieved successfully", { plans: plansData });
    } catch (error) {
        return handleApiError(error);
    }
}

