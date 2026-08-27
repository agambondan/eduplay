'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { adsApi, type DirectAd } from '@/lib/api/ads';
import { useAdManager } from '@/lib/hooks/useAdManager';

interface BannerAdProps {
    slotId?: string;
    format?: 'auto' | 'fluid' | 'rectangle';
}

export function BannerAd({ slotId = 'default-banner', format = 'auto' }: BannerAdProps) {
    const { t } = useLocale();
    const adRef = useRef<HTMLModElement>(null);
    const gptRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const [directAd, setDirectAd] = useState<DirectAd | null>(null);
    const [checked, setChecked] = useState(false);
    const [useGpt, setUseGpt] = useState(false);
    const { loadGPT, gptLoaded, networkOrder } = useAdManager();

    // Try to load a direct ad first; fall back to AdSense if none
    useEffect(() => {
        setChecked(false);
        adsApi
            .getActiveSlot('banner')
            .then((ad) => setDirectAd(ad))
            .catch(() => setDirectAd(null))
            .finally(() => setChecked(true));
    }, [pathname]);

    // Inject AdSense / GPT based on mediation order
    useEffect(() => {
        if (!checked) return;
        const shouldUseAdsense = !directAd && networkOrder.includes('adsense') &&
            process.env.NODE_ENV !== 'development';
        const shouldUseGpt = !directAd && networkOrder.includes('admanager') &&
            process.env.NODE_ENV !== 'development';

        if (shouldUseGpt) {
            setUseGpt(true);
            loadGPT();
            return;
        }

        if (shouldUseAdsense && adRef.current) {
            try {
                ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            } catch {}
        }
    }, [checked, directAd, networkOrder, loadGPT]);

    useEffect(() => {
        if (!useGpt || !gptLoaded || !gptRef.current) return;
        const el = gptRef.current;
        try {
            const adUnit = `/21670785476/eduplay_${slotId.replace(/[^a-z0-9]/g, '_')}`;
            (window as any).googletag.cmd.push(() => {
                const slot = (window as any).googletag.defineSlot(adUnit, [[728, 90], [320, 50]], el.id)
                    ?.addService((window as any).googletag.pubads());
                (window as any).googletag.pubads().enableSingleRequest();
                (window as any).googletag.enableServices();
                (window as any).googletag.display(el.id);
            });
        } catch {}
    }, [useGpt, gptLoaded, slotId]);

    if (!checked) return null;

    // Direct ad
    if (directAd) {
        return (
            <a
                href={directAd.click_url || '#'}
                target='_blank'
                rel='noopener noreferrer sponsored'
                className='relative my-4 flex w-full items-center justify-center overflow-hidden rounded-xl'
            >
                {directAd.image_url ? (
                    <Image
                        src={directAd.image_url}
                        alt={directAd.title}
                        width={728}
                        height={90}
                        className='w-full object-cover'
                        unoptimized
                    />
                ) : (
                    <div className='flex min-h-[90px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-4'>
                        <span className='text-lg font-bold text-white'>{directAd.title}</span>
                    </div>
                )}
                <span className='absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-white'>
                    {t('ads.banner')}
                </span>
            </a>
        );
    }

    // Dev placeholder (no AdSense in dev)
    if (process.env.NODE_ENV === 'development') {
        return (
            <div className='flex min-h-[90px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-200 p-4 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'>
                <span className='text-sm font-bold uppercase'>{t('ads.banner')}</span>
                <span className='text-xs'>Slot: {slotId} | Mediasi: {networkOrder.join(' → ')}</span>
            </div>
        );
    }

    // GPT (Google Ad Manager) — preferred fallback
    if (useGpt) {
        return (
            <div className='my-4 flex w-full justify-center overflow-hidden'>
                <div id={`div-gpt-${slotId.replace(/[^a-z0-9]/g, '_')}`} ref={gptRef} className='min-h-[90px]' />
            </div>
        );
    }

    // Direct ad
    if (directAd) {
        return (
            <div className='flex min-h-[90px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-200 p-4 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'>
                <span className='text-sm font-bold uppercase'>{t('ads.banner')}</span>
                <span className='text-xs'>Slot: {slotId} (AdSense fallback)</span>
            </div>
        );
    }

    // AdSense fallback
    return (
        <div className='my-4 flex w-full justify-center overflow-hidden'>
            <ins
                ref={adRef}
                className='adsbygoogle'
                style={{ display: 'block', width: '100%' }}
                data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive='true'
            />
        </div>
    );
}
