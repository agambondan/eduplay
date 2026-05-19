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
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center backdrop-blur-sm">
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onClose}
          disabled={!canSkip}
          className={cn(
            "px-4 py-2 rounded-full font-bold text-sm transition-all",
            canSkip 
              ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur" 
              : "bg-black/50 text-gray-400 cursor-not-allowed"
          )}
        >
          {canSkip ? "Skip Ad" : `Skip in ${timeLeft}s`}
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-gray-400 font-medium">Advertisement</p>
        
        {/* Placeholder for actual AdSense interstitial code */}
        <div className="w-[300px] h-[250px] bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 mt-4">
          <p className="text-slate-500 font-medium">Ad Space (300x250)</p>
        </div>
      </div>
    </div>
  );
}
