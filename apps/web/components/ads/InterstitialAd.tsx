'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, X } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { adsApi, type DirectAd } from '@/lib/api/ads';

interface InterstitialAdProps {
    isOpen: boolean;
    onClose: () => void;
}

const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT || '';

export function InterstitialAd({ isOpen, onClose }: InterstitialAdProps) {
    const { t } = useLocale();
    const [canSkip, setCanSkip] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5);
    const [directAd, setDirectAd] = useState<DirectAd | null>(null);
    const [checked, setChecked] = useState(false);
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setCanSkip(false);
            setTimeLeft(5);
            setChecked(false);
            setDirectAd(null);
            return;
        }

        adsApi
            .getActiveSlot('interstitial')
            .then((ad) => setDirectAd(ad))
            .catch(() => setDirectAd(null))
            .finally(() => setChecked(true));

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

    // AdSense fallback injection
    useEffect(() => {
        if (!isOpen || !checked || directAd || !adRef.current || !ADSENSE_SLOT) return;
        try {
            const ins = document.createElement('ins');
            ins.className = 'adsbygoogle';
            ins.style.display = 'block';
            ins.dataset.adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';
            ins.dataset.adSlot = ADSENSE_SLOT;
            ins.dataset.adFormat = 'auto';
            ins.dataset.fullWidthResponsive = 'true';
            adRef.current.innerHTML = '';
            adRef.current.appendChild(ins);
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch {
            // ignore
        }
    }, [isOpen, checked, directAd]);

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm'>
            <div className='absolute right-4 top-4 z-50'>
                <button
                    onClick={onClose}
                    disabled={!canSkip}
                    className={cn(
                        'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all',
                        canSkip
                            ? 'bg-white/20 text-white backdrop-blur hover:bg-white/30'
                            : 'cursor-not-allowed bg-black/50 text-gray-400',
                    )}
                >
                    {canSkip ? (
                        <>
                            <X className='h-4 w-4' /> Skip
                        </>
                    ) : (
                        `Skip in ${timeLeft}s`
                    )}
                </button>
            </div>

            {!checked ? (
                <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
            ) : directAd ? (
                // Direct ad
                <a
                    href={directAd.click_url || '#'}
                    target='_blank'
                    rel='noopener noreferrer sponsored'
                    className='flex flex-col items-center gap-3'
                >
                    {directAd.image_url ? (
                        <Image
                            src={directAd.image_url}
                            alt={directAd.title}
                            width={300}
                            height={250}
                            className='rounded-xl object-cover shadow-2xl'
                            unoptimized
                        />
                    ) : (
                        <div className='flex h-[250px] w-[300px] items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-center'>
                            <span className='text-xl font-bold text-white'>{directAd.title}</span>
                        </div>
                    )}
                    <p className='text-xs text-gray-400'>{t('ads.interstitial')}</p>
                </a>
            ) : (
                // AdSense fallback
                <div className='flex flex-col items-center gap-4 text-white'>
                    <div
                        ref={adRef}
                        className='flex min-h-[250px] w-[300px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800'
                    >
                        {!ADSENSE_SLOT && (
                            <p className='px-4 text-center font-medium text-slate-500'>
                                {t('ads.no_ad')}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
