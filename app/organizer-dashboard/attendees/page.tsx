"use client";

import { useState } from "react";
import { useOrganizerEvents } from "@/lib/hooks/api/organizer.queries";
import { useOrganizerAttendees } from "@/lib/hooks/api/organizer.queries";
import { FormSelect } from "@/components/ui/form-select";
import { formatDateToReadable } from "@/lib/formatters";
import { Users, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AttendeesPage() {
    const { data: eventsData } = useOrganizerEvents();
    const events = eventsData?.data?.events || [];
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    
    const { data: attendeesData, isLoading } = useOrganizerAttendees(selectedEventId);
    const attendees = attendeesData?.data?.attendees || [];

    const handleExport = async () => {
        if (!attendees.length) {
            toast.error("No attendees to export");
            return;
        }

        try {
            const { useAuthStore } = await import("@/lib/store/auth.store");
            const { token } = useAuthStore.getState();
            
            if (!token) {
                toast.error("Not authenticated");
                return;
            }

            const url = selectedEventId 
                ? `/api/organizer/attendees/export?eventId=${selectedEventId}`
                : `/api/organizer/attendees/export`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error("Failed to export attendees");
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `attendees-${selectedEventId || 'all'}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            
            toast.success("Attendees exported successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to export attendees");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Attendees</h1>
                <p className="text-muted-foreground mt-2">Manage and view event attendees</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                    <FormSelect
                        label="Select Event"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        options={[
                            { value: "", label: "All Events" },
                            ...events.map((e) => ({
                                value: e.id,
                                label: e.title,
                            })),
                        ]}
                    />
                </div>
                {selectedEventId && attendees.length > 0 && (
                    <Button onClick={handleExport} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                )}
            </div>

            {!selectedEventId ? (
                <div className="text-center py-12 border rounded-lg">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select an event to view attendees</p>
                </div>
            ) : isLoading ? (
                <div className="space-y-4">
                    <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
                    <div className="border rounded-lg overflow-hidden animate-pulse">
                        <div className="h-12 bg-muted/50"></div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted/30 border-t"></div>
                        ))}
                    </div>
                </div>
            ) : attendees.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No attendees for this event yet</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Email</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Ticket</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Booked At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {attendees.map((attendee: any) => (
                                <tr key={attendee.id}>
                                    <td className="px-6 py-4">{attendee.name || "N/A"}</td>
                                    <td className="px-6 py-4">{attendee.email}</td>
                                    <td className="px-6 py-4 font-mono text-sm">{attendee.ticketNumber || "N/A"}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                attendee.ticketStatus === "used"
                                                    ? "bg-green-500/10 text-green-500"
                                                    : attendee.ticketStatus === "cancelled"
                                                    ? "bg-red-500/10 text-red-500"
                                                    : "bg-blue-500/10 text-blue-500"
                                            }`}
                                        >
                                            {attendee.ticketStatus || "active"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {new Date(attendee.bookedAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

