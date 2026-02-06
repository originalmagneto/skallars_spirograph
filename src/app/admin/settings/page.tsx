"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPageRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin?workspace=publishing&tab=settings");
    }, [router]);

    return null;
}
