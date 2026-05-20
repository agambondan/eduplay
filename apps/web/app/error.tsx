'use client';

import { useEffect } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900'>
            <div className='max-w-md text-center'>
                <div className='mb-4 text-6xl'>⚠️</div>
                <h1 className='mb-2 text-2xl font-bold text-gray-900 dark:text-white'>Terjadi Kesalahan</h1>
                <p className='mb-8 text-gray-500 dark:text-slate-400'>
                    Ups, ada yang tidak beres. Tim kami sudah diberitahu. Coba muat ulang halaman.
                </p>
                <div className='flex flex-col gap-3 sm:flex-row sm:justify-center'>
                    <button
                        onClick={reset}
                        className='flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-700'
                    >
                        <RefreshCw className='h-4 w-4' />
                        Coba Lagi
                    </button>
                    <Link
                        href='/'
                        className='flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                    >
                        <Home className='h-4 w-4' />
                        Ke Beranda
                    </Link>
                </div>
                {process.env.NODE_ENV === 'development' && error.message && (
                    <pre className='mt-6 overflow-auto rounded-lg bg-red-50 p-4 text-left text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300'>
                        {error.message}
                    </pre>
                )}
            </div>
        </div>
    );
}
