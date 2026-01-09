"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";

export default function OrganizerNavbar() {
    const { user } = useAuth();
    const router = useRouter();
    const { clearAuth } = useAuthStore();

    const handleSignOut = () => {
        clearAuth();
        router.push("/");
    };

    return (
        <nav className="bg-card border-b border-border sticky top-0 z-50">
            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/organizer-dashboard" className="text-xl font-bold text-foreground">
                        TechEventX
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        {user?.name}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </nav>
    );
}

