"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { generateAIEdit, generateAIImage } from '@/lib/aiService';
import { fetchAISettings } from '@/lib/aiSettings';
import { AdminPanelHeader } from '@/components/admin/AdminPrimitives';

interface ArticleFormData {
    title_sk: string;
    title_en: string;
    title_de: string;
    title_cn: string;
    meta_title_sk: string;
    meta_title_en: string;
    meta_title_de: string;
    meta_title_cn: string;
    meta_description_sk: string;
    meta_description_en: string;
    meta_description_de: string;
    meta_description_cn: string;
    meta_keywords_sk: string;
    meta_keywords_en: string;
    meta_keywords_de: string;
    meta_keywords_cn: string;
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
    published_at?: string | null;
    status: string;
    scheduled_at: string | null;
    submitted_at: string | null;
    approved_at: string | null;
    approved_by: string | null;
    compliance_disclaimer_sk: string;
    compliance_disclaimer_en: string;
    compliance_disclaimer_de: string;
    compliance_disclaimer_cn: string;
    fact_checklist: Record<string, boolean>;
    tags: string[];
}

interface ArticleEditorProps {
    articleId?: string;
    onClose?: () => void;
}

export default function ArticleEditor({ articleId, onClose }: ArticleEditorProps) {
    const isNew = !articleId || articleId === 'new';
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { user, session, isAdmin, isEditor } = useAuth();
    const panelParam = searchParams.get('panel');
    const linkedinParam = searchParams.get('linkedin');
    const linkedinReason = searchParams.get('reason');

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
        meta_title_sk: '',
        meta_title_en: '',
        meta_title_de: '',
        meta_title_cn: '',
        meta_description_sk: '',
        meta_description_en: '',
        meta_description_de: '',
        meta_description_cn: '',
        meta_keywords_sk: '',
        meta_keywords_en: '',
        meta_keywords_de: '',
        meta_keywords_cn: '',
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
        published_at: null,
        status: 'draft',
        scheduled_at: null,
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        compliance_disclaimer_sk: '',
        compliance_disclaimer_en: '',
        compliance_disclaimer_de: '',
        compliance_disclaimer_cn: '',
        fact_checklist: factChecklistDefaults.reduce((acc, item) => {
            acc[item.key] = false;
            return acc;
        }, {} as Record<string, boolean>),
        tags: [],
    });
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'sk' | 'en' | 'de' | 'cn'>('sk');
    const [editTarget, setEditTarget] = useState<'content' | 'excerpt'>('content');
    const [editMode, setEditMode] = useState<'rewrite' | 'expand' | 'shorten' | 'simplify'>('rewrite');
    const [editInstruction, setEditInstruction] = useState('');
    const [editOutput, setEditOutput] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
    const [tagsInput, setTagsInput] = useState('');
    const editorRef = useRef<HTMLDivElement | null>(null);
    const linkedinSectionRef = useRef<HTMLDivElement | null>(null);
    const [seoFieldsAvailable, setSeoFieldsAvailable] = useState(true);
    const [workflowFieldsAvailable, setWorkflowFieldsAvailable] = useState(true);
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageStyle, setImageStyle] = useState('Editorial Photo');
    const [imageAspect, setImageAspect] = useState<'1:1' | '16:9' | '4:3' | '3:4'>('16:9');
    const [imageCount, setImageCount] = useState(2);
    const [imageMode, setImageMode] = useState<'lite' | 'advanced'>('lite');
    const [useGlobalImageSettings, setUseGlobalImageSettings] = useState(true);
    const [globalImageProvider, setGlobalImageProvider] = useState<'gemini' | 'turbo'>('gemini');
    const [globalImageModel, setGlobalImageModel] = useState('');
    const [overrideImageProvider, setOverrideImageProvider] = useState<'gemini' | 'turbo'>('gemini');
    const [overrideImageModel, setOverrideImageModel] = useState('');
    const [imageGenerating, setImageGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; provider: 'gemini' | 'turbo' }>>([]);
    const [linkedinStatus, setLinkedinStatus] = useState<{
        connected: boolean;
        member_name?: string | null;
        member_urn?: string | null;
        expires_at?: string | null;
        expired?: boolean;
        scopes?: string[];
        organization_urns?: string[];
        default_org_urn?: string | null;
    } | null>(null);
    const [linkedinLoading, setLinkedinLoading] = useState(false);
    const [linkedinMessage, setLinkedinMessage] = useState('');
    const [linkedinTarget, setLinkedinTarget] = useState<'member' | 'organization'>('member');
    const [linkedinOrganizations, setLinkedinOrganizations] = useState<Array<{ urn: string; name: string }>>([]);
    const [linkedinOrganizationUrn, setLinkedinOrganizationUrn] = useState('');
    const [linkedinDefaultOrgUrn, setLinkedinDefaultOrgUrn] = useState('');
    const [linkedinOrgNotice, setLinkedinOrgNotice] = useState('');
    const [linkedinSharing, setLinkedinSharing] = useState(false);
    const [linkedinShareMode, setLinkedinShareMode] = useState<'article' | 'image'>('article');
    const [linkedinShareModeTouched, setLinkedinShareModeTouched] = useState(false);
    const [linkedinImageUrl, setLinkedinImageUrl] = useState('');
    const [linkedinLogs, setLinkedinLogs] = useState<Array<{
        id: string;
        status: string;
        share_target: string | null;
        visibility: string | null;
        share_url: string | null;
        error_message: string | null;
        created_at: string;
    }>>([]);
    const [linkedinLogsLoading, setLinkedinLogsLoading] = useState(false);
    const [linkedinScheduleAt, setLinkedinScheduleAt] = useState('');
    const [linkedinScheduled, setLinkedinScheduled] = useState<Array<{
        id: string;
        status: string;
        share_target: string | null;
        share_mode?: string | null;
        visibility: string | null;
        scheduled_at: string;
        error_message: string | null;
        created_at: string;
    }>>([]);
    const [linkedinScheduledLoading, setLinkedinScheduledLoading] = useState(false);
    const [linkedinUiMode, setLinkedinUiMode] = useState<'basic' | 'power'>('basic');

    const hasOrgScope = Boolean(
        linkedinStatus?.scopes?.includes('w_organization_social') ||
        linkedinStatus?.scopes?.includes('r_organization_social') ||
        (linkedinStatus?.organization_urns && linkedinStatus.organization_urns.length > 0)
    );
    const latestLinkedInShare = linkedinLogs.find((log) => log.status === 'success');
    const organizationOptions = useMemo(() => {
        const map = new Map<string, { urn: string; name: string }>();
        linkedinOrganizations.forEach((org) => map.set(org.urn, org));
        if (linkedinDefaultOrgUrn && !map.has(linkedinDefaultOrgUrn)) {
            map.set(linkedinDefaultOrgUrn, { urn: linkedinDefaultOrgUrn, name: 'Default Organization' });
        }
        return Array.from(map.values());
    }, [linkedinOrganizations, linkedinDefaultOrgUrn]);
    const resolveLinkedInOrgUrn = () =>
        linkedinOrganizationUrn ||
        linkedinDefaultOrgUrn ||
        linkedinStatus?.organization_urns?.[0] ||
        organizationOptions[0]?.urn ||
        '';
    const resolveEffectiveLinkedInShareMode = (): 'article' | 'image' => {
        if (linkedinUiMode === 'power') return linkedinShareMode;
        const candidateImageUrl = (linkedinImageUrl || formData.cover_image_url || '').trim();
        return candidateImageUrl ? 'image' : 'article';
    };
    const resolveEffectiveLinkedInImageUrl = () =>
        (linkedinImageUrl || formData.cover_image_url || '').trim();

    const parseJsonSafe = async (res: Response) => {
        try {
            return await res.json();
        } catch {
            return {};
        }
    };

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
            const derivedStatus = article.status || (article.is_published ? 'published' : 'draft');
            setFormData({
                title_sk: article.title_sk || '',
                title_en: article.title_en || '',
                title_de: article.title_de || '',
                title_cn: article.title_cn || '',
                meta_title_sk: article.meta_title_sk || '',
                meta_title_en: article.meta_title_en || '',
                meta_title_de: article.meta_title_de || '',
                meta_title_cn: article.meta_title_cn || '',
                meta_description_sk: article.meta_description_sk || '',
                meta_description_en: article.meta_description_en || '',
                meta_description_de: article.meta_description_de || '',
                meta_description_cn: article.meta_description_cn || '',
                meta_keywords_sk: article.meta_keywords_sk || '',
                meta_keywords_en: article.meta_keywords_en || '',
                meta_keywords_de: article.meta_keywords_de || '',
                meta_keywords_cn: article.meta_keywords_cn || '',
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
                published_at: article.published_at || null,
                status: derivedStatus,
                scheduled_at: article.scheduled_at || null,
                submitted_at: article.submitted_at || null,
                approved_at: article.approved_at || null,
                approved_by: article.approved_by || null,
                compliance_disclaimer_sk: article.compliance_disclaimer_sk || '',
                compliance_disclaimer_en: article.compliance_disclaimer_en || '',
                compliance_disclaimer_de: article.compliance_disclaimer_de || '',
                compliance_disclaimer_cn: article.compliance_disclaimer_cn || '',
                tags: Array.isArray(article.tags) ? article.tags : [],
                fact_checklist: article.fact_checklist || factChecklistDefaults.reduce((acc, item) => {
                    acc[item.key] = false;
                    return acc;
                }, {} as Record<string, boolean>),
            });
            setTagsInput(Array.isArray(article.tags) ? article.tags.join(', ') : '');
        }
    }, [article]);

    useEffect(() => {
        const checkSeoColumns = async () => {
            try {
                const { error } = await supabase
                    .from('articles')
                    .select('meta_title_sk')
                    .limit(1);
                if (error && /does not exist/i.test(error.message)) {
                    setSeoFieldsAvailable(false);
                }
            } catch {
                // ignore
            }
        };
        checkSeoColumns();
    }, []);

    useEffect(() => {
        const checkWorkflowColumns = async () => {
            try {
                const { error } = await supabase
                    .from('articles')
                    .select('status, scheduled_at')
                    .limit(1);
                if (error && /does not exist/i.test(error.message)) {
                    setWorkflowFieldsAvailable(false);
                }
            } catch {
                // ignore
            }
        };
        checkWorkflowColumns();
    }, []);

    useEffect(() => {
        const loadImageSettings = async () => {
            const settings = await fetchAISettings();
            const provider = settings.imageEngine === 'turbo' ? 'turbo' : 'gemini';
            setGlobalImageProvider(provider);
            setOverrideImageProvider(provider);
            if (settings.geminiImageModel) {
                setGlobalImageModel(settings.geminiImageModel);
                setOverrideImageModel(settings.geminiImageModel);
            }
        };
        loadImageSettings();
    }, []);

    useEffect(() => {
        if (!session?.access_token) return;
        const loadStatus = async () => {
            setLinkedinLoading(true);
            try {
                const res = await fetch('/api/linkedin/status', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const data = await parseJsonSafe(res);
                if (res.ok) {
                    setLinkedinStatus(data);
                    if (data?.default_org_urn) {
                        setLinkedinDefaultOrgUrn(data.default_org_urn);
                        setLinkedinOrganizationUrn((prev) => prev || data.default_org_urn);
                    }
                } else {
                    setLinkedinStatus({ connected: false });
                }
            } catch {
                setLinkedinStatus({ connected: false });
            } finally {
                setLinkedinLoading(false);
            }
        };
        loadStatus();
    }, [session?.access_token, linkedinParam]);

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

    const getCurrentMetaTitle = () => {
        switch (activeTab) {
            case 'sk': return formData.meta_title_sk;
            case 'en': return formData.meta_title_en;
            case 'de': return formData.meta_title_de;
            case 'cn': return formData.meta_title_cn;
            default: return formData.meta_title_sk;
        }
    };

    const getCurrentMetaDescription = () => {
        switch (activeTab) {
            case 'sk': return formData.meta_description_sk;
            case 'en': return formData.meta_description_en;
            case 'de': return formData.meta_description_de;
            case 'cn': return formData.meta_description_cn;
            default: return formData.meta_description_sk;
        }
    };

    const getCurrentMetaKeywords = () => {
        switch (activeTab) {
            case 'sk': return formData.meta_keywords_sk;
            case 'en': return formData.meta_keywords_en;
            case 'de': return formData.meta_keywords_de;
            case 'cn': return formData.meta_keywords_cn;
            default: return formData.meta_keywords_sk;
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

    const updateMetaField = (field: 'meta_title' | 'meta_description' | 'meta_keywords', value: string) => {
        const key = `${field}_${activeTab}` as keyof ArticleFormData;
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const updateDisclaimer = (value: string) => {
        const key = `compliance_disclaimer_${activeTab}` as keyof ArticleFormData;
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        if (linkedinMessage.trim()) return;
        const title = getCurrentTitle();
        const excerpt = getCurrentExcerpt();
        if (title || excerpt) {
            setLinkedinMessage([title, excerpt].filter(Boolean).join('\n\n'));
        }
    }, [formData.title_sk, formData.title_en, formData.title_de, formData.title_cn, formData.excerpt_sk, formData.excerpt_en, formData.excerpt_de, formData.excerpt_cn]);

    useEffect(() => {
        if (!linkedinParam) return;
        if (linkedinParam === 'error') {
            const reason = linkedinReason || 'LinkedIn authorization failed.';
            toast.error(reason);
        }
        if (linkedinParam === 'connected') {
            toast.success('LinkedIn connected.');
        }
    }, [linkedinParam, linkedinReason]);

    useEffect(() => {
        if (linkedinTarget === 'organization' && !hasOrgScope) {
            setLinkedinTarget('member');
        }
    }, [linkedinTarget, hasOrgScope]);

    useEffect(() => {
        if (linkedinTarget !== 'organization') return;
        if (linkedinOrganizationUrn) return;
        const resolved = resolveLinkedInOrgUrn();
        if (resolved) setLinkedinOrganizationUrn(resolved);
    }, [linkedinTarget, linkedinDefaultOrgUrn, linkedinOrganizationUrn, linkedinStatus?.organization_urns, organizationOptions]);

    useEffect(() => {
        if (!formData.cover_image_url) return;
        setLinkedinImageUrl((prev) => prev || formData.cover_image_url);
    }, [formData.cover_image_url]);

    useEffect(() => {
        if (linkedinShareModeTouched) return;
        if (!formData.cover_image_url) return;
        setLinkedinShareMode('image');
    }, [formData.cover_image_url, linkedinShareModeTouched]);

    useEffect(() => {
        if (linkedinTarget !== 'organization') return;
        if (!linkedinStatus?.connected) return;
        if (!hasOrgScope) return;
        if (linkedinOrganizations.length > 0) return;
        loadLinkedInOrganizations();
    }, [linkedinTarget, linkedinStatus?.connected, hasOrgScope]);

    useEffect(() => {
        if (!linkedinStatus?.organization_urns?.length) return;
        if (linkedinOrganizations.length > 0) return;
        const fallback = linkedinStatus.organization_urns.map((urn) => ({ urn, name: urn }));
        setLinkedinOrganizations(fallback);
        if (!linkedinOrganizationUrn) {
            setLinkedinOrganizationUrn(linkedinDefaultOrgUrn || linkedinStatus.organization_urns[0]);
        }
    }, [linkedinStatus?.organization_urns, linkedinOrganizations.length, linkedinOrganizationUrn, linkedinDefaultOrgUrn]);

    const loadLinkedInLogs = async () => {
        if (!session?.access_token || !articleId || isNew) return;
        setLinkedinLogsLoading(true);
        try {
            const res = await fetch(`/api/linkedin/logs?articleId=${articleId}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await parseJsonSafe(res);
            if (res.ok && Array.isArray(data.logs)) {
                setLinkedinLogs(data.logs);
            }
        } catch {
            // ignore
        } finally {
            setLinkedinLogsLoading(false);
        }
    };

    useEffect(() => {
        loadLinkedInLogs();
    }, [session?.access_token, articleId, isNew]);

    const loadLinkedInScheduled = async () => {
        if (!session?.access_token || !articleId || isNew) return;
        setLinkedinScheduledLoading(true);
        try {
            const res = await fetch(`/api/linkedin/scheduled?articleId=${articleId}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await parseJsonSafe(res);
            if (res.ok && Array.isArray(data.scheduled)) {
                setLinkedinScheduled(data.scheduled);
            }
        } catch {
            // ignore
        } finally {
            setLinkedinScheduledLoading(false);
        }
    };

    useEffect(() => {
        loadLinkedInScheduled();
    }, [session?.access_token, articleId, isNew]);

    useEffect(() => {
        if (articleLoading) return;
        if (panelParam !== 'linkedin') return;
        if (!linkedinSectionRef.current) return;
        const el = linkedinSectionRef.current;
        const timer = window.setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => window.clearTimeout(timer);
    }, [articleLoading, panelParam, articleId, isNew]);

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

    useEffect(() => {
        if (editorMode !== 'visual') return;
        if (!editorRef.current) return;
        const nextHtml = getCurrentContent() || '';
        if (editorRef.current.innerHTML !== nextHtml) {
            editorRef.current.innerHTML = nextHtml;
        }
    }, [activeTab, editorMode, formData.content_sk, formData.content_en, formData.content_de, formData.content_cn]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (override?: Partial<ArticleFormData>) => {
            if (!user) throw new Error('Not authenticated');

            const resolveLatestFormData = () => {
                if (editorMode !== 'visual' || !editorRef.current) return formData;
                const key = `content_${activeTab}` as keyof ArticleFormData;
                const html = editorRef.current.innerHTML;
                if (html && html !== formData[key]) {
                    return { ...formData, [key]: html };
                }
                return formData;
            };

            const latestFormData = resolveLatestFormData();
            if (latestFormData !== formData) {
                setFormData(latestFormData);
            }

            const mergedData = { ...latestFormData, ...(override || {}) };
            const publishedAt = mergedData.is_published
                ? (mergedData.published_at || new Date().toISOString())
                : null;

            const articleData = {
                ...mergedData,
                author_id: user.id,
                published_at: publishedAt,
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

    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const buildImagePromptFromArticle = () => {
        const title = getCurrentTitle();
        const excerpt = getCurrentExcerpt();
        const contentSnippet = stripHtml(getCurrentContent()).slice(0, 240);
        const basePrompt = title
            ? `Create an editorial cover image for an article titled: "${title}".`
            : 'Create an editorial cover image for a legal/business article.';
        const detailPrompt = excerpt ? `Key theme: ${excerpt}` : '';
        const contextPrompt = contentSnippet ? `Context: ${contentSnippet}` : '';
        const stylePrompt = `Style: ${imageStyle}. Aspect ratio: ${imageAspect}. Professional, high-quality, no text overlay.`;
        setImagePrompt([basePrompt, detailPrompt, contextPrompt, stylePrompt].filter(Boolean).join('\n'));
    };

    const aspectSizes: Record<string, { width: number; height: number }> = {
        '1:1': { width: 1024, height: 1024 },
        '16:9': { width: 1280, height: 720 },
        '4:3': { width: 1024, height: 768 },
        '3:4': { width: 768, height: 1024 },
    };

    const uploadImageToLibrary = async (imageUrl: string, title: string) => {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image data.');
        const blob = await response.blob();
        const ext = blob.type.split('/')[1] || 'png';
        const filePath = `ai/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, blob, { contentType: blob.type });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        await supabase.from('media_library').insert({
            title,
            file_path: filePath,
            public_url: publicUrl,
            bucket: 'images',
            tags: ['ai', 'article', 'generated'],
        });

        return publicUrl;
    };

    const handleGenerateImages = async () => {
        if (!imagePrompt.trim()) {
            toast.error('Enter an image prompt.');
            return;
        }
        setImageGenerating(true);
        setGeneratedImages([]);
        try {
            const liteMode = imageMode === 'lite';
            const effectiveProvider = liteMode
                ? 'turbo'
                : (useGlobalImageSettings ? globalImageProvider : overrideImageProvider);
            const effectiveModel = liteMode
                ? ''
                : (useGlobalImageSettings ? globalImageModel : (overrideImageModel || globalImageModel));
            const { width, height } = aspectSizes[imageAspect];
            const finalPrompt = `${imagePrompt}\nStyle: ${imageStyle}. Aspect ratio: ${imageAspect}.`;
            const results: Array<{ url: string; provider: 'gemini' | 'turbo' }> = [];
            const total = liteMode ? 1 : imageCount;
            for (let i = 0; i < total; i += 1) {
                const url = await generateAIImage(finalPrompt, {
                    turbo: effectiveProvider === 'turbo',
                    width,
                    height,
                    aspectRatio: imageAspect,
                    model: effectiveProvider === 'gemini' && effectiveModel ? effectiveModel : undefined,
                });
                if (effectiveProvider === 'gemini' && url.includes('image.pollinations.ai')) {
                    toast.warning('Gemini/Imagen is unavailable or requires billing. Using Turbo mode instead.');
                }
                results.push({ url, provider: effectiveProvider });
            }
            setGeneratedImages(results);
            toast.success('Images generated');
        } catch (error: any) {
            toast.error(error.message || 'Image generation failed');
        } finally {
            setImageGenerating(false);
        }
    };

    const getArticleUrl = () => {
        const windowOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const base = (windowOrigin || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
        return formData.slug && base ? `${base}/blog/${formData.slug}` : '';
    };

    const handleLinkedInConnect = async () => {
        if (!session?.access_token) {
            toast.error('Missing session. Please sign in again.');
            return;
        }
        try {
            const res = await fetch('/api/linkedin/auth', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ redirectTo: '/admin?tab=article-studio' }),
            });
            const data = await res.json();
            if (!res.ok || !data?.url) {
                throw new Error(data?.error || 'Failed to start LinkedIn connection.');
            }
            window.location.href = data.url;
        } catch (error: any) {
            toast.error(error?.message || 'Failed to connect LinkedIn.');
        }
    };

    const handleLinkedInDisconnect = async () => {
        if (!session?.access_token) return;
        try {
            await fetch('/api/linkedin/disconnect', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            setLinkedinStatus({ connected: false });
            setLinkedinOrganizations([]);
            setLinkedinOrganizationUrn('');
            toast.success('LinkedIn disconnected.');
        } catch {
            toast.error('Failed to disconnect LinkedIn.');
        }
    };

    const loadLinkedInOrganizations = async () => {
        if (!session?.access_token) return;
        setLinkedinOrgNotice('');
        try {
            const res = await fetch('/api/linkedin/organizations', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await parseJsonSafe(res);
            const fallbackOrgs = [
                ...(linkedinDefaultOrgUrn ? [{ urn: linkedinDefaultOrgUrn, name: 'Default Organization' }] : []),
                ...((linkedinStatus?.organization_urns || []).map((urn) => ({ urn, name: urn }))),
            ];
            const dedup = new Map<string, { urn: string; name: string }>();
            fallbackOrgs.forEach((org) => dedup.set(org.urn, org));
            const fallbackList = Array.from(dedup.values());

            if (Array.isArray(data.organizations)) {
                const baseList = data.organizations.length > 0 ? data.organizations : fallbackList;
                setLinkedinOrganizations(baseList);
                if (!linkedinDefaultOrgUrn && data?.default_org_urn) {
                    setLinkedinDefaultOrgUrn(data.default_org_urn);
                }
                if (!linkedinOrganizationUrn) {
                    if (data?.default_org_urn) {
                        setLinkedinOrganizationUrn(data.default_org_urn);
                    } else if (linkedinDefaultOrgUrn) {
                        setLinkedinOrganizationUrn(linkedinDefaultOrgUrn);
                    } else if (baseList.length === 1) {
                        setLinkedinOrganizationUrn(baseList[0].urn);
                    } else if (linkedinStatus?.organization_urns?.length) {
                        setLinkedinOrganizationUrn(linkedinStatus.organization_urns[0]);
                    }
                }
                if (data?.error) {
                    if (baseList.length > 0) {
                        setLinkedinOrgNotice(`${data.error} Using fallback organization list.`);
                    } else {
                        setLinkedinOrgNotice(data.error);
                    }
                }
            } else if (!res.ok) {
                if (fallbackList.length > 0) {
                    setLinkedinOrganizations(fallbackList);
                    if (!linkedinOrganizationUrn) {
                        setLinkedinOrganizationUrn(fallbackList[0].urn);
                    }
                    if (data?.error) {
                        setLinkedinOrgNotice(`${data.error} Using fallback organization list.`);
                    } else {
                        setLinkedinOrgNotice('LinkedIn org API is temporarily unavailable. Using fallback organization list.');
                    }
                    return;
                }
                setLinkedinOrgNotice(data?.error || 'Failed to load LinkedIn organizations.');
            } else if (data?.error) {
                setLinkedinOrgNotice(data.error);
            } else {
                setLinkedinOrgNotice('Failed to load LinkedIn organizations.');
            }
        } catch {
            setLinkedinOrgNotice('Failed to load LinkedIn organizations.');
        }
    };

    const handleLinkedInShare = async () => {
        if (!session?.access_token) {
            toast.error('Missing session. Please sign in again.');
            return;
        }
        if (!articleId || isNew) {
            toast.error('Save the article before sharing.');
            return;
        }
        const linkUrl = getArticleUrl();
        if (!linkUrl) {
            toast.error('Article slug missing. Please save a slug first.');
            return;
        }
        const organizationUrn = linkedinTarget === 'organization' ? resolveLinkedInOrgUrn() : '';
        if (linkedinTarget === 'organization' && !hasOrgScope) {
            toast.error('Company page sharing requires LinkedIn organization scopes.');
            return;
        }
        const effectiveShareMode = resolveEffectiveLinkedInShareMode();
        const effectiveImageUrl = resolveEffectiveLinkedInImageUrl();
        if (effectiveShareMode === 'image' && !effectiveImageUrl) {
            toast.error('Add an image URL for LinkedIn.');
            return;
        }

        setLinkedinSharing(true);
        try {
            const res = await fetch('/api/linkedin/share', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    articleId,
                    linkUrl,
                    title: getCurrentTitle(),
                    excerpt: getCurrentExcerpt(),
                    message: linkedinMessage,
                    shareTarget: linkedinTarget,
                    organizationUrn: organizationUrn || null,
                    shareMode: effectiveShareMode,
                    imageUrl: effectiveShareMode === 'image' ? effectiveImageUrl : null,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'LinkedIn share failed.');
            }
            toast.success('Shared on LinkedIn!');
            loadLinkedInLogs();
        } catch (error: any) {
            toast.error(error?.message || 'LinkedIn share failed.');
        } finally {
            setLinkedinSharing(false);
        }
    };

    const handleLinkedInSchedule = async () => {
        if (!session?.access_token) {
            toast.error('Missing session. Please sign in again.');
            return;
        }
        if (!articleId || isNew) {
            toast.error('Save the article before scheduling.');
            return;
        }
        if (!linkedinScheduleAt) {
            toast.error('Pick a schedule time.');
            return;
        }
        const effectiveShareMode = resolveEffectiveLinkedInShareMode();
        const effectiveImageUrl = resolveEffectiveLinkedInImageUrl();
        const organizationUrn = linkedinTarget === 'organization' ? resolveLinkedInOrgUrn() : '';
        if (linkedinTarget === 'organization' && !hasOrgScope) {
            toast.error('Company page sharing requires LinkedIn organization scopes.');
            return;
        }
        if (effectiveShareMode === 'image' && !effectiveImageUrl) {
            toast.error('Add an image URL for LinkedIn.');
            return;
        }

        try {
            const scheduledAtIso = fromLocalInput(linkedinScheduleAt);
            const res = await fetch('/api/linkedin/schedule', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    articleId,
                    scheduledAt: scheduledAtIso,
                    message: linkedinMessage,
                    shareTarget: linkedinTarget,
                    organizationUrn: organizationUrn || null,
                    shareMode: effectiveShareMode,
                    imageUrl: effectiveShareMode === 'image' ? effectiveImageUrl : null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to schedule share.');
            toast.success('LinkedIn share scheduled.');
            setLinkedinScheduleAt('');
            loadLinkedInScheduled();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to schedule LinkedIn share.');
        }
    };

    const handleRunLinkedInScheduled = async () => {
        if (!session?.access_token) return;
        try {
            const res = await fetch('/api/linkedin/run-scheduled', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to run scheduled shares.');
            toast.success('Checked scheduled shares.');
            loadLinkedInLogs();
            loadLinkedInScheduled();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to run scheduled shares.');
        }
    };

    const handleSaveImage = async (imageUrl: string) => {
        const title = imagePrompt ? imagePrompt.split('\n')[0].slice(0, 80) : 'AI generated image';
        const publicUrl = await uploadImageToLibrary(imageUrl, title);
        toast.success('Saved to media library');
        return publicUrl;
    };

    const handleUseAsCover = async (imageUrl: string) => {
        try {
            const publicUrl = await handleSaveImage(imageUrl);
            setFormData(prev => ({ ...prev, cover_image_url: publicUrl }));
            toast.success('Cover image set');
        } catch (error: any) {
            toast.error(error.message || 'Failed to set cover image');
        }
    };

    if (articleLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading article…</p>
            </div>
        );
    }

    const displayImageProvider = useGlobalImageSettings ? globalImageProvider : overrideImageProvider;
    const displayImageModel = useGlobalImageSettings ? globalImageModel : (overrideImageModel || globalImageModel);
    const effectiveLinkedInShareMode = resolveEffectiveLinkedInShareMode();
    const effectiveLinkedInImageUrl = resolveEffectiveLinkedInImageUrl();

    const parseTagsInput = (value: string) => {
        return value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    };

    const applyEditorCommand = (command: string, value?: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false, value);
        updateField('content', editorRef.current.innerHTML);
    };

    const logArticleAction = async (action: string, status?: string) => {
        if (!user || !articleId) return;
        try {
            await supabase.from('article_audit_logs').insert({
                article_id: articleId,
                action,
                status,
                performed_by: user.id,
            });
        } catch {
            // ignore logging failures
        }
    };

    const toLocalInput = (value: string | null) => {
        if (!value) return '';
        const date = new Date(value);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const fromLocalInput = (value: string) => {
        if (!value) return null;
        const date = new Date(value);
        return date.toISOString();
    };

    const handleWorkflowUpdate = async (next: Partial<ArticleFormData>, actionLabel: string) => {
        await saveMutation.mutateAsync(next);
        await logArticleAction(actionLabel, next.status ?? formData.status);
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case 'review': return 'In Review';
            case 'scheduled': return 'Scheduled';
            case 'published': return 'Published';
            default: return 'Draft';
        }
    };

    const statusBadgeClass = (status: string) => {
        switch (status) {
            case 'published': return 'bg-emerald-100 text-emerald-700';
            case 'scheduled': return 'bg-amber-100 text-amber-700';
            case 'review': return 'bg-blue-100 text-blue-700';
            default: return 'bg-muted text-muted-foreground';
        }
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

    const handleEnhanceFormatting = async () => {
        const inputText = getCurrentContent();
        if (!inputText?.trim()) {
            toast.error('Please add article content first.');
            return;
        }
        setEditLoading(true);
        setEditTarget('content');
        setEditMode('rewrite');
        try {
            const output = await generateAIEdit(inputText, {
                mode: 'rewrite',
                customInstruction: `Reformat into a richly structured article for readability.
Rules:
1. Preserve all facts, numbers, names, and URLs exactly. Do not add new facts or sources.
2. Keep the language as ${languageLabel()}.
3. Use semantic HTML only. No markdown.
4. Start with a short lead paragraph.
5. Use <h2> for main sections (at least 4 for long pieces) and <h3> for subsections (at least 2 when appropriate).
6. Include at least one list (<ul> or <ol>) where it improves clarity.
7. Add one <blockquote> that quotes a sentence from the existing text.
8. Use <em> for emphasis on 2–4 phrases.
9. Paragraphs should be short (2–4 sentences).
10. Keep any existing sources section and links intact.`,
                languageLabel: languageLabel(),
            });
            setEditOutput(output);
            toast.success('Formatting enhancement ready to review.');
        } catch (error: any) {
            toast.error(error.message || 'Formatting enhancement failed.');
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
            <AdminPanelHeader
                title={isNew ? 'New Article' : 'Edit Article'}
                description="Edit content, media, workflow status, and LinkedIn sharing from one place."
                actions={(
                    <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(formData.status)}`}>
                        {statusLabel(formData.status)}
                    </span>
                    {workflowFieldsAvailable && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="scheduleAt" className="text-xs text-muted-foreground">Schedule</Label>
                            <Input
                                id="scheduleAt"
                                name="scheduleAt"
                                autoComplete="off"
                                type="datetime-local"
                                value={toLocalInput(formData.scheduled_at)}
                                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: fromLocalInput(e.target.value) }))}
                                className="h-9 w-[190px]"
                            />
                        </div>
                    )}
                    <Button onClick={() => saveMutation.mutate(undefined)} disabled={saveMutation.isPending}>
                        <Save size={16} className="mr-2" />
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    {!isNew && (
                        <>
                            <Button
                                variant="outline"
                                disabled={saveMutation.isPending}
                                onClick={() => handleWorkflowUpdate({
                                    status: 'draft',
                                    is_published: false,
                                    scheduled_at: null,
                                    submitted_at: null,
                                }, 'save_draft')}
                            >
                                Save Draft
                            </Button>
                            {isEditor && !isAdmin && (
                                <Button
                                    variant="outline"
                                    disabled={saveMutation.isPending}
                                    onClick={() => handleWorkflowUpdate({
                                        status: 'review',
                                        is_published: false,
                                        submitted_at: new Date().toISOString(),
                                    }, 'submit_review')}
                                >
                                    Submit for Review
                                </Button>
                            )}
                            {isAdmin && (
                                <>
                                    <Button
                                        variant="default"
                                        disabled={saveMutation.isPending}
                                        onClick={() => handleWorkflowUpdate({
                                            status: 'published',
                                            is_published: true,
                                            published_at: new Date().toISOString(),
                                            approved_at: new Date().toISOString(),
                                            approved_by: user?.id ?? null,
                                        }, 'publish_now')}
                                    >
                                        Publish Now
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={saveMutation.isPending || !formData.scheduled_at}
                                        onClick={() => handleWorkflowUpdate({
                                            status: 'scheduled',
                                            is_published: true,
                                            published_at: formData.scheduled_at,
                                        }, 'schedule_publish')}
                                    >
                                        Schedule
                                    </Button>
                                </>
                            )}
                        </>
                    )}

                    {/* Delete Button */}
                    {!isNew && isAdmin && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" aria-label="Delete article">
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
                )}
            />

            {!workflowFieldsAvailable && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                    Workflow fields are not available in the database. Run `supabase/articles_workflow.sql` to enable approvals + scheduling.
                </div>
            )}

            {/* Cover Image */}
            <div className="space-y-2">
                <Label>Cover Image</Label>
                {formData.cover_image_url ? (
                    <div className="relative group">
                        <img
                            src={formData.cover_image_url}
                            alt="Cover"
                            width={1200}
                            height={480}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setFormData(prev => ({ ...prev, cover_image_url: '' }))}
                            aria-label="Remove cover image"
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

            {/* AI Cover Image Generator */}
            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-primary" />
                        <span className="text-sm font-semibold">Generate Cover Image</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={buildImagePromptFromArticle}>
                        Use Article Content
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="imagePrompt" className="text-xs text-muted-foreground">Image Prompt</Label>
                    <Textarea
                        id="imagePrompt"
                        name="imagePrompt"
                        autoComplete="off"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        rows={4}
                        placeholder="Describe the desired cover image..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Style</Label>
                        <Select value={imageStyle} onValueChange={setImageStyle}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Editorial Photo">Editorial Photo</SelectItem>
                                <SelectItem value="Corporate Illustration">Corporate Illustration</SelectItem>
                                <SelectItem value="Minimal Abstract">Minimal Abstract</SelectItem>
                                <SelectItem value="Professional 3D">Professional 3D</SelectItem>
                                <SelectItem value="Watercolor Illustration">Watercolor Illustration</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                        <Select value={imageAspect} onValueChange={(value) => setImageAspect(value as typeof imageAspect)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select ratio" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="16:9">16:9 (Hero)</SelectItem>
                                <SelectItem value="4:3">4:3 (Blog)</SelectItem>
                                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Generation Mode</Label>
                    <Select value={imageMode} onValueChange={(value) => setImageMode(value as 'lite' | 'advanced')}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="lite">Lite (Fast Draft)</SelectItem>
                            <SelectItem value="advanced">Advanced (Full Controls)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                        Lite uses Turbo with one variant. Advanced unlocks model and provider controls.
                    </p>
                </div>

                {imageMode === 'advanced' && (
                    <>
                        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Use Global AI Settings</Label>
                                <p className="text-[10px] text-muted-foreground">
                                    Uses defaults from AI Settings. Turn off to override for this article.
                                </p>
                            </div>
                            <Switch checked={useGlobalImageSettings} onCheckedChange={setUseGlobalImageSettings} />
                        </div>

                        {useGlobalImageSettings ? (
                            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                                <div className="font-medium text-foreground">Using global image defaults</div>
                                <div>Provider: {displayImageProvider === 'gemini' ? 'Gemini (Pro)' : 'Turbo (Fast)'}</div>
                                {displayImageProvider === 'gemini' && displayImageModel && (
                                    <div>Model: {displayImageModel}</div>
                                )}
                                <div>
                                    Edit these in <span className="font-semibold">AI Settings</span>.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Provider</Label>
                                <Select
                                    value={overrideImageProvider}
                                    onValueChange={(value) => setOverrideImageProvider(value as 'gemini' | 'turbo')}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gemini">Gemini (Pro)</SelectItem>
                                        <SelectItem value="turbo">Turbo (Fast)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                    Gemini uses your API key. Turbo is fast and free for drafts.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Image Variants</Label>
                            <Input
                                type="number"
                                min={1}
                                max={4}
                                value={imageCount}
                                onChange={(e) => setImageCount(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
                            />
                        </div>

                        {displayImageProvider === 'gemini' && !useGlobalImageSettings && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Gemini Image Model (optional)</Label>
                                <Input
                                    value={overrideImageModel}
                                    onChange={(e) => setOverrideImageModel(e.target.value)}
                                    placeholder="imagen-3.0-generate-001"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Leave empty to fall back to the global model.
                                </p>
                            </div>
                        )}
                    </>
                )}

                <Button onClick={handleGenerateImages} disabled={imageGenerating}>
                    {imageGenerating ? 'Generating images...' : 'Generate Images'}
                </Button>

                {generatedImages.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {generatedImages.map((img, idx) => (
                            <div key={`${img.url}-${idx}`} className="border rounded-lg overflow-hidden bg-white">
                                <div className="aspect-video bg-muted">
                                    <img
                                        src={img.url}
                                        alt={`Generated ${idx + 1}`}
                                        width={1280}
                                        height={720}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="text-[11px] text-muted-foreground">
                                        Provider: {img.provider === 'gemini' ? 'Gemini' : 'Turbo'}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleSaveImage(img.url)}>
                                            Save
                                        </Button>
                                        <Button size="sm" onClick={() => handleUseAsCover(img.url)}>
                                            Use as Cover
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* LinkedIn Share */}
            <div ref={linkedinSectionRef} className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Label className="text-sm font-semibold">LinkedIn Share</Label>
                        <p className="text-xs text-muted-foreground">
                            Connect your LinkedIn account and share this article.
                        </p>
                    </div>
                    {linkedinLoading ? (
                        <Button size="sm" variant="outline" disabled>
                            Checking...
                        </Button>
                    ) : linkedinStatus?.connected ? (
                        <Button size="sm" variant="outline" onClick={handleLinkedInDisconnect}>
                            Disconnect
                        </Button>
                    ) : (
                        <Button size="sm" onClick={handleLinkedInConnect}>
                            Connect LinkedIn
                        </Button>
                    )}
                </div>

                {linkedinStatus?.connected && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Connected as {linkedinStatus.member_name || 'LinkedIn Member'}</span>
                        {linkedinStatus.expires_at && (
                            <span>
                                Token expires {new Date(linkedinStatus.expires_at).toLocaleString()}
                            </span>
                        )}
                        {linkedinStatus.expired && (
                            <span className="text-destructive">Token expired — reconnect.</span>
                        )}
                        {!hasOrgScope && (
                            <span className="text-muted-foreground">
                                Company pages disabled (missing org scopes).
                            </span>
                        )}
                        {linkedinTarget === 'organization' && organizationOptions.length > 0 && (
                            <span>{organizationOptions.length} orgs available</span>
                        )}
                        {latestLinkedInShare?.created_at && (
                            <span className="flex items-center gap-2">
                                Last shared {new Date(latestLinkedInShare.created_at).toLocaleString()}
                                {latestLinkedInShare.share_url && (
                                    <a
                                        href={latestLinkedInShare.share_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary/80 underline"
                                    >
                                        View post
                                    </a>
                                )}
                            </span>
                        )}
                    </div>
                )}

                {linkedinStatus?.connected && (
                    <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                        <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-foreground">Mode</div>
                            <div className="text-[11px] text-muted-foreground">Basic for quick share, Power for full controls.</div>
                        </div>
                        <div className="inline-flex rounded-md border bg-muted/20 p-1">
                            <Button
                                type="button"
                                size="sm"
                                variant={linkedinUiMode === 'basic' ? 'default' : 'ghost'}
                                className="h-7 px-3 text-xs"
                                onClick={() => setLinkedinUiMode('basic')}
                            >
                                Basic
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={linkedinUiMode === 'power' ? 'default' : 'ghost'}
                                className="h-7 px-3 text-xs"
                                onClick={() => setLinkedinUiMode('power')}
                            >
                                Power
                            </Button>
                        </div>
                    </div>
                )}

                {linkedinStatus?.connected && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Share As</Label>
                            <Select
                                value={linkedinTarget}
                                onValueChange={(value) => setLinkedinTarget(value as 'member' | 'organization')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select share target" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Personal Profile</SelectItem>
                                    <SelectItem value="organization" disabled={!hasOrgScope}>
                                        Company Page
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {!hasOrgScope && (
                                <p className="text-[10px] text-muted-foreground">
                                    Company page sharing requires LinkedIn organization scopes and approval.
                                </p>
                            )}
                        </div>

                        {linkedinUiMode === 'power' && (
                            <div className="space-y-2">
                                <Label>Share Type</Label>
                                <Select
                                    value={linkedinShareMode}
                                    onValueChange={(value) => {
                                        setLinkedinShareMode(value as 'article' | 'image');
                                        setLinkedinShareModeTouched(true);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select share type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="article">Link preview</SelectItem>
                                        <SelectItem value="image">Image post</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                    Image posts upload the image and append the article link to the text.
                                    LinkedIn may omit preview images for API link posts.
                                </p>
                            </div>
                        )}

                        {linkedinTarget === 'organization' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label>Organization</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={loadLinkedInOrganizations}
                                    >
                                        Refresh
                                    </Button>
                                </div>
                                {organizationOptions.length > 0 ? (
                                    <Select
                                        value={linkedinOrganizationUrn}
                                        onValueChange={setLinkedinOrganizationUrn}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select organization" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {organizationOptions.map((org) => (
                                                <SelectItem key={org.urn} value={org.urn}>
                                                    {org.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="space-y-2">
                                        <Input
                                            value={linkedinOrganizationUrn}
                                            onChange={(e) => setLinkedinOrganizationUrn(e.target.value)}
                                            placeholder="urn:li:organization:123456"
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            If the list is empty, paste your company URN (from LinkedIn page admin URL or API).
                                        </p>
                                    </div>
                                )}
                                {linkedinOrgNotice && (
                                    <p className="text-[10px] text-amber-700">{linkedinOrgNotice}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {linkedinStatus?.connected && linkedinUiMode === 'power' && effectiveLinkedInShareMode === 'image' && (
                    <div className="space-y-2">
                        <Label>Image URL</Label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                                value={linkedinImageUrl}
                                onChange={(e) => setLinkedinImageUrl(e.target.value)}
                                placeholder="https://..."
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setLinkedinImageUrl(formData.cover_image_url || '')}
                                disabled={!formData.cover_image_url}
                            >
                                Use Cover Image
                            </Button>
                        </div>
                    </div>
                )}

                {linkedinStatus?.connected && (
                    <div className="space-y-2">
                        <Label>LinkedIn Post Text</Label>
                        <Textarea
                            value={linkedinMessage}
                            onChange={(e) => setLinkedinMessage(e.target.value)}
                            rows={3}
                            placeholder="Add your LinkedIn intro..."
                        />
                    </div>
                )}

                {linkedinStatus?.connected && (
                    <div className="rounded-lg border bg-white p-3 space-y-2">
                        <div className="text-xs text-muted-foreground">Preview</div>
                        <div className="flex flex-col gap-3">
                            {(effectiveLinkedInShareMode === 'image' ? effectiveLinkedInImageUrl : formData.cover_image_url) && (
                                <img
                                    src={effectiveLinkedInShareMode === 'image'
                                        ? effectiveLinkedInImageUrl
                                        : formData.cover_image_url}
                                    alt="LinkedIn preview"
                                    width={1200}
                                    height={630}
                                    className="w-full h-40 object-cover rounded-md"
                                />
                            )}
                            <div className="space-y-1">
                                <div className="text-sm font-semibold">{getCurrentTitle() || 'Untitled Article'}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                    {getCurrentExcerpt() || 'Add an excerpt to improve the preview.'}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    {getArticleUrl() || 'Save a slug to generate the article link.'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {linkedinStatus?.connected && (
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={handleLinkedInShare}
                            disabled={
                                linkedinSharing ||
                                linkedinStatus?.expired ||
                                (effectiveLinkedInShareMode === 'article' ? !getArticleUrl() : !effectiveLinkedInImageUrl)
                            }
                        >
                            {linkedinSharing ? 'Sharing…' : 'Share on LinkedIn'}
                        </Button>
                        {(!articleId || isNew) && (
                            <span className="text-xs text-muted-foreground">
                                Save the article before sharing.
                            </span>
                        )}
                    </div>
                )}

                {linkedinStatus?.connected && linkedinUiMode === 'power' && (
                    <Accordion type="single" collapsible className="w-full rounded-lg border bg-white px-3">
                        <AccordionItem value="linkedin-advanced" className="border-b-0">
                            <AccordionTrigger className="py-3 text-xs font-semibold no-underline hover:no-underline">
                                Advanced LinkedIn Tools (Scheduling, Logs, Diagnostics)
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3 pb-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={loadLinkedInLogs}
                                        disabled={linkedinLogsLoading || !articleId || isNew}
                                    >
                                        {linkedinLogsLoading ? 'Refreshing…' : 'Refresh Share Log'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleRunLinkedInScheduled}
                                        disabled={!articleId || isNew}
                                    >
                                        Run Scheduled
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[1fr,180px] gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="linkedinScheduleAt">Schedule share</Label>
                                        <Input
                                            id="linkedinScheduleAt"
                                            name="linkedinScheduleAt"
                                            type="datetime-local"
                                            value={linkedinScheduleAt}
                                            onChange={(e) => setLinkedinScheduleAt(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            className="w-full"
                                            variant="outline"
                                            onClick={handleLinkedInSchedule}
                                            disabled={
                                            !linkedinScheduleAt ||
                                            !articleId ||
                                            isNew ||
                                            (effectiveLinkedInShareMode === 'image' && !effectiveLinkedInImageUrl)
                                        }
                                    >
                                            Schedule
                                        </Button>
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-white p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground">Recent Shares</Label>
                                    </div>
                                    {linkedinLogs.length === 0 ? (
                                        <div className="text-xs text-muted-foreground">No shares logged yet.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {linkedinLogs.map((log) => (
                                                <div
                                                    key={log.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-semibold text-foreground">
                                                            {log.status === 'success' ? 'Shared' : 'Error'}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </span>
                                                        {log.error_message && (
                                                            <span className="text-destructive">{log.error_message}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-muted-foreground">
                                                            {log.share_target || 'member'} · {log.visibility || 'PUBLIC'}
                                                        </span>
                                                        {log.share_url && (
                                                            <a
                                                                href={log.share_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-primary underline"
                                                            >
                                                                View on LinkedIn
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border bg-white p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground">Scheduled Shares</Label>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={loadLinkedInScheduled}
                                            disabled={linkedinScheduledLoading || !articleId || isNew}
                                        >
                                            {linkedinScheduledLoading ? 'Refreshing…' : 'Refresh'}
                                        </Button>
                                    </div>
                                    {linkedinScheduled.length === 0 ? (
                                        <div className="text-xs text-muted-foreground">No scheduled shares.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {linkedinScheduled.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-semibold text-foreground">
                                                            {item.status === 'scheduled' ? 'Scheduled' : item.status}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {new Date(item.scheduled_at).toLocaleString()}
                                                        </span>
                                                        {item.error_message && (
                                                            <span className="text-destructive">{item.error_message}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {item.share_target || 'member'} · {item.visibility || 'PUBLIC'} · {item.share_mode === 'image' ? 'image' : 'link'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
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
                    <Label>Tags (comma separated)</Label>
                    <Input
                        value={tagsInput}
                        onChange={(e) => {
                            const next = e.target.value;
                            setTagsInput(next);
                            setFormData(prev => ({ ...prev, tags: parseTagsInput(next) }));
                        }}
                        placeholder="ai, regulation, compliance"
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
                <div className="flex items-center justify-between">
                    <Label>{getLabel('Content', 'Obsah')}</Label>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={editorMode === 'visual' ? 'default' : 'outline'}
                            onClick={() => setEditorMode('visual')}
                        >
                            Visual
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={editorMode === 'html' ? 'default' : 'outline'}
                            onClick={() => setEditorMode('html')}
                        >
                            HTML
                        </Button>
                    </div>
                </div>

                {editorMode === 'visual' ? (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('bold')}>
                                Bold
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('italic')}>
                                Italic
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('underline')}>
                                Underline
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('formatBlock', 'H2')}>
                                H2
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('formatBlock', 'H3')}>
                                H3
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('formatBlock', 'P')}>
                                Paragraph
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('insertUnorderedList')}>
                                Bullets
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('insertOrderedList')}>
                                Numbered
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    const url = window.prompt('Enter link URL');
                                    if (url) applyEditorCommand('createLink', url);
                                }}
                            >
                                Link
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => applyEditorCommand('unlink')}>
                                Unlink
                            </Button>
                        </div>
                        <div
                            ref={editorRef}
                            className="min-h-[260px] rounded-lg border border-input bg-background p-4 text-sm prose max-w-none focus:outline-none"
                            contentEditable
                            role="textbox"
                            aria-label="Article content editor"
                            aria-multiline="true"
                            onInput={(e) => {
                                const html = (e.target as HTMLDivElement).innerHTML;
                                updateField('content', html);
                            }}
                            suppressContentEditableWarning
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Tip: Use headings and short paragraphs for best readability.
                        </p>
                    </div>
                ) : (
                    <Textarea
                        value={getCurrentContent()}
                        onChange={(e) => updateField('content', e.target.value)}
                        placeholder={getLabel('Start writing article content…', 'Začnite písať obsah článku…')}
                        rows={12}
                        className="font-mono text-sm"
                    />
                )}
            </div>

            {/* SEO Metadata */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-semibold">SEO Metadata</Label>
                    {seoFieldsAvailable && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                updateMetaField('meta_title', getCurrentTitle());
                                updateMetaField('meta_description', getCurrentExcerpt());
                                if (!getCurrentMetaKeywords()) {
                                    updateMetaField('meta_keywords', formData.tags.join(', '));
                                }
                            }}
                        >
                            Use Title + Excerpt
                        </Button>
                    )}
                </div>
                {!seoFieldsAvailable && (
                    <div className="text-xs text-destructive">
                        SEO fields are not available in the database. Run `supabase/articles_meta_fields.sql` in Supabase to enable them.
                    </div>
                )}
                <div className="space-y-2">
                    <Label>Meta Title</Label>
                    <Input
                        value={getCurrentMetaTitle()}
                        onChange={(e) => updateMetaField('meta_title', e.target.value)}
                        placeholder="SEO title (max ~60 chars)"
                        disabled={!seoFieldsAvailable}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Meta Description</Label>
                    <Textarea
                        value={getCurrentMetaDescription()}
                        onChange={(e) => updateMetaField('meta_description', e.target.value)}
                        placeholder="SEO description (max ~160 chars)"
                        rows={3}
                        disabled={!seoFieldsAvailable}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Meta Keywords</Label>
                    <Input
                        value={getCurrentMetaKeywords()}
                        onChange={(e) => updateMetaField('meta_keywords', e.target.value)}
                        placeholder="comma-separated keywords"
                        disabled={!seoFieldsAvailable}
                    />
                </div>
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
                    <Button size="sm" variant="outline" onClick={handleEnhanceFormatting} disabled={editLoading}>
                        Enhance Formatting
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
