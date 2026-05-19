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
  colorClass = "bg-indigo-600" 
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1 text-sm font-medium text-gray-700 dark:text-slate-300">
          {label && <span>{label}</span>}
          {showValue && <span>{value} / {max}</span>}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-slate-700 overflow-hidden">
        <div 
          className={cn("h-2.5 rounded-full transition-all duration-300", colorClass)} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
