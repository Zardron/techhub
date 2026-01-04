"use client";

import SideBar from "@/components/admin-dashboard/SideBar";
import Navbar from "@/components/admin-dashboard/Navbar";
import BreadCrumbs from "@/components/admin-dashboard/BreadCrumbs";
import Footer from "@/components/admin-dashboard/Footer";
import { useAuth } from "@/lib/hooks/use-auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated || !user || user.role !== "admin") {
            router.push("/sign-in");
        }
    }, [user, isAuthenticated, router]);

    if (!isAuthenticated || !user || user.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Redirecting...</div>
            </div>
        );
    }

    return (
        <div className="flex">
            <div
                className={`fixed left-0 top-0 h-screen z-40 ${sideBarCollapsed ? "w-0" : "w-64"
                    } transition-all duration-300 overflow-hidden`}
            >
                <SideBar />
            </div>
            <div className={`flex-1 transition-all duration-300 ${sideBarCollapsed ? "ml-0" : "ml-64"}`}>
                <div className={`fixed top-0 right-0 z-30 transition-all duration-300 ${sideBarCollapsed ? "left-0" : "left-64"}`}>
                    <Navbar
                        sideBarCollapsed={sideBarCollapsed}
                        setSideBarCollapsed={setSideBarCollapsed}
                    />
                </div>
                <div className="p-4 pt-20">
                    <BreadCrumbs />
                    <div className="my-4">{children}</div>
                    <Footer />
                </div>
            </div>
        </div>
    );
}

