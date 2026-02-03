"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, translations } from '@/lib/translations';
import { supabase } from '@/lib/supabase';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.sk;
}

type SiteContentRow = {
  key: string;
  value_sk: string | null;
  value_en: string | null;
  value_de: string | null;
  value_cn: string | null;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getValueForLanguage = (row: SiteContentRow, lang: Language) => {
  const direct = row[`value_${lang}` as const];
  if (direct !== null && direct !== undefined) return direct;
  return row.value_en ?? row.value_sk ?? row.value_de ?? row.value_cn ?? null;
};

const setDeepValue = (target: any, path: string, value: string) => {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return;
  let ref: any = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    const index = Number.isFinite(Number(key)) ? Number(key) : null;

    if (Array.isArray(ref)) {
      const idx = index ?? ref.length;
      ref[idx] = ref[idx] ?? (Number.isFinite(Number(nextKey)) ? [] : {});
      ref = ref[idx];
    } else {
      if (ref[key] === undefined || ref[key] === null) {
        ref[key] = Number.isFinite(Number(nextKey)) ? [] : {};
      }
      ref = ref[key];
    }
  }

  const lastKey = parts[parts.length - 1];
  if (Array.isArray(ref) && Number.isFinite(Number(lastKey))) {
    ref[Number(lastKey)] = value;
  } else {
    ref[lastKey] = value;
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('sk');
  const [siteContent, setSiteContent] = useState<SiteContentRow[]>([]);

  useEffect(() => {
    // Load language from localStorage on client side
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['sk', 'en', 'de', 'cn'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const fetchContent = async () => {
      const primary = await supabase
        .from('site_content')
        .select('key, value_sk, value_en, value_de, value_cn');

      if (!isActive) return;
      if (!primary.error) {
        setSiteContent((primary.data as SiteContentRow[]) || []);
        return;
      }

      if (String(primary.error?.message || '').includes('AbortError')) {
        // Ignore aborted requests (tab switch / auth re-init)
        return;
      }

      console.warn('Primary site content override fetch failed, retrying with legacy columns:', primary.error);
      const fallback = await supabase
        .from('site_content')
        .select('key, value_sk, value_en');

      if (!isActive) return;
      if (String(fallback.error?.message || '').includes('AbortError')) {
        return;
      }
      if (fallback.error) {
        console.warn('Could not fetch site content overrides:', fallback.error);
        setSiteContent([]);
        return;
      }

      const legacyRows = (fallback.data as SiteContentRow[])?.map(row => ({
        ...row,
        value_de: null,
        value_cn: null,
      })) || [];
      setSiteContent(legacyRows);
    };
    fetchContent();
    return () => {
      isActive = false;
    };
  }, []);

  const overrideMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of siteContent) {
      const value = getValueForLanguage(row, language);
      if (value === null || value === undefined) continue;
      map.set(row.key, value);
    }
    return map;
  }, [siteContent, language]);

  const mergedTranslations = useMemo(() => {
    const base = JSON.parse(JSON.stringify(translations[language]));
    for (const [key, value] of overrideMap.entries()) {
      setDeepValue(base, key, value);
    }
    return base as typeof translations.sk;
  }, [language, overrideMap]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: mergedTranslations,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
