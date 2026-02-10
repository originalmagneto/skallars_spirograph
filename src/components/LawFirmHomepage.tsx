"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Phone,
  Mail,
  Linkedin,
} from "lucide-react";
import { Linkedin01Icon } from "hugeicons-react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import dynamic from 'next/dynamic';
import GlobalNetworkSection from './GlobalNetworkSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import BlogCarousel from './BlogCarousel';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import AdminInlinePreviewBar from './AdminInlinePreviewBar';
import { trackEvent } from '@/lib/analytics';

// Dynamically import the Spirograph component with no SSR
const Spirograph = dynamic(() => import('./Spirograph'), {
  ssr: false
});

export default function LawFirmHomepage() {
  const servicesRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const serviceRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [currentClientIndex, setCurrentClientIndex] = useState(0);
  const [showSectionHighlights, setShowSectionHighlights] = useState(false);

  const [activeSection, setActiveSection] = useState("");
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const { t, language } = useLanguage();

  const fallbackImages = [
    "/images/legal-consultation.jpg",
    "/images/contract-review.jpg",
    "/images/court-representation.jpg",
    "/images/corporate-law.jpg",
    "/images/europe-map.jpg",
  ];
  const images = Array.isArray(t.services?.images) && t.services.images.length > 0
    ? t.services.images
    : fallbackImages;

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "services", "countries", "clients", "contact"];
      let current = "";
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && window.scrollY >= element.offsetTop - 100) {
          current = section;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Observe which service card is most in view and update the sticky image accordingly
  useEffect(() => {
    if (!serviceRefs.current?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexAttr = (entry.target as HTMLElement).dataset.index;
            if (indexAttr) {
              const idx = parseInt(indexAttr, 10);
              setCurrentImageIndex(idx % images.length);
            }
          }
        });
      },
      { root: null, threshold: 0.6 }
    );

    serviceRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      serviceRefs.current.forEach((el) => {
        if (el) observer.unobserve(el);
      });
      observer.disconnect();
    };
  }, [images.length]);

  useEffect(() => {
    const handleHighlight = () => {
      setShowSectionHighlights(true);
      setTimeout(() => setShowSectionHighlights(false), 3000);
    };
    const handleFocusSection = (event: Event) => {
      const custom = event as CustomEvent<string>;
      const section = custom.detail;
      if (!section) return;
      const element = document.querySelector(`[data-admin-section="${section}"]`) as HTMLElement | null;
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-primary/70", "ring-offset-4");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary/70", "ring-offset-4");
        }, 2000);
      }
    };
    window.addEventListener("admin:highlight-sections", handleHighlight as EventListener);
    window.addEventListener("admin:focus-section", handleFocusSection as EventListener);
    return () => {
      window.removeEventListener("admin:highlight-sections", handleHighlight as EventListener);
      window.removeEventListener("admin:focus-section", handleFocusSection as EventListener);
    };
  }, []);


  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const teamMembers = t.team.members.map((member, index) => ({
    name: member.name,
    role: member.position,
    description: member.description,
    phone: index === 0 ? "+421 949 110 446" : index === 1 ? "+421 123 456 789" : index === 2 ? "+421 917 580 442" : "0905 444 444",
    email: index === 0 ? "cuprik@skallars.sk" : index === 1 ? "zak@skallars.sk" : index === 2 ? "hudak@skallars.sk" : "ye@skallars.sk",
    image: index === 0
      ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Maria%CC%81n%20C%CC%8Cupri%CC%81k-9zF7Dkbxqk0u4RVyBSMfbZZaXf4fXk.jpg"
      : index === 1
        ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Martin%20Z%CC%8Ca%CC%81k-wuaynP4mw11iW5cYwB5nKEaJvFwBlh.jpg"
        : index === 2
          ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/JH_dark-USHq2kdwHiMPCT2em1Zj2DZer2raMo.jpg"
          : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/img-dy-2-KgydSWygusjb6XI7tw5yi7Oif17dz1.png",
  }));



  const fallbackServices = [
    {
      title: t.services.items.corporate.title,
      description: t.services.items.corporate.description,
    },
    {
      title: t.services.items.contracts.title,
      description: t.services.items.contracts.description,
    },
    {
      title: t.services.items.litigation.title,
      description: t.services.items.litigation.description,
    },
    {
      title: t.services.items.employment.title,
      description: t.services.items.employment.description,
    },
    {
      title: t.services.items.realEstate.title,
      description: t.services.items.realEstate.description,
    },
  ];

  // Fetch clients from database
  const [clients, setClients] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [sectionEnabled, setSectionEnabled] = useState<Record<string, boolean>>({});
  const [clientSettings, setClientSettings] = useState({
    autoplay: true,
    autoplay_interval_ms: 3000,
    visible_count: 3,
  });
  const [teamSettings, setTeamSettings] = useState({
    show_linkedin: true,
    show_icon: true,
    show_bio: true,
    columns_desktop: 4,
    columns_tablet: 2,
    columns_mobile: 1,
  });
  const [footerLinks, setFooterLinks] = useState<any[]>([]);
  const [pageBlocks, setPageBlocks] = useState<any[]>([]);
  const [pageBlockItems, setPageBlockItems] = useState<any[]>([]);
  const [footerSettings, setFooterSettings] = useState({
    show_newsletter: true,
    show_social: true,
    show_solutions: true,
    show_contact: true,
  });
  const [sectionTemplates, setSectionTemplates] = useState({
    hero: 'classic',
    services: 'sticky',
    team: 'cards',
    testimonials: 'grid',
    contact: 'classic',
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const layoutPromise = supabase
        .from('page_sections')
        .select('section_key, enabled, sort_order')
        .eq('page', 'home')
        .order('sort_order', { ascending: true });

      const servicePromise = supabase
        .from('service_items')
        .select('*')
        .order('sort_order', { ascending: true });

      const clientPromise = supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      const clientSettingsPromise = supabase
        .from('client_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      const teamPromise = supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      const teamSettingsPromise = supabase
        .from('team_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      const footerSettingsPromise = supabase
        .from('footer_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      const footerLinksPromise = supabase
        .from('footer_links')
        .select('*')
        .order('section', { ascending: true })
        .order('sort_order', { ascending: true });

      const pageBlocksPromise = supabase
        .from('page_blocks')
        .select('*')
        .eq('page', 'home')
        .order('created_at', { ascending: true });

      const pageBlockItemsPromise = supabase
        .from('page_block_items')
        .select('*')
        .order('sort_order', { ascending: true });

      const templatesPromise = supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'template_hero',
          'template_services',
          'template_team',
          'template_testimonials',
          'template_contact',
        ]);

      void layoutPromise.then(({ data: layoutData, error: layoutError }) => {
        if (cancelled) return;
        if (!layoutError && layoutData && layoutData.length > 0) {
          setSectionOrder(layoutData.map((row: any) => row.section_key));
          const enabledMap: Record<string, boolean> = {};
          layoutData.forEach((row: any) => {
            enabledMap[row.section_key] = row.enabled;
          });
          setSectionEnabled(enabledMap);
        }
      });

      void servicePromise.then(({ data: serviceData }) => {
        if (!cancelled && serviceData) setServiceItems(serviceData);
      });

      void clientPromise.then(({ data: clientData }) => {
        if (!cancelled && clientData) setClients(clientData);
      });

      void clientSettingsPromise.then(({ data: clientSettingsData }) => {
        if (cancelled) return;
        if (clientSettingsData?.[0]) {
          setClientSettings({
            autoplay: clientSettingsData[0].autoplay ?? true,
            autoplay_interval_ms: clientSettingsData[0].autoplay_interval_ms ?? 3000,
            visible_count: clientSettingsData[0].visible_count ?? 3,
          });
        }
      });

      void teamPromise.then(({ data: teamData }) => {
        if (!cancelled && teamData) setTeam(teamData);
      });

      void teamSettingsPromise.then(({ data: teamSettingsData }) => {
        if (cancelled) return;
        if (teamSettingsData?.[0]) {
          setTeamSettings({
            show_linkedin: teamSettingsData[0].show_linkedin ?? true,
            show_icon: teamSettingsData[0].show_icon ?? true,
            show_bio: teamSettingsData[0].show_bio ?? true,
            columns_desktop: teamSettingsData[0].columns_desktop ?? 4,
            columns_tablet: teamSettingsData[0].columns_tablet ?? 2,
            columns_mobile: teamSettingsData[0].columns_mobile ?? 1,
          });
        }
      });

      void footerSettingsPromise.then(({ data: footerSettingsData }) => {
        if (cancelled) return;
        if (footerSettingsData?.[0]) {
          setFooterSettings({
            show_newsletter: footerSettingsData[0].show_newsletter ?? true,
            show_social: footerSettingsData[0].show_social ?? true,
            show_solutions: footerSettingsData[0].show_solutions ?? true,
            show_contact: footerSettingsData[0].show_contact ?? true,
          });
        }
      });

      void footerLinksPromise.then(({ data: footerLinksData }) => {
        if (!cancelled && footerLinksData) {
          setFooterLinks(footerLinksData);
        }
      });

      void pageBlocksPromise.then(({ data: pageBlocksData }) => {
        if (!cancelled && pageBlocksData) {
          setPageBlocks(pageBlocksData);
        }
      });

      void pageBlockItemsPromise.then(({ data: pageBlockItemsData }) => {
        if (!cancelled && pageBlockItemsData) {
          setPageBlockItems(pageBlockItemsData);
        }
      });

      void templatesPromise.then(({ data }) => {
        if (cancelled) return;
        if (!data) return;
        setSectionTemplates((prev) => {
          const next = { ...prev };
          data.forEach((row: any) => {
            if (row.key === 'template_hero' && row.value) next.hero = row.value;
            if (row.key === 'template_services' && row.value) next.services = row.value;
            if (row.key === 'template_team' && row.value) next.team = row.value;
            if (row.key === 'template_testimonials' && row.value) next.testimonials = row.value;
            if (row.key === 'template_contact' && row.value) next.contact = row.value;
          });
          return next;
        });
      });
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Effect for auto-scrolling clients
  useEffect(() => {
    const visibleCount = Math.max(1, Math.min(6, clientSettings.visible_count || 3));
    if (!clientSettings.autoplay) return;
    if (clients.length <= visibleCount) return; // Don't scroll if few clients
    const steps = clients.length - visibleCount + 1;
    const interval = setInterval(() => {
      setCurrentClientIndex(
        (prevIndex) => (prevIndex + 1) % steps
      );
    }, Math.max(500, clientSettings.autoplay_interval_ms || 3000));

    return () => clearInterval(interval);
  }, [clients.length, clientSettings.autoplay, clientSettings.autoplay_interval_ms, clientSettings.visible_count]);

  const servicesFromDb = (serviceItems || [])
    .filter((item: any) => item.enabled !== false)
    .map((item: any) => ({
      title: item[`title_${language}`] || item.title_en || item.title_sk || '',
      description: item[`description_${language}`] || item.description_en || item.description_sk || '',
      icon: item.icon || null,
    }))
    .filter((item: any) => item.title || item.description);

  const servicesToRender = servicesFromDb.length > 0
    ? servicesFromDb
    : fallbackServices.map((item) => ({ ...item, icon: null }));
  const selectServiceImage = (index: number) => {
    const next = Math.max(0, index) % Math.max(1, images.length);
    setCurrentImageIndex(next);
  };
  const activeServiceTitle =
    servicesToRender[currentImageIndex % Math.max(1, servicesToRender.length)]?.title || t.services.title;

  const defaultOrder = ['hero', 'services', 'countries', 'team', 'clients', 'news', 'contact', 'footer'];
  const orderedKeys = sectionOrder.length > 0 ? sectionOrder : defaultOrder;
  const isEnabled = (key: string) => sectionEnabled[key] ?? true;
  const blockMap = new Map((pageBlocks || []).map((block: any) => [block.id, block]));
  const blockItemsMap = new Map<string, any[]>();
  (pageBlockItems || []).forEach((item: any) => {
    if (!blockItemsMap.has(item.block_id)) blockItemsMap.set(item.block_id, []);
    blockItemsMap.get(item.block_id)!.push(item);
  });

  const getBlockText = (block: any, field: string) => {
    const value = block[`${field}_${language}`];
    return value || block[`${field}_en`] || block[`${field}_sk`] || '';
  };
  const gridMobile: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2' };
  const gridTablet: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' };
  const gridDesktop: Record<number, string> = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };
  const teamGridClass = [
    'grid',
    gridMobile[teamSettings.columns_mobile] || 'grid-cols-1',
    gridTablet[teamSettings.columns_tablet] || 'md:grid-cols-2',
    gridDesktop[teamSettings.columns_desktop] || 'lg:grid-cols-4',
    'gap-8',
  ].join(' ');
  const teamTemplate = sectionTemplates.team;
  const teamSectionClass = teamTemplate === 'compact'
    ? 'bg-[#f4f3ff]'
    : 'bg-[#f0f0ff]';
  const teamHeadingClass = teamTemplate === 'compact'
    ? 'text-4xl md:text-5xl font-extrabold mb-4 text-center text-[#210059] tracking-tight'
    : 'text-5xl font-extrabold mb-4 text-center text-[#210059] tracking-tight';
  const teamCardClass = teamTemplate === 'compact'
    ? 'group relative overflow-hidden rounded-2xl border border-[#210059]/12 bg-white p-5 shadow-[0_16px_38px_-30px_rgba(33,0,89,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-[#5d00ff]/35 hover:shadow-[0_24px_50px_-30px_rgba(33,0,89,0.66)]'
    : 'group relative overflow-hidden rounded-3xl border border-[#210059]/14 bg-white p-6 shadow-[0_22px_54px_-34px_rgba(33,0,89,0.62)] transition-all duration-300 hover:-translate-y-2 hover:border-[#5d00ff]/35 hover:shadow-[0_32px_62px_-34px_rgba(33,0,89,0.7)]';
  const teamImageClass = teamTemplate === 'compact'
    ? 'w-44 h-44 mx-auto mb-5 relative'
    : 'w-60 h-60 mx-auto mb-6 relative';

  const mainSections: Record<string, JSX.Element> = {
    hero: (
      <section
        id="home"
        className={`min-h-screen flex items-center justify-center relative overflow-visible pt-24 ${showSectionHighlights ? 'ring-2 ring-primary/60 ring-offset-2' : ''}`}
        data-admin-section="hero"
      >
        <Spirograph />
        <div className="container mx-auto px-4 py-20 relative z-10">
          {sectionTemplates.hero === 'split' ? (
            <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-10 items-center">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="text-sm uppercase tracking-[0.35em] text-muted-foreground mb-6"
                >
                  {t.hero.title}
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="text-6xl md:text-7xl font-extrabold mb-6 text-foreground tracking-tight"
                >
                  {t.hero.subtitle}
                </motion.h1>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                className="rounded-2xl border border-white/40 bg-white/85 backdrop-blur-md p-8 shadow-xl space-y-4"
              >
                <p className="text-lg text-muted-foreground">{t.hero.description}</p>
                <button
                  type="button"
                  onClick={() => scrollToSection('contact')}
                  className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold btn-accent"
                >
                  {t.hero.cta}
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-sm uppercase tracking-[0.35em] text-muted-foreground mb-6"
              >
                {t.hero.title}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="text-7xl md:text-8xl font-extrabold mb-6 text-foreground tracking-tight"
              >
                {t.hero.subtitle}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                className="text-2xl text-muted-foreground max-w-3xl"
              >
                {t.hero.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                className="mt-8"
              >
                <button
                  type="button"
                  onClick={() => scrollToSection('contact')}
                  className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold btn-accent"
                >
                  {t.hero.cta}
                </button>
              </motion.div>
            </>
          )}
        </div>
      </section>
    ),
    services: sectionTemplates.services === 'grid' ? (
      <section
        id="services"
        ref={servicesRef}
        className={`relative z-20 overflow-visible py-24 bg-transparent ${showSectionHighlights ? 'ring-2 ring-primary/60 ring-offset-2' : ''}`}
        data-admin-section="services"
      >
        <div className="container mx-auto px-4 relative z-30">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold mb-4 text-[#210059]">
              {t.services.title}
            </h2>
            <p className="text-xl text-[#210059]/70">
              {t.services.subtitle}
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-7 xl:grid-cols-[0.92fr,1.08fr]">
            <div className="relative h-72 overflow-hidden rounded-3xl border border-[#210059]/20 shadow-[0_28px_58px_-38px_rgba(33,0,89,0.68)]">
              {images.map((src, index) => (
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt={`Legal service image ${index + 1}`}
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                />
              ))}
              <div className="absolute inset-0 bg-[#110c19]/58" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-white/70 mb-2">{t.services.title}</p>
                <p className="text-lg font-semibold leading-tight">{activeServiceTitle}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {servicesToRender.map((service, index) => (
                <div
                  key={index}
                  ref={(el) => {
                    serviceRefs.current[index] = el;
                  }}
                  data-index={index}
                  onMouseEnter={() => selectServiceImage(index)}
                  onFocus={() => selectServiceImage(index)}
                  className="group relative overflow-hidden rounded-2xl border border-[#210059]/14 bg-white/88 p-6 shadow-[0_14px_34px_-26px_rgba(33,0,89,0.54)] backdrop-blur-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-[#5d00ff]/35 hover:shadow-[0_22px_46px_-28px_rgba(33,0,89,0.66)]"
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-12"
                    style={{
                      backgroundImage: `url(${images[index % Math.max(1, images.length)]})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="relative z-10 flex items-center gap-3 mb-3">
                    {service.icon ? (
                      <span className="text-xl text-[#5d00ff]">{service.icon}</span>
                    ) : (
                      <Check className="text-[#5d00ff]" />
                    )}
                    <h3 className="text-lg font-semibold text-foreground">
                      {service.title}
                    </h3>
                  </div>
                  <p className="relative z-10 text-sm text-muted-foreground">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    ) : (
      <section
        id="services"
        ref={servicesRef}
        className={`relative z-20 overflow-visible py-24 bg-transparent ${showSectionHighlights ? 'ring-2 ring-primary/60 ring-offset-2' : ''}`}
        data-admin-section="services"
      >
        <div className="container mx-auto px-4 relative z-30">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div
              ref={stickyRef}
              className="lg:w-1/3 pr-8 lg:sticky lg:top-24 lg:self-start"
              style={{ height: "fit-content" }}
            >
              <h2 className="text-4xl font-bold mb-6 text-[#210059]">
                {t.services.title}
              </h2>
              <p className="text-xl text-[#210059]/70 mb-6">
                {t.services.subtitle}
              </p>
              <div className="relative h-72 overflow-hidden rounded-3xl border border-[#210059]/20 shadow-[0_28px_58px_-38px_rgba(33,0,89,0.68)]">
                {images.map((src, index) => (
                  <img
                    key={`${src}-${index}`}
                    src={src}
                    alt={`Legal service image ${index + 1}`}
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                  />
                ))}
                <div className="absolute inset-0 bg-[#110c19]/58" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/70 mb-2">{t.services.title}</p>
                  <p className="text-lg font-semibold leading-tight">{activeServiceTitle}</p>
                </div>
              </div>
            </div>
            <div className="lg:w-2/3 mt-8 lg:mt-0">
              <div className="grid grid-cols-1 gap-8">
                {servicesToRender.map((service, index) => (
                  <div
                    key={index}
                    ref={(el) => {
                      serviceRefs.current[index] = el;
                    }}
                    data-index={index}
                    onMouseEnter={() => selectServiceImage(index)}
                    onFocus={() => selectServiceImage(index)}
                    className="group relative overflow-hidden rounded-2xl border border-[#210059]/14 bg-white/88 p-6 shadow-[0_16px_40px_-30px_rgba(33,0,89,0.58)] backdrop-blur-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-[#5d00ff]/35 hover:shadow-[0_24px_50px_-30px_rgba(33,0,89,0.7)]"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-12"
                      style={{
                        backgroundImage: `url(${images[index % Math.max(1, images.length)]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    {service.icon ? (
                      <span className="relative z-10 mt-0.5 flex-shrink-0 text-xl text-[#5d00ff]">{service.icon}</span>
                    ) : (
                      <Check className="relative z-10 mt-1 flex-shrink-0 text-[#5d00ff]" />
                    )}
                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold mb-2 text-foreground">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    ),
    countries: (
      <GlobalNetworkSection id="countries" />
    ),
    team: (
      <section
        id="team"
        className={`relative overflow-hidden py-24 reveal ${teamSectionClass} ${showSectionHighlights ? 'ring-2 ring-primary/60 ring-offset-2' : ''}`}
        data-admin-section="team"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#210059]/16" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#210059]/10" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={teamHeadingClass}
          >
            {t.team.title}
          </motion.h2>
          {t.team.subtitle && (
            <p className="mx-auto mb-12 max-w-2xl text-center text-base text-[#210059]/70">
              {t.team.subtitle}
            </p>
          )}
          <div className={teamGridClass}>
            {team.map((member) => (
              <div
                key={member.id}
                className={teamCardClass}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#210059]" />
                <div className={teamImageClass}>
                  <div className="h-full w-full overflow-hidden rounded-2xl border border-[#210059]/14 shadow-md">
                    <img
                      src={member.photo_url || "/placeholder-avatar.jpg"}
                      alt={member.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{
                        objectPosition: `${'photo_position_x' in member ? member.photo_position_x : 50}% ${'photo_position_y' in member ? member.photo_position_y : 50}%`
                      }}
                    />
                  </div>
                  {teamSettings.show_linkedin && member.linkedin_url && (
                    <a
                      href={member.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 bg-[#0077b5] text-white p-2 rounded-lg shadow-sm hover:scale-110 transition-transform"
                    >
                      <Linkedin01Icon size={20} />
                    </a>
                  )}
                </div>

                <div className="relative z-10 text-center">
                  {teamSettings.show_icon && member.icon && (
                    <div className="text-2xl mb-2" aria-hidden="true">
                      {member.icon}
                    </div>
                  )}
                  <h4 className="text-xl font-semibold mb-1 text-[#210059] transition-colors group-hover:text-[#3c00a3]">
                    {member.name}
                  </h4>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#210059]/65">
                    {language === 'sk' ? member.role_sk : member.role_en}
                  </p>
                  {teamSettings.show_bio && (language === 'sk' ? member.bio_sk : member.bio_en) && (
                    <p className="text-sm text-[#210059]/72 leading-relaxed">
                      {language === 'sk' ? member.bio_sk : member.bio_en}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    clients: (
      <section id="clients" className={`py-20 bg-white reveal ${showSectionHighlights ? 'ring-2 ring-primary/60 ring-offset-2' : ''}`} data-admin-section="clients">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h3 className="text-sm font-medium text-[var(--mint-400)] mb-2 uppercase tracking-wide">
                {t.clients.title}
              </h3>
              <h2 className="text-3xl font-medium text-[#210059] mb-4 tracking-tight">
                {t.clients.subtitle}
              </h2>
            </div>
            <div className="md:w-1/2 relative h-32 overflow-hidden">
              <div
                className="absolute inset-0 flex items-center justify-between transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentClientIndex * (100 / Math.max(1, Math.min(6, clientSettings.visible_count || 3)))}%)`,
                }}
              >
                {clients.map((client, index) => (
                  <div
                    key={index}
                    className="px-4 flex-shrink-0"
                    style={{ width: `${100 / Math.max(1, Math.min(6, clientSettings.visible_count || 3))}%` }}
                  >
                    <img
                      src={client.logo_url}
                      alt={`${client.name} logo`}
                      className="max-w-full h-auto mx-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    ),
    news: (
      <section className={`py-24 bg-gradient-to-b from-[#210059] to-gray-900 text-white reveal ${showSectionHighlights ? 'ring-2 ring-primary/60 ring-offset-2' : ''}`} data-admin-section="news">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-5xl font-extrabold mb-12 text-center tracking-tight"
          >
            {t.news.title}
          </motion.h2>
          {t.news.subtitle && (
            <p className="text-center text-sm text-white/70 -mt-8 mb-10">
              {t.news.subtitle}
            </p>
          )}
          <BlogCarousel />
        </div>
      </section>
    ),
  };

  const renderBlock = (block: any) => {
    if (!block || block.enabled === false) return null;
    const title = getBlockText(block, 'title');
    const body = getBlockText(block, 'body');
    const buttonLabel = getBlockText(block, 'button_label');
    const buttonUrl = block.button_url;
    const items = (blockItemsMap.get(block.id) || []).filter((item) => item.enabled !== false);

    if (block.block_type === 'callout') {
      return (
        <section className="py-16 bg-[#210059] text-white" data-admin-section={`block-${block.id}`}>
          <div className="container mx-auto px-4 text-center space-y-4">
            {title && <h3 className="text-3xl font-semibold">{title}</h3>}
            {body && <p className="text-white/80 max-w-2xl mx-auto">{body}</p>}
            {buttonLabel && buttonUrl && (
              <a
                href={buttonUrl}
                target={block.button_external ? '_blank' : undefined}
                rel={block.button_external ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold btn-accent"
                onClick={() => {
                  trackEvent({
                    eventType: 'callout_click',
                    page: 'home',
                    blockId: block.id,
                    label: buttonLabel,
                    href: buttonUrl,
                  });
                }}
              >
                {buttonLabel}
              </a>
            )}
          </div>
        </section>
      );
    }

    if (block.block_type === 'testimonials') {
      const template = sectionTemplates.testimonials;
      const primaryItem = items[0];
      const secondaryItems = items.slice(1);
      return (
        <section className="py-16 bg-white" data-admin-section={`block-${block.id}`}>
          <div className="container mx-auto px-4 space-y-8">
            {title && <h3 className="text-3xl font-semibold text-center text-foreground">{title}</h3>}
            {body && <p className="text-center text-muted-foreground max-w-2xl mx-auto">{body}</p>}
            {template === 'spotlight' ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-6">
                {primaryItem ? (
                  <div className="border rounded-2xl p-8 shadow-md bg-gradient-to-br from-white to-slate-50">
                    <p className="text-base text-muted-foreground mb-6 leading-relaxed">“{getBlockText(primaryItem, 'body')}”</p>
                    <div className="text-sm font-semibold text-foreground">{getBlockText(primaryItem, 'title')}</div>
                    {getBlockText(primaryItem, 'subtitle') && (
                      <div className="text-xs text-muted-foreground">{getBlockText(primaryItem, 'subtitle')}</div>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-2xl p-8 text-sm text-muted-foreground">No testimonials yet.</div>
                )}
                <div className="space-y-4">
                  {secondaryItems.length > 0 ? (
                    secondaryItems.map((item) => (
                      <div key={item.id} className="border rounded-xl p-5 shadow-sm bg-white">
                        <p className="text-sm text-muted-foreground mb-3">“{getBlockText(item, 'body')}”</p>
                        <div className="text-sm font-semibold text-foreground">{getBlockText(item, 'title')}</div>
                        {getBlockText(item, 'subtitle') && (
                          <div className="text-xs text-muted-foreground">{getBlockText(item, 'subtitle')}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="border rounded-xl p-5 text-sm text-muted-foreground">Add more testimonials to fill this column.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-xl p-6 shadow-sm bg-white">
                    <p className="text-sm text-muted-foreground mb-4">“{getBlockText(item, 'body')}”</p>
                    <div className="text-sm font-semibold text-foreground">{getBlockText(item, 'title')}</div>
                    {getBlockText(item, 'subtitle') && (
                      <div className="text-xs text-muted-foreground">{getBlockText(item, 'subtitle')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    if (block.block_type === 'faq') {
      return (
        <section className="py-16 bg-gray-50" data-admin-section={`block-${block.id}`}>
          <div className="container mx-auto px-4 space-y-6">
            {title && <h3 className="text-3xl font-semibold text-center text-foreground">{title}</h3>}
            {body && <p className="text-center text-muted-foreground max-w-2xl mx-auto">{body}</p>}
            <Accordion type="single" collapsible className="max-w-3xl mx-auto">
              {items.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger>{getBlockText(item, 'title')}</AccordionTrigger>
                  <AccordionContent>{getBlockText(item, 'body')}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      );
    }

    return null;
  };

  const footerGridClass = sectionTemplates.contact === 'compact'
    ? 'grid grid-cols-1 lg:grid-cols-2 gap-8'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8';
  const footerSections: Record<string, JSX.Element | null> = {
    contact: footerSettings.show_contact ? (
      <div data-admin-section="contact">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo_white-oudH0EnuPhJanLlxguzBXMippVasLU.svg"
            alt="SKALLARS Logo"
            className="h-10 mb-4 md:mb-0"
          />
          {footerSettings.show_social && (
            <div className="flex space-x-4">
              {footerLinks
                .filter((link) => link.section === 'social' && link.enabled)
                .map((link) => (
                  <a
                    key={link.id || link.url}
                    href={link.url}
                    target={link.is_external ? '_blank' : undefined}
                    rel={link.is_external ? 'noopener noreferrer' : undefined}
                    className="hover:text-gray-300"
                  >
                    <Linkedin />
                  </a>
                ))}
            </div>
          )}
        </div>
        <div className={footerGridClass}>
          {footerSettings.show_contact && (
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.contact.title}</h3>
              {t.contact.subtitle && (
                <p className="text-xs text-gray-300 mb-3">{t.contact.subtitle}</p>
              )}
              <p>{t.contact.address}</p>
              <p>{t.contact.phone}</p>
              <a href={`mailto:${t.contact.email}`} className="hover:underline">
                {t.contact.email}
              </a>
              <p className="text-sm text-gray-300 mt-2">{t.contact.workingHours}</p>
              {t.contact.image && (
                <img
                  src={t.contact.image}
                  alt=""
                  className="mt-4 w-full max-w-xs rounded-lg border border-white/10 object-cover"
                />
              )}
            </div>
          )}
          {sectionTemplates.contact === 'compact' ? (
            <div className="space-y-8">
              {footerSettings.show_solutions && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t.footer.solutionsTitle}</h3>
                  <ul className="space-y-2">
                    {footerLinks
                      .filter((link) => link.section === 'solutions' && link.enabled)
                      .map((link) => (
                        <li key={link.id || link.url}>
                          <a
                            href={link.url}
                            target={link.is_external ? '_blank' : undefined}
                            rel={link.is_external ? 'noopener noreferrer' : undefined}
                            className="hover:underline"
                          >
                            {link[`label_${language}`] || link.label_en || link.label_sk}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {footerSettings.show_newsletter && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t.news.title}</h3>
                  <form className="flex flex-col space-y-2">
                    <input
                      type="email"
                      placeholder={t.footer.newsletterPlaceholder}
                      className="px-4 py-2 bg-gray-800 rounded"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#210059] text-white rounded hover:bg-[#210059]/80"
                    >
                      {t.footer.newsletterCta}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <>
              {footerSettings.show_solutions && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t.footer.solutionsTitle}</h3>
                  <ul className="space-y-2">
                    {footerLinks
                      .filter((link) => link.section === 'solutions' && link.enabled)
                      .map((link) => (
                        <li key={link.id || link.url}>
                          <a
                            href={link.url}
                            target={link.is_external ? '_blank' : undefined}
                            rel={link.is_external ? 'noopener noreferrer' : undefined}
                            className="hover:underline"
                          >
                            {link[`label_${language}`] || link.label_en || link.label_sk}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {footerSettings.show_newsletter && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t.news.title}</h3>
                  <form className="flex flex-col space-y-2">
                    <input
                      type="email"
                      placeholder={t.footer.newsletterPlaceholder}
                      className="px-4 py-2 bg-gray-800 rounded"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#210059] text-white rounded hover:bg-[#210059]/80"
                    >
                      {t.footer.newsletterCta}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    ) : null,
    footer: (
      <div data-admin-section="footer" className="mt-8 pt-8 border-t border-gray-800 text-center">
        <p>{t.footer.copyright}</p>
      </div>
    ),
  };

  const showFooter = orderedKeys.some((key) => (key === 'contact' || key === 'footer') && isEnabled(key));

  return (
    <div className="min-h-screen">
      <AdminInlinePreviewBar />
      {/* Header moved to global SiteHeader in layout */}

      <main>
        {orderedKeys.map((key) => {
          if (key === 'contact' || key === 'footer') return null;
          if (!isEnabled(key)) return null;
          if (key.startsWith('block:')) {
            const blockId = key.split(':')[1];
            const block = blockMap.get(blockId);
            const blockNode = renderBlock(block);
            return blockNode ? <React.Fragment key={key}>{blockNode}</React.Fragment> : null;
          }
          const node = mainSections[key];
          if (!node) return null;
          return <React.Fragment key={key}>{node}</React.Fragment>;
        })}
      </main>

      {showFooter && (
        <footer id="contact" className={`bg-[#110C19] text-white py-10 relative overflow-hidden ${showSectionHighlights ? 'ring-2 ring-primary/60 ring-offset-2' : ''}`}>
          <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none mix-blend-soft-light" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="space-y-10">
              {orderedKeys.map((key) => {
                if (key !== 'contact' && key !== 'footer') return null;
                if (!isEnabled(key)) return null;
                const node = footerSections[key];
                if (!node) return null;
                return <React.Fragment key={`footer-${key}`}>{node}</React.Fragment>;
              })}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
