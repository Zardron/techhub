"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Users, Calendar, Download } from "lucide-react";
import toast from "react-hot-toast";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

export default function FinancialsPage() {
    const { token } = useAuthStore();
    const [timeRange, setTimeRange] = useState<string>("month");

    const handleExport = async () => {
        try {
            if (!token) {
                toast.error("Not authenticated");
                return;
            }

            const response = await fetch(`/api/admin/financials/export?timeRange=${timeRange}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error("Failed to export financial data");
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `financial-report-${timeRange}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            
            toast.success("Financial report exported successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to export financial data");
        }
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ["admin", "financials", timeRange],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(`/api/admin/financials?timeRange=${timeRange}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch financial data");
            return response.json();
        },
        enabled: !!token,
    });

    const summary = data?.data?.summary || {
        totalPlatformRevenue: 0,
        totalOrganizerRevenue: 0,
        totalTransactionAmount: 0,
        totalRefunded: 0,
        subscriptionRevenue: 0,
        totalRevenue: 0,
        netRevenue: 0,
        transactionCount: 0,
    };

    const monthlyBreakdown = data?.data?.monthlyBreakdown || [];
    const topEvents = data?.data?.topEvents || [];

    const formatPrice = (cents: number) => {
        return `₱${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
                    </div>
                    <div className="flex gap-2">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="h-9 bg-muted rounded w-20 animate-pulse"></div>
                        ))}
                        <div className="h-9 bg-muted rounded w-24 animate-pulse"></div>
                    </div>
                </div>

                {/* Summary Cards Skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="p-6 border rounded-lg bg-card animate-pulse">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-4 bg-muted rounded w-32"></div>
                                <div className="w-4 h-4 bg-muted rounded"></div>
                            </div>
                            <div className="h-8 bg-muted rounded w-24 mb-1"></div>
                            <div className="h-3 bg-muted rounded w-40"></div>
                        </div>
                    ))}
                </div>

                {/* Additional Stats Skeleton */}
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 border rounded-lg bg-card animate-pulse">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-4 bg-muted rounded w-32"></div>
                                <div className="w-4 h-4 bg-muted rounded"></div>
                            </div>
                            <div className="h-8 bg-muted rounded w-24 mb-1"></div>
                            <div className="h-3 bg-muted rounded w-40"></div>
                        </div>
                    ))}
                </div>

                {/* Chart Skeleton */}
                <div className="p-6 border rounded-lg bg-card animate-pulse">
                    <div className="h-6 bg-muted rounded w-56 mb-4"></div>
                    <div className="h-[300px] bg-muted/10 rounded border border-muted/20"></div>
                </div>

                {/* Table Skeleton */}
                <div className="p-6 border rounded-lg bg-card animate-pulse">
                    <div className="h-6 bg-muted rounded w-48 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-12 bg-muted/50 rounded"></div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted/30 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-500">Error loading financial data</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Financial Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Platform revenue, commissions, and financial overview
                    </p>
                </div>
                <div className="flex gap-2">
                    {['today', 'week', 'month', '3months', '6months', 'year', 'all'].map((range) => (
                        <Button
                            key={range}
                            variant={timeRange === range ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTimeRange(range)}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Platform Revenue</p>
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-green-500">{formatPrice(summary.totalPlatformRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">From transaction fees</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Subscription Revenue</p>
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-blue-500">{formatPrice(summary.subscriptionRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">From subscriptions</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{formatPrice(summary.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Platform + Subscriptions</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Net Revenue</p>
                        <TrendingDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{formatPrice(summary.netRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">After refunds</p>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Organizer Revenue</p>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{formatPrice(summary.totalOrganizerRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Paid to organizers</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Total Transactions</p>
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{summary.transactionCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Completed transactions</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Total Refunded</p>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-500">{formatPrice(summary.totalRefunded)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Refunded amount</p>
                </div>
            </div>

            {/* Monthly Breakdown Chart */}
            {monthlyBreakdown.length > 0 && (
                <div className="p-6 border rounded-lg bg-card">
                    <h2 className="text-xl font-semibold mb-4">Monthly Revenue Breakdown</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => formatPrice(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="platformRevenue" stroke="#8884d8" name="Platform Revenue" />
                            <Line type="monotone" dataKey="organizerRevenue" stroke="#82ca9d" name="Organizer Revenue" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Top Events by Revenue */}
            {topEvents.length > 0 && (
                <div className="p-6 border rounded-lg bg-card">
                    <h2 className="text-xl font-semibold mb-4">Top Events by Revenue</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Event</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Revenue</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Transactions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {topEvents.map((event: any) => (
                                    <tr key={event.eventId} className="hover:bg-muted/50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium">{event.eventTitle}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold">{formatPrice(event.revenue)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p>{event.transactions}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

