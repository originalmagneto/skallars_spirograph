"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Upload, X, Eye, EyeOff, Trash2, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { generateAIEdit } from '@/lib/aiService';

interface ArticleFormData {
    title_sk: string;
    title_en: string;
    title_de: string;
    title_cn: string;
    slug: string;
    excerpt_sk: string;
    excerpt_en: string;
    excerpt_de: string;
    excerpt_cn: string;
    content_sk: string;
    content_en: string;
    content_de: string;
    content_cn: string;
    cover_image_url: string;
    is_published: boolean;
    compliance_disclaimer_sk: string;
    compliance_disclaimer_en: string;
    compliance_disclaimer_de: string;
    compliance_disclaimer_cn: string;
    fact_checklist: Record<string, boolean>;
}

interface ArticleEditorProps {
    articleId?: string;
    onClose?: () => void;
}

export default function ArticleEditor({ articleId, onClose }: ArticleEditorProps) {
    const isNew = !articleId || articleId === 'new';
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isAdmin, isEditor } = useAuth();

    const factChecklistDefaults: Array<{ key: string; label: string }> = [
        { key: 'facts_verified', label: 'Facts and figures verified against sources' },
        { key: 'jurisdiction_clear', label: 'Jurisdiction and scope are clearly stated' },
        { key: 'citations_present', label: 'Citations or references included where relevant' },
        { key: 'no_legal_advice', label: 'No direct legal advice or client-specific promises' },
        { key: 'risk_balanced', label: 'Risks and limitations are disclosed' },
        { key: 'compliance_reviewed', label: 'Compliance review completed' },
    ];

    const disclaimerDefaults: Record<string, string> = {
        sk: 'Tento článok má informačný charakter a nepredstavuje právne poradenstvo. Pre konkrétne prípady odporúčame individuálnu konzultáciu.',
        en: 'This article is for informational purposes only and does not constitute legal advice. For specific matters, please seek individual counsel.',
        de: 'Dieser Artikel dient nur zu Informationszwecken und stellt keine Rechtsberatung dar. Für konkrete Fälle empfehlen wir eine individuelle Beratung.',
        cn: '本文仅供信息参考，不构成法律建议。如需具体建议，请咨询专业人士。',
    };

    const [formData, setFormData] = useState<ArticleFormData>({
        title_sk: '',
        title_en: '',
        title_de: '',
        title_cn: '',
        slug: '',
        excerpt_sk: '',
        excerpt_en: '',
        excerpt_de: '',
        excerpt_cn: '',
        content_sk: '',
        content_en: '',
        content_de: '',
        content_cn: '',
        cover_image_url: '',
        is_published: false,
        compliance_disclaimer_sk: '',
        compliance_disclaimer_en: '',
        compliance_disclaimer_de: '',
        compliance_disclaimer_cn: '',
        fact_checklist: factChecklistDefaults.reduce((acc, item) => {
            acc[item.key] = false;
            return acc;
        }, {} as Record<string, boolean>),
    });
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'sk' | 'en' | 'de' | 'cn'>('sk');
    const [editTarget, setEditTarget] = useState<'content' | 'excerpt'>('content');
    const [editMode, setEditMode] = useState<'rewrite' | 'expand' | 'shorten' | 'simplify'>('rewrite');
    const [editInstruction, setEditInstruction] = useState('');
    const [editOutput, setEditOutput] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Fetch existing article
    const { data: article, isLoading: articleLoading } = useQuery({
        queryKey: ['article-edit', articleId],
        queryFn: async () => {
            if (isNew) return null;
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .eq('id', articleId)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !isNew && !!articleId,
    });

    // Populate form with existing article data
    useEffect(() => {
        if (article) {
            setFormData({
                title_sk: article.title_sk || '',
                title_en: article.title_en || '',
                title_de: article.title_de || '',
                title_cn: article.title_cn || '',
                slug: article.slug || '',
                excerpt_sk: article.excerpt_sk || '',
                excerpt_en: article.excerpt_en || '',
                excerpt_de: article.excerpt_de || '',
                excerpt_cn: article.excerpt_cn || '',
                content_sk: article.content_sk || '',
                content_en: article.content_en || '',
                content_de: article.content_de || '',
                content_cn: article.content_cn || '',
                cover_image_url: article.cover_image_url || '',
                is_published: article.is_published || false,
                compliance_disclaimer_sk: article.compliance_disclaimer_sk || '',
                compliance_disclaimer_en: article.compliance_disclaimer_en || '',
                compliance_disclaimer_de: article.compliance_disclaimer_de || '',
                compliance_disclaimer_cn: article.compliance_disclaimer_cn || '',
                fact_checklist: article.fact_checklist || factChecklistDefaults.reduce((acc, item) => {
                    acc[item.key] = false;
                    return acc;
                }, {} as Record<string, boolean>),
            });
        }
    }, [article]);

    // Auto-generate slug from Slovak title
    useEffect(() => {
        if (isNew && formData.title_sk) {
            const slug = formData.title_sk
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
    }, [formData.title_sk, isNew]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Not authenticated');

            const articleData = {
                ...formData,
                author_id: user.id,
                published_at: formData.is_published ? new Date().toISOString() : null,
            };

            let newArticleId = articleId;

            if (isNew) {
                const { data, error } = await supabase
                    .from('articles')
                    .insert(articleData)
                    .select('id')
                    .single();
                if (error) throw error;
                newArticleId = data.id;
            } else {
                const { error } = await supabase
                    .from('articles')
                    .update(articleData)
                    .eq('id', articleId);
                if (error) throw error;
            }

            return newArticleId;
        },
        onSuccess: () => {
            toast.success(isNew ? 'Article created!' : 'Article saved!');
            queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            if (onClose) {
                onClose();
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to save article');
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (isNew || !articleId) throw new Error('Cannot delete unsaved article');
            const { error } = await supabase.from('articles').delete().eq('id', articleId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Article deleted');
            queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            if (onClose) {
                onClose();
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete article');
        },
    });

    // Cover image upload
    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, cover_image_url: urlData.publicUrl }));
            toast.success('Cover image uploaded!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    if (articleLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading article...</p>
            </div>
        );
    }

    const getCurrentTitle = () => {
        switch (activeTab) {
            case 'sk': return formData.title_sk;
            case 'en': return formData.title_en;
            case 'de': return formData.title_de;
            case 'cn': return formData.title_cn;
            default: return formData.title_sk;
        }
    };

    const getCurrentExcerpt = () => {
        switch (activeTab) {
            case 'sk': return formData.excerpt_sk;
            case 'en': return formData.excerpt_en;
            case 'de': return formData.excerpt_de;
            case 'cn': return formData.excerpt_cn;
            default: return formData.excerpt_sk;
        }
    };

    const getCurrentContent = () => {
        switch (activeTab) {
            case 'sk': return formData.content_sk;
            case 'en': return formData.content_en;
            case 'de': return formData.content_de;
            case 'cn': return formData.content_cn;
            default: return formData.content_sk;
        }
    };

    const getCurrentDisclaimer = () => {
        switch (activeTab) {
            case 'sk': return formData.compliance_disclaimer_sk;
            case 'en': return formData.compliance_disclaimer_en;
            case 'de': return formData.compliance_disclaimer_de;
            case 'cn': return formData.compliance_disclaimer_cn;
            default: return formData.compliance_disclaimer_sk;
        }
    };

    const updateField = (field: 'title' | 'excerpt' | 'content', value: string) => {
        const key = `${field}_${activeTab}` as keyof ArticleFormData;
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const updateDisclaimer = (value: string) => {
        const key = `compliance_disclaimer_${activeTab}` as keyof ArticleFormData;
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const languageLabel = () => {
        if (activeTab === 'sk') return 'Slovak (SK)';
        if (activeTab === 'en') return 'English (EN)';
        if (activeTab === 'de') return 'German (DE)';
        if (activeTab === 'cn') return 'Chinese (CN)';
        return 'English (EN)';
    };

    const handleEditorialEdit = async () => {
        const inputText = editTarget === 'content' ? getCurrentContent() : getCurrentExcerpt();
        if (!inputText?.trim()) {
            toast.error('Please add text to edit first.');
            return;
        }
        setEditLoading(true);
        try {
            const output = await generateAIEdit(inputText, {
                mode: editMode,
                customInstruction: editInstruction,
                languageLabel: languageLabel(),
            });
            setEditOutput(output);
        } catch (error: any) {
            toast.error(error.message || 'AI edit failed');
        } finally {
            setEditLoading(false);
        }
    };

    const applyEditorialEdit = () => {
        if (!editOutput.trim()) return;
        updateField(editTarget, editOutput);
        toast.success('Applied AI edit');
    };

    const getLabel = (enLabel: string, skLabel: string) => {
        return activeTab === 'sk' ? skLabel : enLabel + ` (${activeTab.toUpperCase()})`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">
                        {isNew ? 'New Article' : 'Edit Article'}
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {formData.is_published ? (
                            <Eye size={16} className="text-green-600" />
                        ) : (
                            <EyeOff size={16} className="text-muted-foreground" />
                        )}
                        <Label htmlFor="published" className="text-sm">
                            {formData.is_published ? 'Published' : 'Draft'}
                        </Label>
                        <Switch
                            id="published"
                            checked={formData.is_published}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                        />
                    </div>
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                        <Save size={16} className="mr-2" />
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>

                    {/* Delete Button */}
                    {!isNew && isAdmin && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 size={16} />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Article</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete this article? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => deleteMutation.mutate()}
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
                <Label>Cover Image</Label>
                {formData.cover_image_url ? (
                    <div className="relative group">
                        <img
                            src={formData.cover_image_url}
                            alt="Cover"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setFormData(prev => ({ ...prev, cover_image_url: '' }))}
                        >
                            <X size={16} />
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-input rounded-lg bg-muted/30 transition-colors">
                        <Upload size={32} className="text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">
                            {uploading ? 'Uploading...' : 'Upload cover image'}
                        </p>
                        <Button variant="outline" size="sm" asChild className="cursor-pointer">
                            <label>
                                Choose File
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleCoverUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </Button>
                    </div>
                )}
            </div>

            {/* Language Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab('sk')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sk'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    🇸🇰 Slovensky
                </button>
                <button
                    onClick={() => setActiveTab('en')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'en'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    🇬🇧 English
                </button>
                <button
                    onClick={() => setActiveTab('de')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'de'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    🇩🇪 Deutsch
                </button>
                <button
                    onClick={() => setActiveTab('cn')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'cn'
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    🇨🇳 Chinese
                </button>
            </div>

            {/* Title & Excerpt */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>{getLabel('Title', 'Titulok')}</Label>
                    <Input
                        value={getCurrentTitle()}
                        onChange={(e) => updateField('title', e.target.value)}
                        placeholder={getLabel('Article title...', 'Názov článku...')}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Slug (URL)</Label>
                    <Input
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="article-url-slug"
                    />
                </div>

                <div className="space-y-2">
                    <Label>{getLabel('Excerpt', 'Krátky popis')}</Label>
                    <Textarea
                        value={getCurrentExcerpt()}
                        onChange={(e) => updateField('excerpt', e.target.value)}
                        placeholder={getLabel('Short article description...', 'Krátky popis článku...')}
                        rows={3}
                    />
                </div>
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
                <Label>{getLabel('Content', 'Obsah')}</Label>
                <Textarea
                    value={getCurrentContent()}
                    onChange={(e) => updateField('content', e.target.value)}
                    placeholder={getLabel('Start writing article content...', 'Začnite písať obsah článku...')}
                    rows={12}
                    className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    Content is rendered as HTML on the blog. Use valid HTML tags. For rich text editing, consider integrating a WYSIWYG editor.
                </p>
            </div>

            {/* Editorial Tools */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} />
                    <Label className="text-sm font-semibold">Editorial Tools (AI)</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Apply To</Label>
                        <Select value={editTarget} onValueChange={(value) => setEditTarget(value as 'content' | 'excerpt')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select target" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="content">Content</SelectItem>
                                <SelectItem value="excerpt">Excerpt</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Action</Label>
                        <Select value={editMode} onValueChange={(value) => setEditMode(value as 'rewrite' | 'expand' | 'shorten' | 'simplify')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rewrite">Rewrite</SelectItem>
                                <SelectItem value="expand">Expand</SelectItem>
                                <SelectItem value="shorten">Shorten</SelectItem>
                                <SelectItem value="simplify">Simplify</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Custom Instructions (optional)</Label>
                    <Textarea
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        rows={2}
                        placeholder="e.g., Keep tone formal and cite Slovak regulations."
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleEditorialEdit} disabled={editLoading}>
                        {editLoading ? 'Editing...' : 'Generate AI Edit'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditOutput('')}>
                        Clear Output
                    </Button>
                </div>
                {editOutput && (
                    <div className="space-y-2">
                        <Label>AI Output (review before applying)</Label>
                        <Textarea
                            value={editOutput}
                            onChange={(e) => setEditOutput(e.target.value)}
                            rows={6}
                            className="font-mono text-xs"
                        />
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={applyEditorialEdit}>
                                Apply to {editTarget}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditOutput('')}>
                                Discard
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Compliance & Fact Check */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <Label className="text-sm font-semibold">Fact-Check & Compliance</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {factChecklistDefaults.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2 bg-white">
                            <div className="text-xs text-muted-foreground">{item.label}</div>
                            <Switch
                                checked={Boolean(formData.fact_checklist?.[item.key])}
                                onCheckedChange={(checked) =>
                                    setFormData(prev => ({
                                        ...prev,
                                        fact_checklist: {
                                            ...(prev.fact_checklist || {}),
                                            [item.key]: checked,
                                        },
                                    }))
                                }
                            />
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>{getLabel('Compliance Disclaimer', 'Právne upozornenie')}</Label>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateDisclaimer(disclaimerDefaults[activeTab] || '')}
                        >
                            Use Default Disclaimer
                        </Button>
                    </div>
                    <Textarea
                        value={getCurrentDisclaimer()}
                        onChange={(e) => updateDisclaimer(e.target.value)}
                        rows={3}
                        placeholder="Add a legal disclaimer for this language..."
                    />
                </div>
            </div>
        </div>
    );
}
