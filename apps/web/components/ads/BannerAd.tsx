'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { adsApi, type DirectAd } from '@/lib/api/ads';

interface BannerAdProps {
    slotId?: string;
    format?: 'auto' | 'fluid' | 'rectangle';
}

export function BannerAd({ slotId = 'default-banner', format = 'auto' }: BannerAdProps) {
    const { t } = useLocale();
    const adRef = useRef<HTMLModElement>(null);
    const pathname = usePathname();
    const [directAd, setDirectAd] = useState<DirectAd | null>(null);
    const [checked, setChecked] = useState(false);

    // Try to load a direct ad first; fall back to AdSense if none
    useEffect(() => {
        setChecked(false);
        adsApi
            .getActiveSlot('banner')
            .then((ad) => setDirectAd(ad))
            .catch(() => setDirectAd(null))
            .finally(() => setChecked(true));
    }, [pathname]);

    // Inject AdSense only when there is no direct ad
    useEffect(() => {
        if (!checked || directAd) return;
        try {
            if (process.env.NODE_ENV !== 'development' && typeof window !== 'undefined') {
                ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            }
        } catch {
            // ignore
        }
    }, [checked, directAd]);

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
