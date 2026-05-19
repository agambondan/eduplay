'use client';

import { useEffect, useRef } from 'react';

interface BannerAdProps {
  slotId?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
}

export function BannerAd({ slotId = 'default-banner', format = 'auto', responsive = true }: BannerAdProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // In production, this would initialize Google AdSense
    // (window.adsbygoogle = window.adsbygoogle || []).push({});
  }, []);

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="w-full bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 min-h-[90px]">
        <span className="font-bold text-sm uppercase">Ad Banner Placement</span>
        <span className="text-xs">Slot: {slotId}</span>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center my-4 overflow-hidden">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
