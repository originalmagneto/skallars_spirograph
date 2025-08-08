"use client";

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/translations';
import { motion } from 'framer-motion';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'sk', name: 'SK', flag: '🇸🇰' },
  { code: 'en', name: 'EN', flag: '🇬🇧' },
  { code: 'de', name: 'DE', flag: '🇩🇪' },
];

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-lg border border-gray-200">
      {languages.map((lang) => (
        <motion.button
          key={lang.code}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLanguage(lang.code)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            language === lang.code
              ? 'bg-[#38F8B8] text-white shadow-md'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <span className="mr-1">{lang.flag}</span>
          {lang.name}
        </motion.button>
      ))}
    </div>
  );
}
