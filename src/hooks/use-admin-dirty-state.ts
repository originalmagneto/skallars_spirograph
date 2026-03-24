"use client";

import { useEffect, useId, useMemo, useState } from "react";

type DirtyStateDetail = {
    id: string;
    dirty: boolean;
    label?: string;
};

declare global {
    interface WindowEventMap {
        "admin:dirty-state": CustomEvent<DirtyStateDetail>;
    }
}

const getDirtyPrompt = (labels: string[], nextAction: string) => {
    if (labels.length === 0) {
        return `You have unsaved changes. Do you want to ${nextAction}?`;
    }

    const uniqueLabels = Array.from(new Set(labels));
    if (uniqueLabels.length === 1) {
        return `You have unsaved changes in ${uniqueLabels[0]}. Do you want to ${nextAction}?`;
    }

    return `You have unsaved changes in multiple places (${uniqueLabels.join(", ")}). Do you want to ${nextAction}?`;
};

export function useAdminDirtyState(isDirty: boolean, label = "this section") {
    const reactId = useId();
    const dirtyId = useMemo(() => `admin-dirty-${reactId.replace(/:/g, "")}`, [reactId]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        window.dispatchEvent(
            new CustomEvent("admin:dirty-state", {
                detail: { id: dirtyId, dirty: isDirty, label },
            }),
        );

        return () => {
            window.dispatchEvent(
                new CustomEvent("admin:dirty-state", {
                    detail: { id: dirtyId, dirty: false, label },
                }),
            );
        };
    }, [dirtyId, isDirty, label]);

    useEffect(() => {
        if (!isDirty || typeof window === "undefined") return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const confirmDiscardChanges = (nextAction = "leave this page") => {
        if (!isDirty || typeof window === "undefined") return true;
        return window.confirm(getDirtyPrompt([label], nextAction));
    };

    return { confirmDiscardChanges };
}

export function useAdminDirtyRegistry() {
    const [registry, setRegistry] = useState<Record<string, string>>({});

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleDirtyState = (event: WindowEventMap["admin:dirty-state"]) => {
            const { id, dirty, label } = event.detail;
            setRegistry((current) => {
                if (!dirty) {
                    if (!(id in current)) return current;
                    const next = { ...current };
                    delete next[id];
                    return next;
                }

                if (current[id] === label) return current;
                return { ...current, [id]: label || "this section" };
            });
        };

        window.addEventListener("admin:dirty-state", handleDirtyState);
        return () => window.removeEventListener("admin:dirty-state", handleDirtyState);
    }, []);

    const dirtyLabels = Object.values(registry).filter(Boolean);

    return {
        hasDirtyChanges: dirtyLabels.length > 0,
        dirtyLabels,
        confirmDirtyNavigation: (nextAction = "leave this page") => {
            if (dirtyLabels.length === 0 || typeof window === "undefined") return true;
            return window.confirm(getDirtyPrompt(dirtyLabels, nextAction));
        },
    };
}
