import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PencilEdit01Icon,
    Search01Icon,
    TextIcon,
    AiMagicIcon,
    Tick01Icon,
    Cancel01Icon,
    ArrowRight01Icon,
    Image01Icon,
    GridViewIcon,
    Menu01Icon
} from 'hugeicons-react';
import { generateContentTranslation } from '@/lib/aiService';
import MediaLibraryPicker from '@/components/admin/MediaLibraryPicker';
import { cn } from '@/lib/utils';
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from '@/components/admin/AdminPrimitives';

// -- Interfaces --

interface SiteContent {
    key: string;
    value_sk: string;
    value_en: string;
    value_de: string;
    value_cn: string;
    draft_value_sk?: string | null;
    draft_value_en?: string | null;
    draft_value_de?: string | null;
    draft_value_cn?: string | null;
    draft_updated_at?: string | null;
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

// -- Configuration --

const BRAND_INDIGO = "#210059";
const BRAND_LIME = "#91CF17";

const SECTION_CONFIG: Record<string, { sk: string; en: string; icon: any }> = {
    navigation: { sk: 'Navigácia', en: 'Navigation', icon: Menu01Icon },
    hero: { sk: 'Hero sekcia', en: 'Hero Section', icon: Image01Icon },
    about: { sk: 'O nás', en: 'About', icon: TextIcon },
    services: { sk: 'Služby', en: 'Services', icon: GridViewIcon },
    countries: { sk: 'Krajiny', en: 'Countries', icon: null },
    team: { sk: 'Tím', en: 'Team', icon: null },
    news: { sk: 'Novinky', en: 'News', icon: null },
    clients: { sk: 'Klienti', en: 'Clients', icon: null },
    network: { sk: 'Globálna sieť', en: 'Global Network', icon: null },
    contact: { sk: 'Kontakt', en: 'Contact', icon: null },
    map: { sk: 'Mapa', en: 'Map', icon: null },
    footer: { sk: 'Päta', en: 'Footer', icon: null },
    general: { sk: 'Všeobecné', en: 'General', icon: null },
};

// -- Components --

const ContentRow = ({
    item,
    isSelected,
    onSelect,
    onSave,
    onPublish
}: {
    item: ContentItem,
    isSelected: boolean,
    onSelect: (item: ContentItem | null) => void,
    onSave: (key: string, data: any) => Promise<void>,
    onPublish: (key: string, data: any) => Promise<void>
}) => {
    const [form, setForm] = useState({
        value_sk: item.draft_value_sk ?? item.value_sk ?? '',
        value_en: item.draft_value_en ?? item.value_en ?? '',
        value_de: item.draft_value_de ?? item.value_de ?? '',
        value_cn: item.draft_value_cn ?? item.value_cn ?? ''
    });
    const [libOpen, setLibOpen] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    const hasDraft = Boolean(item.draft_value_sk || item.draft_value_en);
    const isImage = item.content_type === 'image';

    const handleAutoTranslate = async () => {
        if (!form.value_sk) return toast.error('Source text missing');
        setIsTranslating(true);
        try {
            const t = await generateContentTranslation(form.value_sk);
            setForm(prev => ({ ...prev, value_en: t.en, value_de: t.de, value_cn: t.cn }));
            toast.success('Translated');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "group relative border-b last:border-0 bg-white overflow-hidden transition-colors",
                isSelected ? "bg-slate-50" : "hover:bg-slate-50/50"
            )}
        >
            {/* Active Indicator Line */}
            {isSelected && (
                <motion.div
                    layoutId="active-line"
                    className="absolute left-0 top-0 bottom-0 w-1 z-10"
                    style={{ backgroundColor: BRAND_LIME }}
                />
            )}

            {/* Collapsed View / Header */}
            <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => onSelect(isSelected ? null : item)}
            >
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isSelected ? "bg-[#210059] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-[#210059]/10 group-hover:text-[#210059]"
                )}>
                    {isImage ? <Image01Icon size={18} /> : <TextIcon size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{item.label || item.key}</h3>
                        {hasDraft && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                                Draft
                            </span>
                        )}
                        {!item.registered && (
                            <span className="text-[10px] font-mono text-slate-400">
                                {item.key}
                            </span>
                        )}
                    </div>
                    {!isSelected && (
                        <p className="text-xs text-slate-500 truncate mt-0.5 max-w-2xl">
                            {item.draft_value_sk || item.value_sk || <span className="italic opacity-50">Empty</span>}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                        {['sk', 'en', 'de', 'cn'].map(lang => {
                            const hasVal = !!((form as any)[`value_${lang}`]);
                            return (
                                <div
                                    key={lang}
                                    className={cn(
                                        "w-2 h-2 rounded-full ring-2 ring-white",
                                        hasVal ? "bg-green-400" : "bg-slate-200"
                                    )}
                                />
                            );
                        })}
                    </div>
                    <motion.div animate={{ rotate: isSelected ? 90 : 0 }}>
                        <ArrowRight01Icon size={16} className="text-slate-400" />
                    </motion.div>
                </div>
            </div>

            {/* Expanded Editing Area */}
            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 pt-2">
                            <div className="max-w-3xl mx-auto space-y-6">
                                {/* Editor Area - Full Width */}
                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold text-[#210059] uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
                                        Content Editor
                                    </h4>

                                    {/* Source (Slovak) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold text-slate-500">Slovak (Source)</Label>
                                            {!isImage && (
                                                <Button variant="ghost" size="sm" className="h-5 gap-1 text-[10px] text-[#210059]" onClick={handleAutoTranslate} disabled={isTranslating}>
                                                    <AiMagicIcon size={10} className={isTranslating ? "animate-spin" : ""} />
                                                    Translate All
                                                </Button>
                                            )}
                                        </div>

                                        {isImage ? (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={form.value_sk}
                                                        onChange={e => setForm(f => ({ ...f, value_sk: e.target.value, value_en: e.target.value, value_de: e.target.value, value_cn: e.target.value }))}
                                                        className="font-mono text-xs flex-1"
                                                        placeholder="https://..."
                                                    />
                                                    <Button size="sm" variant="secondary" onClick={() => setLibOpen(true)}>
                                                        Library
                                                    </Button>
                                                </div>
                                                {form.value_sk && (
                                                    <div className="mt-2 text-center bg-slate-50 rounded-lg p-4 border border-slate-100">
                                                        <img src={form.value_sk} alt="Preview" className="max-h-48 mx-auto rounded shadow-sm" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={form.value_sk}
                                                onChange={e => setForm(f => ({ ...f, value_sk: e.target.value }))}
                                                className="min-h-[100px] resize-none focus-visible:ring-[#91CF17]"
                                                placeholder="Enter Slovak content..."
                                            />
                                        )}
                                    </div>

                                    {/* Translations */}
                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-slate-400">English</Label>
                                            <Input
                                                value={form.value_en}
                                                onChange={e => setForm(f => ({ ...f, value_en: e.target.value }))}
                                                className={cn("focus-visible:ring-[#91CF17]")}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-bold text-slate-400">German</Label>
                                                <Input
                                                    value={form.value_de}
                                                    onChange={e => setForm(f => ({ ...f, value_de: e.target.value }))}
                                                    className={cn("focus-visible:ring-[#91CF17]")}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-bold text-slate-400">Chinese</Label>
                                                <Input
                                                    value={form.value_cn}
                                                    onChange={e => setForm(f => ({ ...f, value_cn: e.target.value }))}
                                                    className={cn("focus-visible:ring-[#91CF17]")}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
                                <div className="text-xs text-slate-400 font-mono">
                                    {item.key}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => onSave(item.key, form)} className="border-orange-200 hover:bg-orange-50 hover:text-orange-700 text-slate-600">
                                        <PencilEdit01Icon size={14} className="mr-2" />
                                        Save Draft
                                    </Button>
                                    <Button className="bg-[#210059] hover:bg-[#210059]/90 text-white min-w-[140px]" onClick={() => onPublish(item.key, form)}>
                                        <Tick01Icon size={14} className="mr-2" />
                                        Publish Live
                                    </Button>
                                </div>
                            </div>

                            {/* Library Modal */}
                            {libOpen && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8">
                                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-full overflow-hidden flex flex-col">
                                        <div className="flex items-center justify-between p-4 border-b">
                                            <h3 className="font-semibold">Select Image</h3>
                                            <Button size="sm" variant="ghost" onClick={() => setLibOpen(false)}>Close</Button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4">
                                            <MediaLibraryPicker
                                                onSelect={(url) => {
                                                    setForm(f => ({ ...f, value_sk: url, value_en: url, value_de: url, value_cn: url }));
                                                    setLibOpen(false);
                                                }}
                                                onClose={() => setLibOpen(false)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// -- Main Component --

const ContentManager = () => {
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState('hero');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Content
    const { data: content = [] } = useQuery({
        queryKey: ['site-content-admin'],
        queryFn: async () => {
            const { data } = await supabase
                .from('site_content')
                .select('*')
                .order('section').order('key');
            return data as SiteContent[];
        }
    });

    // Fetch Registry
    const { data: registry = [] } = useQuery({
        queryKey: ['content-registry'],
        queryFn: async () => {
            const { data } = await supabase
                .from('content_registry')
                .select('*')
                .order('section').order('sort_order');
            return data as ContentRegistryItem[];
        }
    });

    // Mutations
    const upsertMutation = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase.from('site_content').upsert(payload, { onConflict: 'key' });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Saved successfully');
            queryClient.invalidateQueries({ queryKey: ['site-content-admin'] });
        },
        onError: (e: any) => toast.error(e.message)
    });

    const handleSave = async (key: string, values: any) => {
        const item = content.find(c => c.key === key) || registry.find(r => r.key === key);
        if (!item) return;

        await upsertMutation.mutateAsync({
            content_type: item.content_type,
            section: item.section,
            description: item.description,
            key,
            draft_value_sk: values.value_sk,
            draft_value_en: values.value_en,
            draft_value_de: values.value_de,
            draft_value_cn: values.value_cn,
            draft_updated_at: new Date().toISOString()
        });
    };

    const handlePublish = async (key: string, values: any) => {
        const item = content.find(c => c.key === key) || registry.find(r => r.key === key);
        if (!item) return;

        await upsertMutation.mutateAsync({
            key,
            content_type: item.content_type,
            section: item.section,
            description: item.description,
            value_sk: values.value_sk,
            value_en: values.value_en,
            value_de: values.value_de,
            value_cn: values.value_cn,
            draft_value_sk: null,
            draft_value_en: null,
            draft_value_de: null,
            draft_value_cn: null,
            draft_updated_at: null
        });
        setSelectedKey(null);
    };

    // Data Processing
    const registryMap = new Map(registry.map(r => [r.key, r]));
    const contentMap = new Map(content.map(c => [c.key, c]));

    // Merge
    const allItems: ContentItem[] = [
        ...registry.map(reg => ({
            ...contentMap.get(reg.key),
            ...reg,
            registered: true,
            value_sk: contentMap.get(reg.key)?.value_sk || '',
            value_en: contentMap.get(reg.key)?.value_en || '',
            value_de: contentMap.get(reg.key)?.value_de || '',
            value_cn: contentMap.get(reg.key)?.value_cn || '',
        } as ContentItem)),
        ...content.filter(c => !registryMap.has(c.key)).map(c => ({
            ...c,
            label: c.key,
            sort_order: 9999,
            registered: false
        }))
    ];

    const filteredItems = allItems
        .filter(item => {
            if (searchQuery) return item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.value_sk.toLowerCase().includes(searchQuery.toLowerCase());
            return item.section === activeSection;
        })
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

    const sectionCounts = allItems.reduce((acc, item) => {
        acc[item.section] = (acc[item.section] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-5">
            <AdminPanelHeader
                title="Site Editor"
                description="Manage global website content and translations."
                actions={
                    <div className="relative w-full md:w-72">
                        <Search01Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search content..."
                            className="pl-9"
                        />
                    </div>
                }
            />

            <AdminActionBar className="overflow-x-auto">
                <div className="inline-flex items-center gap-1 p-1 rounded-lg border bg-white min-w-full md:min-w-0">
                    {Object.entries(SECTION_CONFIG).map(([key, config]) => {
                        const isActive = activeSection === key && !searchQuery;
                        const count = sectionCounts[key] || 0;
                        const Icon = config.icon || ArrowRight01Icon;

                        return (
                            <button
                                key={key}
                                onClick={() => { setActiveSection(key); setSearchQuery(''); }}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-colors min-w-fit",
                                    isActive
                                        ? "bg-slate-100 text-[#210059]"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Icon size={16} className={cn(isActive ? "text-[#210059]" : "text-slate-400")} />
                                <span>{config.en}</span>
                                {count > 0 && (
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded ml-1 transition-colors",
                                        isActive ? "bg-white text-[#210059]" : "bg-slate-100 text-slate-500"
                                    )}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </AdminActionBar>

            <AdminSectionCard className="p-0 overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#210059]">
                            {searchQuery ? 'Search Results' : SECTION_CONFIG[activeSection]?.en}
                        </h3>
                        <span className="text-sm text-slate-500">{filteredItems.length} items</span>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-orange-100 ring-1 ring-orange-200" /> Draft
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-white ring-1 ring-slate-200" /> Published
                        </div>
                    </div>
                </div>
                {filteredItems.length > 0 ? (
                    <motion.div layout className="divide-y divide-slate-100 min-h-[420px]">
                        {filteredItems.map(item => (
                            <ContentRow
                                key={item.key}
                                item={item}
                                isSelected={selectedKey === item.key}
                                onSelect={(i) => setSelectedKey(i ? i.key : null)}
                                onSave={handleSave}
                                onPublish={handlePublish}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-400 min-h-[420px]">
                        <Search01Icon size={48} className="text-slate-200 mb-4" />
                        <p>No content found in this section.</p>
                    </div>
                )}
            </AdminSectionCard>
        </div>
    );
};

export default ContentManager;
