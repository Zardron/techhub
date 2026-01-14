"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, ArrowLeft, Sparkles, Building2, Globe, Phone, MapPin, FileText, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import Link from "next/link";

export default function BecomeOrganizerPage() {
    const { token } = useAuthStore();
    const { user, isAuthenticated, isInitializing } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({
        organizerName: "",
        companyName: "",
        description: "",
        website: "",
        phone: "",
        address: "",
        planId: "",
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Fetch available plans - MUST be called before any conditional returns
    const { data: plansData, isLoading: plansLoading, error: plansError } = useQuery({
        queryKey: ['plans'],
        queryFn: async () => {
            const response = await fetch("/api/plans");
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to fetch plans");
            }
            const data = await response.json();
            // Return the full response object, similar to pricing page
            return data;
        },
        staleTime: 0, // Always fetch fresh data
    });

    // Extract plans from response - handle different response structures
    const plans = (plansData as any)?.data?.plans || (plansData as any)?.plans || [];

    // Submit application mutation - MUST be called before any conditional returns
    const submitApplicationMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/organizer-applications", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to submit application");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Application submitted successfully! We'll review it soon.");
            router.push("/my-applications");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to submit application");
        },
    });

    // Show loading state while initializing auth
    if (isInitializing) {
        return (
            <div className="min-h-screen bg-background pt-20 pb-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    // Check if user is not authenticated - require registration first
    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen bg-background pt-20 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Home</span>
                    </Link>
                    <div className="glass rounded-md p-8 md:p-12 border border-primary/30 text-center card-shadow">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-4">Registration Required</h1>
                        <p className="text-muted-foreground mb-8 text-lg">
                            You need to register and sign in before you can apply to become an organizer. 
                            Please create an account or sign in to continue.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button 
                                onClick={() => router.push("/sign-up")}
                                className="px-8 py-3 text-lg"
                            >
                                Create Account
                            </Button>
                            <Button 
                                onClick={() => router.push("/sign-in")}
                                variant="outline"
                                className="px-8 py-3 text-lg"
                            >
                                Sign In
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Check if user is already an organizer
    if (user?.role === 'organizer') {
        return (
            <div className="min-h-screen bg-background pt-20 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Home</span>
                    </Link>
                    <div className="glass rounded-md p-8 md:p-12 border border-primary/30 text-center card-shadow">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-4">You're Already an Organizer!</h1>
                        <p className="text-muted-foreground mb-8 text-lg">
                            You already have organizer access. Visit your dashboard to start creating amazing events.
                        </p>
                        <Button 
                            onClick={() => router.push("/organizer-dashboard")}
                            className="px-8 py-3 text-lg"
                        >
                            Go to Organizer Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.organizerName.trim()) {
            newErrors.organizerName = "Organizer name is required";
        } else if (formData.organizerName.trim().length > 100) {
            newErrors.organizerName = "Organizer name cannot exceed 100 characters";
        }

        if (!formData.description.trim()) {
            newErrors.description = "Description is required";
        } else if (formData.description.trim().length > 1000) {
            newErrors.description = "Description cannot exceed 1000 characters";
        }

        if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
            newErrors.website = "Website must be a valid URL (starting with http:// or https://)";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            // Only include planId if it's provided and not empty
            const submitData: any = {
                organizerName: formData.organizerName,
                companyName: formData.companyName,
                description: formData.description,
                website: formData.website,
                phone: formData.phone,
                address: formData.address,
            };
            
            // Only include planId if it's a valid non-empty string
            console.log('Form submission - planId value:', formData.planId, 'type:', typeof formData.planId);
            if (formData.planId && formData.planId.trim() !== '') {
                submitData.planId = formData.planId.trim();
                console.log('Including planId in submitData:', submitData.planId);
            } else {
                console.log('planId is empty or not provided, not including in submitData');
            }
            
            console.log('Submitting data:', submitData);
            submitApplicationMutation.mutate(submitData);
        }
    };

    return (
        <div className="min-h-screen bg-background pt-20 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Back to Home Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Home</span>
                </Link>

                {/* Header Section */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue bg-clip-text text-transparent">
                        Become an Organizer
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Join our community of event organizers and start hosting amazing tech events. 
                        Share your expertise and connect with thousands of attendees.
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid gap-8 md:grid-cols-3">
                    {/* Left Column - Info Cards */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="glass rounded-md p-6 border border-primary/20">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="font-semibold">Review Process</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Your application will be reviewed by our admin team within 1-3 business days. 
                                You'll receive a notification once reviewed.
                            </p>
                        </div>

                        <div className="glass rounded-md p-6 border border-blue/20">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-md bg-blue/10 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-blue" />
                                </div>
                                <h3 className="font-semibold">What You Get</h3>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>Create and manage events</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>Track attendees and analytics</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>Process payments and payouts</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>Manage team members</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column - Application Form */}
                    <div className="md:col-span-2">
                        <div className="glass rounded-md p-6 md:p-8 border border-primary/30 card-shadow">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-8 bg-primary rounded-full" />
                                <h2 className="text-2xl font-bold">Application Form</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Organizer Name */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <Building2 className="w-4 h-4 text-primary" />
                                        Organizer Name *
                                    </label>
                                    <FormInput
                                        value={formData.organizerName}
                                        onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                                        placeholder="e.g., Tech Conference Organizers"
                                        error={errors.organizerName}
                                        required
                                        className="bg-dark-200/60 backdrop-blur-sm border-blue/30 text-foreground placeholder:text-light-200/60 focus:border-primary/50 focus:ring-primary/30"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This will be your public organizer name displayed on events
                                    </p>
                                </div>

                                {/* Company Name */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                        Company Name (Optional)
                                    </label>
                                    <FormInput
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        placeholder="e.g., Tech Events Inc."
                                        className="bg-dark-200/60 backdrop-blur-sm border-blue/30 text-foreground placeholder:text-light-200/60 focus:border-primary/50 focus:ring-primary/30"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        Description *
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full min-h-[150px] p-4 border border-blue/30 rounded-md bg-dark-200/60 backdrop-blur-sm text-foreground placeholder:text-light-200/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-y"
                                        placeholder="Tell us about your organization, your experience with event planning, and what types of events you plan to host..."
                                        required
                                    />
                                    {errors.description && (
                                        <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-muted-foreground">
                                            Provide details about your event planning experience
                                        </p>
                                        <p className={`text-xs ${formData.description.length > 1000 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {formData.description.length}/1000
                                        </p>
                                    </div>
                                </div>

                                {/* Contact Information Grid */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    {/* Website */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                            <Globe className="w-4 h-4 text-muted-foreground" />
                                            Website (Optional)
                                        </label>
                                        <FormInput
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="https://yourwebsite.com"
                                            error={errors.website}
                                            className="bg-dark-200/60 backdrop-blur-sm border-blue/30 text-foreground placeholder:text-light-200/60 focus:border-primary/50 focus:ring-primary/30"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            Phone (Optional)
                                        </label>
                                        <FormInput
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+1 (555) 123-4567"
                                            className="bg-dark-200/60 backdrop-blur-sm border-blue/30 text-foreground placeholder:text-light-200/60 focus:border-primary/50 focus:ring-primary/30"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <MapPin className="w-4 h-4 text-muted-foreground" />
                                        Address (Optional)
                                    </label>
                                    <FormInput
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="123 Main St, City, State, ZIP"
                                        className="bg-dark-200/60 backdrop-blur-sm border-blue/30 text-foreground placeholder:text-light-200/60 focus:border-primary/50 focus:ring-primary/30"
                                    />
                                </div>

                                {/* Plan Selection */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                                        Plan Planning to Purchase (Optional)
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formData.planId}
                                            onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                                            disabled={plansLoading}
                                            className="w-full h-9 px-4 border border-blue/30 rounded-md bg-dark-200/60 backdrop-blur-sm text-foreground placeholder:text-light-200/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all appearance-none cursor-pointer pr-9 disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{ colorScheme: 'dark' }}
                                        >
                                            <option value="">Select a plan (optional)</option>
                                            {plansLoading ? (
                                                <option value="" disabled>Loading plans...</option>
                                            ) : plansError ? (
                                                <option value="" disabled>Error loading plans</option>
                                            ) : plans.length === 0 ? (
                                                <option value="" disabled>No plans available</option>
                                            ) : (
                                                plans.map((plan: any) => (
                                                    <option key={plan.id} value={plan.id}>
                                                        {plan.name}
                                                        {plan.price > 0 
                                                            ? ` - ₱${(plan.price / 100).toLocaleString()}/${plan.billingCycle === 'annual' ? 'year' : 'month'}`
                                                            : plan.name === 'Enterprise' 
                                                                ? ' - Custom Pricing' 
                                                                : ' - Free'}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg
                                                className="h-4 w-4 text-muted-foreground"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Select the plan you're interested in purchasing after your application is approved
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={submitApplicationMutation.isPending}
                                        className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-primary to-blue hover:from-primary/90 hover:to-blue/90"
                                    >
                                        {submitApplicationMutation.isPending ? (
                                            <>
                                                <span className="animate-spin mr-2">⏳</span>
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5 mr-2" />
                                                Submit Application
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground mt-3">
                                        By submitting, you agree to our Terms of Service and Privacy Policy
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

