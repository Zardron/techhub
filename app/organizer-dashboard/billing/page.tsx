"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function BillingPage() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    // Fetch plans
    const { data: plansData } = useQuery({
        queryKey: ["plans"],
        queryFn: async () => {
            const response = await fetch("/api/plans");
            if (!response.ok) throw new Error("Failed to fetch plans");
            return response.json();
        },
    });

    // Fetch current subscription
    const { data: subscriptionData } = useQuery({
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

    const plans = plansData?.data?.plans || [];
    const subscription = subscriptionData?.data?.subscription;

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
            if (data.data.subscription.clientSecret) {
                const stripe = await stripePromise;
                if (stripe) {
                    const result = await stripe.confirmCardPayment(data.data.subscription.clientSecret);
                    if (result.error) {
                        toast.error(result.error.message || "Payment failed");
                    } else {
                        toast.success("Subscription activated!");
                        queryClient.invalidateQueries({ queryKey: ["subscription"] });
                    }
                }
            } else {
                toast.success("Subscription created!");
                queryClient.invalidateQueries({ queryKey: ["subscription"] });
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
            {subscription && (
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-semibold">Current Plan</h3>
                            <p className="text-muted-foreground">
                                {subscription.plan?.name || "No plan selected"}
                            </p>
                        </div>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                subscription.status === "active"
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-yellow-500/10 text-yellow-500"
                            }`}
                        >
                            {subscription.status}
                        </span>
                    </div>

                    {subscription.plan && (
                        <div className="space-y-2 mb-4">
                            <p className="text-sm">
                                <strong>Price:</strong> ${(subscription.plan.price / 100).toFixed(2)}/month
                            </p>
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
                        </div>
                    )}

                    {subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
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
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan: any) => {
                        const isCurrentPlan = subscription?.planId === plan.id;
                        const isPopular = plan.isPopular;

                        return (
                            <div
                                key={plan.id}
                                className={`p-6 border rounded-lg ${
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
                                    <span className="text-3xl font-bold">₱{(plan.price / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    <span className="text-muted-foreground">/month</span>
                                </div>

                                <ul className="space-y-2 mb-6">
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500" />
                                        {plan.features.maxEvents
                                            ? `${plan.features.maxEvents} events/month`
                                            : "Unlimited events"}
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500" />
                                        {plan.features.analytics ? "Analytics" : "No analytics"}
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        {plan.features.customBranding ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <X className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        Custom branding
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        {plan.features.prioritySupport ? (
                                            <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <X className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        Priority support
                                    </li>
                                </ul>

                                {isCurrentPlan ? (
                                    <Button disabled className="w-full">
                                        Current Plan
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
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

