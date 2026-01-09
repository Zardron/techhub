"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import OrganizerSidebar from "@/components/organizer-dashboard/Sidebar";
import OrganizerNavbar from "@/components/organizer-dashboard/Navbar";

export default function OrganizerDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, user, isInitializing } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isInitializing) {
            if (!isAuthenticated) {
                router.push("/sign-in");
            } else if (user?.role !== "organizer" && user?.role !== "admin") {
                router.push("/");
            }
        }
    }, [isAuthenticated, user, isInitializing, router]);

    if (isInitializing) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-foreground/60">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated || (user?.role !== "organizer" && user?.role !== "admin")) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <OrganizerNavbar />
            <div className="flex">
                <OrganizerSidebar />
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

