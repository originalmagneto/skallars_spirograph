"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
    const [allowLimitedAccess, setAllowLimitedAccess] = useState(false);
    const autoDiagnosticsRanRef = useRef(false);
    const diagnosticsTimeoutRef = useRef<number | null>(null);
    const refreshTimeoutRef = useRef<number | null>(null);
    const accessRetryRef = useRef(0);
    const [accessChecking, setAccessChecking] = useState(false);
    const ROLE_CACHE_KEY = 'skallars_role_cache_v1';
    const ROLE_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

    const readRoleCache = (userId: string) => {
        try {
            const raw = window.localStorage.getItem(ROLE_CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as { userId: string; role: string; ts: number };
            if (!parsed || parsed.userId !== userId) return null;
            if (Date.now() - parsed.ts > ROLE_CACHE_TTL_MS) return null;
            return parsed.role as string;
        } catch {
            return null;
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth");
        router.refresh();
    };

    const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number, label: string) => {
        const wrapped = Promise.resolve(promise);
        return await new Promise<T>((resolve, reject) => {
            const timer = window.setTimeout(() => {
                reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
            }, ms);
            wrapped
                .then((value) => {
                    window.clearTimeout(timer);
                    resolve(value);
                })
                .catch((err) => {
                    window.clearTimeout(timer);
                    reject(err);
                });
        });
    };

    const checkAccessViaRpc = async () => {
        setAccessChecking(true);
        try {
            const targetId = user?.id;
            if (!targetId) {
                setAccessCheckMessage('No active user session detected.');
                return;
            }

            // Server-first role check is the primary source of truth.
            try {
                const sessionRes = await withTimeout(supabase.auth.getSession(), 8000, 'Session check');
                const token = sessionRes.data.session?.access_token;
                if (token) {
                    const fallbackRes = await withTimeout(
                        fetch('/api/admin/role', {
                            headers: { Authorization: `Bearer ${token}` },
                        }),
                        8000,
                        'Server role check'
                    );
                    if (fallbackRes.ok) {
                        const fallbackData = await fallbackRes.json();
                        const role = fallbackData?.role;
                        if (role === 'admin' || role === 'editor') {
                            setAccessOverride(true);
                            setAccessCheckMessage(`Server role confirmed (${role}).`);
                            return;
                        }
                    }
                }
            } catch {
                // Continue to RPC fallback.
            }

            const adminRpc = await withTimeout(
                supabase.rpc('is_profile_admin', { _user_id: targetId }),
                8000,
                'Admin RPC check'
            );
            const editorRpc = await withTimeout(
                supabase.rpc('is_profile_editor', { _user_id: targetId }),
                8000,
                'Editor RPC check'
            );

            const isAdminRpc = adminRpc.data;
            const isEditorRpc = editorRpc.data;
            const adminError = adminRpc.error;
            const editorError = editorRpc.error;

            if (!adminError && isAdminRpc === true) {
                setAccessOverride(true);
                setAccessCheckMessage('Admin access confirmed.');
                return;
            }
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
        } catch (error: any) {
            // Ignore RPC errors; fallback to context state.
            setAccessCheckMessage(error?.message || 'Access check failed. Please re-login.');
        } finally {
            setAccessChecking(false);
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

    useEffect(() => {
        if (!user?.id) return;
        if (isAdmin || isEditor || accessOverride === true) return;
        const cachedRole = readRoleCache(user.id);
        if (cachedRole === 'admin' || cachedRole === 'editor') {
            setAccessOverride(true);
            setAccessCheckMessage(`Cached role confirmed (${cachedRole}).`);
        }
    }, [user?.id, isAdmin, isEditor, accessOverride]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setAccessCheckMessage('Checking permissions...');
        if (refreshTimeoutRef.current) {
            window.clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = null;
        }
        refreshTimeoutRef.current = window.setTimeout(() => {
            setIsRefreshing(false);
            setAccessCheckMessage('Permission refresh timed out. Please try again.');
        }, 12000);
        try {
            await withTimeout(refreshRoles(), 8000, 'Role refresh');
            await withTimeout(checkAccessViaRpc(), 8000, 'Access check');
        } catch (error: any) {
            setAccessCheckMessage(error?.message || 'Refresh failed.');
        } finally {
            if (refreshTimeoutRef.current) {
                window.clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
            setIsRefreshing(false);
        }
    };

    const runDiagnostics = async () => {
        setIsDiagnosticsRunning(true);
        setDiagnostics('');
        if (diagnosticsTimeoutRef.current) {
            window.clearTimeout(diagnosticsTimeoutRef.current);
            diagnosticsTimeoutRef.current = null;
        }
        diagnosticsTimeoutRef.current = window.setTimeout(() => {
            setDiagnostics('Diagnostics timed out. Please reload the page and try again.');
            setIsDiagnosticsRunning(false);
        }, 12000);
        try {
            const result: Record<string, any> = {
                timestamp: new Date().toISOString(),
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
                authContext: {
                    userId: user?.id || null,
                    email: user?.email || null,
                    isAdmin,
                    isEditor,
                },
            };

            let sessionRes: any = null;
            try {
                sessionRes = await withTimeout(supabase.auth.getSession(), 8000, 'Session check');
                result.session = {
                    userId: sessionRes.data.session?.user?.id || null,
                    email: sessionRes.data.session?.user?.email || null,
                    expiresAt: sessionRes.data.session?.expires_at || null,
                    error: sessionRes.error?.message || null,
                };
            } catch (error: any) {
                result.session = {
                    userId: null,
                    email: null,
                    expiresAt: null,
                    error: error?.message || 'Session check failed',
                };
            }

            let userRes: any = null;
            try {
                userRes = await withTimeout(supabase.auth.getUser(), 8000, 'User check');
                result.user = {
                    userId: userRes.data.user?.id || null,
                    email: userRes.data.user?.email || null,
                    error: userRes.error?.message || null,
                };
            } catch (error: any) {
                result.user = {
                    userId: null,
                    email: null,
                    error: error?.message || 'User check failed',
                };
            }

            const targetId = userRes?.data?.user?.id || user?.id || null;
            if (targetId) {
                const profileRes = await withTimeout(
                    supabase
                    .from('profiles')
                    .select('id, role')
                    .eq('id', targetId)
                    .maybeSingle(),
                    8000,
                    'Profile check'
                );
                result.profile = {
                    data: profileRes.data,
                    error: profileRes.error?.message || null,
                };

                const adminRpc = await withTimeout(
                    supabase.rpc('is_profile_admin', { _user_id: targetId }),
                    8000,
                    'Admin RPC check'
                );
                result.is_profile_admin = {
                    data: adminRpc.data,
                    error: adminRpc.error?.message || null,
                };

                const editorRpc = await withTimeout(
                    supabase.rpc('is_profile_editor', { _user_id: targetId }),
                    8000,
                    'Editor RPC check'
                );
                result.is_profile_editor = {
                    data: editorRpc.data,
                    error: editorRpc.error?.message || null,
                };

                const contentRes = await withTimeout(
                    supabase
                    .from('site_content')
                    .select('key')
                    .limit(1),
                    8000,
                    'Site content check'
                );
                result.site_content_select = {
                    ok: !contentRes.error,
                    error: contentRes.error?.message || null,
                };

                const layoutRes = await withTimeout(
                    supabase
                    .from('page_sections')
                    .select('section_key')
                    .limit(1),
                    8000,
                    'Page sections check'
                );
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
            if (diagnosticsTimeoutRef.current) {
                window.clearTimeout(diagnosticsTimeoutRef.current);
                diagnosticsTimeoutRef.current = null;
            }
            setIsDiagnosticsRunning(false);
        }
    };

    useEffect(() => {
        if (!user?.id) return;
        if (isAdmin || isEditor || accessOverride === true) return;
        if (autoDiagnosticsRanRef.current) return;
        autoDiagnosticsRanRef.current = true;
        void runDiagnostics();
    }, [user?.id, isAdmin, isEditor, accessOverride]);

    useEffect(() => {
        if (!user?.id) return;
        if (isAdmin || isEditor || accessOverride === true) return;
        if (accessRetryRef.current >= 3) return;
        const timeout = window.setTimeout(() => {
            accessRetryRef.current += 1;
            void checkAccessViaRpc();
        }, 2000);
        return () => window.clearTimeout(timeout);
    }, [user?.id, isAdmin, isEditor, accessOverride, accessCheckMessage]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) return null;

    const canManage = isAdmin || isEditor || accessOverride === true || allowLimitedAccess;

    if (!canManage) {
        const isChecking = accessChecking || accessCheckMessage.toLowerCase().includes('checking') || accessCheckMessage.toLowerCase().includes('timed out');
        const canContinueLimited = accessCheckMessage.toLowerCase().includes('timed out');
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
                        <h2 className="text-2xl font-bold">{isChecking ? 'Checking Permissions' : 'Permission Required'}</h2>
                        <p className="text-gray-500">
                            {isChecking
                                ? 'Verifying your admin access. This can take a few seconds.'
                                : `Your account (${user.email}) does not have administrative rights to access the dashboard.`}
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
                        {canContinueLimited && (
                            <Button
                                onClick={() => {
                                    setAllowLimitedAccess(true);
                                    setAccessCheckMessage('Limited access enabled. Role verification timed out.');
                                }}
                                variant="outline"
                                className="w-full h-11"
                            >
                                Continue in Limited Mode
                            </Button>
                        )}
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
                {allowLimitedAccess && !isAdmin && !isEditor && (
                    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Limited access mode: role verification timed out. Some actions may fail until permissions are confirmed.
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
