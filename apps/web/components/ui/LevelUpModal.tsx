'use client';

import { useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useLocale } from '@/lib/i18n';

interface LevelUpModalProps {
  newLevel: number;
  onClose: () => void;
}

export function LevelUpModal({ newLevel, onClose }: LevelUpModalProps) {
  const { t } = useLocale();
  const focusRef = useFocusTrap(true);

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t('level.up')} ${newLevel}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={focusRef}
        className="relative flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-10 text-center text-white shadow-2xl"
        style={{ animation: 'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-white/60 hover:text-white"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-inner">
          <Zap className="h-10 w-10 fill-yellow-300 text-yellow-300" />
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
            {t('level.up')}
          </div>
          <div className="mt-1 text-6xl font-black">{newLevel}</div>
        </div>

        <p className="text-indigo-100">{t('level.up_desc', { level: newLevel })}</p>

        <button
          onClick={onClose}
          className="rounded-xl bg-white px-6 py-2 font-bold text-indigo-600 transition-all hover:bg-indigo-50"
        >
          {t('game.resume')}
        </button>
      </div>

      <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.7); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
    </div>
  );
}
