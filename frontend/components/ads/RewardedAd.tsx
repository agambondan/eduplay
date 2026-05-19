'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { PlayCircle, Gift } from 'lucide-react';

interface RewardedAdProps {
  isOpen: boolean;
  onClose: () => void;
  onReward: () => void;
  rewardText?: string;
}

export function RewardedAd({ isOpen, onClose, onReward, rewardText = "Mendapat Reward!" }: RewardedAdProps) {
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
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {!isPlaying && !rewardGranted ? (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <Gift className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tonton Iklan</h3>
            <p className="text-gray-500 dark:text-slate-400">Tonton video pendek untuk mendapatkan reward: <strong className="text-indigo-600 dark:text-indigo-400">{rewardText}</strong></p>
            <div className="flex w-full gap-3 mt-4">
              <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                Batal
              </button>
              <button onClick={() => setIsPlaying(true)} className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                <PlayCircle className="w-5 h-5" /> Tonton
              </button>
            </div>
          </div>
        ) : isPlaying && !rewardGranted ? (
          <div className="p-8 flex flex-col items-center justify-center bg-slate-900 aspect-video w-full">
            <span className="text-white text-4xl font-bold font-mono animate-pulse">{timeLeft}</span>
            <p className="text-slate-400 mt-4 font-medium">Video sedang diputar...</p>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <Gift className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reward Diterima!</h3>
            <p className="text-gray-500 dark:text-slate-400">Kamu telah mendapatkan <strong className="text-emerald-600 dark:text-emerald-400">{rewardText}</strong></p>
            <button onClick={onClose} className="w-full mt-4 py-3 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
              Lanjut Main
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
