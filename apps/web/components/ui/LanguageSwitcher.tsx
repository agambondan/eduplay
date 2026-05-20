'use client';

import { useLocale } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
      className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
      title="Switch language"
    >
      {locale === 'id' ? 'EN' : 'ID'}
    </button>
  );
}
