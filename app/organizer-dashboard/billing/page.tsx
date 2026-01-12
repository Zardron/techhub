"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
// PayMongo integration - using their payment widget

export default function BillingPage() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    // Fetch plans
    const { data: plansData, isLoading: plansLoading, error: plansError } = useQuery({
        queryKey: ["plans"],
        queryFn: async () => {
            const response = await fetch("/api/plans");
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Plans API error:", errorText);
                throw new Error("Failed to fetch plans");
            }
            const data = await response.json();
            console.log("Plans API response:", data); // Debug log
            return data;
        },
    });

    // Fetch current subscription
    const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
        queryKey: ["subscription"],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/subscriptions", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch subscription");
            return response.json();
        },
        enabled: !!token,
    });

    // Fix: handleSuccessResponse spreads the data object, so plans are directly in plansData.plans, not plansData.data.plans
    const plans = plansData?.plans || plansData?.data?.plans || [];
    const subscription = subscriptionData?.subscription || subscriptionData?.data?.subscription;
    const currentPlan = subscription?.plan;

    const createSubscriptionMutation = useMutation({
        mutationFn: async (planId: string) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/subscriptions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ planId }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to create subscription");
            }
            return response.json();
        },
        onSuccess: async (data) => {
            const subscription = data.subscription || data.data?.subscription;
            
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
            
            // If there's a payment intent, redirect to payment page
            if (subscription?.paymentIntentId) {
                window.location.href = `/organizer-dashboard/billing/payment?intent=${subscription.paymentIntentId}`;
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create subscription");
        },
    });

    const cancelSubscriptionMutation = useMutation({
        mutationFn: async () => {
            if (!token || !subscription) throw new Error("No active subscription");
            const response = await fetch(`/api/subscriptions/${subscription.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to cancel subscription");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Subscription will be canceled at period end");
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to cancel subscription");
        },
    });

    const handleSubscribe = (planId: string) => {
        setSelectedPlanId(planId);
        createSubscriptionMutation.mutate(planId);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Billing & Subscription</h1>
                <p className="text-muted-foreground mt-2">Manage your subscription and billing</p>
            </div>

            {/* Current Subscription */}
            {!subscriptionLoading && (
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-semibold">Current Plan</h3>
                            <p className="text-muted-foreground">
                                {currentPlan?.name || "Free Plan"}
                            </p>
                        </div>
                        {subscription ? (
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    subscription.status === "active"
                                        ? "bg-green-500/10 text-green-500"
                                        : "bg-yellow-500/10 text-yellow-500"
                                }`}
                            >
                                {subscription.status}
                            </span>
                        ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500">
                                Free
                            </span>
                        )}
                    </div>

                    {currentPlan ? (
                        <div className="space-y-2 mb-4">
                            <p className="text-sm">
                                <strong>Price:</strong> ₱{(currentPlan.price / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                            </p>
                            {subscription && (
                                <>
                                    <p className="text-sm">
                                        <strong>Current Period:</strong>{" "}
                                        {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{" "}
                                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                    </p>
                                    {subscription.cancelAtPeriodEnd && (
                                        <div className="flex items-center gap-2 text-yellow-600">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-sm">Will cancel at period end</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2 mb-4">
                            <p className="text-sm text-muted-foreground">
                                You're currently on the Free Plan. Upgrade to unlock more features and higher limits.
                            </p>
                        </div>
                    )}

                    {subscription && subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
                        <Button
                            variant="destructive"
                            onClick={() => cancelSubscriptionMutation.mutate()}
                            disabled={cancelSubscriptionMutation.isPending}
                        >
                            {cancelSubscriptionMutation.isPending ? "Canceling..." : "Cancel Subscription"}
                        </Button>
                    )}
                </div>
            )}

            {/* Available Plans */}
            <div>
                <h2 className="text-2xl font-semibold mb-4">Available Plans</h2>
                {plansLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="p-6 border rounded-lg bg-card animate-pulse">
                                <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                                <div className="h-4 bg-muted rounded w-full mb-4"></div>
                                <div className="h-8 bg-muted rounded w-40 mb-4"></div>
                                <div className="space-y-2 mb-6">
                                    {[...Array(6)].map((_, j) => (
                                        <div key={j} className="h-4 bg-muted rounded w-full"></div>
                                    ))}
                                </div>
                                <div className="h-10 bg-muted rounded w-full"></div>
                            </div>
                        ))}
                    </div>
                ) : plansError ? (
                    <div className="text-center py-8 text-destructive">Failed to load plans. Please try again.</div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No plans available at the moment.</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
                        {plans
                            .filter((plan: any) => {
                                // Enterprise plan should always be available
                                const isEnterprise = plan.name?.toLowerCase() === 'enterprise';
                                if (isEnterprise) return true;
                                
                                // Show all plans, including the current one
                                return true;
                            })
                            .map((plan: any) => {
                                const isPopular = plan.isPopular;
                                const isEnterprise = plan.name?.toLowerCase() === 'enterprise';
                                // Check if this is the current plan by comparing plan IDs
                                const currentPlanId = currentPlan?._id?.toString() || currentPlan?.id?.toString();
                                const planId = plan._id?.toString() || plan.id?.toString();
                                const isCurrentPlan = currentPlanId === planId || (!subscription && plan.price === 0 && !isEnterprise);

                        return (
                            <div
                                key={plan.id}
                                className={`p-6 border rounded-lg flex flex-col h-full ${
                                    isPopular ? "border-primary shadow-lg" : ""
                                } ${isCurrentPlan ? "bg-primary/5" : "bg-card"}`}
                            >
                                {isPopular && (
                                    <div className="text-center mb-2">
                                        <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

                                <div className="mb-4">
                                    {isEnterprise ? (
                                        <span className="text-3xl font-bold">Custom pricing</span>
                                    ) : (
                                        <>
                                            <span className="text-3xl font-bold">₱{(plan.price / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                            <span className="text-muted-foreground">/month</span>
                                        </>
                                    )}
                                </div>

                                <ul className="space-y-2 mb-6 flex-1">
                                    {/* Core Features - Always checked */}
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500" />
                                        {plan.features?.maxEvents === null || plan.features?.maxEvents === undefined
                                            ? "Unlimited events"
                                            : `${plan.features.maxEvents} events`}
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500" />
                                        {plan.features?.maxBookingsPerEvent === null || plan.features?.maxBookingsPerEvent === undefined
                                            ? "Unlimited bookings per event"
                                            : `Up to ${plan.features.maxBookingsPerEvent} bookings/event`}
                                    </li>
                                    
                                    {/* Features with checkmarks */}
                                    {plan.features?.analytics && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500" />
                                            Analytics & Insights
                                        </li>
                                    )}
                                    {plan.features?.customBranding && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500" />
                                            Custom Branding
                                        </li>
                                    )}
                                    {plan.features?.prioritySupport && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500" />
                                            Priority Support
                                        </li>
                                    )}
                                    {plan.features?.apiAccess && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500" />
                                            API Access
                                        </li>
                                    )}
                                    {plan.features?.whiteLabel && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500" />
                                            White Label Solution
                                        </li>
                                    )}
                                    
                                    {/* Base Features - Always checked */}
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500" />
                                        Secure Payment Processing
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500" />
                                        QR Code Tickets
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500" />
                                        Email Notifications
                                    </li>
                                    
                                    {/* Features with X marks */}
                                    {!plan.features?.analytics && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <X className="w-4 h-4 text-muted-foreground" />
                                            Analytics & Insights
                                        </li>
                                    )}
                                    {!plan.features?.customBranding && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <X className="w-4 h-4 text-muted-foreground" />
                                            Custom Branding
                                        </li>
                                    )}
                                    {!plan.features?.prioritySupport && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <X className="w-4 h-4 text-muted-foreground" />
                                            Priority Support
                                        </li>
                                    )}
                                    {!plan.features?.apiAccess && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <X className="w-4 h-4 text-muted-foreground" />
                                            API Access
                                        </li>
                                    )}
                                    {!plan.features?.whiteLabel && (
                                        <li className="flex items-center gap-2 text-sm">
                                            <X className="w-4 h-4 text-muted-foreground" />
                                            White Label Solution
                                        </li>
                                    )}
                                </ul>

                                <div className="mt-auto">
                                    {isCurrentPlan ? (
                                        <Button disabled className="w-full">
                                            Current Plan
                                        </Button>
                                    ) : isEnterprise ? (
                                        <Button
                                            className="w-full"
                                            onClick={() => window.location.href = '/contact'}
                                        >
                                            Contact Sales
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            onClick={() => handleSubscribe(plan.id)}
                                            disabled={createSubscriptionMutation.isPending && selectedPlanId === plan.id}
                                        >
                                            {createSubscriptionMutation.isPending && selectedPlanId === plan.id
                                                ? "Processing..."
                                                : "Subscribe"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    </div>
                )}
            </div>
        </div>
    );
}

