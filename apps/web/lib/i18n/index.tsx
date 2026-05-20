'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import id from './locales/id';
import en from './locales/en';

type Locale = 'id' | 'en';

const messages: Record<Locale, Record<string, string>> = { id, en };

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'id',
  setLocale: () => {},
  t: (key: string) => key,
  isRTL: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id');

  useEffect(() => {
    const stored = localStorage.getItem('eduplay-locale') as Locale | null;
    if (stored === 'id' || stored === 'en') {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('eduplay-locale', l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string): string => {
      return messages[locale]?.[key] || messages['id']?.[key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRTL: false }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale() {
  return useContext(I18nContext);
}

export { type Locale };
