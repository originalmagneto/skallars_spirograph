"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export default function SiteHeader() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  // Track scroll position for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active section for navigation highlighting
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

  const navItems = [
    { id: 'home', href: '/#home', label: 'Skallars' },
    { id: 'services', href: '/#services', label: t.navigation.services },
    { id: 'countries', href: '/#countries', label: t.navigation.countries },
    { id: 'team', href: '/#team', label: t.navigation.team },
    { id: 'contact', href: '/#contact', label: t.navigation.contact },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
          ? 'py-3 glass shadow-lg'
          : 'py-5 bg-transparent'
        }`}
      data-admin-section="navigation"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="relative z-10 group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-dark-G5tVbs8tg8buqtWwaFJjCCudUb9tJa.svg"
                alt="SKALLARS Logo"
                className="h-9 md:h-10 transition-opacity group-hover:opacity-90"
              />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="relative px-4 py-2 group"
              >
                <span
                  className={`relative z-10 text-sm font-medium transition-colors duration-300 ${pathname === '/' && activeSection === item.id
                      ? 'text-[hsl(var(--brand-indigo))]'
                      : 'text-slate-600 group-hover:text-[hsl(var(--brand-indigo))]'
                    }`}
                >
                  {item.label}
                </span>
                {/* Active indicator dot */}
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: pathname === '/' && activeSection === item.id ? 1 : 0,
                    opacity: pathname === '/' && activeSection === item.id ? 1 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-accent))]"
                />
                {/* Hover underline */}
                <span
                  className={`absolute bottom-0 left-4 right-4 h-px bg-[hsl(var(--brand-indigo))] origin-left transition-transform duration-300 ${pathname === '/' && activeSection === item.id
                      ? 'scale-x-0'
                      : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                />
              </Link>
            ))}

            {/* Blog Button */}
            <Link
              href="/blog"
              className="ml-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 btn-accent"
            >
              {t.navigation.blog}
            </Link>

            {/* Language Toggle */}
            <div className="ml-4">
              <LanguageToggle />
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden relative z-10 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {isMobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={24} className="text-[hsl(var(--brand-indigo))]" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={24} className="text-[hsl(var(--brand-indigo))]" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="lg:hidden overflow-hidden"
          >
            <div className="glass border-t border-slate-200/50 mt-3">
              <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${pathname === '/' && activeSection === item.id
                          ? 'bg-[hsl(var(--brand-indigo))]/5 text-[hsl(var(--brand-indigo))]'
                          : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navItems.length * 0.05, duration: 0.3 }}
                  className="pt-4 border-t border-slate-100 mt-2"
                >
                  <Link
                    href="/blog"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-base font-semibold btn-accent text-center"
                  >
                    {t.navigation.blog}
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (navItems.length + 1) * 0.05, duration: 0.3 }}
                  className="flex justify-center pt-4"
                >
                  <LanguageToggle />
                </motion.div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
