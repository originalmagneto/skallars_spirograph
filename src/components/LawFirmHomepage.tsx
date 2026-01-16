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
import BlogCarousel from './BlogCarousel';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

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

  const [activeSection, setActiveSection] = useState("");
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const { t, language } = useLanguage();

  const images = [
    "/images/legal-consultation.jpg",
    "/images/contract-review.jpg",
    "/images/court-representation.jpg",
    "/images/corporate-law.jpg",
    "/images/europe-map.jpg",
  ];

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



  const legalServices = [
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

  useEffect(() => {
    const fetchData = async () => {
      // Clients
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (clientData) setClients(clientData);

      // Team
      const { data: teamData } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (teamData) setTeam(teamData);
    };
    fetchData();
  }, []);

  // Effect for auto-scrolling clients
  useEffect(() => {
    if (clients.length <= 2) return; // Don't scroll if few clients

    const interval = setInterval(() => {
      setCurrentClientIndex(
        (prevIndex) => (prevIndex + 1) % (clients.length - 2)
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [clients.length]);

  return (
    <div className="min-h-screen">
      {/* Header moved to global SiteHeader in layout */}

      <main>
        <section
          id="home"
          className="min-h-screen flex items-center justify-center relative overflow-visible pt-24"
        >
          {/* Spirograph pinned to hero section */}
          <Spirograph />
          <div className="container mx-auto px-4 py-20 relative z-10">
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
          </div>
        </section>

        <section id="team" className="py-24 bg-transparent reveal">
          <div className="container mx-auto px-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-5xl font-extrabold mb-12 text-center text-foreground tracking-tight"
            >
              {t.team.title}
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="bg-white p-6 rounded-lg shadow-lg flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 hover:scale-105 group"
                >
                  <div className="w-64 h-64 mx-auto mb-6 relative">
                    <div className="w-full h-full rounded-lg overflow-hidden border-4 border-white shadow-md">
                      <img
                        src={member.photo_url || "/placeholder-avatar.jpg"}
                        alt={member.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        style={{
                          objectPosition: `${'photo_position_x' in member ? member.photo_position_x : 50}% ${'photo_position_y' in member ? member.photo_position_y : 50}%`
                        }}
                      />
                    </div>
                    {member.linkedin_url && (
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

                  <div className="text-center">
                    <h4 className="text-xl font-semibold mb-1 text-foreground group-hover:text-accent transition-colors">
                      {member.name}
                    </h4>
                    <p className="text-muted-foreground mb-4 font-medium text-sm">
                      {language === 'sk' ? member.role_sk : member.role_en}
                    </p>
                  </div>

                  {/* Contact info logic simplified as DB doesn't have phone/email yet? 
                      Wait, the schema in migration had `name`, `role`, `photo`. 
                      The user mentioned "linked to linkedin links".
                      Existing static data had phone/email but DB schema didn't include them in my previous step?
                      Let's check schema. `team_members` has: name, role_sk, role_en, company, photo_url, linkedin_url.
                      It does NOT have phone/email. I will omit them or use placeholders if data is missing, 
                      or just stick to LinkedIn as the primary contact method if that's what the DB supports.
                      
                      Actually, usually these are public profiles. 
                      Ill add a generic "Contact" button or just the LinkedIn.
                      User specifically asked for "Linkedin badges... linked to linkedin links".
                   */}

                  {/* Description/Bio is also missing from DB schema I defined in guide?
                       Checking guide... schema: id, name, role_sk, role_en, company, photo_url, linkedin_url.
                       So no bio/description either.
                       I will stick to Name, Role, and LinkedIn.
                   */}

                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ... Service Section ... */}
        <section
          id="services"
          ref={servicesRef}
          className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-pattern opacity-[0.03] mix-blend-multiply pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row">
              <div
                ref={stickyRef}
                className="lg:w-1/3 pr-8 lg:sticky lg:top-24 lg:self-start"
                style={{ height: "fit-content" }}
              >
                <h2 className="text-4xl font-bold mb-6 text-foreground">
                  {t.services.title}
                </h2>
                <p className="text-xl text-muted-foreground mb-6">
                  {t.services.subtitle}
                </p>
                <div className="relative h-64 rounded-lg overflow-hidden ring-1 ring-border shadow-md">
                  {images.map((src, index) => (
                    <img
                      key={src}
                      src={src}
                      alt={`Legal service image ${index + 1}`}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${index === currentImageIndex
                        ? "opacity-100"
                        : "opacity-0"
                        }`}
                    />
                  ))}
                  <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
                </div>
              </div>
              <div className="lg:w-2/3 mt-8 lg:mt-0">
                <div className="grid grid-cols-1 gap-8">
                  {legalServices.map((service, index) => (
                    <div
                      key={index}
                      ref={(el) => {
                        serviceRefs.current[index] = el;
                      }}
                      data-index={index}
                      className="flex items-start space-x-4 bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-transparent hover:border-secondary/20"
                    >
                      <Check className="text-accent flex-shrink-0 mt-1" />
                      <div>
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

        <GlobalNetworkSection id="countries" />

        <section id="clients" className="py-20 bg-white reveal">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h3 className="text-base font-semibold text-[var(--mint-400)] mb-2 uppercase tracking-wide">
                  {t.clients.title}
                </h3>
                <h2 className="text-4xl md:text-5xl font-extrabold text-[#210059] mb-4 tracking-tight">
                  {t.clients.subtitle}
                </h2>
              </div>
              <div className="md:w-1/2 relative h-32 overflow-hidden">
                <div
                  className="absolute inset-0 flex items-center justify-between transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${currentClientIndex * 33.33}%)`,
                  }}
                >
                  {clients.map((client, index) => (
                    <div key={index} className="w-1/3 px-4 flex-shrink-0">
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

        <section className="py-24 bg-gradient-to-b from-[#210059] to-gray-900 text-white reveal">
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
            <BlogCarousel />
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-[#110C19] text-white py-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none mix-blend-soft-light" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo_white-oudH0EnuPhJanLlxguzBXMippVasLU.svg"
              alt="SKALLARS Logo"
              className="h-10 mb-4 md:mb-0"
            />
            <div className="flex space-x-4">
              <a href="#" className="hover:text-gray-300">
                <Linkedin />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.contact.title}</h3>
              <p>Staré Grunty 18</p>
              <p>841 04 Bratislava</p>
              <a href="mailto:info@skallars.sk" className="hover:underline">
                info@skallars.sk
              </a>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.navigation.services}</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:underline">
                    {t.services.items.corporate.title}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    {t.services.items.contracts.title}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    {t.services.items.litigation.title}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    {t.services.items.employment.title}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Riešenia</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="hover:underline">
                    IT a ochrana osobných údajov
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Duševné vlastníctvo
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    Umelá inteligencia
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline">
                    {t.services.items.realEstate.title}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.news.title}</h3>
              <form className="flex flex-col space-y-2">
                <input
                  type="email"
                  placeholder="Váš email"
                  className="px-4 py-2 bg-gray-800 rounded"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#210059] text-white rounded hover:bg-[#210059]/80"
                >
                  Odoberať
                </button>
              </form>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p>
              {t.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
