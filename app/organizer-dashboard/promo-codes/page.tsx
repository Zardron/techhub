"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Tag, Plus, X, Check, AlertCircle, Trash2, Edit } from "lucide-react";
import toast from "react-hot-toast";
import { formatDateToReadable } from "@/lib/formatters";

export default function PromoCodesPage() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        code: "",
        description: "",
        discountType: "percentage" as "percentage" | "fixed",
        discountValue: "",
        usageLimit: "",
        validFrom: "",
        validUntil: "",
        eventId: "",
        minPurchaseAmount: "",
        maxDiscountAmount: "",
    });

    // Fetch events for dropdown
    const { data: eventsData } = useQuery({
        queryKey: ["organizer", "events"],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/organizer/events", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch events");
            return response.json();
        },
        enabled: !!token,
    });

    const events = eventsData?.data?.events || [];

    // Fetch promo codes
    const { data, isLoading, error } = useQuery({
        queryKey: ["organizer", "promoCodes"],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/organizer/promo-codes", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch promo codes");
            return response.json();
        },
        enabled: !!token,
    });

    const promoCodes = data?.data?.promoCodes || [];

    // Create promo code mutation
    const createMutation = useMutation({
        mutationFn: async (codeData: any) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/organizer/promo-codes", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(codeData),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to create promo code");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Promo code created successfully");
            queryClient.invalidateQueries({ queryKey: ["organizer", "promoCodes"] });
            setShowAddForm(false);
            setFormData({
                code: "",
                description: "",
                discountType: "percentage",
                discountValue: "",
                usageLimit: "",
                validFrom: "",
                validUntil: "",
                eventId: "",
                minPurchaseAmount: "",
                maxDiscountAmount: "",
            });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create promo code");
        },
    });

    // Toggle active status mutation
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ codeId, isActive }: { codeId: string; isActive: boolean }) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/organizer/promo-codes", {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ codeId, isActive }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to update promo code");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Promo code updated successfully");
            queryClient.invalidateQueries({ queryKey: ["organizer", "promoCodes"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update promo code");
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (codeId: string) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(`/api/organizer/promo-codes?codeId=${codeId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to delete promo code");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Promo code deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["organizer", "promoCodes"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete promo code");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const codeData: any = {
            code: formData.code,
            description: formData.description,
            discountType: formData.discountType,
            discountValue: parseInt(formData.discountValue),
            validFrom: formData.validFrom,
            validUntil: formData.validUntil,
        };

        if (formData.usageLimit) codeData.usageLimit = parseInt(formData.usageLimit);
        if (formData.eventId) codeData.eventId = formData.eventId;
        if (formData.minPurchaseAmount) codeData.minPurchaseAmount = parseInt(formData.minPurchaseAmount);
        if (formData.maxDiscountAmount) codeData.maxDiscountAmount = parseInt(formData.maxDiscountAmount);

        createMutation.mutate(codeData);
    };

    const formatPrice = (cents: number) => {
        if (cents === 0) return "Free";
        return `₱${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
                    </div>
                    <div className="h-10 bg-muted rounded w-40 animate-pulse"></div>
                </div>

                {/* Promo Codes List Skeleton */}
                <div className="border rounded-lg bg-card overflow-hidden animate-pulse">
                    <div className="p-6 border-b">
                        <div className="h-6 bg-muted rounded w-48"></div>
                    </div>
                    <div className="divide-y">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 bg-muted rounded w-32"></div>
                                            <div className="h-6 bg-muted rounded w-20"></div>
                                        </div>
                                        <div className="h-4 bg-muted rounded w-full"></div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {[...Array(5)].map((_, j) => (
                                                <div key={j}>
                                                    <div className="h-3 bg-muted rounded w-24 mb-2"></div>
                                                    <div className="h-4 bg-muted rounded w-32"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="ml-4 flex gap-2">
                                        <div className="h-9 bg-muted rounded w-28"></div>
                                        <div className="h-9 bg-muted rounded w-9"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Promo Codes</h1>
                    <p className="text-muted-foreground mt-2">
                        Create and manage discount codes for your events
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Promo Code
                </Button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="p-6 border rounded-lg bg-card">
                    <h2 className="text-xl font-semibold mb-4">Create New Promo Code</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormInput
                                label="Code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                required
                                placeholder="SUMMER2024"
                            />
                            <FormSelect
                                label="Discount Type"
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as "percentage" | "fixed" })}
                                options={[
                                    { value: "percentage", label: "Percentage" },
                                    { value: "fixed", label: "Fixed Amount" },
                                ]}
                                required
                            />
                        </div>
                        <FormInput
                            label="Discount Value"
                            type="number"
                            value={formData.discountValue}
                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                            required
                            placeholder={formData.discountType === "percentage" ? "10 (for 10%)" : "500 (in cents)"}
                            helperText={formData.discountType === "percentage" ? "Enter percentage (0-100)" : "Enter amount in cents"}
                        />
                        <FormInput
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description"
                        />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormInput
                                label="Valid From"
                                type="datetime-local"
                                value={formData.validFrom}
                                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                required
                            />
                            <FormInput
                                label="Valid Until"
                                type="datetime-local"
                                value={formData.validUntil}
                                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormSelect
                                label="Event (Optional)"
                                value={formData.eventId}
                                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                                options={[
                                    { value: "", label: "All Events" },
                                    ...events.map((event: any) => ({
                                        value: event.id,
                                        label: event.title,
                                    })),
                                ]}
                            />
                            <FormInput
                                label="Usage Limit (Optional)"
                                type="number"
                                value={formData.usageLimit}
                                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                placeholder="Unlimited if empty"
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormInput
                                label="Min Purchase Amount (Optional)"
                                type="number"
                                value={formData.minPurchaseAmount}
                                onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                                placeholder="In cents"
                            />
                            <FormInput
                                label="Max Discount Amount (Optional)"
                                type="number"
                                value={formData.maxDiscountAmount}
                                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                                placeholder="In cents (for percentage)"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Creating..." : "Create Promo Code"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setFormData({
                                        code: "",
                                        description: "",
                                        discountType: "percentage",
                                        discountValue: "",
                                        usageLimit: "",
                                        validFrom: "",
                                        validUntil: "",
                                        eventId: "",
                                        minPurchaseAmount: "",
                                        maxDiscountAmount: "",
                                    });
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Promo Codes List */}
            <div className="border rounded-lg bg-card overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        <h2 className="text-xl font-semibold">
                            Promo Codes ({promoCodes.length})
                        </h2>
                    </div>
                </div>

                {promoCodes.length === 0 ? (
                    <div className="p-12 text-center">
                        <Tag className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                        <p className="text-muted-foreground mb-4">No promo codes yet</p>
                        <Button onClick={() => setShowAddForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Promo Code
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y">
                        {promoCodes.map((code: any) => {
                            const isExpired = new Date(code.validUntil) < new Date();
                            const isUsedUp = code.usageLimit && code.usedCount >= code.usageLimit;
                            return (
                                <div
                                    key={code.id}
                                    className="p-6 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl font-bold text-primary">{code.code}</span>
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                        code.isActive && !isExpired && !isUsedUp
                                                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                                                            : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                                    }`}
                                                >
                                                    {code.isActive && !isExpired && !isUsedUp ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                            {code.description && (
                                                <p className="text-sm text-muted-foreground mb-2">{code.description}</p>
                                            )}
                                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Discount</p>
                                                    <p className="font-semibold">
                                                        {code.discountType === "percentage"
                                                            ? `${code.discountValue}%`
                                                            : formatPrice(code.discountValue)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Usage</p>
                                                    <p className="font-semibold">
                                                        {code.usedCount} / {code.usageLimit || "∞"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Valid From</p>
                                                    <p className="font-semibold">{formatDateToReadable(code.validFrom)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Valid Until</p>
                                                    <p className="font-semibold">{formatDateToReadable(code.validUntil)}</p>
                                                </div>
                                                {code.event && (
                                                    <div>
                                                        <p className="text-muted-foreground">Event</p>
                                                        <p className="font-semibold">{code.event.title}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    toggleActiveMutation.mutate({
                                                        codeId: code.id,
                                                        isActive: !code.isActive,
                                                    })
                                                }
                                                disabled={toggleActiveMutation.isPending}
                                            >
                                                {code.isActive ? (
                                                    <>
                                                        <X className="w-4 h-4 mr-1" />
                                                        Deactivate
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Activate
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (confirm(`Delete promo code ${code.code}?`)) {
                                                        deleteMutation.mutate(code.id);
                                                    }
                                                }}
                                                disabled={deleteMutation.isPending}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
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

