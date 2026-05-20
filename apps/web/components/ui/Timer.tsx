'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/stores/gameStore';
import { cn } from '@/lib/utils/cn';
import { useLocale } from '@/lib/i18n';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isRunning?: boolean;
}

export function Timer({ initialSeconds, onTimeUp, isRunning = true }: TimerProps) {
  const { t } = useLocale();
  const [seconds, setSeconds] = useState(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  const firedRef = useRef(false);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (!isRunning || seconds <= 0) return;
    const id = setInterval(() => {
      const isPaused = useGameStore.getState().isPaused;
      if (isPaused) return;
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

  const isPaused = useGameStore((s) => s.isPaused);

  return (
    <div
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-2',
        isPaused ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-100 dark:bg-slate-700'
      )}
    >
      <span className="text-sm font-medium text-gray-600 dark:text-slate-300">
        {isPaused ? t('game.pause') : t('game.timer')}
      </span>
      <span
        className={cn(
          'font-mono text-xl font-bold',
          seconds <= 10 && !isPaused ? 'animate-pulse text-rose-600' : 'text-gray-900 dark:text-white'
        )}
      >
        {isPaused ? `${seconds}s` : `${seconds}s`}
      </span>
    </div>
  );
}
