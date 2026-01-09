import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';

/**
 * Hook to initialize auth state from localStorage on mount
 */
export const useAuth = () => {
    const { initializeAuth, token, user, isAuthenticated, isInitializing, setAuth, clearAuth } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Mark as mounted on client side
        setMounted(true);
        
        // Initialize auth from localStorage on client side only
        if (typeof window !== 'undefined') {
            initializeAuth();
        }
    }, [initializeAuth]);

    // Return initializing state until mounted to prevent hydration mismatch
    if (!mounted) {
        return {
            token: null,
            user: null,
            isAuthenticated: false,
            isInitializing: true,
            setAuth,
            clearAuth,
        };
    }

    return {
        token,
        user,
        isAuthenticated,
        isInitializing,
        setAuth,
        clearAuth,
    };
};

