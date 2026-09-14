'use client';

import { Difficulty } from '@/types/game';
import { cn } from '@/lib/utils/cn';

const LABELS: Record<Difficulty, { label: string; color: string }> = {
  easy: {
    label: 'Mudah',
    color:
      'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  medium: {
    label: 'Sedang',
    color:
      'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  hard: {
    label: 'Sulit',
    color:
      'border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

interface Props {
  selected: Difficulty;
  onChange: (d: Difficulty) => void;
  levels?: Difficulty[];
}

export function DifficultySelector({ selected, onChange, levels = ['easy', 'medium', 'hard'] }: Props) {
  return (
    <div className="flex gap-2">
      {levels.map((d) => {
        const cfg = LABELS[d];
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            className={cn(
              'rounded-xl border-2 px-5 py-2.5 text-sm font-bold transition-all',
              selected === d ? cfg.color : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
