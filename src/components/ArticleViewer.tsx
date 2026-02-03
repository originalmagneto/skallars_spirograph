"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { GeneratedArticle } from '@/lib/aiService'; // Reusing interface or similar structure

interface ArticleViewerProps {
    post: any; // Using any to accommodate Supabase structure with language fields
}

export default function ArticleViewer({ post }: ArticleViewerProps) {
    const { language, t } = useLanguage();

    // Helper to get content based on language with fallback
    const getField = (field: 'title' | 'content' | 'excerpt' | 'disclaimer') => {
        // Try current language
        const fieldKey = field === 'disclaimer' ? 'compliance_disclaimer' : field;
        const val = post[`${fieldKey}_${language}`];
        if (val) return val;

        // Fallback order: EN -> SK -> DE -> CN
        const fallbacks = ['en', 'sk', 'de', 'cn'];
        for (const lang of fallbacks) {
            if (post[`${fieldKey}_${lang}`]) return post[`${fieldKey}_${lang}`];
        }

        // Legacy/Ghost fallback
        if (field === 'title') return post.title;
        if (field === 'content') return post.html || post.content; // Ghost/Mock uses html or content
        if (field === 'excerpt') return post.excerpt;

        return '';
    };

    const title = getField('title');
    const content = getField('content');
    const featureImage = post.cover_image_url || post.feature_image;
    const disclaimer = getField('disclaimer');

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 py-16 max-w-3xl">
                <div className="mb-6 flex items-center gap-3 text-sm font-medium">
                    <Link href="/" className="text-[#210059] hover:underline hover:text-purple-700 transition-colors">
                        {t.navigation.home}
                    </Link>
                    <span className="text-gray-300">•</span>
                    <Link href="/blog" className="text-[#210059] hover:underline hover:text-purple-700 transition-colors">
                        {t.navigation.blog}
                    </Link>
                </div>

                <article>
                    {post.category && (
                        <div className="mb-4">
                            <span
                                className="inline-block text-[10px] uppercase tracking-wide px-3 py-1 rounded-full font-bold"
                                style={{ backgroundColor: '#210059', color: '#FFFFFF' }}
                            >
                                {post.category}
                            </span>
                        </div>
                    )}

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#210059] mb-6 tracking-tight leading-tight">
                        {title}
                    </h1>

                    <div className="flex items-center gap-4 mb-8 text-sm text-gray-500 border-b pb-8">
                        <span className="flex items-center gap-2">
                            {new Date(post.published_at || post.created_at).toLocaleDateString(language === 'sk' ? 'sk-SK' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                        {post.reading_time && (
                            <>
                                <span>•</span>
                                <span>{post.reading_time} min read</span>
                            </>
                        )}
                    </div>

                    {featureImage && (
                        <div className="mb-10 rounded-2xl overflow-hidden shadow-xl ring-1 ring-gray-900/5 aspect-video relative">
                            <img
                                src={featureImage}
                                alt={title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div
                        className="prose prose-lg prose-slate max-w-none 
              prose-headings:font-bold prose-headings:text-[#210059] prose-headings:tracking-tight
              prose-p:text-gray-600 prose-p:leading-relaxed
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[#210059] prose-strong:font-bold
              prose-li:text-gray-600
              prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />

                    {disclaimer && (
                        <div className="mt-10 rounded-xl border border-[#210059]/20 bg-[#f7f3ff] p-6 text-sm text-[#210059]">
                            <div className="font-semibold mb-2">Legal Disclaimer</div>
                            <div className="text-[#210059]/90">{disclaimer}</div>
                        </div>
                    )}
                </article>

                <div className="mt-16 pt-8 border-t flex justify-between">
                    <Link href="/blog" className="px-6 py-3 rounded-full bg-gray-100 text-[#210059] font-medium hover:bg-gray-200 transition-all">
                        ← {t.news.viewAll}
                    </Link>
                </div>
            </div>
        </div>
    );
}
