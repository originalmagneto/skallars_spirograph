"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { MOCK_POSTS } from '@/lib/mockPosts';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackEvent } from '@/lib/analytics';

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
  tags?: string[];
};

export default function BlogCarousel() {
  const [posts, setPosts] = useState<PostPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    limit_count: 6,
    show_view_all: true,
    autoplay: true,
    autoplay_interval_ms: 6000,
    scroll_step: 1,
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const resumeRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useLanguage();

  const clearAutoplay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  const clearResume = () => {
    if (resumeRef.current) {
      clearTimeout(resumeRef.current);
      resumeRef.current = null;
    }
  };

  const resolveScrollStep = () => {
    const el = scrollRef.current;
    if (!el) return 320;
    const firstCard = el.querySelector('article');
    const cardWidth = firstCard instanceof HTMLElement ? firstCard.offsetWidth : 300;
    const gap = Number.parseFloat(window.getComputedStyle(el).gap || '24') || 24;
    const naturalStep = cardWidth + gap;
    // Backward compatible: if old small values are saved, use natural card step.
    if ((settings.scroll_step || 0) <= 40) return naturalStep;
    return Math.max(naturalStep, settings.scroll_step || naturalStep);
  };

  const resolveAutoplayInterval = () => Math.max(3000, settings.autoplay_interval_ms || 6000);

  const tickCarousel = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const step = resolveScrollStep();
    const next = el.scrollLeft + step;
    const end = el.scrollWidth - el.clientWidth;
    if (next >= end - 2) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    el.scrollTo({ left: next, behavior: 'smooth' });
  };

  const startAutoplay = () => {
    if (!settings.autoplay) return;
    clearAutoplay();
    autoplayRef.current = setInterval(tickCarousel, resolveAutoplayInterval());
  };

  const stopAutoplay = () => {
    clearAutoplay();
    clearResume();
  };

  const scheduleAutoplayResume = (delayMs = 3200) => {
    clearResume();
    resumeRef.current = setTimeout(() => {
      startAutoplay();
    }, delayMs);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/blog', { cache: 'no-store' });
        if (!res.ok) {
          setPosts(MOCK_POSTS);
        } else {
          const data = await res.json();
          setPosts(data.posts || MOCK_POSTS);
          if (data.settings) {
            setSettings({
              limit_count: data.settings.limit_count ?? 6,
              show_view_all: data.settings.show_view_all ?? true,
              autoplay: data.settings.autoplay ?? true,
              autoplay_interval_ms: data.settings.autoplay_interval_ms ?? 6000,
              scroll_step: data.settings.scroll_step ?? 1,
            });
          }
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
    if (!settings.autoplay) return;

    // Start autoplay after a short delay
    const timer = setTimeout(startAutoplay, 1000);

    const el = scrollRef.current;
    el.addEventListener('mouseenter', stopAutoplay);
    el.addEventListener('mouseleave', startAutoplay);

    return () => {
      clearTimeout(timer);
      el.removeEventListener('mouseenter', stopAutoplay);
      el.removeEventListener('mouseleave', startAutoplay);
      stopAutoplay();
    };
  }, [posts.length, settings.autoplay, settings.autoplay_interval_ms, settings.scroll_step]);

  const scrollBy = (direction: -1 | 1) => {
    if (scrollRef.current) {
      // Pause autoplay when manually scrolling
      stopAutoplay();
      
      const el = scrollRef.current;
      const currentScroll = el.scrollLeft;
      const newScroll = currentScroll + direction * resolveScrollStep();
      
      // Ensure we don't scroll beyond bounds
      const maxScroll = el.scrollWidth - el.clientWidth;
      const targetScroll = Math.max(0, Math.min(newScroll, maxScroll));
      
      el.scrollTo({ left: targetScroll, behavior: 'smooth' });
      
      // Resume autoplay after manual scroll
      scheduleAutoplayResume();
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
          onClick={() => scrollBy(-1)}
        >
          ‹
        </button>
      </div>
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10">
        <button
          aria-label="Scroll right"
          className="rounded-full bg-white/90 hover:bg-white shadow-lg p-3 transition-all duration-200 hover:scale-110 text-gray-700 hover:text-gray-900 text-xl font-bold"
          onClick={() => scrollBy(1)}
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
            <Link href={`/blog/${post.slug}`} className="block relative">
              <img
                src={post.feature_image || '/images/legal-consultation.jpg'}
                alt={post.feature_image_alt || post.title}
                className="w-full h-40 object-cover transform transition-transform duration-300 hover:scale-[1.03]"
              />
              {post.tags?.length ? (
                <span
                  className="absolute top-3 left-3 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full shadow-md"
                  style={{ backgroundColor: '#210059', color: '#FFFFFF', textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
                >
                  {post.tags[0]}
                </span>
              ) : null}
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
      {settings.show_view_all && (
        <div className="mt-6 text-center">
          <Link
            href="/blog"
            className="inline-block px-4 py-2 rounded-full font-semibold shadow-md transition-transform duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: '#210059', color: '#FFFFFF', textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
            onClick={() => {
              trackEvent({
                eventType: 'blog_view_all_click',
                page: 'home',
                href: '/blog',
              });
            }}
          >
            {t.news.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}
