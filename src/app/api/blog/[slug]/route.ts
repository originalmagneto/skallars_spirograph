import { NextRequest, NextResponse } from 'next/server';
import { getGhost } from '@/lib/ghost';
import { MOCK_POSTS } from '@/lib/mockPosts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { slug: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = params;

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const supabaseKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const nowIso = new Date().toISOString();
    const { data: post, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .or(`published_at.is.null,published_at.lte.${nowIso}`)
      .single();

    if (error || !post) {
      // Fallback to mock if not found in DB (legacy support)
      const mockPost = MOCK_POSTS.find((p) => p.slug === slug);
      if (mockPost) return NextResponse.json({ post: mockPost });

      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Transform to frontend expectation. 
    // We pass all raw fields so the frontend can choose language.
    // We also set default 'html' and 'title' for SEO/Metadata parsers that might not use the context.
    const transformedPost = {
      ...post,
      // Default to English or Slovak if specific logic needed for simple clients
      title: post.title_sk || post.title_en,
      html: post.content_sk || post.content_en,
      feature_image: post.cover_image_url,
      published_at: post.published_at,
    };

    return NextResponse.json({ post: transformedPost });

  } catch (error: any) {
    console.error("Failed to fetch article:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
