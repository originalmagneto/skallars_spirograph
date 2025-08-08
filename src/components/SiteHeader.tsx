"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

export default function SiteHeader() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>('');
  const { t } = useLanguage();

  useEffect(() => {
    if (pathname !== '/') return;
    const options: IntersectionObserverInit = { root: null, rootMargin: '-40% 0px -55% 0px', threshold: 0 };
    const sections = ['home', 'services', 'countries', 'team', 'clients', 'contact'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, options);
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pathname]);

  // Apply .reveal animation when in view
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal')) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const linkBase = 'text-[#210059] hover:text-[#210059]/80 font-bold inline-flex items-center align-middle';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-md transition-all">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-dark-G5tVbs8tg8buqtWwaFJjCCudUb9tJa.svg"
            alt="SKALLARS Logo"
            className="h-10"
          />
        </Link>
        <nav>
          <ul className="flex items-center space-x-6">
            <li>
              <Link href="/#home" className={`${linkBase}`}>
                <span className={`mr-2 inline-block w-2 h-2 rounded-full transition-opacity ${pathname === '/' && activeSection === 'home' ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--mint-400)' }} />
                Skallars
              </Link>
            </li>
            <li>
              <Link href="/#services" className={`${linkBase}`}>
                <span className={`mr-2 inline-block w-2 h-2 rounded-full transition-opacity ${pathname === '/' && activeSection === 'services' ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--mint-400)' }} />
                {t.navigation.services}
              </Link>
            </li>
            <li>
              <Link href="/#countries" className={`${linkBase}`}>
                <span className={`mr-2 inline-block w-2 h-2 rounded-full transition-opacity ${pathname === '/' && activeSection === 'countries' ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--mint-400)' }} />
                {t.navigation.countries}
              </Link>
            </li>
            <li>
              <Link href="/#team" className={`${linkBase}`}>
                <span className={`mr-2 inline-block w-2 h-2 rounded-full transition-opacity ${pathname === '/' && activeSection === 'team' ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--mint-400)' }} />
                {t.navigation.team}
              </Link>
            </li>
            <li>
              <Link href="/#contact" className={`${linkBase}`}>
                <span className={`mr-2 inline-block w-2 h-2 rounded-full transition-opacity ${pathname === '/' && activeSection === 'contact' ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--mint-400)' }} />
                {t.navigation.contact}
              </Link>
            </li>
            <li className="pl-2">
              <Link
                href="/blog"
                className="inline-flex items-center justify-center h-10 px-5 rounded-full text-base font-semibold shadow-md align-middle"
                style={{
                  backgroundColor: '#38F8B8',
                  color: '#FFFFFF',
                  textShadow: '0 1px 1px rgba(0,0,0,0.25)'
                }}
              >
                {t.navigation.blog}
              </Link>
            </li>
            <li className="pl-4">
              <LanguageToggle />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}


