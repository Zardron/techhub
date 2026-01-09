"use client";

import { useState } from "react";
import { Calendar, Users, DollarSign, TrendingUp, Ticket, Clock } from "lucide-react";
import { useOrganizerStats } from "@/lib/hooks/api/organizer.queries";
import Link from "next/link";

export default function OrganizerDashboardPage() {
    const { data: stats, isLoading } = useOrganizerStats();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Loading statistics...</p>
                </div>
            </div>
        );
    }

    const statsData = stats || {
        totalEvents: 0,
        upcomingEvents: 0,
        totalBookings: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        recentEvents: [],
    };

    const statCards = [
        {
            title: "Total Events",
            value: statsData.totalEvents,
            icon: Calendar,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
        },
        {
            title: "Upcoming Events",
            value: statsData.upcomingEvents,
            icon: Clock,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
        },
        {
            title: "Total Bookings",
            value: statsData.totalBookings,
            icon: Ticket,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
        },
        {
            title: "Total Revenue",
            value: `$${(statsData.totalRevenue / 100).toFixed(2)}`,
            icon: DollarSign,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Welcome back! Here's an overview of your events and bookings.
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.title}
                            className="p-6 border rounded-lg bg-card shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </h3>
                                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                    <Icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold">{stat.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link
                    href="/organizer-dashboard/events/create"
                    className="p-6 border rounded-lg bg-card hover:bg-accent transition-colors"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-semibold">Create Event</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Create a new event and start accepting bookings
                    </p>
                </Link>

                <Link
                    href="/organizer-dashboard/events"
                    className="p-6 border rounded-lg bg-card hover:bg-accent transition-colors"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-semibold">Manage Events</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        View and manage all your events
                    </p>
                </Link>

                <Link
                    href="/organizer-dashboard/analytics"
                    className="p-6 border rounded-lg bg-card hover:bg-accent transition-colors"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-semibold">View Analytics</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Track your event performance and revenue
                    </p>
                </Link>
            </div>

            {/* Recent Events */}
            {statsData.recentEvents && statsData.recentEvents.length > 0 && (
                <div className="p-6 border rounded-lg bg-card">
                    <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
                    <div className="space-y-4">
                        {statsData.recentEvents.map((event: any) => (
                            <Link
                                key={event.id}
                                href={`/organizer-dashboard/events/${event.id}`}
                                className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">{event.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {event.date} • {event.bookings || 0} bookings
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        event.status === 'published' 
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-gray-500/10 text-gray-500'
                                    }`}>
                                        {event.status}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

