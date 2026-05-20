'use client';

import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import en from './locales/en';
import id from './locales/id';

type Locale = 'id' | 'en';

const messages: Record<Locale, Record<string, string>> = { id, en };

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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
    (key: string, params?: Record<string, string | number>): string => {
      let str = messages[locale]?.[key] || messages['id']?.[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
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

export { I18nContext, type Locale };
