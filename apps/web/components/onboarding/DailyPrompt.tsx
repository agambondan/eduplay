'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { Sun, Zap } from 'lucide-react';

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export default function DailyPrompt({ onNext, onSkip }: Props) {
  const { t } = useLocale();
  const router = useRouter();

  const handleGo = () => {
    router.push('/daily');
  };

  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-slate-800">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
        <Sun className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        {t('daily.prompt_title')}
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        {t('daily.prompt_desc')}
      </p>

      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Zap size={16} />
        {t('daily.bonus')}
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleGo}
          className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600"
        >
          {t('daily.prompt_cta')}
        </button>
        <button
          onClick={onNext}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {t('daily.prompt_later')}
        </button>
      </div>
    </div>
  );
}
