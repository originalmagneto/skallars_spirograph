"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Calendar, Share2 } from 'lucide-react';
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
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from '@/components/admin/AdminPrimitives';
import ArticleEditor from './ArticleEditor';

interface Article {
    id: string;
    title_sk: string;
    title_en: string;
    title_de: string;
    title_cn: string;
    slug: string;
    excerpt_sk: string;
    excerpt_en: string;
    excerpt_de: string;
    excerpt_cn: string;
    cover_image_url: string;
    is_published: boolean;
    published_at: string | null;
    status?: string | null;
    scheduled_at?: string | null;
    submitted_at?: string | null;
    created_at: string;
}

type BentoSize = 'sm' | 'md' | 'lg' | 'full';
type ArticlesLayoutKey = 'overview' | 'filters' | 'list';

const ARTICLES_LAYOUT_STORAGE_KEY = 'admin:articles:bento-layout:v1';
const BENTO_SIZE_CLASS: Record<BentoSize, string> = {
    sm: 'xl:col-span-4',
    md: 'xl:col-span-6',
    lg: 'xl:col-span-8',
    full: 'xl:col-span-12',
};
const ARTICLES_LAYOUT_DEFAULTS: Record<ArticlesLayoutKey, BentoSize> = {
    overview: 'full',
    filters: 'full',
    list: 'full',
};

export default function ArticlesManager() {
    const queryClient = useQueryClient();
    const { isAdmin, session } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'review' | 'scheduled' | 'published' | 'needs-action' | 'shared'>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [linkedinSummary, setLinkedinSummary] = useState<
        Record<
            string,
            {
                sharedAt: string | null;
                url: string | null;
                shareTarget: 'member' | 'organization' | null;
                shareMode: 'article' | 'image' | null;
                scheduledAt: string | null;
                scheduledStatus: string | null;
                scheduledShareTarget: 'member' | 'organization' | null;
                metrics: {
                    likeCount: number | null;
                    commentCount: number | null;
                    shareCount: number | null;
                    impressionCount: number | null;
                    clickCount: number | null;
                    engagement: number | null;
                    uniqueImpressionsCount: number | null;
                } | null;
            }
        >
    >({});
    const [linkedinSummaryLoading, setLinkedinSummaryLoading] = useState(false);
    const [layout, setLayout] = useState<Record<ArticlesLayoutKey, BentoSize>>(ARTICLES_LAYOUT_DEFAULTS);

    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId) {
            setEditingArticleId(editId);
            setIsCreating(false);
        }
        if (searchParams.get('create') === 'true') {
            setIsCreating(true);
            setEditingArticleId(null);
        }
    }, [searchParams]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(ARTICLES_LAYOUT_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<Record<ArticlesLayoutKey, BentoSize>>;
            setLayout((prev) => ({ ...prev, ...parsed }));
        } catch {
            // ignore invalid persisted layout
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(ARTICLES_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
        } catch {
            // ignore storage failures
        }
    }, [layout]);

    // Fetch articles
    const { data: articles, isLoading, error } = useQuery({
        queryKey: ['admin-articles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                if (error.message.includes('does not exist')) {
                    console.warn('Articles table does not exist yet. Please run the SQL schema.');
                    return [];
                }
                throw error;
            }
            return data as Article[];
        },
    });

    const refreshLinkedInSummary = useCallback(
        async (opts?: { signal?: AbortSignal; silent?: boolean }) => {
            if (!session?.access_token) {
                setLinkedinSummary({});
                return;
            }
            if (!articles || articles.length === 0) {
                setLinkedinSummary({});
                return;
            }
            const ids = articles.map((article) => article.id).filter(Boolean);
            if (ids.length === 0) {
                setLinkedinSummary({});
                return;
            }

            const silent = opts?.silent ?? true;
            if (!silent) setLinkedinSummaryLoading(true);
            try {
                const chunkSize = 80;
                const summaryRows: any[] = [];
                for (let i = 0; i < ids.length; i += chunkSize) {
                    const chunkIds = ids.slice(i, i + chunkSize);
                    const res = await fetch(`/api/linkedin/logs-summary?ids=${encodeURIComponent(chunkIds.join(','))}`, {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        signal: opts?.signal,
                    });
                    const data = await res.json();
                    if (!res.ok || !Array.isArray(data.summaries)) {
                        continue;
                    }
                    summaryRows.push(...data.summaries);
                }
                const next: Record<
                    string,
                    {
                        sharedAt: string | null;
                        url: string | null;
                        shareTarget: 'member' | 'organization' | null;
                        shareMode: 'article' | 'image' | null;
                        scheduledAt: string | null;
                        scheduledStatus: string | null;
                        scheduledShareTarget: 'member' | 'organization' | null;
                        metrics: {
                            likeCount: number | null;
                            commentCount: number | null;
                            shareCount: number | null;
                            impressionCount: number | null;
                            clickCount: number | null;
                            engagement: number | null;
                            uniqueImpressionsCount: number | null;
                        } | null;
                    }
                > = {};
                summaryRows.forEach((item: any) => {
                    if (!item?.article_id) return;
                    next[item.article_id] = {
                        sharedAt: item.last_shared_at || null,
                        url: item.share_url || null,
                        shareTarget: item.share_target === 'organization' ? 'organization' : item.share_target === 'member' ? 'member' : null,
                        shareMode: item.share_mode === 'image' ? 'image' : item.share_mode === 'article' ? 'article' : null,
                        scheduledAt: item.scheduled_at || null,
                        scheduledStatus: item.scheduled_status || null,
                        scheduledShareTarget:
                            item.scheduled_share_target === 'organization'
                                ? 'organization'
                                : item.scheduled_share_target === 'member'
                                ? 'member'
                                : null,
                        metrics: item.metrics
                            ? {
                                likeCount: typeof item.metrics.likeCount === 'number' ? item.metrics.likeCount : null,
                                commentCount: typeof item.metrics.commentCount === 'number' ? item.metrics.commentCount : null,
                                shareCount: typeof item.metrics.shareCount === 'number' ? item.metrics.shareCount : null,
                                impressionCount: typeof item.metrics.impressionCount === 'number' ? item.metrics.impressionCount : null,
                                clickCount: typeof item.metrics.clickCount === 'number' ? item.metrics.clickCount : null,
                                engagement: typeof item.metrics.engagement === 'number' ? item.metrics.engagement : null,
                                uniqueImpressionsCount: typeof item.metrics.uniqueImpressionsCount === 'number' ? item.metrics.uniqueImpressionsCount : null,
                            }
                            : null,
                    };
                });
                setLinkedinSummary(next);
            } catch {
                // ignore
            } finally {
                if (!silent) setLinkedinSummaryLoading(false);
            }
        },
        [session?.access_token, articles]
    );

    useEffect(() => {
        const controller = new AbortController();
        refreshLinkedInSummary({ signal: controller.signal, silent: true });
        return () => controller.abort();
    }, [refreshLinkedInSummary]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onLinkedInActivity = () => {
            refreshLinkedInSummary({ silent: true });
        };
        window.addEventListener('linkedin:activity-updated', onLinkedInActivity as EventListener);
        const interval = window.setInterval(() => {
            refreshLinkedInSummary({ silent: true });
        }, 60_000);
        return () => {
            window.removeEventListener('linkedin:activity-updated', onLinkedInActivity as EventListener);
            window.clearInterval(interval);
        };
    }, [refreshLinkedInSummary]);

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('articles').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Article deleted');
            queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete article');
        },
    });

    const getStatus = (article: Article) => article.status || (article.is_published ? 'published' : 'draft');
    const statusBadge = (status: string) => {
        switch (status) {
            case 'published': return { label: 'Published', variant: 'default' as const };
            case 'scheduled': return { label: 'Scheduled', variant: 'secondary' as const };
            case 'review': return { label: 'In Review', variant: 'secondary' as const };
            default: return { label: 'Draft', variant: 'secondary' as const };
        }
    };

    const getLinkedInState = (articleId: string) => {
        const summary = linkedinSummary[articleId];
        if (!summary) return { label: 'Not shared', variant: 'outline' as const };
        if (summary.scheduledAt) {
            const target = summary.scheduledShareTarget === 'organization' ? 'Company' : 'Personal';
            return { label: `Scheduled (${target})`, variant: 'secondary' as const };
        }
        if (summary.sharedAt) {
            const target = summary.shareTarget === 'organization' ? 'Company' : 'Personal';
            return { label: `Shared (${target})`, variant: 'secondary' as const };
        }
        return { label: 'Not shared', variant: 'outline' as const };
    };

    const formatCompactNumber = (value: number | null) => {
        if (value === null || Number.isNaN(value)) return null;
        return Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    };

    const formatLinkedInMetrics = (articleId: string) => {
        const metrics = linkedinSummary[articleId]?.metrics;
        if (!metrics) return null;
        const parts: string[] = [];
        const likes = formatCompactNumber(metrics.likeCount);
        const comments = formatCompactNumber(metrics.commentCount);
        const impressions = formatCompactNumber(metrics.impressionCount);
        if (likes !== null) parts.push(`${likes} likes`);
        if (comments !== null) parts.push(`${comments} comments`);
        if (impressions !== null) parts.push(`${impressions} impressions`);
        return parts.length > 0 ? parts.join(' · ') : null;
    };

    const quickFilters: Array<{ value: typeof statusFilter; label: string }> = [
        { value: 'all', label: 'All' },
        { value: 'needs-action', label: 'Needs Action' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'published', label: 'Published' },
        { value: 'shared', label: 'LinkedIn Shared' },
    ];
    const updateLayoutSize = (key: ArticlesLayoutKey, size: BentoSize) => {
        setLayout((prev) => ({ ...prev, [key]: size }));
    };

    const filteredArticles = useMemo(() => {
        const source = articles || [];
        const filtered = source.filter((article) => {
            const titleSk = (article.title_sk || '').toLowerCase();
            const titleEn = (article.title_en || '').toLowerCase();
            const slug = (article.slug || '').toLowerCase();
            const term = searchQuery.toLowerCase().trim();
            const matchesSearch = !term || titleSk.includes(term) || titleEn.includes(term) || slug.includes(term);
            if (!matchesSearch) return false;

            const status = getStatus(article);
            const linkedIn = linkedinSummary[article.id];
            const isShared = Boolean(linkedIn?.sharedAt || linkedIn?.scheduledAt);

            if (statusFilter === 'all') return true;
            if (statusFilter === 'needs-action') return status === 'draft' || status === 'review';
            if (statusFilter === 'shared') return isShared;
            return status === statusFilter;
        });

        filtered.sort((a, b) => {
            const left = new Date(a.created_at).getTime();
            const right = new Date(b.created_at).getTime();
            return sortOrder === 'newest' ? right - left : left - right;
        });
        return filtered;
    }, [articles, searchQuery, statusFilter, sortOrder, linkedinSummary]);

    const summary = useMemo(() => {
        const counts = { total: 0, draft: 0, review: 0, scheduled: 0, published: 0, shared: 0 };
        (articles || []).forEach((article) => {
            counts.total += 1;
            const status = getStatus(article);
            if (status === 'published') counts.published += 1;
            else if (status === 'scheduled') counts.scheduled += 1;
            else if (status === 'review') counts.review += 1;
            else counts.draft += 1;
        });
        counts.shared = Object.values(linkedinSummary).filter((item) => !!item.sharedAt).length;
        return counts;
    }, [articles, linkedinSummary]);

    // Show editor view
    if (editingArticleId || isCreating) {
        return (
            <div className="space-y-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setEditingArticleId(null);
                        setIsCreating(false);
                        router.replace('/admin?workspace=publishing&tab=articles');
                    }}
                >
                    ← Back to Articles
                </Button>
                <ArticleEditor
                    articleId={isCreating ? undefined : editingArticleId || undefined}
                    onClose={() => {
                        setEditingArticleId(null);
                        setIsCreating(false);
                        router.replace('/admin?workspace=publishing&tab=articles');
                    }}
                />
            </div>
        );
    }

    if (error) {
        return (
            <AdminSectionCard className="py-12 text-center">
                <p className="text-destructive">Error loading articles: {(error as Error).message}</p>
            </AdminSectionCard>
        );
    }

    return (
        <div className="space-y-6">
            <AdminPanelHeader
                title="Articles"
                description="Manage drafts, publishing status, and LinkedIn distribution."
                actions={(
                    <>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin?workspace=publishing&tab=article-studio')}
                        >
                            Open Studio
                        </Button>
                        <Button onClick={() => setIsCreating(true)}>
                            <Plus size={16} className="mr-2" />
                            New Article
                        </Button>
                    </>
                )}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <AdminSectionCard className={`space-y-3 ${BENTO_SIZE_CLASS[layout.overview]}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Overview</p>
                        <div className="flex items-center gap-2">
                            <label htmlFor="articlesOverviewSize" className="text-xs text-muted-foreground">Size</label>
                            <select
                                id="articlesOverviewSize"
                                value={layout.overview}
                                onChange={(e) => updateLayoutSize('overview', e.target.value as BentoSize)}
                                className="h-8 rounded-md border bg-white px-2 text-xs"
                            >
                                <option value="sm">S</option>
                                <option value="md">M</option>
                                <option value="lg">L</option>
                                <option value="full">Full</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                        <div className="rounded-xl border bg-white px-4 py-3">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="mt-1 text-2xl font-semibold">{summary.total}</div>
                        </div>
                        <div className="rounded-xl border bg-white px-4 py-3">
                            <div className="text-xs text-muted-foreground">Draft</div>
                            <div className="mt-1 text-2xl font-semibold">{summary.draft}</div>
                        </div>
                        <div className="rounded-xl border bg-white px-4 py-3">
                            <div className="text-xs text-muted-foreground">Review</div>
                            <div className="mt-1 text-2xl font-semibold">{summary.review}</div>
                        </div>
                        <div className="rounded-xl border bg-white px-4 py-3">
                            <div className="text-xs text-muted-foreground">Scheduled</div>
                            <div className="mt-1 text-2xl font-semibold">{summary.scheduled}</div>
                        </div>
                        <div className="rounded-xl border bg-white px-4 py-3">
                            <div className="text-xs text-muted-foreground">Published</div>
                            <div className="mt-1 text-2xl font-semibold">{summary.published}</div>
                        </div>
                        <div className="rounded-xl border bg-white px-4 py-3">
                            <div className="text-xs text-muted-foreground">LinkedIn Shared</div>
                            <div className="mt-1 text-2xl font-semibold">{summary.shared}</div>
                        </div>
                    </div>
                </AdminSectionCard>

                <AdminSectionCard className={`space-y-3 ${BENTO_SIZE_CLASS[layout.filters]}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Filters</p>
                        <div className="flex items-center gap-2">
                            <label htmlFor="articlesFiltersSize" className="text-xs text-muted-foreground">Size</label>
                            <select
                                id="articlesFiltersSize"
                                value={layout.filters}
                                onChange={(e) => updateLayoutSize('filters', e.target.value as BentoSize)}
                                className="h-8 rounded-md border bg-white px-2 text-xs"
                            >
                                <option value="sm">S</option>
                                <option value="md">M</option>
                                <option value="lg">L</option>
                                <option value="full">Full</option>
                            </select>
                        </div>
                    </div>
                    <AdminActionBar>
                        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr),220px,auto]">
                            <div className="relative">
                                <label htmlFor="articleSearch" className="sr-only">Search articles</label>
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="articleSearch"
                                    name="articleSearch"
                                    autoComplete="off"
                                    aria-label="Search articles"
                                    placeholder="Search title or slug..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <select
                                aria-label="Filter by status"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="h-9 rounded-md border px-3 text-sm bg-white"
                            >
                                <option value="all">All statuses</option>
                                <option value="needs-action">Needs action</option>
                                <option value="draft">Draft</option>
                                <option value="review">In Review</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="published">Published</option>
                                <option value="shared">LinkedIn shared</option>
                            </select>
                            <select
                                aria-label="Sort articles"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                className="h-9 rounded-md border px-3 text-sm bg-white"
                            >
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                            </select>
                            <div className="flex items-center justify-end text-xs text-muted-foreground lg:justify-start">
                                <span>{filteredArticles.length} / {summary.total}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 h-7 px-2 text-[11px]"
                                    onClick={() => refreshLinkedInSummary({ silent: false })}
                                    disabled={linkedinSummaryLoading}
                                >
                                    {linkedinSummaryLoading ? 'Syncing LinkedIn…' : 'Sync LinkedIn'}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            {quickFilters.map((filter) => (
                                <Button
                                    key={filter.value}
                                    type="button"
                                    size="sm"
                                    variant={statusFilter === filter.value ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className="h-8"
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                    </AdminActionBar>
                </AdminSectionCard>

                <AdminSectionCard className={`space-y-4 ${BENTO_SIZE_CLASS[layout.list]}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Articles List</p>
                        <div className="flex items-center gap-2">
                            <label htmlFor="articlesListSize" className="text-xs text-muted-foreground">Size</label>
                            <select
                                id="articlesListSize"
                                value={layout.list}
                                onChange={(e) => updateLayoutSize('list', e.target.value as BentoSize)}
                                className="h-8 rounded-md border bg-white px-2 text-xs"
                            >
                                <option value="sm">S</option>
                                <option value="md">M</option>
                                <option value="lg">L</option>
                                <option value="full">Full</option>
                            </select>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground">Loading articles...</p>
                        </div>
                    ) : filteredArticles.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">
                                {searchQuery ? 'No articles match your search' : 'No articles yet'}
                            </p>
                            {!searchQuery && (
                                <Button onClick={() => setIsCreating(true)}>
                                    <Plus size={16} className="mr-2" />
                                    Create First Article
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredArticles.map((article) => {
                                const metricsLabel = formatLinkedInMetrics(article.id);
                                return (
                                <div
                                    key={article.id}
                                    className="flex flex-col gap-4 rounded-xl border p-4 hover:bg-muted/20 transition-colors md:flex-row md:items-center"
                                >
                            {/* Cover Image Thumbnail */}
                            <div className="w-20 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                {article.cover_image_url ? (
                                    <img
                                        src={article.cover_image_url}
                                        alt={article.title_sk || article.title_en || 'Article cover'}
                                        width={320}
                                        height={224}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <Calendar size={20} />
                                    </div>
                                )}
                            </div>

                            {/* Article Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h3 className="font-medium truncate">{article.title_sk || article.title_en || 'Untitled'}</h3>
                                    {(() => {
                                        const status = getStatus(article);
                                        const { label, variant } = statusBadge(status);
                                        return (
                                            <Badge variant={variant}>
                                                <span className="flex items-center gap-1">
                                                    {status === 'published' ? <Eye size={12} /> : <EyeOff size={12} />} {label}
                                                </span>
                                            </Badge>
                                        );
                                    })()}
                                    <Badge variant={getLinkedInState(article.id).variant}>
                                        <span className="flex items-center gap-1">
                                            <Share2 size={12} />
                                            {getLinkedInState(article.id).label}
                                        </span>
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                    /{article.slug}
                                </p>
                                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                                    <span>
                                        {article.scheduled_at ? `Scheduled: ${new Date(article.scheduled_at).toLocaleString()}` : new Date(article.created_at).toLocaleDateString()}
                                    </span>
                                    {linkedinSummary[article.id]?.sharedAt && (
                                        <span>
                                            LinkedIn: {new Date(linkedinSummary[article.id].sharedAt as string).toLocaleDateString()}
                                        </span>
                                    )}
                                    {metricsLabel && (
                                        <span>{metricsLabel}</span>
                                    )}
                                    {linkedinSummary[article.id]?.scheduledAt && (
                                        <span>
                                            Next share: {new Date(linkedinSummary[article.id].scheduledAt as string).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex w-full items-center gap-2 md:w-auto md:flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingArticleId(article.id)}
                                    className="flex-1 md:flex-none"
                                >
                                    <Edit size={14} className="mr-1" />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/admin?workspace=publishing&tab=article-studio&edit=${article.id}&panel=linkedin`)}
                                    className="flex-1 md:flex-none"
                                >
                                    <Share2 size={14} className="mr-1" />
                                    LinkedIn
                                </Button>
                                {isAdmin && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" aria-label="Delete article">
                                                <Trash2 size={14} />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Article</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete &ldquo;{article.title_sk || article.title_en}&rdquo;? This cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    onClick={() => deleteMutation.mutate(article.id)}
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </AdminSectionCard>
            </div>
        </div>
    );
}
