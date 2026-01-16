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
import { PencilEdit01Icon, Cancel01Icon, Tick01Icon, Search01Icon, TextIcon } from 'hugeicons-react';

interface SiteContent {
    id: string;
    key: string;
    value_sk: string;
    value_en: string;
    content_type: string;
    section: string;
    description: string | null;
}

const SECTION_LABELS: Record<string, { sk: string; en: string }> = {
    hero: { sk: 'Hero sekcia', en: 'Hero Section' },
    about: { sk: 'O nás', en: 'About' },
    services: { sk: 'Služby', en: 'Services' },
    team: { sk: 'Tím', en: 'Team' },
    network: { sk: 'Globálna sieť', en: 'Global Network' },
    contact: { sk: 'Kontakt', en: 'Contact' },
    footer: { sk: 'Päta', en: 'Footer' },
    general: { sk: 'Všeobecné', en: 'General' },
};

const ContentManager = () => {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ value_sk: '', value_en: '' });
    const [searchQuery, setSearchQuery] = useState('');

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

    const updateMutation = useMutation({
        mutationFn: async ({ id, value_sk, value_en }: { id: string; value_sk: string; value_en: string }) => {
            const { error } = await supabase
                .from('site_content')
                .update({ value_sk, value_en })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Content updated');
            queryClient.invalidateQueries({ queryKey: ['site-content-admin'] });
            queryClient.invalidateQueries({ queryKey: ['site-content'] });
            setEditingId(null);
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const startEdit = (item: SiteContent) => {
        setEditingId(item.id);
        setEditForm({ value_sk: item.value_sk, value_en: item.value_en });
    };

    const filteredContent = content?.filter(
        (item) =>
            item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.value_sk.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.value_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    // Group by section
    const groupedContent = filteredContent?.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
    }, {} as Record<string, SiteContent[]>);

    const isLongText = (text: string) => text.length > 80;

    if (isLoading) return <div className="p-4 text-muted-foreground">Loading content...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <TextIcon size={20} className="text-primary" />
                <h2 className="text-lg font-semibold">Site Content</h2>
                <Badge variant="secondary">{filteredContent?.length || 0}</Badge>
            </div>

            <p className="text-sm text-muted-foreground">
                Edit text content across your website. Changes are saved to the database and reflected immediately.
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
                                    editingId === item.id ? (
                                        <div key={item.id} className="p-4 bg-muted/50 rounded-lg border space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
                                                    {item.description && (
                                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => updateMutation.mutate({ id: item.id, ...editForm })}
                                                        disabled={updateMutation.isPending}
                                                    >
                                                        <Tick01Icon size={14} className="mr-1" />
                                                        Save
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                                        <Cancel01Icon size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Slovak (SK)</Label>
                                                    {isLongText(item.value_sk) ? (
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
                                                <div className="space-y-2">
                                                    <Label className="text-xs">English (EN)</Label>
                                                    {isLongText(item.value_en) ? (
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
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-4 p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group"
                                            onClick={() => startEdit(item)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
                                                </div>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-xs text-muted-foreground">SK: </span>
                                                        <span className="text-foreground">{item.value_sk.length > 60 ? `${item.value_sk.slice(0, 60)}...` : item.value_sk}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-muted-foreground">EN: </span>
                                                        <span className="text-foreground">{item.value_en.length > 60 ? `${item.value_en.slice(0, 60)}...` : item.value_en}</span>
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
