import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Delete01Icon, UserIcon, Shield01Icon } from 'hugeicons-react';
import { toast } from 'sonner';

interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: 'admin' | 'editor' | 'user';
    created_at: string;
}

const UserManagement = () => {
    const queryClient = useQueryClient();

    // Fetch all users
    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as UserProfile[];
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'editor' | 'user' }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Role updated successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update role');
        },
    });

    if (isLoading) {
        return <div className="text-center py-8 text-muted-foreground">Loading users...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">User Management</h2>
                <Button variant="outline" asChild>
                    <a
                        href="https://supabase.com/dashboard/project/_/auth/users"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Manage Auth Users (Supabase)
                    </a>
                </Button>
            </div>

            {users && users.length > 0 ? (
                <div className="space-y-2">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center gap-4 p-4 bg-card border hover:border-primary/50 transition-colors rounded-lg"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-muted rounded-full">
                                    <UserIcon size={20} className="text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-medium truncate">{user.full_name || 'Unnamed User'}</h3>
                                    <p className="text-sm text-muted-foreground truncate">{user.email || 'No email access'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                <Badge
                                    variant={user.role === 'admin' ? 'default' : user.role === 'editor' ? 'secondary' : 'outline'}
                                    className="gap-1"
                                >
                                    <Shield01Icon size={12} />
                                    {user.role}
                                </Badge>

                                <Select
                                    value={user.role}
                                    onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role: role as 'admin' | 'editor' | 'user' })}
                                    disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1} // Prevent locking out last admin
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                    <UserIcon size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No users found.</p>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
