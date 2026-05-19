import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StreakCounterProps {
  streak: number;
  active?: boolean;
}

export function StreakCounter({ streak, active = false }: StreakCounterProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold shadow-sm transition-colors',
        active
          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400'
          : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
      )}
    >
      <Flame className={cn('h-4 w-4', active ? 'fill-red-500 text-red-500' : '')} />
      <span>{streak}</span>
    </div>
  );
}
