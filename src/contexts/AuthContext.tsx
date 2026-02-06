"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    isEditor: boolean;
    healthWarning: string | null;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshRoles: () => Promise<void>;
    dismissHealthWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isEditor, setIsEditor] = useState(false);
    const [healthWarning, setHealthWarning] = useState<string | null>(null);
    const roleRetryRef = useRef(0);
    const initialSessionResolvedRef = useRef(false);
    const roleFetchInFlightRef = useRef<Promise<void> | null>(null);
    const roleFetchUserRef = useRef<string | null>(null);
    const ROLE_CACHE_KEY = 'skallars_role_cache_v1';
    const ROLE_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
    const ROLE_CHECK_TIMEOUT_MS = 15000;
    const INITIAL_AUTH_TIMEOUT_MS = 12000;

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

    const writeRoleCache = (userId: string, role: string) => {
        try {
            window.localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ userId, role, ts: Date.now() }));
        } catch {
            // Ignore cache failures
        }
    };

    const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number, label: string) => {
        const wrapped = Promise.resolve(promise);
        return await new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
            wrapped
                .then((value) => {
                    clearTimeout(timer);
                    resolve(value);
                })
                .catch((err) => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    };

    const fetchRoles = useCallback(async (userId: string) => {
        if (roleFetchInFlightRef.current && roleFetchUserRef.current === userId) {
            await roleFetchInFlightRef.current;
            return;
        }

        const run = async () => {
        const cachedRole = typeof window !== 'undefined' ? readRoleCache(userId) : null;
        const applyRole = (role: string) => {
            setIsAdmin(role === 'admin');
            setIsEditor(role === 'editor' || role === 'admin');
            writeRoleCache(userId, role);
        };

        if (cachedRole) {
            setIsAdmin(cachedRole === 'admin');
            setIsEditor(cachedRole === 'editor' || cachedRole === 'admin');
        }

        // Server-first role check avoids flaky client-side profile/RPC timeouts.
        if (!session?.access_token) {
            if (!cachedRole) {
                setIsAdmin(false);
                setIsEditor(false);
            }
            return;
        }

        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const res = await withTimeout(
                    fetch('/api/admin/role', {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        cache: 'no-store',
                    }),
                    ROLE_CHECK_TIMEOUT_MS,
                    'Server role check'
                );

                if (res.ok) {
                    const data = await res.json();
                    const role = data?.role || 'user';
                    applyRole(role);
                    setHealthWarning(null);
                    return;
                }

                // Treat auth failures as unauthenticated user role.
                if (res.status === 401) {
                    applyRole('user');
                    setHealthWarning(null);
                    return;
                }
            } catch {
                // Retry a couple of times before falling back to cache/guest role.
                if (attempt < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
                    continue;
                }
            }
        }
        if (!cachedRole) {
            setIsAdmin(false);
            setIsEditor(false);
        }
        setHealthWarning('Role verification is currently slow or unavailable. Access checks may be temporarily delayed.');
        };

        let promise: Promise<void> | null = null;
        promise = run().finally(() => {
            if (roleFetchInFlightRef.current === promise) {
                roleFetchInFlightRef.current = null;
                roleFetchUserRef.current = null;
            }
        });
        roleFetchInFlightRef.current = promise;
        roleFetchUserRef.current = userId;
        await promise;
    }, [session?.access_token]);

    const refreshRoles = useCallback(async () => {
        if (user?.id) {
            await fetchRoles(user.id);
        }
    }, [user?.id, fetchRoles]);

    useEffect(() => {
        // Create a safety timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            if (!initialSessionResolvedRef.current) {
                setLoading(false);
            }
        }, INITIAL_AUTH_TIMEOUT_MS);

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            initialSessionResolvedRef.current = true;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchRoles(session.user.id);
            }
            clearTimeout(timeoutId);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'INITIAL_SESSION' && initialSessionResolvedRef.current) {
                    return;
                }
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchRoles(session.user.id);
                } else {
                    setIsAdmin(false);
                    setIsEditor(false);
                    setHealthWarning(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchRoles]);

    useEffect(() => {
        if (!user?.id) return;
        if (isAdmin || isEditor) return;
        if (roleRetryRef.current >= 3) return;

        const timeout = setTimeout(() => {
            roleRetryRef.current += 1;
            fetchRoles(user.id);
        }, 1200);

        return () => clearTimeout(timeout);
    }, [user?.id, isAdmin, isEditor, fetchRoles]);

    const signIn = async (email: string, password: string) => {
        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Login timed out. Please try again.')), 12000)
            );
            const result = await Promise.race([
                supabase.auth.signInWithPassword({ email, password }),
                timeout,
            ]) as { error?: Error | null };
            const error = result?.error ?? null;
            return { error: error as Error | null };
        } catch (error: any) {
            return { error: error as Error };
        }
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error as Error | null };
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Sign out failed:', error);
        } finally {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setIsEditor(false);
            setHealthWarning(null);
        }
    };

    const dismissHealthWarning = () => {
        setHealthWarning(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                isAdmin,
                isEditor,
                healthWarning,
                signIn,
                signUp,
                signOut,
                refreshRoles,
                dismissHealthWarning,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
