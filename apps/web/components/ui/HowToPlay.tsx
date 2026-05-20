'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

interface Step {
  emoji: string;
  text: string;
}

interface HowToPlayProps {
  steps: Step[];
}

export function HowToPlay({ steps }: HowToPlayProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <div className="w-full rounded-xl border border-gray-200 dark:border-slate-700">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 dark:text-slate-300"
      >
        <span className="flex items-center gap-1.5">
          <span>📖</span> {t('game.how_to_play')}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && (
        <ul className="space-y-2.5 border-t border-gray-200 px-4 pb-4 pt-3 dark:border-slate-700">
          {steps.map((step, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-slate-400"
            >
              <span className="shrink-0 text-base leading-tight">{step.emoji}</span>
              <span>{step.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
