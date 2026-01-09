import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";

export interface OrganizerStats {
    totalEvents: number;
    upcomingEvents: number;
    totalBookings: number;
    totalRevenue: number;
    monthlyRevenue: number;
    recentEvents: Array<{
        id: string;
        title: string;
        date: string;
        bookings: number;
        status: string;
    }>;
}

export interface OrganizerStatsResponse {
    success: boolean;
    message: string;
    data: OrganizerStats;
}

export interface OrganizerEvent {
    id: string;
    title: string;
    slug: string;
    description: string;
    image: string;
    date: string;
    time: string;
    location: string;
    mode: string;
    status: string;
    capacity?: number;
    availableTickets?: number;
    isFree: boolean;
    price?: number;
    createdAt: string;
    updatedAt: string;
}

export interface OrganizerEventsResponse {
    success: boolean;
    message: string;
    data: {
        events: OrganizerEvent[];
    };
}

export const useOrganizerStats = () => {
    const { token } = useAuthStore();

    return useQuery<OrganizerStatsResponse>({
        queryKey: ["organizer", "stats"],
        queryFn: async () => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("/api/organizer/stats", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch organizer stats");
            }

            return response.json();
        },
        enabled: !!token,
    });
};

export const useOrganizerEvents = () => {
    const { token } = useAuthStore();

    return useQuery<OrganizerEventsResponse>({
        queryKey: ["organizer", "events"],
        queryFn: async () => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("/api/organizer/events", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch events");
            }

            return response.json();
        },
        enabled: !!token,
    });
};

export const useCreateOrganizerEvent = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("/api/organizer/events", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create event");
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
            queryClient.invalidateQueries({ queryKey: ["organizer", "stats"] });
        },
    });
};

export interface Attendee {
    id: string;
    name?: string;
    email: string;
    ticketNumber?: string;
    ticketStatus?: string;
    bookedAt: string;
}

export interface OrganizerAttendeesResponse {
    success: boolean;
    message: string;
    data: {
        attendees: Attendee[];
    };
}

export const useOrganizerAttendees = (eventId?: string) => {
    const { token } = useAuthStore();

    return useQuery<OrganizerAttendeesResponse>({
        queryKey: ["organizer", "attendees", eventId],
        queryFn: async () => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const url = eventId
                ? `/api/organizer/attendees?eventId=${eventId}`
                : "/api/organizer/attendees";

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch attendees");
            }

            return response.json();
        },
        enabled: !!token,
    });
};
