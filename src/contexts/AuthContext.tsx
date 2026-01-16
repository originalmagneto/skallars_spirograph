"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    isEditor: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isEditor, setIsEditor] = useState(false);

    const fetchRoles = useCallback(async (userId: string) => {
        try {
            const { data } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId);

            const roles = data?.map(r => r.role) || [];
            setIsAdmin(roles.includes('admin'));
            setIsEditor(roles.includes('editor') || roles.includes('admin'));
        } catch (error) {
            console.error('Error fetching roles:', error);
            setIsAdmin(false);
            setIsEditor(false);
        }
    }, []);

    const refreshRoles = useCallback(async () => {
        if (user?.id) {
            await fetchRoles(user.id);
        }
    }, [user?.id, fetchRoles]);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchRoles(session.user.id);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchRoles(session.user.id);
                } else {
                    setIsAdmin(false);
                    setIsEditor(false);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, [fetchRoles]);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error as Error | null };
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error as Error | null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
        setIsEditor(false);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                isAdmin,
                isEditor,
                signIn,
                signUp,
                signOut,
                refreshRoles,
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
