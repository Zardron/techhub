"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, X, AlertCircle, TrendingUp, Users, DollarSign } from "lucide-react";
import { formatDateToReadable } from "@/lib/formatters";

const statusColors = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    trialing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    canceled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    past_due: "bg-red-500/10 text-red-500 border-red-500/20",
    incomplete: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    incomplete_expired: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusIcons = {
    active: Check,
    trialing: AlertCircle,
    canceled: X,
    past_due: AlertCircle,
    incomplete: AlertCircle,
    incomplete_expired: X,
};

export default function SubscriptionsPage() {
    const { token } = useAuthStore();
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const { data, isLoading, error } = useQuery({
        queryKey: ["admin", "subscriptions", statusFilter],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            
            const url = statusFilter === "all" 
                ? "/api/admin/subscriptions"
                : `/api/admin/subscriptions?status=${statusFilter}`;
            
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (!response.ok) throw new Error("Failed to fetch subscriptions");
            return response.json();
        },
        enabled: !!token,
    });

    const subscriptions = data?.data?.subscriptions || [];
    const stats = data?.data?.stats || {
        total: 0,
        active: 0,
        trialing: 0,
        canceled: 0,
        pastDue: 0,
    };

    const formatPrice = (cents: number, currency: string = "php") => {
        if (cents === 0) return "Free";
        const symbol = currency.toUpperCase() === "PHP" ? "₱" : "$";
        return `${symbol}${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-foreground/60">Loading subscriptions...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">Error loading subscriptions</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Subscriptions</h1>
                <p className="text-muted-foreground mt-2">
                    Manage all organizer subscriptions and billing
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Active</p>
                        <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-500">{stats.active}</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Trialing</p>
                        <AlertCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-500">{stats.trialing}</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Canceled</p>
                        <X className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-500">{stats.canceled}</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Past Due</p>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-500">{stats.pastDue}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    onClick={() => setStatusFilter("all")}
                    size="sm"
                >
                    All
                </Button>
                <Button
                    variant={statusFilter === "active" ? "default" : "outline"}
                    onClick={() => setStatusFilter("active")}
                    size="sm"
                >
                    Active
                </Button>
                <Button
                    variant={statusFilter === "trialing" ? "default" : "outline"}
                    onClick={() => setStatusFilter("trialing")}
                    size="sm"
                >
                    Trialing
                </Button>
                <Button
                    variant={statusFilter === "canceled" ? "default" : "outline"}
                    onClick={() => setStatusFilter("canceled")}
                    size="sm"
                >
                    Canceled
                </Button>
                <Button
                    variant={statusFilter === "past_due" ? "default" : "outline"}
                    onClick={() => setStatusFilter("past_due")}
                    size="sm"
                >
                    Past Due
                </Button>
            </div>

            {/* Subscriptions Table */}
            <div className="border rounded-lg bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Organizer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Plan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Period
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {subscriptions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No subscriptions found
                                    </td>
                                </tr>
                            ) : (
                                subscriptions.map((subscription: any) => {
                                    const StatusIcon = statusIcons[subscription.status as keyof typeof statusIcons] || AlertCircle;
                                    return (
                                        <tr key={subscription.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <p className="text-sm font-medium">{subscription.user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{subscription.user.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <p className="text-sm font-medium">{subscription.plan.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatPrice(subscription.plan.price, subscription.plan.currency)}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[subscription.status as keyof typeof statusColors] || statusColors.canceled}`}
                                                >
                                                    <StatusIcon className="w-3 h-3" />
                                                    {subscription.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                <div>
                                                    <p>Start: {formatDateToReadable(subscription.currentPeriodStart)}</p>
                                                    <p>End: {formatDateToReadable(subscription.currentPeriodEnd)}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                {formatDateToReadable(subscription.createdAt)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

