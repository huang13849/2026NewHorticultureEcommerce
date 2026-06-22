'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import zhDict from '@/lib/i18n/zh.json';
import enDict from '@/lib/i18n/en.json';
import deDict from '@/lib/i18n/de.json';
import jaDict from '@/lib/i18n/ja.json';
import frDict from '@/lib/i18n/fr.json';
import arDict from '@/lib/i18n/ar.json';
import ruDict from '@/lib/i18n/ru.json';

export type Lang = 'zh' | 'en' | 'de' | 'ja' | 'fr' | 'ar' | 'ru';

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'zh', label: '中', native: '中文' },
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'de', label: 'DE', native: 'Deutsch' },
  { code: 'ja', label: 'JA', native: '日本語' },
  { code: 'fr', label: 'FR', native: 'Français' },
  { code: 'ar', label: 'AR', native: 'العربية' },
  { code: 'ru', label: 'RU', native: 'Русский' },
];

const DEFAULT_LANG: Lang = process.env.NEXT_PUBLIC_DEFAULT_LANG === 'zh' ? 'zh' : 'en';
const LANG_STORAGE_KEY = `lang:${DEFAULT_LANG}`;

const dictionaries: Record<Lang, Record<string, unknown>> = {
  zh: zhDict as Record<string, unknown>,
  en: enDict as Record<string, unknown>,
  de: deDict as Record<string, unknown>,
  ja: jaDict as Record<string, unknown>,
  fr: frDict as Record<string, unknown>,
  ar: arDict as Record<string, unknown>,
  ru: ruDict as Record<string, unknown>,
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

function resolve(obj: unknown, key: string): string | undefined {
  const keys = key.split('.');
  let val: unknown = obj;
  for (const k of keys) {
    if (val && typeof val === 'object') {
      val = (val as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
    if (val === undefined) break;
  }
  return typeof val === 'string' ? val : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
      if (stored && ['zh', 'en', 'de', 'ja', 'fr', 'ar', 'ru'].includes(stored)) return stored;
    }
    return DEFAULT_LANG;
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem(LANG_STORAGE_KEY, l);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const val = resolve(dictionaries[lang], key)
      || resolve(dictionaries.en, key)
      || resolve(dictionaries.zh, key);
    if (!val) return key;
    if (!params) return val;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      val
    );
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
