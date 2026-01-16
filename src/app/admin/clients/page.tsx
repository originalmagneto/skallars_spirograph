"use client";

import ClientLogosManager from '@/components/admin/ClientLogosManager';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ClientsPage() {
    const { user, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/admin/login');
        } else if (!loading && !isAdmin) {
            router.push('/');
        }
    }, [user, loading, isAdmin, router]);

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    if (!user || !isAdmin) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold">Client Logos Management</h1>
            <ClientLogosManager />
        </div>
    );
}
