"use client";

import UserManagement from '@/components/admin/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersPage() {
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
            <h1 className="text-2xl font-bold">User Management</h1>
            <UserManagement />
        </div>
    );
}
