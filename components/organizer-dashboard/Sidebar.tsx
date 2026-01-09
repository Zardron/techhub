"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    Home, 
    Calendar, 
    Users, 
    BarChart3, 
    Settings, 
    CreditCard,
    Plus,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    {
        href: "/organizer-dashboard",
        label: "Dashboard",
        icon: Home,
    },
    {
        href: "/organizer-dashboard/events",
        label: "Events",
        icon: Calendar,
    },
    {
        href: "/organizer-dashboard/events/create",
        label: "Create Event",
        icon: Plus,
    },
    {
        href: "/organizer-dashboard/attendees",
        label: "Attendees",
        icon: Users,
    },
    {
        href: "/organizer-dashboard/analytics",
        label: "Analytics",
        icon: BarChart3,
    },
    {
        href: "/organizer-dashboard/billing",
        label: "Billing",
        icon: CreditCard,
    },
    {
        href: "/organizer-dashboard/settings",
        label: "Settings",
        icon: Settings,
    },
];

export default function OrganizerSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-card border-r border-border min-h-screen sticky top-0">
            <div className="p-6">
                <h2 className="text-xl font-bold text-foreground">Organizer Portal</h2>
            </div>
            <nav className="px-4 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || 
                        (item.href !== "/organizer-dashboard" && pathname?.startsWith(item.href));
                    
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

