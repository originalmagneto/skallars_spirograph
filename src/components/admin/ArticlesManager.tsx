"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';
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
    created_at: string;
}

export default function ArticlesManager() {
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

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

    // Filter articles by search query
    const filteredArticles = articles?.filter(article =>
        article.title_sk.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.title_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.slug.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

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
                        router.replace('/admin?tab=articles');
                    }}
                >
                    ← Back to Articles
                </Button>
                <ArticleEditor
                    articleId={isCreating ? undefined : editingArticleId || undefined}
                    onClose={() => {
                        setEditingArticleId(null);
                        setIsCreating(false);
                        router.replace('/admin?tab=articles');
                    }}
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">Error loading articles: {(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={() => setIsCreating(true)}>
                    <Plus size={16} className="mr-2" />
                    New Article
                </Button>
            </div>

            {/* Articles List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading articles...</p>
                </div>
            ) : filteredArticles.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/30">
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
                    {filteredArticles.map((article) => (
                        <div
                            key={article.id}
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            {/* Cover Image Thumbnail */}
                            <div className="w-20 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                {article.cover_image_url ? (
                                    <img
                                        src={article.cover_image_url}
                                        alt=""
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
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium truncate">{article.title_sk || article.title_en || 'Untitled'}</h3>
                                    <Badge variant={article.is_published ? 'default' : 'secondary'}>
                                        {article.is_published ? (
                                            <span className="flex items-center gap-1">
                                                <Eye size={12} /> Published
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <EyeOff size={12} /> Draft
                                            </span>
                                        )}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                    /{article.slug}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(article.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingArticleId(article.id)}
                                >
                                    <Edit size={14} className="mr-1" />
                                    Edit
                                </Button>
                                {isAdmin && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
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
                    ))}
                </div>
            )}
        </div>
    );
}
