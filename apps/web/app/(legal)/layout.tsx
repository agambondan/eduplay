import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className='min-h-screen bg-gray-50 dark:bg-slate-900'>
            <header className='border-b border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'>
                <div className='mx-auto flex max-w-4xl items-center gap-4 px-4 py-4'>
                    <Link
                        href='/'
                        className='flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        Kembali ke EduPlay
                    </Link>
                </div>
            </header>
            <main className='mx-auto max-w-4xl px-4 py-10'>{children}</main>
            <footer className='border-t border-gray-200 bg-white py-6 dark:border-slate-700 dark:bg-slate-800'>
                <div className='mx-auto max-w-4xl px-4 text-center text-sm text-gray-500 dark:text-slate-400'>
                    &copy; {new Date().getFullYear()} EduPlay &mdash;{' '}
                    <Link href='/privacy-policy' className='hover:underline'>
                        Kebijakan Privasi
                    </Link>{' '}
                    &middot;{' '}
                    <Link href='/terms-of-service' className='hover:underline'>
                        Syarat & Ketentuan
                    </Link>{' '}
                    &middot;{' '}
                    <Link href='/about' className='hover:underline'>
                        Tentang Kami
                    </Link>
                </div>
            </footer>
        </div>
    );
}
