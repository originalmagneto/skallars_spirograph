import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { PencilEdit01Icon, Cancel01Icon, Tick01Icon, Search01Icon, TextIcon, AiMagicIcon } from 'hugeicons-react';
import { generateContentTranslation } from '@/lib/aiService';

interface SiteContent {
    id?: string;
    key: string;
    value_sk: string;
    value_en: string;
    value_de: string;
    value_cn: string;
    draft_value_sk?: string | null;
    draft_value_en?: string | null;
    draft_value_de?: string | null;
    draft_value_cn?: string | null;
    content_type: string;
    section: string;
    description: string | null;
}

interface ContentRegistryItem {
    key: string;
    section: string;
    label: string;
    content_type: string;
    description: string | null;
    sort_order: number;
}

interface ContentItem extends SiteContent {
    label?: string;
    sort_order?: number;
    registered?: boolean;
}

const SECTION_LABELS: Record<string, { sk: string; en: string }> = {
    navigation: { sk: 'Navigácia', en: 'Navigation' },
    hero: { sk: 'Hero sekcia', en: 'Hero Section' },
    about: { sk: 'O nás', en: 'About' },
    services: { sk: 'Služby', en: 'Services' },
    countries: { sk: 'Krajiny', en: 'Countries' },
    team: { sk: 'Tím', en: 'Team' },
    news: { sk: 'Novinky', en: 'News' },
    clients: { sk: 'Klienti', en: 'Clients' },
    network: { sk: 'Globálna sieť', en: 'Global Network' },
    contact: { sk: 'Kontakt', en: 'Contact' },
    map: { sk: 'Mapa', en: 'Map' },
    footer: { sk: 'Päta', en: 'Footer' },
    general: { sk: 'Všeobecné', en: 'General' },
};

const ContentManager = () => {
    const queryClient = useQueryClient();
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editingMeta, setEditingMeta] = useState<{ content_type: string; section: string; description: string | null } | null>(null);
    const [editForm, setEditForm] = useState({ value_sk: '', value_en: '', value_de: '', value_cn: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [uploading, setUploading] = useState(false);

    const { data: content, isLoading } = useQuery({
        queryKey: ['site-content-admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('site_content')
                .select('*')
                .order('section', { ascending: true })
                .order('key', { ascending: true });

            if (error) {
                console.warn("Could not fetch site content:", error);
                return [];
            }
            return data as SiteContent[];
        },
    });

    const { data: registry, isLoading: registryLoading } = useQuery({
        queryKey: ['content-registry'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('content_registry')
                .select('*')
                .order('section', { ascending: true })
                .order('sort_order', { ascending: true });

            if (error) {
                console.warn("Could not fetch content registry:", error);
                return [];
            }
            return data as ContentRegistryItem[];
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: {
            key: string;
            value_sk: string;
            value_en: string;
            value_de: string;
            value_cn: string;
            content_type: string;
            section: string;
            description: string | null;
            draft_value_sk?: string | null;
            draft_value_en?: string | null;
            draft_value_de?: string | null;
            draft_value_cn?: string | null;
            draft_updated_at?: string | null;
        }) => {
            const { error } = await supabase
                .from('site_content')
                .upsert(payload, { onConflict: 'key' });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Draft saved');
            queryClient.invalidateQueries({ queryKey: ['site-content-admin'] });
            queryClient.invalidateQueries({ queryKey: ['site-content'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const startEdit = (item: ContentItem) => {
        setEditingKey(item.key);
        setEditingMeta({
            content_type: item.content_type || 'text',
            section: item.section || 'general',
            description: item.description || null,
        });
        setEditForm({
            value_sk: item.draft_value_sk ?? item.value_sk ?? '',
            value_en: item.draft_value_en ?? item.value_en ?? '',
            value_de: item.draft_value_de ?? item.value_de ?? '',
            value_cn: item.draft_value_cn ?? item.value_cn ?? ''
        });
    };

    const saveDraft = async (item: ContentItem) => {
        await updateMutation.mutateAsync({
            key: item.key,
            value_sk: item.value_sk || '',
            value_en: item.value_en || '',
            value_de: item.value_de || '',
            value_cn: item.value_cn || '',
            content_type: item.content_type || editingMeta?.content_type || 'text',
            section: item.section || editingMeta?.section || 'general',
            description: item.description || editingMeta?.description || null,
            draft_value_sk: editForm.value_sk,
            draft_value_en: editForm.value_en,
            draft_value_de: editForm.value_de,
            draft_value_cn: editForm.value_cn,
            draft_updated_at: new Date().toISOString()
        } as any);
    };

    const publishDraft = async (item: ContentItem) => {
        try {
            const { error } = await supabase
                .from('site_content')
                .upsert({
                    key: item.key,
                    value_sk: editForm.value_sk,
                    value_en: editForm.value_en,
                    value_de: editForm.value_de,
                    value_cn: editForm.value_cn,
                    content_type: item.content_type || editingMeta?.content_type || 'text',
                    section: item.section || editingMeta?.section || 'general',
                    description: item.description || editingMeta?.description || null,
                    draft_value_sk: null,
                    draft_value_en: null,
                    draft_value_de: null,
                    draft_value_cn: null,
                    draft_updated_at: null
                }, { onConflict: 'key' });
            if (error) throw error;
            toast.success('Content published');
            queryClient.invalidateQueries({ queryKey: ['site-content-admin'] });
            queryClient.invalidateQueries({ queryKey: ['site-content'] });
            setEditingKey(null);
            setEditingMeta(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to publish');
        }
    };

    const uploadImage = async (file: File, item: ContentItem) => {
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const safeKey = item.key.replace(/[^a-z0-9-_]+/gi, '-');
            const fileName = `${safeKey}-${Date.now()}.${fileExt}`;
            const filePath = `content/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            const url = urlData.publicUrl;
            setEditForm({
                value_sk: url,
                value_en: url,
                value_de: url,
                value_cn: url,
            });
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleAutoTranslate = async () => {
        if (!editForm.value_sk) {
            toast.error('Please enter Slovak text first');
            return;
        }

        setIsTranslating(true);
        try {
            const translations = await generateContentTranslation(editForm.value_sk);
            setEditForm(prev => ({
                ...prev,
                value_en: translations.en,
                value_de: translations.de,
                value_cn: translations.cn
            }));
            toast.success('Auto-translation completed!');
        } catch (error: any) {
            toast.error('Translation failed: ' + error.message);
        } finally {
            setIsTranslating(false);
        }
    };

    const registryMap = new Map((registry || []).map(item => [item.key, item]));
    const contentMap = new Map((content || []).map(item => [item.key, item]));

    const registeredItems: ContentItem[] = (registry || []).map((item) => {
        const existing = contentMap.get(item.key);
        return {
            id: existing?.id,
            key: item.key,
            value_sk: existing?.value_sk || '',
            value_en: existing?.value_en || '',
            value_de: existing?.value_de || '',
            value_cn: existing?.value_cn || '',
            draft_value_sk: existing?.draft_value_sk,
            draft_value_en: existing?.draft_value_en,
            draft_value_de: existing?.draft_value_de,
            draft_value_cn: existing?.draft_value_cn,
            content_type: existing?.content_type || item.content_type || 'text',
            section: item.section || existing?.section || 'general',
            description: item.description || existing?.description || null,
            label: item.label,
            sort_order: item.sort_order,
            registered: true,
        };
    });

    const unregisteredItems: ContentItem[] = (content || [])
        .filter(item => !registryMap.has(item.key))
        .map(item => ({
            ...item,
            label: item.key,
            sort_order: 9999,
            registered: false,
        }));

    const mergedContent: ContentItem[] = [...registeredItems, ...unregisteredItems]
        .sort((a, b) => {
            if (a.section !== b.section) return a.section.localeCompare(b.section);
            const aOrder = a.sort_order ?? 9999;
            const bOrder = b.sort_order ?? 9999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (a.label || a.key).localeCompare(b.label || b.key);
        });

    const filteredContent = mergedContent.filter(
        (item) =>
            (item.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.value_sk?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.value_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    // Group by section
    const groupedContent = filteredContent?.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
    }, {} as Record<string, ContentItem[]>);

    const isLongText = (text: string) => text && text.length > 80;

    if (isLoading || registryLoading) return <div className="p-4 text-muted-foreground">Loading content...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <TextIcon size={20} className="text-primary" />
                <h2 className="text-lg font-semibold">Site Content</h2>
                <Badge variant="secondary">{filteredContent?.length || 0}</Badge>
            </div>

            <p className="text-sm text-muted-foreground">
                Edit text content across your website. Use the "Magic Wand" to automatically translate Slovak text to English, German, and Chinese.
            </p>
            <p className="text-xs text-muted-foreground">
                Keys map to translation paths (example: <span className="font-mono">hero.title</span>, <span className="font-mono">services.items.corporate.description</span>).
            </p>

            <div className="relative">
                <Search01Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                />
            </div>

            <Accordion type="multiple" defaultValue={Object.keys(SECTION_LABELS)} className="space-y-2">
                {Object.entries(groupedContent || {}).map(([section, items]) => (
                    <AccordionItem key={section} value={section} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{SECTION_LABELS[section]?.en || section}</span>
                                <Badge variant="outline" className="text-xs">{items.length}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 pb-2">
                                {items.map((item) =>
                                    editingKey === item.key ? (
                                        <div key={item.key} className="p-4 bg-muted/50 rounded-lg border space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium">{item.label || item.key}</div>
                                                    <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
                                                    {item.description && (
                                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                                    )}
                                                    {(item.draft_value_sk || item.draft_value_en || item.draft_value_de || item.draft_value_cn) && (
                                                        <Badge variant="secondary" className="mt-2 text-[10px]">Has Draft</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        disabled={updateMutation.isPending}
                                                        onClick={() => saveDraft(item)}
                                                    >
                                                        <Tick01Icon size={14} className="mr-1" />
                                                        Save Draft
                                                    </Button>
                                                    <Button size="sm" variant="secondary" onClick={() => publishDraft(item)}>
                                                        Publish
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                                                        <Cancel01Icon size={14} />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Slovak (Source) */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold text-blue-600">Slovak (Source)</Label>
                                                    {item.content_type !== 'image' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 text-xs gap-1 bg-white"
                                                            onClick={handleAutoTranslate}
                                                            disabled={isTranslating}
                                                        >
                                                            <AiMagicIcon size={12} className={isTranslating ? "animate-pulse" : ""} />
                                                            {isTranslating ? "Translating..." : "Auto-Translate All"}
                                                        </Button>
                                                    )}
                                                </div>
                                                {item.content_type === 'image' ? (
                                                    <div className="space-y-2">
                                                        {editForm.value_sk && (
                                                            <img src={editForm.value_sk} alt="" className="w-full max-w-sm rounded border" />
                                                        )}
                                                        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                                                            <Input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) uploadImage(file, item);
                                                                }}
                                                            />
                                                            <Button size="sm" variant="outline" disabled={uploading}>
                                                                {uploading ? 'Uploading...' : 'Upload Image'}
                                                            </Button>
                                                        </label>
                                                        <p className="text-[10px] text-muted-foreground">Image URL will be used for all languages.</p>
                                                    </div>
                                                ) : isLongText(item.value_sk) || item.content_type === 'textarea' ? (
                                                    <Textarea
                                                        value={editForm.value_sk}
                                                        onChange={(e) => setEditForm((f) => ({ ...f, value_sk: e.target.value }))}
                                                        rows={3}
                                                    />
                                                ) : (
                                                    <Input
                                                        value={editForm.value_sk}
                                                        onChange={(e) => setEditForm((f) => ({ ...f, value_sk: e.target.value }))}
                                                    />
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* English */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs">English</Label>
                                                    {item.content_type === 'image' ? (
                                                        <Input
                                                            value={editForm.value_en}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_en: e.target.value }))}
                                                        />
                                                    ) : isLongText(item.value_en) || item.content_type === 'textarea' ? (
                                                        <Textarea
                                                            value={editForm.value_en}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_en: e.target.value }))}
                                                            rows={3}
                                                        />
                                                    ) : (
                                                        <Input
                                                            value={editForm.value_en}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_en: e.target.value }))}
                                                        />
                                                    )}
                                                </div>

                                                {/* German */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs">German</Label>
                                                    {item.content_type === 'image' ? (
                                                        <Input
                                                            value={editForm.value_de}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_de: e.target.value }))}
                                                        />
                                                    ) : isLongText(item.value_de) || item.content_type === 'textarea' ? (
                                                        <Textarea
                                                            value={editForm.value_de}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_de: e.target.value }))}
                                                            rows={3}
                                                        />
                                                    ) : (
                                                        <Input
                                                            value={editForm.value_de}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_de: e.target.value }))}
                                                        />
                                                    )}
                                                </div>

                                                {/* Chinese */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Chinese</Label>
                                                    {item.content_type === 'image' ? (
                                                        <Input
                                                            value={editForm.value_cn}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_cn: e.target.value }))}
                                                        />
                                                    ) : isLongText(item.value_cn) || item.content_type === 'textarea' ? (
                                                        <Textarea
                                                            value={editForm.value_cn}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_cn: e.target.value }))}
                                                            rows={3}
                                                        />
                                                    ) : (
                                                        <Input
                                                            value={editForm.value_cn}
                                                            onChange={(e) => setEditForm((f) => ({ ...f, value_cn: e.target.value }))}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            key={item.key}
                                            className="flex items-start gap-4 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group"
                                            onClick={() => startEdit(item)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium">{item.label || item.key}</span>
                                                    {(item.draft_value_sk || item.draft_value_en || item.draft_value_de || item.draft_value_cn) && (
                                                        <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                                                    )}
                                                    {!item.registered && (
                                                        <Badge variant="outline" className="text-[10px]">Unregistered</Badge>
                                                    )}
                                                </div>
                                                <div className="font-mono text-xs text-muted-foreground mb-1">{item.key}</div>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-xs text-muted-foreground">SK: </span>
                                                        <span className="text-foreground">
                                                            {item.value_sk?.length > 40 ? `${item.value_sk.slice(0, 40)}...` : item.value_sk}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                                        <span>EN: {item.value_en ? '✅' : '❌'}</span>
                                                        <span>DE: {item.value_de ? '✅' : '❌'}</span>
                                                        <span>CN: {item.value_cn ? '✅' : '❌'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PencilEdit01Icon size={14} />
                                            </Button>
                                        </div>
                                    )
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            {filteredContent?.length === 0 && searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                    No content found matching "{searchQuery}"
                </div>
            )}
        </div>
    );
};

export default ContentManager;
