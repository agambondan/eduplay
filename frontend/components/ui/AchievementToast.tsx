'use client';

import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ToastData {
  id: string;
  name: string;
  description: string;
  xpReward: number;
}

export function AchievementToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Simple global event listener for achievements
  useEffect(() => {
    const handleAchievement = (e: CustomEvent<ToastData>) => {
      setToasts((prev) => [...prev, e.detail]);

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== e.detail.id));
      }, 5000);
    };

    window.addEventListener('unlock-achievement' as any, handleAchievement as any);
    return () => window.removeEventListener('unlock-achievement' as any, handleAchievement as any);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col gap-3 sm:bottom-6 sm:right-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-in slide-in-from-right-8 fade-in pointer-events-auto relative w-80 transform rounded-2xl border border-amber-200 bg-white p-4 pr-12 shadow-lg transition-all dark:border-amber-900/50 dark:bg-slate-800"
        >
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 shadow-inner">
              <Trophy className="h-6 w-6 text-white" />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                Achievement Unlocked
              </span>
              <h4 className="mt-0.5 font-bold leading-tight text-gray-900 dark:text-white">
                {toast.name}
              </h4>
              <p className="mt-1 line-clamp-2 text-sm leading-snug text-gray-500 dark:text-slate-400">
                {toast.description}
              </p>
              <div className="mt-2 w-max rounded bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                +{toast.xpReward} XP
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility to trigger toast from anywhere
export function showAchievement(data: ToastData) {
  const event = new CustomEvent('unlock-achievement', { detail: data });
  window.dispatchEvent(event);
}
