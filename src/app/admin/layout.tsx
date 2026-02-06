"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiMagicIcon, Logout01Icon, UserMultipleIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAdmin, isEditor, signOut, refreshRoles, healthWarning, dismissHealthWarning } = useAuth();
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [accessMessage, setAccessMessage] = useState("");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth");
        }
    }, [loading, user, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth");
        router.refresh();
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setAccessMessage("Checking permissions...");
        try {
            await refreshRoles();
            setAccessMessage("Permissions refreshed.");
        } catch (error: any) {
            setAccessMessage(error?.message || "Permission refresh failed.");
        } finally {
            setIsRefreshing(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) return null;

    const canManage = isAdmin || isEditor;

    if (!canManage) {
        return (
            <div className="min-h-screen bg-white">
                <header className="border-b bg-white">
                    <div className="w-full max-w-none px-6 lg:px-8 2xl:px-12 py-4 flex items-center justify-between">
                        <Link href="/" className="text-xl font-bold">Skallars Admin</Link>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 mr-2">{user.email}</span>
                            <Button variant="ghost" size="sm" onClick={handleSignOut}>
                                <Logout01Icon size={18} />
                            </Button>
                        </div>
                    </div>
                </header>
                <div className="w-full max-w-none px-6 lg:px-8 2xl:px-12 py-20 text-center space-y-6">
                    <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                        <UserMultipleIcon size={40} className="text-gray-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Permission Required</h2>
                        <p className="text-gray-500">
                            Your account ({user.email}) does not currently have administrative rights to access the dashboard.
                        </p>
                    </div>
                    <div className="max-w-md mx-auto p-6 border rounded-xl bg-white space-y-4 shadow-sm">
                        <p className="text-sm">
                            If you just updated your role in Supabase, refresh permissions.
                        </p>
                        {accessMessage && <p className="text-xs text-gray-500">{accessMessage}</p>}
                        <Button onClick={handleRefresh} disabled={isRefreshing} className="w-full h-11">
                            <AiMagicIcon size={18} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                            {isRefreshing ? "Checking..." : "Refresh Permissions"}
                        </Button>
                    </div>
                    <div className="flex justify-center gap-4 pt-4">
                        <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
                        <Button asChild><Link href="/">Return to Site</Link></Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <header className="border-b bg-white sticky top-0 z-50">
                <div className="w-full max-w-none px-6 lg:px-8 2xl:px-12 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-xl font-bold text-[#210059]">Skallars Admin</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 mr-2">{user.email}</span>
                        <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign Out">
                            <Logout01Icon size={18} />
                        </Button>
                    </div>
                </div>
            </header>
            <main className="w-full max-w-none px-6 lg:px-8 2xl:px-12 py-8">
                {healthWarning && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
                                <p className="text-sm text-amber-900">{healthWarning}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                                    {isRefreshing ? "Checking..." : "Retry Check"}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={dismissHealthWarning}>
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
