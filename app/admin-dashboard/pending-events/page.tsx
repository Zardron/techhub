"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { Button } from "@/components/ui/button";
import { Check, X, Calendar, MapPin, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { formatDateToReadable, formatDateTo12Hour } from "@/lib/formatters";
import Image from "next/image";
import Link from "next/link";

export default function PendingEventsPage() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    // Fetch pending events
    const { data, isLoading, error } = useQuery({
        queryKey: ["admin", "pendingEvents"],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/admin/events?status=pending_approval", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch pending events");
            return response.json();
        },
        enabled: !!token,
    });

    const events = data?.data?.events || [];

    // Approve event mutation
    const approveMutation = useMutation({
        mutationFn: async (eventId: string) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(`/api/admin/events/${eventId}/approve`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to approve event");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Event approved successfully");
            queryClient.invalidateQueries({ queryKey: ["admin", "pendingEvents"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to approve event");
        },
    });

    // Reject event mutation
    const rejectMutation = useMutation({
        mutationFn: async (eventId: string) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(`/api/admin/events/${eventId}/approve?reason=Rejected by admin`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to reject event");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Event rejected");
            queryClient.invalidateQueries({ queryKey: ["admin", "pendingEvents"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to reject event");
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
                </div>

                {/* Event Cards Skeleton */}
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 border rounded-lg bg-card animate-pulse">
                            <div className="flex gap-6">
                                <div className="relative w-48 h-32 rounded-lg bg-muted shrink-0"></div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <div className="h-6 bg-muted rounded w-64"></div>
                                            <div className="h-4 bg-muted rounded w-full"></div>
                                            <div className="h-4 bg-muted rounded w-3/4"></div>
                                        </div>
                                        <div className="h-6 bg-muted rounded w-32"></div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {[...Array(4)].map((_, j) => (
                                            <div key={j} className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-muted rounded"></div>
                                                <div className="h-4 bg-muted rounded w-32"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="h-10 bg-muted rounded w-24"></div>
                                        <div className="h-10 bg-muted rounded w-20"></div>
                                        <div className="h-10 bg-muted rounded w-28"></div>
                                    </div>
                                </div>
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
                <div className="text-red-500">Error loading pending events</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Pending Event Approvals</h1>
                <p className="text-muted-foreground mt-2">
                    Review and approve events submitted by organizers
                </p>
            </div>

            {events.length === 0 ? (
                <div className="p-12 text-center border rounded-lg bg-card">
                    <Check className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground">No pending events for approval</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {events.map((event: any) => (
                        <div
                            key={event.id}
                            className="p-6 border rounded-lg bg-card"
                        >
                            <div className="flex gap-6">
                                <div className="relative w-48 h-32 rounded-lg overflow-hidden shrink-0">
                                    <Image
                                        src={event.image}
                                        alt={event.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                                            <p className="text-muted-foreground line-clamp-2">{event.description}</p>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                            Pending Approval
                                        </span>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>{formatDateToReadable(event.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span>{formatDateTo12Hour(event.time)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                            <span>{event.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">Mode:</span>
                                            <span className="capitalize">{event.mode}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => approveMutation.mutate(event.id)}
                                            disabled={approveMutation.isPending}
                                            className="bg-green-500 hover:bg-green-600"
                                        >
                                            <Check className="w-4 h-4 mr-2" />
                                            {approveMutation.isPending ? "Approving..." : "Approve"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                if (confirm(`Reject event "${event.title}"?`)) {
                                                    rejectMutation.mutate(event.id);
                                                }
                                            }}
                                            disabled={rejectMutation.isPending}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                                        </Button>
                                        <Link href={`/events/${event.slug}`}>
                                            <Button variant="outline">
                                                View Event
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

