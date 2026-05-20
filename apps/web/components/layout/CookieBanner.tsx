'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Cookie } from 'lucide-react';

const STORAGE_KEY = 'eduplay-cookie-consent';

export function CookieBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(STORAGE_KEY);
        if (!consent) setVisible(true);
    }, []);

    const accept = () => {
        localStorage.setItem(STORAGE_KEY, 'accepted');
        setVisible(false);
    };

    const decline = () => {
        localStorage.setItem(STORAGE_KEY, 'declined');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            role='dialog'
            aria-label='Cookie consent'
            className='fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800 md:bottom-4'
        >
            <div className='flex items-start gap-3'>
                <Cookie className='mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500' />
                <div className='flex-1 text-sm'>
                    <p className='font-semibold text-gray-900 dark:text-white'>Kami menggunakan cookie 🍪</p>
                    <p className='mt-1 text-gray-500 dark:text-slate-400'>
                        Cookie digunakan untuk analitik dan iklan yang relevan. Lihat{' '}
                        <Link href='/privacy-policy' className='text-indigo-600 hover:underline dark:text-indigo-400'>
                            Kebijakan Privasi
                        </Link>{' '}
                        kami.
                    </p>
                    <div className='mt-3 flex flex-wrap gap-2'>
                        <button
                            onClick={accept}
                            className='rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700'
                        >
                            Terima Semua
                        </button>
                        <button
                            onClick={decline}
                            className='rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                        >
                            Hanya Esensial
                        </button>
                    </div>
                </div>
                <button
                    onClick={decline}
                    aria-label='Tutup'
                    className='rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700'
                >
                    <X className='h-4 w-4' />
                </button>
            </div>
        </div>
    );
}
