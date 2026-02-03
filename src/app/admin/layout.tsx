"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserMultipleIcon, AiMagicIcon, Logout01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAdmin, isEditor, signOut, refreshRoles } = useAuth();
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth");
        router.refresh();
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth");
        }
    }, [loading, user, router]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshRoles();
        setIsRefreshing(false);
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
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <Link href="/" className="text-xl font-bold">Skallars Admin</Link>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 mr-2">{user.email}</span>
                            <Button variant="ghost" size="sm" onClick={handleSignOut}>
                                <Logout01Icon size={18} />
                            </Button>
                        </div>
                    </div>
                </header>
                <div className="container mx-auto px-4 py-20 text-center space-y-6">
                    <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                        <UserMultipleIcon size={40} className="text-gray-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Permission Required</h2>
                        <p className="text-gray-500">
                            Your account ({user.email}) does not have administrative rights to access the dashboard.
                        </p>
                    </div>
                    <div className="max-w-md mx-auto p-6 border rounded-xl bg-white space-y-4 shadow-sm">
                        <p className="text-sm">
                            If you just granted yourself permissions in Supabase, click the button below to refresh your status.
                        </p>
                        <Button onClick={handleRefresh} disabled={isRefreshing} className="w-full h-11">
                            <AiMagicIcon size={18} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Checking...' : 'Refresh Permissions'}
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
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
