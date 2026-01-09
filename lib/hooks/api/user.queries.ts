import { IUser } from "@/database/user.model";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user' | 'organizer';
    organizerName?: string;
}

export interface CreateUserResponse {
    message: string;
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'organizer';
    createdAt: Date;
    updatedAt: Date;
}

export const useGetAllUsers = () => {
    const { token } = useAuthStore();
    const router = useRouter();

    return useQuery<{ message: string; data: IUser[] }>({
        queryKey: ['admin', 'users'],
        queryFn: async () => {
            if (!token) {
                router.push('/sign-in');
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${BASE_URL}/api/admin`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                // Token invalid, clear auth
                useAuthStore.getState().clearAuth();
                router.push('/sign-in');
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            return data;
        },
        enabled: !!token,
    });
};

export const useCreateUser = () => {
    const { token } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation<CreateUserResponse, Error, CreateUserData>({
        mutationFn: async (userData: CreateUserData) => {
            if (!token) {
                router.push('/sign-in');
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${BASE_URL}/api/admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(userData),
            });

            if (response.status === 401) {
                // Token invalid, clear auth
                useAuthStore.getState().clearAuth();
                router.push('/sign-in');
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create user');
            }

            return data;
        },
        onSuccess: () => {
            // Invalidate and refetch users list
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
};

export const useDeleteUser = () => {
    const { token } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (userId: string) => {
            if (!token) {
                router.push('/sign-in');
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${BASE_URL}/api/admin?id=${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                useAuthStore.getState().clearAuth();
                router.push('/sign-in');
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete user');
            }

            return;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
};

export const useBanUser = () => {
    const { token } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation<{ id: string; banned: boolean }, Error, { userId: string; action: 'ban' | 'unban' }>({
        mutationFn: async ({ userId, action }) => {
            if (!token) {
                router.push('/sign-in');
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${BASE_URL}/api/admin`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ userId, action }),
            });

            if (response.status === 401) {
                useAuthStore.getState().clearAuth();
                router.push('/sign-in');
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Failed to ${action} user`);
            }

            return { id: data.id, banned: data.banned };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
};
