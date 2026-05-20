import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Trophy, Zap, Shield } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Tentang EduPlay — Platform Game Edukasi',
    description:
        'EduPlay adalah platform game edukasi online gratis untuk pelajar SD hingga SMA. Belajar matematika, bahasa, geografi, dan logika sambil bermain.',
};

export default function AboutPage() {
    const features = [
        {
            icon: BookOpen,
            title: 'Belajar Sambil Bermain',
            desc: '15+ mini game edukatif mencakup Matematika, Bahasa Indonesia, Geografi, Logika, Sains, dan Sejarah.',
        },
        {
            icon: Trophy,
            title: 'Sistem Gamifikasi',
            desc: 'XP, Level, Streak harian, Achievement, dan Leaderboard untuk menjaga motivasi belajar.',
        },
        {
            icon: Zap,
            title: 'Daily Challenge',
            desc: 'Tantangan harian dengan soal baru setiap hari. Selesaikan untuk bonus XP 2x!',
        },
        {
            icon: Shield,
            title: 'Aman untuk Semua Usia',
            desc: 'Zero gambar manusia atau makhluk hidup. Semua visual menggunakan geometri, angka, huruf, dan ikon.',
        },
    ];

    return (
        <div className='space-y-12'>
            <div className='text-center'>
                <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl text-white shadow-lg'>
                    🎮
                </div>
                <h1 className='text-4xl font-bold text-gray-900 dark:text-white'>Tentang EduPlay</h1>
                <p className='mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300'>
                    Platform game edukasi online gratis yang menggabungkan pembelajaran dengan keseruan gaming —
                    dirancang khusus untuk pelajar Indonesia.
                </p>
            </div>

            <div className='grid gap-6 sm:grid-cols-2'>
                {features.map(({ icon: Icon, title, desc }) => (
                    <div
                        key={title}
                        className='rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800'
                    >
                        <div className='mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20'>
                            <Icon className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
                        </div>
                        <h3 className='mb-2 text-lg font-bold text-gray-900 dark:text-white'>{title}</h3>
                        <p className='text-sm text-gray-600 dark:text-slate-400'>{desc}</p>
                    </div>
                ))}
            </div>

            <div className='rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                <h2 className='mb-4 text-2xl font-bold text-gray-900 dark:text-white'>Misi Kami</h2>
                <p className='text-gray-600 dark:text-slate-300'>
                    EduPlay lahir dari keyakinan bahwa belajar seharusnya menyenangkan. Kami percaya bahwa
                    dengan menggabungkan elemen game yang engaging dengan konten edukatif berkualitas, setiap
                    pelajar bisa menikmati proses belajar dan meraih hasil yang lebih baik.
                </p>
                <p className='mt-4 text-gray-600 dark:text-slate-300'>
                    Platform ini dirancang khusus untuk konteks Indonesia — dengan soal dalam Bahasa Indonesia,
                    konten yang relevan dengan kurikulum nasional, dan optimasi untuk perangkat mobile dengan
                    koneksi 3G/4G.
                </p>
            </div>

            <div className='rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-center text-white'>
                <h2 className='mb-2 text-2xl font-bold'>Siap Mulai Belajar?</h2>
                <p className='mb-6 text-indigo-100'>Gratis selamanya. Mulai main tanpa perlu install.</p>
                <Link
                    href='/games'
                    className='inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-indigo-600 shadow-md transition-all hover:bg-indigo-50'
                >
                    Jelajahi Game
                </Link>
            </div>

            <div className='text-center text-sm text-gray-500 dark:text-slate-400'>
                <p>
                    Ada pertanyaan?{' '}
                    <a href='mailto:hello@eduplay.id' className='text-indigo-600 hover:underline'>
                        hello@eduplay.id
                    </a>
                </p>
            </div>
        </div>
    );
}
