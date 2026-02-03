"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserMultipleIcon, AiMagicIcon, Logout01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAdmin, isEditor, signOut, refreshRoles } = useAuth();
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [accessOverride, setAccessOverride] = useState<boolean | null>(null);
    const [accessCheckMessage, setAccessCheckMessage] = useState<string>('');
    const [diagnostics, setDiagnostics] = useState<string>('');
    const [isDiagnosticsRunning, setIsDiagnosticsRunning] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth");
        router.refresh();
    };

    const checkAccessViaRpc = async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const targetId = userData?.user?.id || user?.id;
            if (!targetId) {
                setAccessCheckMessage('No active user session detected.');
                return;
            }

            const { data: isAdminRpc, error: adminError } = await supabase
                .rpc('is_profile_admin', { _user_id: targetId });

            if (!adminError && isAdminRpc === true) {
                setAccessOverride(true);
                setAccessCheckMessage('Admin access confirmed.');
                return;
            }

            const { data: isEditorRpc, error: editorError } = await supabase
                .rpc('is_profile_editor', { _user_id: targetId });

            if (!editorError && isEditorRpc === true) {
                setAccessOverride(true);
                setAccessCheckMessage('Editor access confirmed.');
                return;
            }
            if (adminError || editorError) {
                const adminMsg = adminError?.message ? `Admin check error: ${adminError.message}` : '';
                const editorMsg = editorError?.message ? `Editor check error: ${editorError.message}` : '';
                setAccessCheckMessage([adminMsg, editorMsg].filter(Boolean).join(' | ') || 'Access check failed. Please re-login.');
            } else {
                setAccessOverride(false);
                setAccessCheckMessage('No admin/editor role detected.');
            }
        } catch {
            // Ignore RPC errors; fallback to context state.
            setAccessCheckMessage('Access check failed. Please re-login.');
        }
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth");
        }
    }, [loading, user, router]);

    useEffect(() => {
        if (!user?.id) return;
        checkAccessViaRpc();
    }, [user?.id]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setAccessCheckMessage('Checking permissions...');
        try {
            await supabase.auth.refreshSession();
        } catch {
            // Ignore refresh failures; continue to role checks.
        }
        await refreshRoles();
        await checkAccessViaRpc();
        setIsRefreshing(false);
    };

    const runDiagnostics = async () => {
        setIsDiagnosticsRunning(true);
        setDiagnostics('');
        try {
            const result: Record<string, any> = {
                timestamp: new Date().toISOString(),
                authContext: {
                    userId: user?.id || null,
                    email: user?.email || null,
                    isAdmin,
                    isEditor,
                },
            };

            const sessionRes = await supabase.auth.getSession();
            result.session = {
                userId: sessionRes.data.session?.user?.id || null,
                email: sessionRes.data.session?.user?.email || null,
                expiresAt: sessionRes.data.session?.expires_at || null,
                error: sessionRes.error?.message || null,
            };

            const userRes = await supabase.auth.getUser();
            result.user = {
                userId: userRes.data.user?.id || null,
                email: userRes.data.user?.email || null,
                error: userRes.error?.message || null,
            };

            const targetId = userRes.data.user?.id || user?.id || null;
            if (targetId) {
                const profileRes = await supabase
                    .from('profiles')
                    .select('id, role')
                    .eq('id', targetId)
                    .maybeSingle();
                result.profile = {
                    data: profileRes.data,
                    error: profileRes.error?.message || null,
                };

                const adminRpc = await supabase.rpc('is_profile_admin', { _user_id: targetId });
                result.is_profile_admin = {
                    data: adminRpc.data,
                    error: adminRpc.error?.message || null,
                };

                const editorRpc = await supabase.rpc('is_profile_editor', { _user_id: targetId });
                result.is_profile_editor = {
                    data: editorRpc.data,
                    error: editorRpc.error?.message || null,
                };

                const rolesRes = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', targetId);
                result.user_roles = {
                    data: rolesRes.data,
                    error: rolesRes.error?.message || null,
                };

                const contentRes = await supabase
                    .from('site_content')
                    .select('key')
                    .limit(1);
                result.site_content_select = {
                    ok: !contentRes.error,
                    error: contentRes.error?.message || null,
                };

                const layoutRes = await supabase
                    .from('page_sections')
                    .select('section_key')
                    .limit(1);
                result.page_sections_select = {
                    ok: !layoutRes.error,
                    error: layoutRes.error?.message || null,
                };
            }

            const output = JSON.stringify(result, null, 2);
            setDiagnostics(output);
            console.info('[admin-diagnostics]', result);

            if (user?.id) {
                await supabase.from('admin_access_logs').insert({
                    user_id: user.id,
                    status: 'diagnostics',
                    details: result
                });
            }
        } catch (error: any) {
            const message = error?.message || 'Unknown diagnostics error';
            setDiagnostics(`Diagnostics failed: ${message}`);
            console.error('[admin-diagnostics] failed', error);
        } finally {
            setIsDiagnosticsRunning(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) return null;

    const canManage = isAdmin || isEditor || accessOverride === true;

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
                        {accessCheckMessage && (
                            <p className="text-xs text-gray-500">
                                {accessCheckMessage}
                            </p>
                        )}
                        <Button onClick={handleRefresh} disabled={isRefreshing} className="w-full h-11">
                            <AiMagicIcon size={18} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Checking...' : 'Refresh Permissions'}
                        </Button>
                        <Button onClick={runDiagnostics} disabled={isDiagnosticsRunning} variant="outline" className="w-full h-11">
                            {isDiagnosticsRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
                        </Button>
                    </div>
                    {diagnostics && (
                        <div className="max-w-2xl mx-auto text-left border rounded-xl bg-white p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">Diagnostics Output</div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(diagnostics);
                                            setAccessCheckMessage('Diagnostics copied to clipboard.');
                                        } catch {
                                            setAccessCheckMessage('Failed to copy diagnostics.');
                                        }
                                    }}
                                >
                                    Copy
                                </Button>
                            </div>
                            <pre className="text-[11px] whitespace-pre-wrap text-muted-foreground">
                                {diagnostics}
                            </pre>
                        </div>
                    )}
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
