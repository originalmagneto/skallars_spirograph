import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Add01Icon, Delete01Icon, PencilEdit01Icon, Cancel01Icon, Tick01Icon, UserIcon, Upload01Icon, Linkedin01Icon, SaveEnergy01Icon } from 'hugeicons-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TeamMember {
    id: string;
    name: string;
    role_sk: string;
    role_en: string;
    bio_sk?: string | null;
    bio_en?: string | null;
    icon?: string | null;
    company: string | null;
    photo_url: string | null;
    linkedin_url: string | null;
    display_order: number;
    is_active: boolean;
    photo_position_x?: number;
    photo_position_y?: number;
}

interface TeamSettings {
    id?: string;
    show_linkedin: boolean;
    show_icon: boolean;
    show_bio: boolean;
    columns_desktop: number;
    columns_tablet: number;
    columns_mobile: number;
}

const emptyMember: Omit<TeamMember, 'id'> = {
    name: '',
    role_sk: '',
    role_en: '',
    bio_sk: '',
    bio_en: '',
    icon: '',
    company: '',
    photo_url: '',
    linkedin_url: '',
    display_order: 0,
    is_active: true,
    photo_position_x: 50,
    photo_position_y: 50,
};

const defaultSettings: TeamSettings = {
    show_linkedin: true,
    show_icon: true,
    show_bio: true,
    columns_desktop: 4,
    columns_tablet: 2,
    columns_mobile: 1,
};

const TeamMembersManager = () => {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<TeamMember, 'id'>>(emptyMember);
    const [isAdding, setIsAdding] = useState(false);
    const [newMember, setNewMember] = useState<Omit<TeamMember, 'id'>>(emptyMember);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [settingsForm, setSettingsForm] = useState<TeamSettings>(defaultSettings);

    const { data: members, isLoading } = useQuery({
        queryKey: ['team-members'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('display_order', { ascending: true });

            // If table doesn't exist or error, return empty array for now
            if (error) {
                console.warn("Could not fetch team members:", error);
                return [];
            }
            return data as TeamMember[];
        },
    });

    const { data: teamSettings } = useQuery({
        queryKey: ['team-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_settings')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(1);
            if (error) {
                console.warn("Could not fetch team settings:", error);
                return null;
            }
            return (data?.[0] as TeamSettings) || null;
        },
    });

    useEffect(() => {
        if (!teamSettings) {
            setSettingsForm(defaultSettings);
            return;
        }
        setSettingsForm({
            id: teamSettings.id,
            show_linkedin: teamSettings.show_linkedin ?? true,
            show_icon: teamSettings.show_icon ?? true,
            show_bio: teamSettings.show_bio ?? true,
            columns_desktop: teamSettings.columns_desktop ?? 4,
            columns_tablet: teamSettings.columns_tablet ?? 2,
            columns_mobile: teamSettings.columns_mobile ?? 1,
        });
    }, [teamSettings]);

    const saveSettingsMutation = useMutation({
        mutationFn: async (payload: TeamSettings) => {
            const { error } = await supabase
                .from('team_settings')
                .upsert({
                    id: payload.id,
                    show_linkedin: payload.show_linkedin,
                    show_icon: payload.show_icon,
                    show_bio: payload.show_bio,
                    columns_desktop: payload.columns_desktop,
                    columns_tablet: payload.columns_tablet,
                    columns_mobile: payload.columns_mobile,
                    updated_at: new Date().toISOString(),
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Team settings saved');
            queryClient.invalidateQueries({ queryKey: ['team-settings'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const uploadPhoto = async (file: File): Promise<string | null> => {
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `team-${Date.now()}.${fileExt}`;
            const filePath = `team/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error: any) {
            toast.error('Failed to upload photo: ' + error.message);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const createMutation = useMutation({
        mutationFn: async (member: Omit<TeamMember, 'id'>) => {
            const { error } = await supabase.from('team_members').insert(member);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Team member added');
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            setIsAdding(false);
            setNewMember(emptyMember);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...member }: TeamMember) => {
            const { error } = await supabase.from('team_members').update(member).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Team member updated');
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            setEditingId(null);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('team_members').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Team member deleted');
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            setDeleteId(null);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const startEdit = (member: TeamMember) => {
        setEditingId(member.id);
        setEditForm({
            name: member.name,
            role_sk: member.role_sk,
            role_en: member.role_en,
            bio_sk: member.bio_sk || '',
            bio_en: member.bio_en || '',
            icon: member.icon || '',
            company: member.company || '',
            photo_url: member.photo_url || '',
            linkedin_url: member.linkedin_url || '',
            display_order: member.display_order,
            is_active: member.is_active,
            photo_position_x: member.photo_position_x ?? 50,
            photo_position_y: member.photo_position_y ?? 50,
        });
    };

    const MemberForm = ({
        values,
        onChange,
        onSave,
        onCancel,
        isNew = false,
    }: {
        values: Omit<TeamMember, 'id'>;
        onChange: (values: Omit<TeamMember, 'id'>) => void;
        onSave: () => void;
        onCancel: () => void;
        isNew?: boolean;
    }) => {
        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                const url = await uploadPhoto(file);
                if (url) {
                    onChange({ ...values, photo_url: url });
                }
            }
        };

        return (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Photo Upload & Positioning */}
                    <div className="row-span-2 space-y-4">
                        <Label className="text-xs">Photo & Positioning</Label>
                        <div className="flex flex-col items-center gap-2">
                            {/* Preview Area */}
                            <div className="relative w-48 h-48 bg-muted border rounded-lg overflow-hidden shadow-sm">
                                {values.photo_url ? (
                                    <img
                                        src={values.photo_url}
                                        alt="Preview"
                                        className="w-full h-full object-cover transition-all duration-200"
                                        style={{
                                            objectPosition: `${values.photo_position_x || 50}% ${values.photo_position_y || 50}%`
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <UserIcon size={40} className="text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            <label className="cursor-pointer w-full">
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                <Button type="button" variant="outline" size="sm" disabled={uploading} className="w-full">
                                    <Upload01Icon size={14} className="mr-1" />
                                    {uploading ? 'Uploading...' : 'Change Photo'}
                                </Button>
                            </label>
                        </div>

                        {/* Position Sliders */}
                        {values.photo_url && (
                            <div className="space-y-3 bg-card p-3 rounded border">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                                        <span>Horizontal</span>
                                        <span>{values.photo_position_x || 50}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={values.photo_position_x || 50}
                                        onChange={(e) => onChange({ ...values, photo_position_x: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                                        <span>Vertical</span>
                                        <span>{values.photo_position_y || 50}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={values.photo_position_y || 50}
                                        onChange={(e) => onChange({ ...values, photo_position_y: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Icon */}
                    <div>
                        <Label className="text-xs">Icon (Emoji or Short Label)</Label>
                        <Input
                            value={values.icon || ''}
                            onChange={(e) => onChange({ ...values, icon: e.target.value })}
                            placeholder="⚖️"
                            className="mt-1"
                        />
                    </div>

                    {/* Name */}
                    <div>
                        <Label className="text-xs">Full Name</Label>
                        <Input
                            value={values.name}
                            onChange={(e) => onChange({ ...values, name: e.target.value })}
                            placeholder="John Doe"
                            className="mt-1"
                        />
                    </div>

                    {/* Company */}
                    <div>
                        <Label className="text-xs">Company</Label>
                        <Input
                            value={values.company || ''}
                            onChange={(e) => onChange({ ...values, company: e.target.value })}
                            placeholder="Company name"
                            className="mt-1"
                        />
                    </div>

                    {/* Role SK */}
                    <div>
                        <Label className="text-xs">Role (Slovak)</Label>
                        <Input
                            value={values.role_sk}
                            onChange={(e) => onChange({ ...values, role_sk: e.target.value })}
                            placeholder="Advokát"
                            className="mt-1"
                        />
                    </div>

                    {/* Role EN */}
                    <div>
                        <Label className="text-xs">Role (English)</Label>
                        <Input
                            value={values.role_en}
                            onChange={(e) => onChange({ ...values, role_en: e.target.value })}
                            placeholder="Attorney"
                            className="mt-1"
                        />
                    </div>

                    {/* Bio SK */}
                    <div className="md:col-span-2">
                        <Label className="text-xs">Bio (Slovak)</Label>
                        <Textarea
                            value={values.bio_sk || ''}
                            onChange={(e) => onChange({ ...values, bio_sk: e.target.value })}
                            placeholder="Krátky popis alebo zameranie."
                            rows={3}
                            className="mt-1"
                        />
                    </div>

                    {/* Bio EN */}
                    <div className="md:col-span-2">
                        <Label className="text-xs">Bio (English)</Label>
                        <Textarea
                            value={values.bio_en || ''}
                            onChange={(e) => onChange({ ...values, bio_en: e.target.value })}
                            placeholder="Short bio or focus area."
                            rows={3}
                            className="mt-1"
                        />
                    </div>

                    {/* LinkedIn */}
                    <div>
                        <Label className="text-xs flex items-center gap-1">
                            <Linkedin01Icon size={12} />
                            LinkedIn URL
                        </Label>
                        <Input
                            value={values.linkedin_url || ''}
                            onChange={(e) => onChange({ ...values, linkedin_url: e.target.value })}
                            placeholder="https://linkedin.com/in/..."
                            className="mt-1"
                        />
                    </div>

                    {/* Display Order */}
                    <div>
                        <Label className="text-xs">Display Order</Label>
                        <Input
                            type="number"
                            value={values.display_order}
                            onChange={(e) => onChange({ ...values, display_order: parseInt(e.target.value) || 0 })}
                            className="mt-1 w-20"
                        />
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-2 pt-5">
                        <Switch
                            checked={values.is_active}
                            onCheckedChange={(v) => onChange({ ...values, is_active: v })}
                        />
                        <Label className="text-xs">Show on Website</Label>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" onClick={onSave}>
                        <Tick01Icon size={14} className="mr-1" />
                        {isNew ? 'Add Member' : 'Save Changes'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancel}>
                        <Cancel01Icon size={14} className="mr-1" />
                        Cancel
                    </Button>
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="p-4 text-muted-foreground">Loading team members...</div>;

    return (
        <div className="space-y-6">
            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                <div className="flex items-center gap-2">
                    <UserIcon size={18} className="text-primary" />
                    <h3 className="text-sm font-semibold">Team Section Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label className="text-xs">Desktop Columns</Label>
                        <Input
                            type="number"
                            min={2}
                            max={4}
                            value={settingsForm.columns_desktop}
                            onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                columns_desktop: Math.max(2, Math.min(4, parseInt(e.target.value) || 4))
                            })}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Tablet Columns</Label>
                        <Input
                            type="number"
                            min={1}
                            max={3}
                            value={settingsForm.columns_tablet}
                            onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                columns_tablet: Math.max(1, Math.min(3, parseInt(e.target.value) || 2))
                            })}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Mobile Columns</Label>
                        <Input
                            type="number"
                            min={1}
                            max={2}
                            value={settingsForm.columns_mobile}
                            onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                columns_mobile: Math.max(1, Math.min(2, parseInt(e.target.value) || 1))
                            })}
                            className="mt-1"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={settingsForm.show_icon}
                            onCheckedChange={(v) => setSettingsForm({ ...settingsForm, show_icon: v })}
                        />
                        <Label className="text-xs">Show Icons</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={settingsForm.show_bio}
                            onCheckedChange={(v) => setSettingsForm({ ...settingsForm, show_bio: v })}
                        />
                        <Label className="text-xs">Show Bio</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={settingsForm.show_linkedin}
                            onCheckedChange={(v) => setSettingsForm({ ...settingsForm, show_linkedin: v })}
                        />
                        <Label className="text-xs">Show LinkedIn</Label>
                    </div>
                </div>
                <Button size="sm" onClick={() => saveSettingsMutation.mutate(settingsForm)} disabled={saveSettingsMutation.isPending}>
                    <SaveEnergy01Icon size={14} className="mr-1" />
                    {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <UserIcon size={20} className="text-primary" />
                    <h2 className="text-lg font-semibold">Team Members</h2>
                    <Badge variant="secondary">{members?.length || 0}</Badge>
                </div>
                {!isAdding && (
                    <Button size="sm" onClick={() => setIsAdding(true)}>
                        <Add01Icon size={14} className="mr-1" />
                        Add Member
                    </Button>
                )}
            </div>

            {isAdding && (
                <MemberForm
                    values={newMember}
                    onChange={setNewMember}
                    onSave={() => createMutation.mutate(newMember)}
                    onCancel={() => {
                        setIsAdding(false);
                        setNewMember(emptyMember);
                    }}
                    isNew
                />
            )}

            <div className="space-y-2">
                {members?.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-muted-foreground">
                        No team members found. Add one to get started.
                    </div>
                )}
                {members?.map((member) =>
                    editingId === member.id ? (
                        <MemberForm
                            key={member.id}
                            values={editForm}
                            onChange={setEditForm}
                            onSave={() => updateMutation.mutate({ id: member.id, ...editForm })}
                            onCancel={() => setEditingId(null)}
                        />
                    ) : (
                        <div
                            key={member.id}
                            className="flex items-center gap-4 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors"
                        >
                            {/* Photo */}
                            <div className="w-12 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
                                {member.photo_url ? (
                                    <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <UserIcon size={20} className="text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{member.name}</span>
                                    {!member.is_active && <Badge variant="outline">Hidden</Badge>}
                                    {member.linkedin_url && (
                                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                            <Linkedin01Icon size={14} />
                                        </a>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {member.role_en} {member.company && `• ${member.company}`}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => startEdit(member)}>
                                    <PencilEdit01Icon size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteId(member.id)}
                                >
                                    <Delete01Icon size={14} />
                                </Button>
                            </div>
                        </div>
                    )
                )}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this team member? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TeamMembersManager;
