'use client';

import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Props {
  onDigit: (digit: number) => void;
  onDelete: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
  className?: string;
  submitLabel?: string;
}

export function GameNumpad({
  onDigit,
  onDelete,
  onSubmit,
  disabled = false,
  className,
  submitLabel = 'OK',
}: Props) {
  return (
    <div
      className={cn('grid w-full max-w-xs grid-cols-3 gap-2 select-none', className)}
      role="group"
      aria-label="Virtual numpad"
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(n)}
          className="flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-indigo-100 bg-white font-mono text-2xl font-black text-indigo-700 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:border-indigo-500"
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        aria-label="Delete"
        className="flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-gray-200 bg-white font-bold text-gray-500 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-rose-500"
      >
        <Delete className="h-6 w-6" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit(0)}
        className="flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-indigo-100 bg-white font-mono text-2xl font-black text-indigo-700 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:border-indigo-500"
      >
        0
      </button>
      {onSubmit ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="flex min-h-[52px] items-center justify-center rounded-2xl bg-emerald-600 font-mono text-lg font-black text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}