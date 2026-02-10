import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { MOCK_POSTS } from '@/lib/mockPosts';
import { fetchSeoSettings, getBaseUrlFromHeaders } from '@/lib/seoSettings';

export const revalidate = 30; // refresh frequently for mock/demo

async function getBaseUrl() {
  const h = await headers();
  const protocol = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return `${protocol}://${host}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const defaults = {
    title: 'Blog | Skallars',
    description: 'Latest legal updates, commentary, and insights from Skallars.',
  };
  const settings = await fetchSeoSettings([
    'seo_blog_title',
    'seo_blog_description',
    'seo_blog_og_image',
  ]);

  const baseUrl = await getBaseUrlFromHeaders();
  const title = settings.seo_blog_title || defaults.title;
  const description = settings.seo_blog_description || defaults.description;
  const ogImage = settings.seo_blog_og_image;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/blog`,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

async function getPosts() {
  const base = await getBaseUrl();
  try {
    const res = await fetch(`${base}/api/blog?limit=12`, { next: { revalidate: 30 } });
    if (!res.ok) return MOCK_POSTS as any[];
    const data = await res.json();
    return data.posts || (MOCK_POSTS as any[]);
  } catch {
    return MOCK_POSTS as any[];
  }
}

export default async function BlogIndexPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-6xl font-extrabold text-[#210059] mb-3 tracking-tight">Blog</h1>
        <div className="text-base font-semibold text-[var(--mint-400)] uppercase tracking-wide mb-8">Novinky a komentáre</div>
        {(!posts || posts.length === 0) && (
          <div className="text-gray-500">Zatiaľ žiadne články.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post: any) => (
            <article
              key={post.id}
              className="bg-white rounded-xl overflow-hidden shadow-lg transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl"
            >
              <Link href={`/blog/${post.slug}`}>
                <img
                  src={post.feature_image || '/images/legal-consultation.jpg'}
                  alt={post.feature_image_alt || post.title}
                  className="w-full h-48 object-cover transform transition-transform duration-300 hover:scale-[1.03]"
                />
              </Link>
              <div className="p-6">
                {post.badge && (
                  <span
                    className="inline-block text-[10px] uppercase tracking-wide px-2 py-1 rounded-full mb-2"
                    style={{ backgroundColor: '#210059', color: '#FFFFFF', textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
                  >
                    {post.badge}
                  </span>
                )}
                <h2 className="text-xl font-semibold text-[#210059] mb-2">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                {post.excerpt && (
                  <p className="text-gray-600 text-sm mb-4">{post.excerpt}</p>
                )}
                <div className="text-xs text-gray-400">
                  {post.published_at && new Date(post.published_at).toLocaleDateString('sk-SK')}
                  {typeof post.reading_time === 'number' && ` • ${post.reading_time} min`}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
