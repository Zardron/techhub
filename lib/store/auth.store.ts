import { create } from 'zustand';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'organizer';
}

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    setAuth: (token: string, user: User) => void;
    clearAuth: () => void;
    initializeAuth: () => void;
}

// Always start with the same initial state to prevent hydration mismatches
// Auth will be initialized on the client side after mount
export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isAuthenticated: false,
    isInitializing: true, // Start as initializing to prevent hydration mismatch

    setAuth: (token: string, user: User) => {
        // Store in localStorage for persistence
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }
        set({ token, user, isAuthenticated: true, isInitializing: false });
    },

    clearAuth: () => {
        // Clear localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
    },

    initializeAuth: () => {
        if (typeof window === 'undefined') {
            set({ isInitializing: false });
            return;
        }

        set({ isInitializing: true });

        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                set({ token, user, isAuthenticated: true, isInitializing: false });
            } catch (error) {
                // Invalid user data, clear it
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
            }
        } else {
            set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
        }
    },
}));

