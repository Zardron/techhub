"use client";

import { useOrganizerStats } from "@/lib/hooks/api/organizer.queries";
import { useOrganizerEvents } from "@/lib/hooks/api/organizer.queries";
import { Calendar, Users, DollarSign, TrendingUp, Ticket } from "lucide-react";
import {
    LineChart,
    Line,
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

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function AnalyticsPage() {
    const { data: statsData } = useOrganizerStats();
    const { data: eventsData } = useOrganizerEvents();
    
    const stats = statsData?.data || {
        totalEvents: 0,
        upcomingEvents: 0,
        totalBookings: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
    };

    const events = eventsData?.data?.events || [];

    // Prepare chart data
    const eventsByStatus = events.reduce((acc: any, event: any) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
    }, {});

    const statusData = Object.entries(eventsByStatus).map(([name, value]) => ({
        name,
        value,
    }));

    const eventsByMode = events.reduce((acc: any, event: any) => {
        acc[event.mode] = (acc[event.mode] || 0) + 1;
        return acc;
    }, {});

    const modeData = Object.entries(eventsByMode).map(([name, value]) => ({
        name,
        value,
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground mt-2">Track your event performance and revenue</p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-bold">${(stats.totalRevenue / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground mt-1">All time</p>
                </div>

                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Monthly Revenue</h3>
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold">${(stats.monthlyRevenue / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground mt-1">This month</p>
                </div>

                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Bookings</h3>
                        <Ticket className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold">{stats.totalBookings}</p>
                    <p className="text-sm text-muted-foreground mt-1">All events</p>
                </div>

                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Upcoming Events</h3>
                        <Calendar className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
                    <p className="text-sm text-muted-foreground mt-1">Scheduled</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Event Status Distribution */}
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold mb-4">Events by Status</h3>
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

                {/* Event Mode Distribution */}
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold mb-4">Events by Mode</h3>
                    {modeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={modeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {modeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

            {/* Recent Events Performance */}
            {stats.recentEvents && stats.recentEvents.length > 0 && (
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold mb-4">Recent Events Performance</h3>
                    <div className="space-y-4">
                        {stats.recentEvents.map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h4 className="font-semibold">{event.title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {event.date} • {event.bookings} bookings
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        event.status === "published"
                                            ? "bg-green-500/10 text-green-500"
                                            : "bg-gray-500/10 text-gray-500"
                                    }`}
                                >
                                    {event.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

