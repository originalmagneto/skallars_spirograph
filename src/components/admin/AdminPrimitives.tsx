"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminPanelHeaderProps = {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
};

export function AdminPanelHeader({ title, description, actions, className }: AdminPanelHeaderProps) {
    return (
        <div
            className={cn(
                "rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-[#f7f3ff] px-5 py-4 shadow-[0_18px_40px_-34px_rgba(33,0,89,0.45)] lg:px-6",
                className,
            )}
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5d00ff]/70">
                        Admin Workspace
                    </div>
                    <h2 className="mt-1 text-xl font-semibold leading-tight text-balance text-[#210059]">{title}</h2>
                    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
            </div>
        </div>
    );
}

type AdminSectionCardProps = {
    children: ReactNode;
    className?: string;
};

export function AdminSectionCard({ children, className }: AdminSectionCardProps) {
    return (
        <section
            className={cn(
                "rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.22)] backdrop-blur-sm lg:p-5",
                className,
            )}
        >
            {children}
        </section>
    );
}

type AdminActionBarProps = {
    children: ReactNode;
    className?: string;
};

export function AdminActionBar({ children, className }: AdminActionBarProps) {
    return (
        <div className={cn("rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3", className)}>
            <div className="flex flex-wrap items-center gap-2">{children}</div>
        </div>
    );
}

export type BentoSize = "sm" | "md" | "lg" | "full";

export const BENTO_SIZE_CLASS: Record<BentoSize, string> = {
    sm: "xl:col-span-4",
    md: "xl:col-span-6",
    lg: "xl:col-span-8",
    full: "xl:col-span-12",
};

export function useBentoLayout<T extends string>(
    storageKey: string,
    defaults: Record<T, BentoSize>
) {
    const [layout, setLayout] = useState<Record<T, BentoSize>>(defaults);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<Record<T, BentoSize>>;
            setLayout((prev) => ({ ...prev, ...parsed }));
        } catch {
            // ignore invalid persisted layout
        }
    }, [storageKey]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(layout));
        } catch {
            // ignore storage failures
        }
    }, [storageKey, layout]);

    const updateLayoutSize = (key: T, size: BentoSize) => {
        setLayout((prev) => ({ ...prev, [key]: size }));
    };

    return { layout, updateLayoutSize };
}
