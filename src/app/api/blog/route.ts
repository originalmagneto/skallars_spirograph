import { NextRequest, NextResponse } from 'next/server';
import { getGhost } from '@/lib/ghost';
import { MOCK_POSTS } from '@/lib/mockPosts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch news settings (optional)
    let settings: any = null;
    try {
      const { data: settingsData } = await supabase
        .from('news_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      settings = settingsData?.[0] || null;
    } catch {
      settings = null;
    }

    const effectiveLimit = Number.isFinite(parseInt(limitParam || '', 10))
      ? parseInt(limitParam as string, 10)
      : (settings?.limit_count ?? 6);

    // Determine offset
    const from = (page - 1) * effectiveLimit;
    const to = from + effectiveLimit - 1;

    // Fetch articles from Supabase
    const { data: posts, error, count } = await supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Transform to match BlogCarousel expectation (if needed)
    const transformedPosts = posts?.map(post => ({
      id: post.id,
      // Smart fallback for title in list view
      title: post.title_sk || post.title_en || post.title_de || post.title_cn || 'Untitled Article',
      slug: post.slug,
      excerpt: post.excerpt_sk || post.excerpt_en || post.excerpt_de || post.excerpt_cn || '',
      feature_image: post.cover_image_url,
      published_at: post.published_at,
      reading_time: 5, // Placeholder or calculate
      // Multi-language support for frontend will need to send all titles
      title_sk: post.title_sk,
      title_en: post.title_en,
      title_de: post.title_de,
      title_cn: post.title_cn,
      excerpt_sk: post.excerpt_sk,
      excerpt_en: post.excerpt_en,
      excerpt_de: post.excerpt_de,
      excerpt_cn: post.excerpt_cn,
    })) || [];

    return NextResponse.json({
      posts: transformedPosts,
      settings: {
        limit_count: settings?.limit_count ?? 6,
        show_view_all: settings?.show_view_all ?? true,
        autoplay: settings?.autoplay ?? true,
        autoplay_interval_ms: settings?.autoplay_interval_ms ?? 50,
        scroll_step: settings?.scroll_step ?? 1,
      },
      meta: {
        pagination: {
          page,
          limit: effectiveLimit,
          pages: Math.ceil((count || 0) / effectiveLimit),
          total: count
        }
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch articles from Supabase:", error);
    // Fallback to MOCK_POSTS only on error, or return empty?
    // Better to return empty real data than confusing mock data now that we have a real DB.
    const fallbackLimit = 6;
    return NextResponse.json({ posts: [], settings: { limit_count: fallbackLimit, show_view_all: true, autoplay: true, autoplay_interval_ms: 50, scroll_step: 1 }, meta: { pagination: { page: 1, limit: fallbackLimit, pages: 0, total: 0 } } });
  }
}
