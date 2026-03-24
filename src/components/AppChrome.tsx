"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";

export default function AppChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isDashboardSurface = pathname?.startsWith("/admin") || pathname?.startsWith("/auth");

    return (
        <>
            {!isDashboardSurface && <SiteHeader />}
            <div className={isDashboardSurface ? "min-h-screen" : "pt-20"}>{children}</div>
        </>
    );
}
