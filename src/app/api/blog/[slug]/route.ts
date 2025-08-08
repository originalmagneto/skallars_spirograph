import { NextRequest, NextResponse } from 'next/server';
import { getGhost } from '@/lib/ghost';
import { MOCK_POSTS } from '@/lib/mockPosts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { slug: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = params;
  const ghost = getGhost();

  if (!ghost) {
    const post = MOCK_POSTS.find((p) => p.slug === slug);
    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ post });
  }

  try {
    const post = await ghost.posts.read({ slug }, { include: ['tags'] });
    return NextResponse.json({ post });
  } catch (error: any) {
    // Fallback to mock
    const post = MOCK_POSTS.find((p) => p.slug === slug);
    if (!post) {
      return NextResponse.json({ error: error?.message || 'Failed to fetch post' }, { status: 500 });
    }
    return NextResponse.json({ post });
  }
}


