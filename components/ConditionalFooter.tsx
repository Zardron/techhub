"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Footer from "@/components/Footer";

function ConditionalFooterContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const ticketNumber = searchParams.get("ticketNumber");
    
    const hideFooter = 
        pathname === "/sign-up" || 
        pathname === "/sign-in" || 
        pathname === "/appeal-ban" || 
        pathname.startsWith("/admin-dashboard") || 
        pathname.startsWith("/organizer-dashboard") ||
        (pathname === "/bookings" && ticketNumber !== null);

    if (hideFooter) {
        return null;
    }

    return (
        <div className="container mx-auto px-10 relative z-10">
            <Footer />
        </div>
    );
}

export default function ConditionalFooter() {
    return (
        <Suspense fallback={null}>
            <ConditionalFooterContent />
        </Suspense>
    );
}
