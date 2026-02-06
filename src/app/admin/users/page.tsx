"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsersPageRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin?workspace=publishing&tab=users");
    }, [router]);

    return null;
}
