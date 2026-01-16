"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MapSettingsProvider } from "@/contexts/MapSettingsContext";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "sonner"; // Using sonner for toasts as in OMNI web

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <AuthProvider>
                <LanguageProvider>
                    <MapSettingsProvider>
                        {children}
                        <Toaster position="top-center" />
                    </MapSettingsProvider>
                </LanguageProvider>
            </AuthProvider>
        </QueryProvider>
    );
}
