"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import AnimateOnScroll from "@/components/AnimateOnScroll";

export default function PricingPage() {
    // Fetch pricing plans
    const { data: plansData, isLoading, error } = useQuery({
        queryKey: ["plans"],
        queryFn: async () => {
            const response = await fetch("/api/plans");
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to fetch plans");
            }
            const data = await response.json();
            console.log("API Response:", data);
            return data;
        },
        staleTime: 0, // Always fetch fresh data
    });

    // Format price from centavos to PHP
    const formatPrice = (centavos: number, planName?: string) => {
        // Enterprise plan should show "Custom pricing" instead of "Free"
        if (centavos === 0 && planName?.toLowerCase() === 'enterprise') {
            return "Custom pricing";
        }
        if (centavos === 0) return "Free";
        return `₱${(centavos / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-light-200">Loading pricing...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Error loading pricing plans</p>
                    <p className="text-light-200 text-sm">{error instanceof Error ? error.message : "Unknown error"}</p>
                </div>
            </div>
        );
    }

    // Extract plans from response - handle different response structures
    const plans = (plansData as any)?.data?.plans || (plansData as any)?.plans || [];

    // Ensure plans are sorted: Free, Basic, Pro, Enterprise
    const planOrder = ['Free', 'Basic', 'Pro', 'Enterprise'];
    const sortedPlans = [...plans].sort((a: any, b: any) => {
        const aIndex = planOrder.indexOf(a.name);
        const bIndex = planOrder.indexOf(b.name);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return (a.price || 0) - (b.price || 0);
    });

    return (
        <div className="min-h-screen py-20 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <AnimateOnScroll variant="fade">
                    <div className="text-center space-y-4 mb-16">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                            Simple, Transparent Pricing
                        </h1>
                        <p className="text-light-200 max-w-2xl mx-auto text-lg">
                            Choose the perfect plan for your event management needs. Start free, upgrade anytime.
                        </p>
                    </div>
                </AnimateOnScroll>

                {/* Pricing Cards */}
                {Array.isArray(sortedPlans) && sortedPlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        {sortedPlans.map((plan: any, index: number) => {
                            const isPopular = plan.isPopular;
                            const isEnterprise = plan.name?.toLowerCase() === 'enterprise';
                            const isFree = plan.price === 0 && !isEnterprise;

                            return (
                                <AnimateOnScroll
                                    key={plan.id}
                                    delay={index * 100}
                                    variant="slide"
                                    className="relative h-full"
                                >
                                    <div
                                        className={`relative h-full flex flex-col glass rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue/10 ${
                                            isPopular
                                                ? "border-2 border-blue/50 bg-linear-to-br from-blue/10 via-blue/5 to-transparent"
                                                : "border border-border-dark/50 hover:border-blue/30"
                                        }`}
                                    >
                                        {/* Most Popular Badge */}
                                        {isPopular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                                <span className="bg-blue text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                                                    Most Popular
                                                </span>
                                            </div>
                                        )}

                                        {/* Plan Header */}
                                        <div className="text-center mb-8">
                                            <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                                            
                                            {/* Price Display */}
                                            {isEnterprise ? (
                                                <div className="mb-4">
                                                    <div className="text-3xl font-bold mb-2">Custom pricing</div>
                                                </div>
                                            ) : isFree ? (
                                                <div className="mb-4">
                                                    <div className="text-5xl font-bold mb-2">Free</div>
                                                </div>
                                            ) : (
                                                <div className="mb-4">
                                                    <div className="text-5xl font-bold mb-2">
                                                        {formatPrice(plan.price, plan.name)}
                                                        <span className="text-xl text-light-200/70 font-normal">/month</span>
                                                    </div>
                                                    {plan.annualPrice && (
                                                        <div className="text-sm text-light-200/80 mt-3">
                                                            {formatPrice(plan.annualPrice, plan.name)}/year
                                                            <span className="text-green-500 ml-2 font-medium">
                                                                (Save {formatPrice((plan.price * 12) - plan.annualPrice, plan.name)})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Description */}
                                            {plan.description && (
                                                <p className="text-sm text-light-200/80 mt-4">{plan.description}</p>
                                            )}
                                            {isEnterprise && (
                                                <p className="text-sm text-light-200/80 mt-2">
                                                    Custom solutions for large organizations
                                                </p>
                                            )}
                                        </div>

                                        {/* Features List */}
                                        <ul className="space-y-3 mb-8 grow">
                                            {/* Core Features - Always shown */}
                                            <li className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                <span className="text-sm text-light-200">
                                                    {plan.features?.maxEvents === null || plan.features?.maxEvents === undefined
                                                        ? "Unlimited events"
                                                        : `${plan.features.maxEvents} events`}
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                <span className="text-sm text-light-200">
                                                    {plan.features?.maxBookingsPerEvent === null || plan.features?.maxBookingsPerEvent === undefined
                                                        ? "Unlimited bookings per event"
                                                        : `Up to ${plan.features.maxBookingsPerEvent} bookings/event`}
                                                </span>
                                            </li>
                                            
                                            {/* Standard Features - Conditional */}
                                            {plan.features?.analytics && (
                                                <li className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                    <span className="text-sm text-light-200">Analytics & Insights</span>
                                                </li>
                                            )}
                                            {plan.features?.customBranding && (
                                                <li className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                    <span className="text-sm text-light-200">Custom Branding</span>
                                                </li>
                                            )}
                                            {plan.features?.prioritySupport && (
                                                <li className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                    <span className="text-sm text-light-200">Priority Support</span>
                                                </li>
                                            )}
                                            {plan.features?.apiAccess && (
                                                <li className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                    <span className="text-sm text-light-200">API Access</span>
                                                </li>
                                            )}
                                            
                                            {/* Enterprise Features */}
                                            {plan.features?.whiteLabel && (
                                                <li className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                    <span className="text-sm text-light-200">White Label Solution</span>
                                                </li>
                                            )}
                                            
                                            {/* Base Features - Always shown */}
                                            <li className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                <span className="text-sm text-light-200">Secure Payment Processing</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                <span className="text-sm text-light-200">QR Code Tickets</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                <span className="text-sm text-light-200">Email Notifications</span>
                                            </li>
                                        </ul>

                                        {/* CTA Button */}
                                        <Link href="/sign-up" className="block mt-auto">
                                            <Button
                                                className={`w-full py-6 rounded-xl font-semibold transition-all duration-300 ${
                                                    isPopular
                                                        ? "bg-blue hover:bg-blue/90 text-white shadow-lg shadow-blue/20"
                                                        : "bg-dark-100 hover:bg-dark-100/90 text-foreground border border-blue/20 hover:border-blue/40"
                                                }`}
                                            >
                                                {isFree
                                                    ? "Get Started Free"
                                                    : isEnterprise
                                                    ? "Contact Sales"
                                                    : "Choose Plan"}
                                            </Button>
                                        </Link>
                                    </div>
                                </AnimateOnScroll>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-light-200">No pricing plans available at the moment. Please check back later.</p>
                    </div>
                )}

                {/* FAQ Section */}
                <AnimateOnScroll variant="fade">
                    <div className="mt-24 space-y-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                            Frequently Asked Questions
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                            <div className="glass p-6 rounded-xl border border-border-dark/50 hover:border-blue/30 transition-colors">
                                <h3 className="font-semibold mb-3">Can I change plans later?</h3>
                                <p className="text-sm text-light-200/80">
                                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                                </p>
                            </div>
                            <div className="glass p-6 rounded-xl border border-border-dark/50 hover:border-blue/30 transition-colors">
                                <h3 className="font-semibold mb-3">What payment methods do you accept?</h3>
                                <p className="text-sm text-light-200/80">
                                    We accept all major credit cards through Stripe. Secure and encrypted payments.
                                </p>
                            </div>
                            <div className="glass p-6 rounded-xl border border-border-dark/50 hover:border-blue/30 transition-colors">
                                <h3 className="font-semibold mb-3">Is there a setup fee?</h3>
                                <p className="text-sm text-light-200/80">
                                    No setup fees. Just choose your plan and start creating events immediately.
                                </p>
                            </div>
                            <div className="glass p-6 rounded-xl border border-border-dark/50 hover:border-blue/30 transition-colors">
                                <h3 className="font-semibold mb-3">Can I cancel anytime?</h3>
                                <p className="text-sm text-light-200/80">
                                    Yes, you can cancel your subscription at any time. No long-term commitments.
                                </p>
                            </div>
                        </div>
                    </div>
                </AnimateOnScroll>

                {/* CTA Section */}
                <AnimateOnScroll variant="glow">
                    <div className="mt-20 glass p-12 rounded-2xl text-center border border-border-dark/50">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                        <p className="text-light-200 mb-8 max-w-2xl mx-auto text-lg">
                            Join thousands of event organizers using TechEventX to manage their events.
                        </p>
                        <Link href="/sign-up">
                            <Button className="bg-linear-to-r from-blue to-primary hover:from-blue/90 hover:to-primary/90 text-white px-8 py-6 rounded-xl text-base font-semibold hover:scale-105 transition-all duration-300 shadow-lg shadow-blue/20">
                                Start Your Free Trial
                            </Button>
                        </Link>
                    </div>
                </AnimateOnScroll>
            </div>
        </div>
    );
}
