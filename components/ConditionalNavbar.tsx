"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Navbar from "./Navbar";

function ConditionalNavbarContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const ticketNumber = searchParams.get("ticketNumber");
    
    const hideNavbar = 
        pathname.startsWith("/admin-dashboard") || 
        pathname.startsWith("/organizer-dashboard") ||
        pathname === "/appeal-ban" ||
        (pathname === "/bookings" && ticketNumber !== null);

    if (hideNavbar) {
        return null;
    }

    return (
        <Navbar />
    );
}

export default function ConditionalNavbar() {
    return (
        <Suspense fallback={null}>
            <ConditionalNavbarContent />
        </Suspense>
    );
}
