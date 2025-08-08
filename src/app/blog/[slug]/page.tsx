import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { MOCK_POSTS } from '@/lib/mockPosts';

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

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="mb-2 flex items-center gap-3">
          <a href="/" className="text-sm text-[#210059] hover:underline">← Domov</a>
          <span className="text-gray-300">•</span>
          <a href="/blog" className="text-sm text-[#210059] hover:underline">Blog</a>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#210059] mb-2 tracking-tight">{post.title}</h1>
        {post.badge && (
          <span
            className="inline-block text-[10px] uppercase tracking-wide px-2 py-1 rounded-full mb-4"
            style={{ backgroundColor: '#210059', color: '#FFFFFF', textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
          >
            {post.badge}
          </span>
        )}
        {post.feature_image && (
          <img
            src={post.feature_image}
            alt={post.feature_image_alt || post.title}
            className="w-full h-auto rounded-xl mb-6 shadow-lg"
          />
        )}
        {post.html ? (
          <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: post.html }} />
        ) : (
          <p className="text-gray-600">Obsah nie je k dispozícii.</p>
        )}
        <div className="mt-10 flex gap-3">
          <a href="/blog" className="px-4 py-2 rounded-md bg-[#210059] text-white hover:bg-[#210059]/90 transition-colors">Späť na blog</a>
          <a href="/" className="px-4 py-2 rounded-md border border-[#210059] text-[#210059] hover:bg-[#210059]/5 transition-colors">Na hlavnú stránku</a>
        </div>
      </div>
    </div>
  );
}


