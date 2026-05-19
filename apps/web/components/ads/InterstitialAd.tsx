'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

interface InterstitialAdProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InterstitialAd({ isOpen, onClose }: InterstitialAdProps) {
  const [canSkip, setCanSkip] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setCanSkip(false);
      setTimeLeft(5);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="absolute right-4 top-4 z-50">
        <button
          onClick={onClose}
          disabled={!canSkip}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-bold transition-all',
            canSkip
              ? 'bg-white/20 text-white backdrop-blur hover:bg-white/30'
              : 'cursor-not-allowed bg-black/50 text-gray-400'
          )}
        >
          {canSkip ? 'Skip Ad' : `Skip in ${timeLeft}s`}
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="font-medium text-gray-400">Advertisement</p>

        {/* Placeholder for actual AdSense interstitial code */}
        <div className="mt-4 flex h-[250px] w-[300px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
          <p className="font-medium text-slate-500">Ad Space (300x250)</p>
        </div>
      </div>
    </div>
  );
}
