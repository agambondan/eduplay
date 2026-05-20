'use client';

import { useState } from 'react';
import { Brain, Calculator, Globe2, Languages } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

const CATEGORIES = [
  {
    key: 'math',
    labelKey: 'category.math',
    icon: Calculator,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  },
  {
    key: 'language',
    labelKey: 'category.language',
    icon: Languages,
    color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  },
  {
    key: 'geography',
    labelKey: 'category.geography',
    icon: Globe2,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
  },
  {
    key: 'logic',
    labelKey: 'category.logic',
    icon: Brain,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
  },
];

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export default function InterestSelector({ onNext, onSkip }: Props) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-800">
      <h2 className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-white">
        {t('onboarding.interest_title')}
      </h2>
      <p className="mb-6 text-center text-sm text-gray-500 dark:text-slate-400">
        {t('onboarding.interest_desc')}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(({ key, labelKey, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
              selected.includes(key)
                ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/20'
                : 'border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500'
            }`}
          >
            <div className={`rounded-lg p-2 ${color}`}>
              <Icon size={24} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t(labelKey)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={onNext}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          {selected.length > 0
            ? t('onboarding.interest_selected').replace('{n}', String(selected.length))
            : t('onboarding.interest_continue')}
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {t('onboarding.skip')}
        </button>
      </div>

      {selected.length > 0 && (
        <p className="mt-3 text-center text-xs text-gray-400">{t('onboarding.interest_saved')}</p>
      )}
    </div>
  );
}
