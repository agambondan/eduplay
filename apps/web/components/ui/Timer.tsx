import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/stores/gameStore';
import { cn } from '@/lib/utils/cn';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isRunning?: boolean;
}

export function Timer({ initialSeconds, onTimeUp, isRunning = true }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  const firedRef = useRef(false);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (!isRunning || seconds <= 0) return;
    const id = setInterval(() => {
      setSeconds((prev) => {
        const next = prev - 1;
        useGameStore.getState().setTimeLeft(next);
        if (next <= 0 && !firedRef.current) {
          firedRef.current = true;
          setTimeout(() => onTimeUpRef.current?.(), 0);
        }
        return Math.max(next, 0);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, seconds]);

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
