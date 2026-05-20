'use client';

import { Sparkles } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

interface Props {
  username: string;
  onNext: () => void;
  onSkip: () => void;
}

export default function WelcomeStep({ username, onNext, onSkip }: Props) {
  const { t } = useLocale();
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-slate-800">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
        <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        {t('onboarding.welcome_title').replace('{name}', username)}
      </h1>
      <div className="mb-6 space-y-2 text-sm text-gray-500 dark:text-slate-400">
        <p>{t('onboarding.welcome_desc_1')}</p>
        <p>{t('onboarding.welcome_desc_2')}</p>
        <p>{t('onboarding.welcome_desc_3')}</p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={onNext}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          {t('onboarding.welcome_cta')}
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
}
