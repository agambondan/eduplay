import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isRunning?: boolean;
}

export function Timer({ initialSeconds, onTimeUp, isRunning = true }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (!isRunning) return;
    if (seconds <= 0) {
      if (onTimeUp) onTimeUp();
      return;
    }
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds, isRunning, onTimeUp]);

  return (
    <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 dark:bg-slate-700">
      <span className="text-sm font-medium text-gray-600 dark:text-slate-300">Time:</span>
      <span
        className={cn(
          'font-mono text-xl font-bold',
          seconds <= 10 ? 'animate-pulse text-rose-600' : 'text-gray-900 dark:text-white'
        )}
      >
        {seconds}s
      </span>
    </div>
  );
}
