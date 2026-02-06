"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AILabPageRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin?workspace=publishing&tab=article-studio");
    }, [router]);

    return null;
}
