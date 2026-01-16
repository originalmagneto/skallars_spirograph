import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { MOCK_POSTS } from '@/lib/mockPosts';
import ArticleViewer from '@/components/ArticleViewer';

type Params = { params: { slug: string } };

export const revalidate = 30;

function getBaseUrl() {
  const h = headers();
  const protocol = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return `${protocol}://${host}`;
}

async function getPost(slug: string) {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/blog/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) return MOCK_POSTS.find((p) => p.slug === slug) || null;
    const data = await res.json();
    return data.post || MOCK_POSTS.find((p) => p.slug === slug) || null;
  } catch {
    return MOCK_POSTS.find((p) => p.slug === slug) || null;
  }
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = params;
  const post = await getPost(slug);
  if (!post) return notFound();

  return <ArticleViewer post={post} />;
}


