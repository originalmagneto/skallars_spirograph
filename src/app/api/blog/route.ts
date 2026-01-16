import { NextRequest, NextResponse } from 'next/server';
import { getGhost } from '@/lib/ghost';
import { MOCK_POSTS } from '@/lib/mockPosts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '6', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Determine offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

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
      meta: {
        pagination: {
          page,
          limit,
          pages: Math.ceil((count || 0) / limit),
          total: count
        }
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch articles from Supabase:", error);
    // Fallback to MOCK_POSTS only on error, or return empty?
    // Better to return empty real data than confusing mock data now that we have a real DB.
    return NextResponse.json({ posts: [], meta: { pagination: { page: 1, limit, pages: 0, total: 0 } } });
  }
}


