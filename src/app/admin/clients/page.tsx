"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientsPageRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin?workspace=site&tab=clients");
    }, [router]);

    return null;
}
