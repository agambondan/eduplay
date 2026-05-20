'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Timer } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

export function DailyChallengeCard() {
  const { t } = useLocale();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Reset at midnight WIB (WIB is UTC+7)
      // For simplicity, reset at local midnight
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);

      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${mins
          .toString()
          .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Calendar className="h-3.5 w-3.5" /> {t('daily.title')}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-gray-500 dark:text-slate-400">
            <Timer className="h-3.5 w-3.5" /> {timeLeft}
          </span>
        </div>
        <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{t('daily.title')}</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Selesaikan satu set soal spesial hari ini dan dapatkan bonus <strong>{t('daily.bonus')}</strong>!
        </p>
      </div>
      <Link
        href="/daily"
        className="mt-6 inline-block w-full rounded-xl bg-emerald-500 px-4 py-3 text-center font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
      >
        {t('daily.prompt_cta')}
      </Link>
    </div>
  );
}
