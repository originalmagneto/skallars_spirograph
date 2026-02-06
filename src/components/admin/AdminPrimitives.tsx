import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminPanelHeaderProps = {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
};

export function AdminPanelHeader({ title, description, actions, className }: AdminPanelHeaderProps) {
    return (
        <div className={cn("rounded-2xl border bg-white px-5 py-4 lg:px-6", className)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h2 className="text-xl font-semibold leading-tight">{title}</h2>
                    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
        <section className={cn("rounded-2xl border bg-white p-4 lg:p-5", className)}>
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
        <div className={cn("rounded-xl border bg-muted/20 p-3", className)}>
            <div className="flex flex-wrap items-center gap-2">{children}</div>
        </div>
    );
}
