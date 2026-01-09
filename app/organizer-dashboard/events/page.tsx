"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrganizerEvents } from "@/lib/hooks/api/organizer.queries";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, Calendar, MapPin, Users, DollarSign } from "lucide-react";
import { formatDateToReadable } from "@/lib/formatters";
import toast from "react-hot-toast";

export default function OrganizerEventsPage() {
    const { data, isLoading, error } = useOrganizerEvents();
    const events = data?.data?.events || [];

    const handleDelete = async (eventId: string, eventTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/organizer/events/${eventId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to delete event");
            }

            toast.success("Event deleted successfully");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete event");
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">My Events</h1>
                    <p className="text-muted-foreground mt-2">Loading events...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">My Events</h1>
                    <p className="text-muted-foreground mt-2">Failed to load events</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">My Events</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage all your events ({events.length} total)
                    </p>
                </div>
                <Link href="/organizer-dashboard/events/create">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Event
                    </Button>
                </Link>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <p className="text-muted-foreground mb-4">You haven't created any events yet</p>
                    <Link href="/organizer-dashboard/events/create">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Event
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="p-6 border rounded-lg hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold">{event.title}</h3>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                event.status === "published"
                                                    ? "bg-green-500/10 text-green-500"
                                                    : event.status === "draft"
                                                    ? "bg-gray-500/10 text-gray-500"
                                                    : "bg-red-500/10 text-red-500"
                                            }`}
                                        >
                                            {event.status}
                                        </span>
                                    </div>

                                    <p className="text-muted-foreground mb-4 line-clamp-2">
                                        {event.description}
                                    </p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>{formatDateToReadable(event.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span>
                                                {event.capacity
                                                    ? `${event.capacity - (event.availableTickets || 0)}/${event.capacity}`
                                                    : "Unlimited"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                                            <span>{event.isFree ? "Free" : `₱${((event.price || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <Link href={`/events/${event.slug}`}>
                                        <Button variant="outline" size="sm">
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Link href={`/organizer-dashboard/events/${event.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(event.id, event.title)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

