import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Add01Icon, Delete01Icon, PencilEdit01Icon, Cancel01Icon, Tick01Icon, Image01Icon, Upload01Icon, Link01Icon, SaveEnergy01Icon, CropIcon } from 'hugeicons-react';
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
import MediaLibraryPicker from '@/components/admin/MediaLibraryPicker';
import ImageCropperModal from '@/components/admin/ImageCropperModal';
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from '@/components/admin/AdminPrimitives';

interface Client {
    id: string;
    name: string;
    logo_url: string;
    website_url: string | null;
    display_order: number;
    is_active: boolean;
}

interface ClientSettings {
    id?: string;
    autoplay: boolean;
    autoplay_interval_ms: number;
    visible_count: number;
}

const emptyClient: Omit<Client, 'id'> = {
    name: '',
    logo_url: '',
    website_url: '',
    display_order: 0,
    is_active: true,
};

const defaultSettings: ClientSettings = {
    autoplay: true,
    autoplay_interval_ms: 3000,
    visible_count: 3,
};

const ClientLogosManager = () => {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Omit<Client, 'id'>>(emptyClient);
    const [isAdding, setIsAdding] = useState(false);
    const [newClient, setNewClient] = useState<Omit<Client, 'id'>>(emptyClient);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [settingsForm, setSettingsForm] = useState<ClientSettings>(defaultSettings);
    const [cropState, setCropState] = useState<{
        url: string;
        label?: string;
        onApply: (url: string) => void;
    } | null>(null);

    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) {
                console.warn("Could not fetch clients:", error);
                return [];
            }
            return data as Client[];
        },
    });

    const { data: clientSettings } = useQuery({
        queryKey: ['client-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('client_settings')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(1);
            if (error) {
                console.warn("Could not fetch client settings:", error);
                return null;
            }
            return (data?.[0] as ClientSettings) || null;
        },
    });

    useEffect(() => {
        if (!clientSettings) {
            setSettingsForm(defaultSettings);
            return;
        }
        setSettingsForm({
            id: clientSettings.id,
            autoplay: clientSettings.autoplay ?? true,
            autoplay_interval_ms: clientSettings.autoplay_interval_ms ?? 3000,
            visible_count: clientSettings.visible_count ?? 3,
        });
    }, [clientSettings]);

    const saveSettingsMutation = useMutation({
        mutationFn: async (payload: ClientSettings) => {
            const { error } = await supabase
                .from('client_settings')
                .upsert({
                    id: payload.id,
                    autoplay: payload.autoplay,
                    autoplay_interval_ms: payload.autoplay_interval_ms,
                    visible_count: payload.visible_count,
                    updated_at: new Date().toISOString(),
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Client settings saved');
            queryClient.invalidateQueries({ queryKey: ['client-settings'] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const uploadLogo = async (file: File): Promise<string | null> => {
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `client-${Date.now()}.${fileExt}`;
            const filePath = `clients/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            try {
                await supabase.from('media_library').insert({
                    title: `Client Logo ${new Date().toLocaleDateString()}`,
                    file_path: filePath,
                    public_url: urlData.publicUrl,
                    bucket: 'images',
                    tags: ['clients'],
                });
            } catch (error) {
                console.warn('Could not insert into media library:', error);
            }

            return urlData.publicUrl;
        } catch (error: any) {
            toast.error('Failed to upload logo: ' + error.message);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const createMutation = useMutation({
        mutationFn: async (client: Omit<Client, 'id'>) => {
            if (!client.logo_url) throw new Error('Logo is required');
            const { error } = await supabase.from('clients').insert(client);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Client added');
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsAdding(false);
            setNewClient(emptyClient);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...client }: Client) => {
            const { error } = await supabase.from('clients').update(client).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Client updated');
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setEditingId(null);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Client deleted');
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setDeleteId(null);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const startEdit = (client: Client) => {
        setEditingId(client.id);
        setEditForm({
            name: client.name,
            logo_url: client.logo_url,
            website_url: client.website_url || '',
            display_order: client.display_order,
            is_active: client.is_active,
        });
    };

    const ClientForm = ({
        values,
        onChange,
        onSave,
        onCancel,
        isNew = false,
    }: {
        values: Omit<Client, 'id'>;
        onChange: (values: Omit<Client, 'id'>) => void;
        onSave: () => void;
        onCancel: () => void;
        isNew?: boolean;
    }) => {
        const [showLibrary, setShowLibrary] = useState(false);
        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                const url = await uploadLogo(file);
                if (url) {
                    onChange({ ...values, logo_url: url });
                }
            }
        };

        return (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Logo Upload */}
                    <div className="row-span-2">
                        <Label className="text-xs">Client Logo</Label>
                        <div className="mt-1 flex flex-col items-center gap-2">
                            <div className="w-full h-32 bg-white border border-dashed rounded flex items-center justify-center overflow-hidden p-4">
                                {values.logo_url ? (
                                    <img src={values.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                        <Image01Icon size={24} />
                                        <span className="text-xs mt-1">No Logo</span>
                                    </div>
                                )}
                            </div>
                            <label className="cursor-pointer">
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                                    <span>
                                        <Upload01Icon size={14} className="mr-1" />
                                        {uploading ? 'Uploading...' : 'Upload Logo'}
                                    </span>
                                </Button>
                            </label>
                            <div className="flex w-full gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setShowLibrary((prev) => !prev)}
                                >
                                    <Image01Icon size={14} className="mr-1" />
                                    Browse Library
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    disabled={!values.logo_url}
                                    onClick={() => {
                                        if (!values.logo_url) return;
                                        setCropState({
                                            url: values.logo_url,
                                            label: values.name || 'Client logo',
                                            onApply: (url) => onChange({ ...values, logo_url: url }),
                                        });
                                    }}
                                >
                                    <CropIcon size={14} className="mr-1" />
                                    Crop
                                </Button>
                            </div>
                            {showLibrary && (
                                <MediaLibraryPicker
                                    onSelect={(url) => {
                                        onChange({ ...values, logo_url: url });
                                        setShowLibrary(false);
                                    }}
                                    onClose={() => setShowLibrary(false)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <Label className="text-xs">Client Name</Label>
                        <Input
                            value={values.name}
                            onChange={(e) => onChange({ ...values, name: e.target.value })}
                            placeholder="Client Name"
                            className="mt-1"
                        />
                    </div>

                    {/* Website URL */}
                    <div>
                        <Label className="text-xs flex items-center gap-1">
                            <Link01Icon size={12} />
                            Website URL
                        </Label>
                        <Input
                            value={values.website_url || ''}
                            onChange={(e) => onChange({ ...values, website_url: e.target.value })}
                            placeholder="https://client-website.com"
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
                    <Button size="sm" onClick={onSave} disabled={!values.name || !values.logo_url}>
                        <Tick01Icon size={14} className="mr-1" />
                        {isNew ? 'Add Client' : 'Save Changes'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancel}>
                        <Cancel01Icon size={14} className="mr-1" />
                        Cancel
                    </Button>
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="p-4 text-muted-foreground">Loading clients...</div>;

    return (
        <div className="space-y-6">
            <AdminPanelHeader
                title="Client Logos"
                description="Manage client portfolio cards and front-page carousel behavior."
                actions={(
                    <>
                        <Badge variant="secondary">{clients?.length || 0}</Badge>
                        {!isAdding && (
                            <Button size="sm" onClick={() => setIsAdding(true)}>
                                <Add01Icon size={14} className="mr-1" />
                                Add Client
                            </Button>
                        )}
                    </>
                )}
            />

            <AdminSectionCard className="space-y-4 bg-muted/20">
                <div className="flex items-center gap-2">
                    <Image01Icon size={18} className="text-primary" />
                    <h3 className="text-sm font-semibold">Clients Section Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label className="text-xs">Visible Logos</Label>
                        <Input
                            type="number"
                            min={1}
                            max={6}
                            value={settingsForm.visible_count}
                            onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                visible_count: Math.max(1, Math.min(6, parseInt(e.target.value) || 1))
                            })}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Autoplay Interval (ms)</Label>
                        <Input
                            type="number"
                            min={500}
                            max={10000}
                            value={settingsForm.autoplay_interval_ms}
                            onChange={(e) => setSettingsForm({
                                ...settingsForm,
                                autoplay_interval_ms: Math.max(500, parseInt(e.target.value) || 3000)
                            })}
                            className="mt-1"
                        />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                        <Switch
                            checked={settingsForm.autoplay}
                            onCheckedChange={(v) => setSettingsForm({ ...settingsForm, autoplay: v })}
                        />
                        <Label className="text-xs">Autoplay</Label>
                    </div>
                </div>
                <Button size="sm" onClick={() => saveSettingsMutation.mutate(settingsForm)} disabled={saveSettingsMutation.isPending}>
                    <SaveEnergy01Icon size={14} className="mr-1" />
                    {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
            </AdminSectionCard>

            <AdminActionBar>
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Image01Icon size={14} className="text-primary" />
                    Use media library + crop tools for consistent brand appearance.
                </span>
            </AdminActionBar>

            {isAdding && (
                <ClientForm
                    values={newClient}
                    onChange={setNewClient}
                    onSave={() => createMutation.mutate(newClient)}
                    onCancel={() => {
                        setIsAdding(false);
                        setNewClient(emptyClient);
                    }}
                    isNew
                />
            )}

            <AdminSectionCard className="space-y-2">
                {clients?.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-muted-foreground">
                        No clients found. Add one to genericize your portfolio.
                    </div>
                )}
                {clients?.map((client) =>
                    editingId === client.id ? (
                        <ClientForm
                            key={client.id}
                            values={editForm}
                            onChange={setEditForm}
                            onSave={() => updateMutation.mutate({ id: client.id, ...editForm })}
                            onCancel={() => setEditingId(null)}
                        />
                    ) : (
                        <div
                            key={client.id}
                            className="flex items-center gap-4 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors"
                        >
                            {/* Logo */}
                            <div className="w-16 h-12 bg-white rounded border flex items-center justify-center p-1 flex-shrink-0">
                                <img src={client.logo_url} alt={client.name} className="max-w-full max-h-full object-contain" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{client.name}</span>
                                    {!client.is_active && <Badge variant="outline">Hidden</Badge>}
                                </div>
                                {client.website_url && (
                                    <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                                        <Link01Icon size={10} />
                                        {client.website_url}
                                    </a>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => startEdit(client)}>
                                    <PencilEdit01Icon size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteId(client.id)}
                                >
                                    <Delete01Icon size={14} />
                                </Button>
                            </div>
                        </div>
                    )
                )}
            </AdminSectionCard>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Client</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this client? This action cannot be undone.
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

            {cropState && (
                <ImageCropperModal
                    open
                    imageUrl={cropState.url}
                    initialAspect="landscape"
                    aspectOptions={['landscape', 'square']}
                    label={cropState.label}
                    tags={['clients']}
                    onClose={() => setCropState(null)}
                    onComplete={(url) => {
                        cropState.onApply(url);
                        setCropState(null);
                    }}
                />
            )}
        </div>
    );
};

export default ClientLogosManager;
