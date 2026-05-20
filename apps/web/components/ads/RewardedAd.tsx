'use client';

import { useEffect, useState } from 'react';
import { Gift, PlayCircle } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';

interface RewardedAdProps {
  isOpen: boolean;
  onClose: () => void;
  onReward: () => void;
  rewardText?: string;
}

export function RewardedAd({
  isOpen,
  onClose,
  onReward,
  rewardText = 'Mendapat Reward!',
}: RewardedAdProps) {
  const { t } = useLocale();
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [rewardGranted, setRewardGranted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setTimeLeft(15);
      setRewardGranted(false);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isPlaying || rewardGranted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setRewardGranted(true);
          onReward();
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, rewardGranted, onReward]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {!isPlaying && !rewardGranted ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Gift className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('ads.rewarded')}</h3>
            <p className="text-gray-500 dark:text-slate-400">
              Tonton video pendek untuk mendapatkan reward:{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{rewardText}</strong>
            </p>
            <div className="mt-4 flex w-full gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-3 font-bold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => setIsPlaying(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-600"
              >
                <PlayCircle className="h-5 w-5" /> {t('ads.rewarded')}
              </button>
            </div>
          </div>
        ) : isPlaying && !rewardGranted ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center bg-slate-900 p-8">
            <span className="animate-pulse font-mono text-4xl font-bold text-white">
              {timeLeft}
            </span>
            <p className="mt-4 font-medium text-slate-400">Video sedang diputar...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Gift className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reward Diterima!</h3>
            <p className="text-gray-500 dark:text-slate-400">
              Kamu telah mendapatkan{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">{rewardText}</strong>
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
            >
              {t('game.resume')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
