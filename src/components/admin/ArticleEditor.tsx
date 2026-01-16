"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Upload, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
    });
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'sk' | 'en' | 'de' | 'cn'>('sk');

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

    const updateField = (field: 'title' | 'excerpt' | 'content', value: string) => {
        const key = `${field}_${activeTab}` as keyof ArticleFormData;
        setFormData(prev => ({ ...prev, [key]: value }));
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
                    Supports Markdown formatting. For rich text editing, consider integrating a WYSIWYG editor.
                </p>
            </div>
        </div>
    );
}
