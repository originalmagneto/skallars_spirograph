"use client";

import AILab from '@/components/admin/AILab';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AILabPage() {
    const { user, loading, isAdmin, isEditor } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/admin/login');
        } else if (!loading && !isAdmin && !isEditor) {
            router.push('/');
        }
    }, [user, loading, isAdmin, isEditor, router]);

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    if (!user || (!isAdmin && !isEditor)) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold">AI Article Laboratory</h1>
            <AILab />
        </div>
    );
}
