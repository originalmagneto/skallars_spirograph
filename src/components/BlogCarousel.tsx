"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { MOCK_POSTS } from '@/lib/mockPosts';
import { useLanguage } from '@/contexts/LanguageContext';

type PostPreview = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  feature_image?: string | null;
  feature_image_alt?: string | null;
  published_at?: string;
  reading_time?: number;
  badge?: 'News' | 'Komentár' | 'Analýza';
};

export default function BlogCarousel() {
  const [posts, setPosts] = useState<PostPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/blog?limit=9', { cache: 'no-store' });
        if (!res.ok) {
          setPosts(MOCK_POSTS);
        } else {
          const data = await res.json();
          setPosts(data.posts || MOCK_POSTS);
        }
      } catch (e) {
        console.error(e);
        setPosts(MOCK_POSTS);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Autoplay slow scroll (pause on hover)
  useEffect(() => {
    if (!scrollRef.current || posts.length === 0) return;
    
    const start = () => {
      autoplayRef.current && clearInterval(autoplayRef.current);
      autoplayRef.current = setInterval(() => {
        if (!scrollRef.current) return;
        const el = scrollRef.current;
        const next = el.scrollLeft + 1; // slower drift
        const end = el.scrollWidth - el.clientWidth;
        if (next >= end) {
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollTo({ left: next, behavior: 'smooth' });
        }
      }, 50);
    };
    
    const stop = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
    
    // Start autoplay after a short delay
    const timer = setTimeout(start, 1000);
    
    const el = scrollRef.current;
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
    
    return () => {
      clearTimeout(timer);
      el.removeEventListener('mouseenter', stop);
      el.removeEventListener('mouseleave', start);
      stop();
    };
  }, [posts.length]);

  const scrollBy = (delta: number) => {
    if (scrollRef.current) {
      // Pause autoplay when manually scrolling
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
      
      const el = scrollRef.current;
      const currentScroll = el.scrollLeft;
      const newScroll = currentScroll + delta;
      
      // Ensure we don't scroll beyond bounds
      const maxScroll = el.scrollWidth - el.clientWidth;
      const targetScroll = Math.max(0, Math.min(newScroll, maxScroll));
      
      el.scrollTo({ left: targetScroll, behavior: 'smooth' });
      
      // Resume autoplay after manual scroll
      setTimeout(() => {
        if (!autoplayRef.current) {
          const start = () => {
            autoplayRef.current = setInterval(() => {
              if (!scrollRef.current) return;
              const el = scrollRef.current;
              const next = el.scrollLeft + 1;
              const end = el.scrollWidth - el.clientWidth;
              if (next >= end) {
                el.scrollTo({ left: 0, behavior: 'smooth' });
              } else {
                el.scrollTo({ left: next, behavior: 'smooth' });
              }
            }, 50);
          };
          start();
        }
      }, 3000); // Resume after 3 seconds
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-6 overflow-x-hidden">
        {[1,2,3].map((i) => (
          <div key={i} className="min-w-[300px] h-60 bg-white/10 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!posts.length) {
    return <div className="text-gray-400">Žiadne články nie sú k dispozícii.</div>;
  }

  return (
    <div className="relative">
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-10">
        <button
          aria-label="Scroll left"
          className="rounded-full bg-white/90 hover:bg-white shadow-lg p-3 transition-all duration-200 hover:scale-110 text-gray-700 hover:text-gray-900 text-xl font-bold"
          onClick={() => scrollBy(-320)}
        >
          ‹
        </button>
      </div>
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10">
        <button
          aria-label="Scroll right"
          className="rounded-full bg-white/90 hover:bg-white shadow-lg p-3 transition-all duration-200 hover:scale-110 text-gray-700 hover:text-gray-900 text-xl font-bold"
          onClick={() => scrollBy(320)}
        >
          ›
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scrollbar-thin"
      >
        {posts.map((post) => (
          <article
            key={post.id}
            className="min-w-[300px] max-w-[300px] bg-white rounded-xl overflow-hidden shadow-lg snap-start transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl"
          >
            <Link href={`/blog/${post.slug}`}>
              <img
                src={post.feature_image || '/images/legal-consultation.jpg'}
                alt={post.feature_image_alt || post.title}
                className="w-full h-40 object-cover transform transition-transform duration-300 hover:scale-[1.03]"
              />
            </Link>
            <div className="p-4">
              {post.badge && (
                <span
                  className="inline-block text-[10px] uppercase tracking-wide px-2 py-1 rounded-full mb-2"
                  style={{
                    backgroundColor: '#210059',
                    color: '#FFFFFF',
                    textShadow: '0 1px 1px rgba(0,0,0,0.25)'
                  }}
                >
                  {post.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold text-[#210059] mb-2 line-clamp-2">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              {post.excerpt && (
                <p className="text-gray-600 text-sm line-clamp-3">{post.excerpt}</p>
              )}
              <div className="mt-3 text-xs text-gray-400">
                {post.published_at && new Date(post.published_at).toLocaleDateString('sk-SK')}
                {typeof post.reading_time === 'number' && ` • ${post.reading_time} min`}
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/blog"
          className="inline-block px-4 py-2 rounded-full font-semibold shadow-md transition-transform duration-200 hover:scale-[1.02]"
          style={{ backgroundColor: '#210059', color: '#FFFFFF', textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
        >
          {t.news.viewAll}
        </Link>
      </div>
    </div>
  );
}


