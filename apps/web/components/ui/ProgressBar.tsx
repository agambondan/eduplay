import { cn } from '@/lib/utils/cn';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  colorClass?: string;
}

export function ProgressBar({
  value,
  max,
  label,
  showValue = false,
  colorClass = 'bg-indigo-600',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-slate-300">
          {label && <span>{label}</span>}
          {showValue && (
            <span>
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
        <div
          className={cn('h-2.5 rounded-full transition-all duration-300', colorClass)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
