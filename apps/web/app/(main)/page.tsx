'use client';

import { UserStats } from '@/types/user';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Award,
    ChevronRight,
    Gamepad2,
    Medal,
    Play,
    Sparkles,
    TrendingUp,
    Trophy,
} from 'lucide-react';
import api from '@/lib/api/client';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { xpUtils } from '@/lib/utils/xp';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { DailyChallengeCard } from '@/components/ui/DailyChallengeCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StreakCounter } from '@/components/ui/StreakCounter';
import { XPBadge } from '@/components/ui/XPBadge';

function getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
}

const RANK_COLORS = [
    'bg-amber-400 text-white',
    'bg-gray-300 text-gray-800',
    'bg-amber-600 text-white',
];

function slugToTitle(slug: string): string {
    return slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const [stats, setStats] = useState<UserStats | null>(null);
    const { t } = useLocale();

    const { data: leadData } = useQuery({
        queryKey: ['leaderboard', 'global', 'all'],
        queryFn: () => leaderboardApi.getGlobalLeaderboard('all'),
        staleTime: 60_000,
        enabled: !!user,
    });

    useEffect(() => {
        api
            .get('/user/stats')
            .then((res) => setStats(res.data.data))
            .catch(() => {});
    }, []);

    const { level, xpInLevel, nextLevelXP } = xpUtils.getLevelProgress(user?.xp || 0);

    const avatarInitial = (user?.username || 'P')[0].toUpperCase();
    const avatarColor = user?.avatar_color || '#6366f1';

    const recentUnique = stats?.recent_sessions
        ? Array.from(
              new Map(stats.recent_sessions.map((s) => [s.game_slug, s])).values(),
          ).slice(0, 4)
        : [];

    const topThree = leadData?.entries?.slice(0, 3) ?? [];
    const userRank = leadData?.user_rank;

    return (
        <div className='space-y-6'>
            <OnboardingFlow />

            {/* Hero card */}
            <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none'>
                <div className='absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5' />
                <div className='absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5' />
                <div className='absolute right-20 top-12 h-16 w-16 rounded-full bg-white/[0.03]' />

                <div className='relative flex items-start justify-between'>
                    <div className='flex items-center gap-4'>
                        <div
                            className='flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black shadow-lg ring-2 ring-white/30'
                            style={{ backgroundColor: avatarColor }}
                        >
                            {avatarInitial}
                        </div>
                        <div>
                            <p className='text-sm font-medium text-indigo-200'>
                                {getTimeGreeting()} 👋
                            </p>
                            <h1 className='text-2xl font-bold'>{user?.username || 'Pelajar'}</h1>
                            <p className='mt-0.5 flex items-center gap-1 text-sm text-indigo-200'>
                                <Sparkles className='h-3.5 w-3.5' />
                                {t('app.tagline')}
                            </p>
                        </div>
                    </div>
                    <div className='flex flex-col items-end gap-2'>
                        <XPBadge level={level} xp={user?.xp || 0} />
                        <StreakCounter
                            streak={user?.streak || 0}
                            active={(user?.streak || 0) > 0}
                        />
                    </div>
                </div>

                <div className='relative mt-6'>
                    <ProgressBar
                        value={xpInLevel}
                        max={nextLevelXP}
                        label={`Level ${level} → ${level + 1}`}
                        showValue
                        colorClass='bg-white/60'
                    />
                </div>
            </div>

            {/* Stats grid */}
            {stats && (
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
                    {[
                        { label: t('profile.games_played'), value: stats.total_games || 0, icon: '🎮' },
                        { label: t('profile.total_xp'), value: stats.total_xp || 0, icon: '⭐' },
                        { label: t('profile.level'), value: level, icon: '🏅' },
                        { label: t('profile.streak'), value: user?.streak || 0, icon: '🔥' },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className='rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800'
                        >
                            <div className='text-2xl'>{s.icon}</div>
                            <div className='mt-1 text-xl font-black text-gray-900 dark:text-white'>
                                {s.value}
                            </div>
                            <div className='text-xs font-medium text-gray-500 dark:text-slate-400'>
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lanjutkan Main */}
            {recentUnique.length > 0 && (
                <div>
                    <div className='mb-3 flex items-center justify-between'>
                        <h2 className='flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400'>
                            <Gamepad2 className='h-4 w-4' />
                            Lanjutkan Main
                        </h2>
                        <Link
                            href='/games'
                            className='flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
                        >
                            Semua Game <ChevronRight className='h-3.5 w-3.5' />
                        </Link>
                    </div>
                    <div className='scrollbar-none flex gap-3 overflow-x-auto pb-1'>
                        {recentUnique.map((session) => (
                            <Link
                                key={session.game_slug}
                                href={`/games/${session.game_slug}`}
                                className='flex flex-shrink-0 items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-700'
                            >
                                <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30'>
                                    <Play className='h-4 w-4 text-indigo-600 dark:text-indigo-400' />
                                </div>
                                <div>
                                    <p className='whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white'>
                                        {slugToTitle(session.game_slug)}
                                    </p>
                                    <p className='text-xs text-gray-500 dark:text-slate-400'>
                                        Skor: {session.score}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Rank + Achievement row */}
            {user && (
                <div className='grid grid-cols-2 gap-4'>
                    {/* Rank card */}
                    <div className='flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                        <div className='flex items-center justify-between'>
                            <h3 className='flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-slate-300'>
                                <Medal className='h-4 w-4 text-amber-500' />
                                Ranking
                            </h3>
                            <Link
                                href='/leaderboard'
                                className='text-xs font-bold text-indigo-600 dark:text-indigo-400'
                            >
                                Lihat →
                            </Link>
                        </div>

                        {userRank ? (
                            <div className='flex items-center justify-center'>
                                <div className='text-center'>
                                    <div className='text-3xl font-black text-gray-900 dark:text-white'>
                                        #{userRank.rank}
                                    </div>
                                    <div className='text-xs text-gray-500 dark:text-slate-400'>
                                        Global
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className='text-xs text-gray-400 dark:text-slate-500'>
                                Main game untuk masuk ranking!
                            </p>
                        )}

                        {topThree.length > 0 && (
                            <div className='space-y-1.5'>
                                {topThree.map((entry, i) => (
                                    <div
                                        key={entry.user_id}
                                        className='flex items-center gap-2 text-xs'
                                    >
                                        <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${RANK_COLORS[i]}`}
                                        >
                                            {i + 1}
                                        </span>
                                        <span className='truncate font-medium text-gray-700 dark:text-slate-300'>
                                            {entry.username}
                                        </span>
                                        <span className='ml-auto font-bold text-indigo-600 dark:text-indigo-400'>
                                            {entry.score.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Achievement card */}
                    <div className='flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                        <div className='flex items-center justify-between'>
                            <h3 className='flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-slate-300'>
                                <Award className='h-4 w-4 text-purple-500' />
                                Pencapaian
                            </h3>
                            <Link
                                href='/profile'
                                className='text-xs font-bold text-indigo-600 dark:text-indigo-400'
                            >
                                Lihat →
                            </Link>
                        </div>

                        <div className='flex items-center justify-center'>
                            <div className='text-center'>
                                <div className='text-3xl font-black text-gray-900 dark:text-white'>
                                    {stats?.achievements_unlocked ?? 0}
                                </div>
                                <div className='text-xs text-gray-500 dark:text-slate-400'>
                                    Terbuka
                                </div>
                            </div>
                        </div>

                        <div className='space-y-1.5'>
                            {stats && stats.achievements_unlocked > 0 ? (
                                <>
                                    <div className='flex justify-between text-[10px] text-gray-500 dark:text-slate-400'>
                                        <span>{stats.achievements_unlocked} unlocked</span>
                                        <span>13 total</span>
                                    </div>
                                    <div className='h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700'>
                                        <div
                                            className='h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all'
                                            style={{
                                                width: `${Math.min((stats.achievements_unlocked / 13) * 100, 100)}%`,
                                            }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className='text-xs text-gray-400 dark:text-slate-500'>
                                    Selesaikan tantangan untuk unlock!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Guest CTA */}
            {!user && (
                <div className='overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white'>
                    <div className='mb-1 text-xs font-bold uppercase tracking-widest text-indigo-200'>
                        Mulai perjalananmu
                    </div>
                    <h2 className='mb-2 text-xl font-black'>Buat akun gratis</h2>
                    <p className='mb-5 text-sm text-indigo-100'>
                        Simpan progress, kumpulkan XP, saingi teman di leaderboard, dan buka
                        pencapaian eksklusif!
                    </p>
                    <div className='flex gap-3'>
                        <Link
                            href='/register'
                            className='flex-1 rounded-xl bg-white py-2.5 text-center text-sm font-black text-indigo-600 transition-colors hover:bg-indigo-50'
                        >
                            Daftar Sekarang
                        </Link>
                        <Link
                            href='/login'
                            className='flex-1 rounded-xl border border-white/30 bg-white/10 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-white/20'
                        >
                            Masuk
                        </Link>
                    </div>
                </div>
            )}

            {/* 7-day XP chart */}
            {stats?.history && stats.history.length > 0 && (
                <div className='rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                    <h2 className='mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white'>
                        <TrendingUp className='h-5 w-5 text-indigo-500' /> {t('profile.7day_xp')}
                    </h2>
                    <div className='flex items-end justify-between gap-2 pl-2'>
                        {(() => {
                            const maxXP = Math.max(...stats.history.map((p) => p.xp), 1);
                            return stats.history.map((pt, i) => {
                                const heightPct = (pt.xp / maxXP) * 100;
                                return (
                                    <div key={i} className='group flex flex-1 flex-col items-center'>
                                        <div className='mb-1 text-[10px] font-bold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400'>
                                            +{pt.xp}
                                        </div>
                                        <div
                                            className='min-h-[4px] w-full rounded-t-md bg-gradient-to-t from-indigo-400 to-indigo-500 transition-all group-hover:from-indigo-500 group-hover:to-indigo-600 dark:from-indigo-600 dark:to-indigo-500'
                                            style={{
                                                height: `${Math.max(heightPct, 4)}%`,
                                                maxHeight: '120px',
                                            }}
                                        />
                                        <div className='mt-2 text-[9px] font-bold text-gray-400 dark:text-slate-500'>
                                            {new Date(pt.date).toLocaleDateString('id-ID', {
                                                weekday: 'short',
                                                day: 'numeric',
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {/* Daily Challenge + Leaderboard CTA */}
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                <DailyChallengeCard />
                <div className='flex h-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                    <div>
                        <div className='mb-4 flex items-center gap-2'>
                            <Trophy className='h-5 w-5 text-amber-500' />
                            <h3 className='text-xl font-bold text-gray-900 dark:text-white'>
                                {t('leaderboard.title')}
                            </h3>
                        </div>
                        <p className='text-sm text-gray-500 dark:text-slate-400'>
                            Lihat posisi kamu di antara pemain lain dan raih podium!
                        </p>
                    </div>
                    <Link
                        href='/leaderboard'
                        className='mt-6 inline-block w-full rounded-xl bg-amber-500 px-4 py-3 text-center font-bold text-white shadow-sm transition-colors hover:bg-amber-600'
                    >
                        Lihat Ranking
                    </Link>
                </div>
            </div>
        </div>
    );
}
