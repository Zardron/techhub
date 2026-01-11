import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    readAt?: string;
    createdAt: string;
}

export interface NotificationsResponse {
    message: string;
    notifications: Notification[];
    unreadCount: number;
    // Legacy support for data wrapper (if API changes)
    data?: {
        notifications: Notification[];
        unreadCount: number;
    };
}

export const useNotifications = (unreadOnly: boolean = false) => {
    const { token } = useAuthStore();

    return useQuery<NotificationsResponse>({
        queryKey: ["notifications", unreadOnly],
        queryFn: async () => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const url = unreadOnly
                ? "/api/users/notifications?unreadOnly=true"
                : "/api/users/notifications";

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch notifications");
            }

            return response.json();
        },
        enabled: !!token,
        refetchInterval: 30000, // Refetch every 30 seconds
    });
};

export const useMarkNotificationAsRead = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("/api/users/notifications", {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ notificationIds: [notificationId] }),
            });

            if (!response.ok) {
                throw new Error("Failed to mark notification as read");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["user", "notifications"] });
        },
    });
};

export const useMarkAllNotificationsAsRead = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("/api/users/notifications", {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ markAllAsRead: true }),
            });

            if (!response.ok) {
                throw new Error("Failed to mark all notifications as read");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["user", "notifications"] });
        },
    });
};

export const useDeleteNotification = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch(`/api/users/notifications?notificationId=${notificationId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to delete notification");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["user", "notifications"] });
        },
    });
};

export const useDeleteAllNotifications = () => {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch("/api/users/notifications?deleteAll=true", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to delete all notifications");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["user", "notifications"] });
        },
    });
};

