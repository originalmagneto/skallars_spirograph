"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { UserMultipleIcon, Logout01Icon } from "hugeicons-react";

export default function UserManagement() {
    const { data: users, isLoading } = useQuery({
        queryKey: ['users-admin'],
        queryFn: async () => {
            // Note: Regular users can't list all users from auth.users easily without a secure server function
            // or a public profiles table. Assuming 'profiles' table exists or similar mechanism.
            // For now, we might only be able to see the current user or a mock list if Supabase isn't fully configured for this.
            // We will try to fetch from a 'profiles' table if it exists.
            const { data, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) {
                // If profiles table doesn't exist, return empty or error
                console.warn("Could not fetch users:", error);
                return [];
            }
            return data;
        },
    });

    if (isLoading) return <div>Loading users...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <UserMultipleIcon size={20} className="text-primary" />
                <h2 className="text-lg font-semibold">User Management</h2>
                <Badge variant="secondary">{users?.length || 0}</Badge>
            </div>

            <p className="text-sm text-gray-500">
                Manage administrator access and user roles. (Currently read-only for safety).
            </p>

            <div className="border rounded-lg bg-white overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 font-medium text-gray-500">User ID</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users && users.length > 0 ? (
                            users.map((user: any) => (
                                <tr key={user.id}>
                                    <td className="px-4 py-3">{user.id}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                            {user.role || 'user'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">
                                        No actions
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                    No user profiles found in database.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
