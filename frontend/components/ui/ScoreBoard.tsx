import { cn } from '@/lib/utils/cn';

interface ScoreBoardProps {
  score: number;
  label?: string;
}

export function ScoreBoard({ score, label = 'Score' }: ScoreBoardProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 dark:bg-slate-700">
      <span className="text-sm font-medium text-gray-600 dark:text-slate-300">{label}:</span>
      <span className={cn('text-xl font-bold', score >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
        {' '}
        {score}{' '}
      </span>
    </div>
  );
}
