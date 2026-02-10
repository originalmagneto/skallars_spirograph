import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { MOCK_POSTS } from '@/lib/mockPosts';
import ArticleViewer from '@/components/ArticleViewer';

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 30;

async function getBaseUrl() {
  const h = await headers();
  const protocol = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return `${protocol}://${host}`;
}

const getFirstField = (post: any, key: string) => {
  return (
    post?.[`${key}_sk`] ||
    post?.[`${key}_en`] ||
    post?.[`${key}_de`] ||
    post?.[`${key}_cn`] ||
    post?.[key] ||
    ''
  );
};

async function getPost(slug: string) {
  const base = await getBaseUrl();
  try {
    const res = await fetch(`${base}/api/blog/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) return MOCK_POSTS.find((p) => p.slug === slug) || null;
    const data = await res.json();
    return data.post || MOCK_POSTS.find((p) => p.slug === slug) || null;
  } catch {
    return MOCK_POSTS.find((p) => p.slug === slug) || null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const baseUrl = await getBaseUrl();
  const title =
    getFirstField(post, 'meta_title') ||
    getFirstField(post, 'title') ||
    'Skallars Article';
  const description =
    getFirstField(post, 'meta_description') ||
    getFirstField(post, 'excerpt') ||
    '';
  const image = post.cover_image_url || post.feature_image || undefined;
  const imageUrl = image
    ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)
    : undefined;
  const canonical = `${baseUrl}/blog/${post.slug || slug}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    alternates: {
      canonical,
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return notFound();

  const baseUrl = await getBaseUrl();
  const canonical = `${baseUrl}/blog/${post.slug || slug}`;
  const title =
    getFirstField(post, 'meta_title') ||
    getFirstField(post, 'title') ||
    'Skallars Article';
  const description =
    getFirstField(post, 'meta_description') ||
    getFirstField(post, 'excerpt') ||
    '';
  const image = post.cover_image_url || post.feature_image || undefined;
  const imageUrl = image
    ? (image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`)
    : undefined;
  const publishedAt = post.published_at || post.created_at;
  const modifiedAt = post.updated_at || publishedAt;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: publishedAt,
    dateModified: modifiedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical
    },
    publisher: {
      "@type": "Organization",
      name: "Skallars",
      logo: {
        "@type": "ImageObject",
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-dark-G5tVbs8tg8buqtWwaFJjCCudUb9tJa.svg"
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleViewer post={post} />
    </>
  );
}
