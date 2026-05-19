import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StreakCounterProps {
  streak: number;
  active?: boolean;
}

export function StreakCounter({ streak, active = false }: StreakCounterProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border transition-colors",
      active 
        ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30" 
        : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
    )}>
      <Flame className={cn("w-4 h-4", active ? "fill-red-500 text-red-500" : "")} />
      <span>{streak}</span>
    </div>
  );
}
