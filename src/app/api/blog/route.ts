import { NextRequest, NextResponse } from 'next/server';
import { getGhost } from '@/lib/ghost';
import { MOCK_POSTS } from '@/lib/mockPosts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '6', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  const ghost = getGhost();

  if (!ghost) {
    // Return mock posts if Ghost is not configured
    const start = (page - 1) * limit;
    const end = start + limit;
    const posts = MOCK_POSTS.slice(start, end);
    return NextResponse.json({ posts, meta: { pagination: { page, limit, pages: 1, total: MOCK_POSTS.length } } });
  }

  try {
    const posts = await ghost.posts.browse({
      limit,
      page,
      include: ['tags'],
      fields: ['id', 'title', 'slug', 'excerpt', 'feature_image', 'feature_image_alt', 'published_at', 'reading_time'],
      filter: 'visibility:public'
    });

    return NextResponse.json({
      posts,
      meta: (posts as any).meta || null,
    });
  } catch (error: any) {
    // Fallback to mock if Ghost call fails
    const start = (page - 1) * limit;
    const end = start + limit;
    const posts = MOCK_POSTS.slice(start, end);
    return NextResponse.json({ posts, meta: { pagination: { page, limit, pages: 1, total: MOCK_POSTS.length } } });
  }
}


