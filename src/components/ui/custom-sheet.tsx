import * as React from "react"
import { cn } from "@/lib/utils"
import { Cancel01Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"

interface SheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
    className?: string
}

export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <div
                className={cn(
                    "h-full w-full sm:w-[540px] bg-background shadow-2xl border-l animate-in slide-in-from-right duration-300",
                    className
                )}
                role="dialog"
            >
                {children}
            </div>
            {/* Backdrop click handler */}
            <div className="absolute inset-0 -z-10" onClick={() => onOpenChange(false)} />
        </div>
    )
}

export function SheetHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col space-y-2 text-center sm:text-left px-6 py-4 border-b", className)}>
            {children}
        </div>
    )
}

export function SheetTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <h2 className={cn("text-lg font-semibold text-foreground", className)}>
            {children}
        </h2>
    )
}

export function SheetContent({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("relative flex-1 overflow-y-auto px-6 py-6", className)}>
            {children}
        </div>
    )
}

export function SheetFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t px-6 py-4 bg-muted/10", className)}>
            {children}
        </div>
    )
}
