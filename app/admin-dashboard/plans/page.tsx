"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Plus, Edit, Trash2, Check, X, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

export default function PlansPage() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        annualPrice: "",
        currency: "php",
        billingCycle: "monthly",
        isActive: true,
        isPopular: false,
    });

    // Fetch plans
    const { data, isLoading, error } = useQuery({
        queryKey: ["admin", "plans"],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/admin/plans", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch plans");
            return response.json();
        },
        enabled: !!token,
    });

    const plans = data?.data?.plans || [];

    // Create/Update plan mutation
    const savePlanMutation = useMutation({
        mutationFn: async (planData: any) => {
            if (!token) throw new Error("Not authenticated");
            const url = editingPlan 
                ? `/api/admin/plans/${editingPlan.id}`
                : "/api/admin/plans";
            const method = editingPlan ? "PATCH" : "POST";
            
            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(planData),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to save plan");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success(editingPlan ? "Plan updated successfully" : "Plan created successfully");
            queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
            setShowForm(false);
            setEditingPlan(null);
            setFormData({
                name: "",
                description: "",
                price: "",
                annualPrice: "",
                currency: "php",
                billingCycle: "monthly",
                isActive: true,
                isPopular: false,
            });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to save plan");
        },
    });

    // Delete plan mutation
    const deletePlanMutation = useMutation({
        mutationFn: async (planId: string) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(`/api/admin/plans/${planId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to delete plan");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Plan deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete plan");
        },
    });

    const formatPrice = (cents: number, currency: string = "php") => {
        const symbol = currency.toUpperCase() === "PHP" ? "₱" : "$";
        return `${symbol}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleEdit = (plan: any) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            description: plan.description || "",
            price: (plan.price / 100).toString(),
            annualPrice: plan.annualPrice ? (plan.annualPrice / 100).toString() : "",
            currency: plan.currency || "php",
            billingCycle: plan.billingCycle || "monthly",
            isActive: plan.isActive,
            isPopular: plan.isPopular || false,
        });
        setShowForm(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const planData = {
            name: formData.name,
            description: formData.description,
            price: Math.round(parseFloat(formData.price) * 100),
            annualPrice: formData.annualPrice ? Math.round(parseFloat(formData.annualPrice) * 100) : undefined,
            currency: formData.currency,
            billingCycle: formData.billingCycle,
            isActive: formData.isActive,
            isPopular: formData.isPopular,
        };
        savePlanMutation.mutate(planData);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
                    </div>
                    <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
                </div>

                {/* Plans Grid Skeleton */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="p-6 border rounded-lg bg-card animate-pulse">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                                    <div className="h-3 bg-muted rounded w-16"></div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 bg-muted rounded"></div>
                                    <div className="w-8 h-8 bg-muted rounded"></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-8 bg-muted rounded w-40"></div>
                                <div className="h-4 bg-muted rounded w-32"></div>
                                <div className="h-4 bg-muted rounded w-full"></div>
                                <div className="h-6 bg-muted rounded w-20 mt-4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">Error loading plans</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Subscription Plans</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage subscription plans for organizers
                    </p>
                </div>
                <Button onClick={() => {
                    setShowForm(true);
                    setEditingPlan(null);
                    setFormData({
                        name: "",
                        description: "",
                        price: "",
                        annualPrice: "",
                        currency: "php",
                        billingCycle: "monthly",
                        isActive: true,
                        isPopular: false,
                    });
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Plan
                </Button>
            </div>

            {showForm && (
                <div className="p-6 border rounded-lg bg-card">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingPlan ? "Edit Plan" : "Create New Plan"}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormInput
                                label="Plan Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <FormSelect
                                label="Currency"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                options={[
                                    { value: "php", label: "PHP (₱)" },
                                    { value: "usd", label: "USD ($)" },
                                ]}
                                required
                            />
                            <FormInput
                                label="Monthly Price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                required
                                helperText="Enter amount in currency (e.g., 29.99)"
                            />
                            <FormInput
                                label="Annual Price (Optional)"
                                type="number"
                                step="0.01"
                                value={formData.annualPrice}
                                onChange={(e) => setFormData({ ...formData, annualPrice: e.target.value })}
                                helperText="Enter amount in currency"
                            />
                            <FormInput
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="md:col-span-2"
                            />
                            <FormSelect
                                label="Billing Cycle"
                                value={formData.billingCycle}
                                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                                options={[
                                    { value: "monthly", label: "Monthly" },
                                    { value: "annual", label: "Annual" },
                                ]}
                                required
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 rounded"
                                />
                                <span>Active</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isPopular}
                                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                                    className="w-4 h-4 rounded"
                                />
                                <span>Popular</span>
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={savePlanMutation.isPending}>
                                {savePlanMutation.isPending ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingPlan(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {plans.length === 0 ? (
                <div className="p-12 text-center border rounded-lg bg-card">
                    <CreditCard className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground">No plans created yet</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map((plan: any) => (
                        <div
                            key={plan.id}
                            className={`p-6 border rounded-lg bg-card ${plan.isPopular ? 'border-primary ring-2 ring-primary/20' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{plan.name}</h3>
                                    {plan.isPopular && (
                                        <span className="text-xs text-primary font-medium">POPULAR</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(plan)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm(`Delete plan "${plan.name}"?`)) {
                                                deletePlanMutation.mutate(plan.id);
                                            }
                                        }}
                                        disabled={deletePlanMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-3xl font-bold">
                                    {formatPrice(plan.price, plan.currency)}
                                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                                </p>
                                {plan.annualPrice && (
                                    <p className="text-sm text-muted-foreground">
                                        {formatPrice(plan.annualPrice, plan.currency)}/year
                                    </p>
                                )}
                                {plan.description && (
                                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-4">
                                    {plan.isActive ? (
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                                            <Check className="w-3 h-3 inline mr-1" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">
                                            <X className="w-3 h-3 inline mr-1" />
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

