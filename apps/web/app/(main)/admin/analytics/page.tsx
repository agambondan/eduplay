'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, CreditCard } from 'lucide-react';
import api from '@/lib/api/client';

interface DailyCount { date: string; count: number }
interface CategoryCount { category: string; count: number }

interface AnalyticsStats {
    new_users_last_30d: DailyCount[];
    sessions_last_30d: DailyCount[];
    category_breakdown: CategoryCount[];
    total_subscriptions: number;
    active_subscriptions: number;
}

function MiniBar({ data, color = 'bg-indigo-500' }: { data: DailyCount[]; color?: string }) {
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
        <div className='flex h-16 items-end gap-0.5'>
            {data.map((d) => (
                <div
                    key={d.date}
                    title={`${d.date}: ${d.count}`}
                    className={`flex-1 rounded-sm ${color} opacity-80 transition-all hover:opacity-100`}
                    style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }}
                />
            ))}
        </div>
    );
}

const CATEGORY_COLORS: Record<string, string> = {
    math: 'bg-blue-500',
    language: 'bg-emerald-500',
    geography: 'bg-amber-500',
    logic: 'bg-purple-500',
    science: 'bg-cyan-500',
    history: 'bg-rose-500',
    arcade: 'bg-orange-500',
    multiplayer: 'bg-violet-500',
};

export default function AdminAnalyticsPage() {
    const { data: stats, isLoading } = useQuery<AnalyticsStats>({
        queryKey: ['admin-analytics'],
        queryFn: () => api.get('/admin/analytics').then((r) => r.data.data),
        refetchInterval: 60_000,
    });

    const totalNewUsers = stats?.new_users_last_30d.reduce((s, d) => s + d.count, 0) ?? 0;
    const totalSessions = stats?.sessions_last_30d.reduce((s, d) => s + d.count, 0) ?? 0;
    const maxCategory = Math.max(...(stats?.category_breakdown.map((c) => c.count) ?? [1]), 1);

    if (isLoading) {
        return (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className='h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800' />
                ))}
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Analytics</h1>
                <p className='text-sm text-gray-500 dark:text-slate-400'>Data 30 hari terakhir</p>
            </div>

            {/* Stat cards */}
            <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                {[
                    { label: 'User Baru (30d)', value: totalNewUsers, icon: Users, color: 'text-indigo-600' },
                    { label: 'Sesi Game (30d)', value: totalSessions, icon: TrendingUp, color: 'text-emerald-600' },
                    { label: 'Total Subscriber', value: stats?.total_subscriptions ?? 0, icon: CreditCard, color: 'text-amber-600' },
                    { label: 'Subscriber Aktif', value: stats?.active_subscriptions ?? 0, icon: BarChart3, color: 'text-violet-600' },
                ].map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className='rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                            <Icon className={`mb-2 h-5 w-5 ${s.color}`} />
                            <p className='text-2xl font-black text-gray-900 dark:text-white'>
                                {s.value.toLocaleString()}
                            </p>
                            <p className='text-xs text-gray-400 dark:text-slate-500'>{s.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Charts */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <div className='rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                    <p className='mb-3 text-sm font-bold text-gray-700 dark:text-slate-300'>
                        User Baru per Hari
                    </p>
                    {stats?.new_users_last_30d.length ? (
                        <MiniBar data={stats.new_users_last_30d} color='bg-indigo-500' />
                    ) : (
                        <p className='py-6 text-center text-sm text-gray-400'>Belum ada data</p>
                    )}
                    <div className='mt-1 flex justify-between text-[10px] text-gray-400'>
                        <span>{stats?.new_users_last_30d[0]?.date?.slice(5)}</span>
                        <span>{stats?.new_users_last_30d.at(-1)?.date?.slice(5)}</span>
                    </div>
                </div>

                <div className='rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                    <p className='mb-3 text-sm font-bold text-gray-700 dark:text-slate-300'>
                        Sesi Game per Hari
                    </p>
                    {stats?.sessions_last_30d.length ? (
                        <MiniBar data={stats.sessions_last_30d} color='bg-emerald-500' />
                    ) : (
                        <p className='py-6 text-center text-sm text-gray-400'>Belum ada data</p>
                    )}
                    <div className='mt-1 flex justify-between text-[10px] text-gray-400'>
                        <span>{stats?.sessions_last_30d[0]?.date?.slice(5)}</span>
                        <span>{stats?.sessions_last_30d.at(-1)?.date?.slice(5)}</span>
                    </div>
                </div>
            </div>

            {/* Category breakdown */}
            <div className='rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800'>
                <p className='mb-4 text-sm font-bold text-gray-700 dark:text-slate-300'>
                    Sesi per Kategori (all-time)
                </p>
                {stats?.category_breakdown.length ? (
                    <div className='space-y-3'>
                        {stats.category_breakdown.map((c) => (
                            <div key={c.category} className='flex items-center gap-3'>
                                <span className='w-24 shrink-0 text-right text-xs font-medium capitalize text-gray-500 dark:text-slate-400'>
                                    {c.category}
                                </span>
                                <div className='flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700'>
                                    <div
                                        className={`h-2 rounded-full ${CATEGORY_COLORS[c.category] ?? 'bg-gray-400'} transition-all`}
                                        style={{ width: `${(c.count / maxCategory) * 100}%` }}
                                    />
                                </div>
                                <span className='w-10 shrink-0 text-right text-xs font-bold text-gray-700 dark:text-slate-300'>
                                    {c.count.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className='py-6 text-center text-sm text-gray-400'>Belum ada data sesi</p>
                )}
            </div>
        </div>
    );
}
