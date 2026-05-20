'use client';

import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useLocale } from '@/lib/i18n';
import { useGameStore } from '@/lib/stores/gameStore';

export function PauseOverlay() {
  const { t } = useLocale();
  const isPaused = useGameStore((s) => s.isPaused);
  const togglePause = useGameStore((s) => s.togglePause);
  const focusRef = useFocusTrap(isPaused);

  if (!isPaused) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('game.pause')}
    >
      <div
        ref={focusRef}
        className="flex flex-col items-center gap-6 rounded-2xl bg-white p-10 shadow-2xl dark:bg-slate-800"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('game.pause')}</h2>
        <p className="text-gray-500 dark:text-slate-400">{t('game.resume_prompt')}</p>
        <button
          onClick={togglePause}
          className="touch-target rounded-xl bg-emerald-500 px-10 py-3 text-lg font-bold text-white transition-colors hover:bg-emerald-600"
        >
          {t('game.resume')}
        </button>
      </div>
    </div>
  );
}
