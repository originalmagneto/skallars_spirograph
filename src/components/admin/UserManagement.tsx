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
import {
    UserIcon,
    Shield01Icon,
    PencilEdit01Icon,
    Cancel01Icon
} from 'hugeicons-react';
import { toast } from 'sonner';
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from '@/components/admin/AdminPrimitives';

interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
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

    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editForm, setEditForm] = useState({ full_name: '', avatar_url: '' });

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { userId: string, full_name: string, avatar_url: string }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: data.full_name, avatar_url: data.avatar_url })
                .eq('id', data.userId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Profile updated');
            setEditingUser(null);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    if (isLoading) {
        return <div className="text-center py-8 text-muted-foreground">Loading users...</div>;
    }

    return (
        <div className="space-y-6">
            <AdminPanelHeader
                title="User Management"
                description="Manage roles and profile metadata for admin users."
                actions={
                    <Button variant="outline" asChild>
                        <a
                            href="https://supabase.com/dashboard/project/_/auth/users"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Manage Auth Users (Supabase)
                        </a>
                    </Button>
                }
            />

            {users && users.length > 0 ? (
                <AdminSectionCard className="space-y-2">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center gap-4 p-4 bg-card border hover:border-primary/50 transition-colors rounded-lg group"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.full_name || 'User'} className="w-10 h-10 rounded-full object-cover bg-muted" />
                                ) : (
                                    <div className="p-2 bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                                        <UserIcon size={20} className="text-muted-foreground" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium truncate">{user.full_name || 'Unnamed User'}</h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                                            onClick={() => {
                                                setEditingUser(user);
                                                setEditForm({ full_name: user.full_name || '', avatar_url: user.avatar_url || '' });
                                            }}
                                        >
                                            <PencilEdit01Icon size={12} />
                                        </Button>
                                    </div>
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
                </AdminSectionCard>
            ) : (
                <AdminActionBar className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                    <UserIcon size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No users found.</p>
                </AdminActionBar>
            )}

            {/* Edit User Dialog */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold">Edit User Profile</h3>
                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                                <Cancel01Icon size={18} />
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Display Name</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={editForm.full_name}
                                    onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Avatar URL</label>
                                <div className="flex gap-2">
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={editForm.avatar_url}
                                        onChange={e => setEditForm(f => ({ ...f, avatar_url: e.target.value }))}
                                        placeholder="https://..."
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Paste an image URL for the profile photo.</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t">
                            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                            <Button onClick={() => updateProfileMutation.mutate({ userId: editingUser.id, ...editForm })}>
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
