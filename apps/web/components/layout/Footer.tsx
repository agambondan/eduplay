'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n';

export default function Footer() {
  const { t } = useLocale();
  return (
    <footer className="hidden border-t border-gray-200 bg-white py-6 md:block dark:border-slate-700 dark:bg-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} EduPlay.
          </p>
          <nav className="flex gap-4 text-sm text-gray-500 dark:text-slate-400" aria-label="Footer">
            <Link
              href="/about"
              className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              Tentang
            </Link>
            <Link
              href="/privacy-policy"
              className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              Privasi
            </Link>
            <Link
              href="/terms-of-service"
              className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              Syarat
            </Link>
            <Link
              href="/support"
              className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              {t('nav.support')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
