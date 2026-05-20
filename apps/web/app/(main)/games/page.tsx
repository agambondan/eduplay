'use client';

import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api/games';
import { GameCard } from '@/components/ui/GameCard';
import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Calculator,
    BookOpen,
    Globe,
    Layers,
    FlaskConical,
    Clock,
    ArrowLeft,
    ChevronRight,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

interface CategoryConfig {
    label: string;
    icon: LucideIcon;
    gradient: string;
    lightBg: string;
    textColor: string;
    desc: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    math: {
        label: 'Math',
        icon: Calculator,
        gradient: 'from-blue-500 to-blue-600',
        lightBg: 'bg-blue-50 dark:bg-blue-950/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        desc: 'Soal matematika dan hitung cepat',
    },
    language: {
        label: 'Language',
        icon: BookOpen,
        gradient: 'from-emerald-500 to-emerald-600',
        lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        desc: 'Kata, ejaan, dan teka-teki bahasa',
    },
    geography: {
        label: 'Geography',
        icon: Globe,
        gradient: 'from-amber-500 to-orange-500',
        lightBg: 'bg-amber-50 dark:bg-amber-950/30',
        textColor: 'text-amber-600 dark:text-amber-400',
        desc: 'Negara, bendera, dan ibukota dunia',
    },
    logic: {
        label: 'Logic',
        icon: Layers,
        gradient: 'from-purple-500 to-purple-600',
        lightBg: 'bg-purple-50 dark:bg-purple-950/30',
        textColor: 'text-purple-600 dark:text-purple-400',
        desc: 'Puzzle, strategi, dan berpikir kritis',
    },
    science: {
        label: 'Science',
        icon: FlaskConical,
        gradient: 'from-cyan-500 to-teal-500',
        lightBg: 'bg-cyan-50 dark:bg-cyan-950/30',
        textColor: 'text-cyan-600 dark:text-cyan-400',
        desc: 'Kimia, fisika, dan sains dasar',
    },
    history: {
        label: 'History',
        icon: Clock,
        gradient: 'from-rose-500 to-rose-600',
        lightBg: 'bg-rose-50 dark:bg-rose-950/30',
        textColor: 'text-rose-600 dark:text-rose-400',
        desc: 'Sejarah dan peristiwa dunia',
    },
};

export default function GamesPage() {
    const { t } = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedCategory = searchParams.get('cat');

    const { data: games, isLoading } = useQuery({
        queryKey: ['games'],
        queryFn: gamesApi.list,
    });

    const categoriesWithCount = useMemo(() => {
        if (!games) return [];
        const counts: Record<string, number> = {};
        games.forEach((g) => {
            counts[g.category] = (counts[g.category] || 0) + 1;
        });
        return Object.entries(CATEGORY_CONFIG)
            .map(([id, config]) => ({ id, ...config, count: counts[id] || 0 }))
            .filter((c) => c.count > 0);
    }, [games]);

    const filteredGames = useMemo(() => {
        if (!games || !selectedCategory) return [];
        return games.filter((g) => g.category === selectedCategory);
    }, [games, selectedCategory]);

    if (selectedCategory && CATEGORY_CONFIG[selectedCategory]) {
        const catConfig = CATEGORY_CONFIG[selectedCategory];
        const Icon = catConfig.icon;

        return (
            <div className='space-y-6'>
                <div className='flex items-center gap-3'>
                    <button
                        onClick={() => router.back()}
                        className='hidden items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 md:flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                    >
                        <ArrowLeft className='h-4 w-4' />
                        {t('game.category')}
                    </button>
                    <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${catConfig.gradient} shadow-sm`}
                    >
                        <Icon className='h-5 w-5 text-white' />
                    </div>
                    <div>
                        <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                            {t(`category.${selectedCategory}`)}
                        </h1>
                        <p className='text-sm text-gray-500 dark:text-slate-400'>{catConfig.desc}</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className='h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800'
                            />
                        ))}
                    </div>
                ) : (
                    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                        {filteredGames.map((game) => (
                            <GameCard key={game.id} game={game} />
                        ))}
                        {filteredGames.length === 0 && (
                            <div className='col-span-full py-20 text-center'>
                                <p className='text-gray-500'>{t('game.no_games')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className='space-y-8'>
            <div>
                <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>{t('game.hub')}</h1>
                <p className='text-gray-500 dark:text-slate-400'>
                    Pilih kategori game edukatif favoritmu!
                </p>
            </div>

            {isLoading ? (
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className='h-44 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800'
                        />
                    ))}
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                    {categoriesWithCount.map((cat) => {
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => router.push(`/games?cat=${cat.id}`)}
                                className='group flex flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-800'
                            >
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.gradient} shadow-sm transition-transform duration-200 group-hover:scale-105`}
                                >
                                    <Icon className='h-6 w-6 text-white' />
                                </div>
                                <div className='flex-1'>
                                    <div className='font-bold text-gray-900 dark:text-white'>
                                        {t(`category.${cat.id}`)}
                                    </div>
                                    <div className='mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-slate-400'>
                                        {cat.desc}
                                    </div>
                                </div>
                                <div className='flex w-full items-center justify-between'>
                                    <span
                                        className={`rounded-full ${cat.lightBg} ${cat.textColor} px-2.5 py-0.5 text-xs font-bold`}
                                    >
                                        {cat.count} game
                                    </span>
                                    <ChevronRight className='h-4 w-4 text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-600' />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
