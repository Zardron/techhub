"use client";

import Link from "next/link";
import { useState } from "react";
import { useDashboardStatistics } from "@/lib/hooks/api/admin.queries";
import { Users, Calendar, Ticket, Building2, TrendingUp } from "lucide-react";
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const COLORS = {
    primary: "#8884d8",
    secondary: "#82ca9d",
    tertiary: "#ffc658",
    accent: "#ff7300",
};

const ROLE_COLORS = {
    admin: "#8884d8",
    user: "#82ca9d",
    organizer: "#ffc658",
};

const MODE_COLORS = {
    online: "#8884d8",
    offline: "#82ca9d",
    hybrid: "#ff7300",
};

type ChartType = "area" | "line" | "bar";

export default function AdminDashboardPage() {
    const { data: statisticsData, isLoading, error } = useDashboardStatistics();
    const [growthChartType, setGrowthChartType] = useState<ChartType>("area");
    const [eventsChartType, setEventsChartType] = useState<ChartType>("line");

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Welcome to the admin dashboard. Manage your platform from here.
                    </p>
                </div>
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading statistics...</p>
                </div>
            </div>
        );
    }

    if (error || !statisticsData) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Welcome to the admin dashboard. Manage your platform from here.
                    </p>
                </div>
                <div className="flex items-center justify-center h-64">
                    <p className="text-destructive">Failed to load statistics</p>
                </div>
            </div>
        );
    }

    const stats = statisticsData;
    const totals = stats.totals || { users: 0, events: 0, bookings: 0, organizers: 0 };

    // Prepare role distribution data for pie chart
    const roleData = [
        { name: "Users", value: stats.roleDistribution?.user || 0, color: ROLE_COLORS.user },
        { name: "Admins", value: stats.roleDistribution?.admin || 0, color: ROLE_COLORS.admin },
        { name: "Organizers", value: stats.roleDistribution?.organizer || 0, color: ROLE_COLORS.organizer },
    ].filter((item) => item.value > 0);

    // Prepare mode distribution data for pie chart
    const modeData = [
        { name: "Online", value: stats.modeDistribution?.online || 0, color: MODE_COLORS.online },
        { name: "Offline", value: stats.modeDistribution?.offline || 0, color: MODE_COLORS.offline },
        { name: "Hybrid", value: stats.modeDistribution?.hybrid || 0, color: MODE_COLORS.hybrid },
    ].filter((item) => item.value > 0);

    // Prepare combined chart data for events, bookings, and users over time
    interface TimeDataPoint {
        month: string;
        events: number;
        bookings: number;
        users: number;
    }

    const combinedTimeData: TimeDataPoint[] = [];
    const allMonths = new Set([
        ...(stats.eventsOverTime || []).map((item) => item.month),
        ...(stats.bookingsOverTime || []).map((item) => item.month),
        ...(stats.usersOverTime || []).map((item) => item.month),
    ]);

    Array.from(allMonths)
        .sort()
        .forEach((month) => {
            const eventCount = stats.eventsOverTime?.find((item) => item.month === month)?.count || 0;
            const bookingCount = stats.bookingsOverTime?.find((item) => item.month === month)?.count || 0;
            const userCount = stats.usersOverTime?.find((item) => item.month === month)?.count || 0;
            combinedTimeData.push({
                month: month.split("-")[1] + "/" + month.split("-")[0].slice(2), // Format as MM/YY
                events: eventCount,
                bookings: bookingCount,
                users: userCount,
            });
        });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Welcome to the admin dashboard. Manage your platform from here.
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Users"
                    value={totals.users}
                    icon={<Users className="h-5 w-5" />}
                    href="/admin-dashboard/all-users"
                    trend={stats.usersOverTime?.slice(-2)?.[1]?.count || 0}
                    previousTrend={stats.usersOverTime?.slice(-2)?.[0]?.count || 0}
                />
                <StatCard
                    title="Total Events"
                    value={totals.events}
                    icon={<Calendar className="h-5 w-5" />}
                    href="/admin-dashboard/all-events"
                    trend={stats.eventsOverTime?.slice(-2)?.[1]?.count || 0}
                    previousTrend={stats.eventsOverTime?.slice(-2)?.[0]?.count || 0}
                />
                <StatCard
                    title="Total Bookings"
                    value={totals.bookings}
                    icon={<Ticket className="h-5 w-5" />}
                    href="/admin-dashboard/all-events"
                    trend={stats.bookingsOverTime?.slice(-2)?.[1]?.count || 0}
                    previousTrend={stats.bookingsOverTime?.slice(-2)?.[0]?.count || 0}
                />
                <StatCard
                    title="Organizers"
                    value={totals.organizers}
                    icon={<Building2 className="h-5 w-5" />}
                    href="/admin-dashboard/all-organizers"
                />
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Growth Over Time Chart */}
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Growth Over Time (Last 6 Months)</h3>
                        <select
                            value={growthChartType}
                            onChange={(e) => setGrowthChartType(e.target.value as ChartType)}
                            className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="area">Area Chart</option>
                            <option value="line">Line Chart</option>
                            <option value="bar">Bar Chart</option>
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        {growthChartType === "area" ? (
                            <AreaChart data={combinedTimeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="events"
                                    stackId="1"
                                    stroke={COLORS.primary}
                                    fill={COLORS.primary}
                                    name="Events"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="bookings"
                                    stackId="1"
                                    stroke={COLORS.secondary}
                                    fill={COLORS.secondary}
                                    name="Bookings"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    stackId="1"
                                    stroke={COLORS.tertiary}
                                    fill={COLORS.tertiary}
                                    name="Users"
                                />
                            </AreaChart>
                        ) : growthChartType === "line" ? (
                            <LineChart data={combinedTimeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="events"
                                    stroke={COLORS.primary}
                                    strokeWidth={2}
                                    name="Events"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="bookings"
                                    stroke={COLORS.secondary}
                                    strokeWidth={2}
                                    name="Bookings"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="users"
                                    stroke={COLORS.tertiary}
                                    strokeWidth={2}
                                    name="Users"
                                />
                            </LineChart>
                        ) : (
                            <BarChart data={combinedTimeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="events" fill={COLORS.primary} name="Events" />
                                <Bar dataKey="bookings" fill={COLORS.secondary} name="Bookings" />
                                <Bar dataKey="users" fill={COLORS.tertiary} name="Users" />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>

                {/* User Role Distribution */}
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold mb-4">User Role Distribution</h3>
                    {roleData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={roleData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {roleData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No data available
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Events Over Time */}
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Events Created Over Time</h3>
                        <select
                            value={eventsChartType}
                            onChange={(e) => setEventsChartType(e.target.value as ChartType)}
                            className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="line">Line Chart</option>
                            <option value="area">Area Chart</option>
                            <option value="bar">Bar Chart</option>
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        {eventsChartType === "line" ? (
                            <LineChart data={combinedTimeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="events"
                                    stroke={COLORS.primary}
                                    strokeWidth={2}
                                    name="Events"
                                />
                            </LineChart>
                        ) : eventsChartType === "area" ? (
                            <AreaChart data={combinedTimeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="events"
                                    stroke={COLORS.primary}
                                    fill={COLORS.primary}
                                    name="Events"
                                />
                            </AreaChart>
                        ) : (
                            <BarChart data={combinedTimeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="events" fill={COLORS.primary} name="Events" />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>

                {/* Event Mode Distribution */}
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold mb-4">Event Mode Distribution</h3>
                    {modeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={modeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {modeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No data available
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DashboardCard
                    title="Users"
                    description="Manage platform users"
                    href="/admin-dashboard/all-users"
                    icon={<Users className="h-6 w-6" />}
                />
                <DashboardCard
                    title="Organizers"
                    description="Manage event organizers"
                    href="/admin-dashboard/all-organizers"
                    icon={<Building2 className="h-6 w-6" />}
                />
                <DashboardCard
                    title="Events"
                    description="Manage events"
                    href="/admin-dashboard/all-events"
                    icon={<Calendar className="h-6 w-6" />}
                />
            </div>
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    href?: string;
    trend?: number;
    previousTrend?: number;
}

function StatCard({ title, value, icon, href, trend, previousTrend }: StatCardProps) {
    const trendPercentage =
        trend !== undefined && previousTrend !== undefined && previousTrend > 0
            ? ((trend - previousTrend) / previousTrend) * 100
            : null;

    const cardContent = (
        <div className="p-6 border rounded-lg hover:bg-accent transition-colors">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className="text-muted-foreground">{icon}</div>
            </div>
            <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold">{value.toLocaleString()}</p>
                {trendPercentage !== null && (
                    <div className="flex items-center gap-1 text-sm">
                        <TrendingUp
                            className={`h-4 w-4 ${trendPercentage >= 0 ? "text-green-500" : "text-red-500"}`}
                        />
                        <span className={trendPercentage >= 0 ? "text-green-500" : "text-red-500"}>
                            {trendPercentage >= 0 ? "+" : ""}
                            {trendPercentage.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{cardContent}</Link>;
    }

    return cardContent;
}

function DashboardCard({
    title,
    description,
    href,
    icon,
}: {
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className="block p-6 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
        >
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <h3 className="text-xl font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
        </Link>
    );
}
