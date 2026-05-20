'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2, Radio, Search, Trophy } from 'lucide-react';

import { gamesApi } from '@/lib/api/games';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { cn } from '@/lib/utils/cn';
import { LeaderboardTable } from '@/components/ui/LeaderboardTable';
import type { Game } from '@/types/game';

const CATEGORY_LABEL: Record<string, string> = {
    math: 'Matematika',
    language: 'Bahasa',
    geography: 'Geografi',
    logic: 'Logika',
    science: 'Sains',
    history: 'Sejarah',
    arcade: 'Arcade',
    multiplayer: 'Multiplayer',
};

function GameSelector({
    games,
    value,
    onChange,
}: {
    games: Game[];
    value: string;
    onChange: (slug: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selected = games.find((g) => g.slug === value);

    const filtered = search.trim()
        ? games.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
        : games;

    const grouped = filtered.reduce<Record<string, Game[]>>((acc, g) => {
        const cat = g.category || 'other';
        (acc[cat] ??= []).push(g);
        return acc;
    }, {});

    return (
        <div ref={ref} className='relative w-full'>
            <button
                onClick={() => setOpen((o) => !o)}
                className='flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-white'
            >
                <span className='truncate'>{selected?.name ?? 'Pilih game…'}</span>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200',
                        open && 'rotate-180',
                    )}
                />
            </button>

            {open && (
                <div className='absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800'>
                    <div className='sticky top-0 border-b border-gray-100 bg-white p-2 dark:border-slate-700 dark:bg-slate-800'>
                        <div className='flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-slate-700'>
                            <Search className='h-3.5 w-3.5 shrink-0 text-gray-400' />
                            <input
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder='Cari game…'
                                className='w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-white'
                            />
                        </div>
                    </div>

                    {Object.entries(grouped).map(([cat, list]) => (
                        <div key={cat}>
                            <p className='px-3 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500'>
                                {CATEGORY_LABEL[cat] ?? cat}
                            </p>
                            {list.map((g) => (
                                <button
                                    key={g.slug}
                                    onClick={() => {
                                        onChange(g.slug);
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    className={cn(
                                        'flex w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-700',
                                        g.slug === value
                                            ? 'font-bold text-indigo-600 dark:text-indigo-400'
                                            : 'text-gray-700 dark:text-slate-300',
                                    )}
                                >
                                    {g.name}
                                    {g.slug === value && (
                                        <span className='ml-auto text-indigo-400'>✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <p className='px-4 py-6 text-center text-sm text-gray-400'>
                            Tidak ada game yang ditemukan
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const { t } = useLocale();
  const [tab, setTab] = useState<'global' | 'game'>('global');
  const [period, setPeriod] = useState<'all' | 'weekly'>('all');
  const [selectedGame, setSelectedGame] = useState<string>('');

  const { data: games } = useQuery({ queryKey: ['games'], queryFn: gamesApi.list });

  const { data: leadData, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['leaderboard', tab, selectedGame, period],
    queryFn: () => {
      if (tab === 'global') return leaderboardApi.getGlobalLeaderboard(period);
      return leaderboardApi.getGameLeaderboard(selectedGame, period);
    },
    enabled: tab === 'global' || !!selectedGame,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('leaderboard.title')}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Live</span>
            {dataUpdatedAt > 0 && (
              <span className="text-xs text-gray-400">
                · diperbarui {new Date(dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        <div className="flex w-fit rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setPeriod('all')}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-bold transition-all',
              period === 'all'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700'
                : 'text-gray-500'
            )}
          >
            All-Time
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-bold transition-all',
              period === 'weekly'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700'
                : 'text-gray-500'
            )}
          >
            {t('leaderboard.weekly')}
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-100 dark:border-slate-700">
        <button
          onClick={() => setTab('global')}
          className={cn(
            'relative px-2 pb-3 text-sm font-bold transition-all',
            tab === 'global' ? 'text-indigo-600' : 'text-gray-500'
          )}
        >
          {t('leaderboard.global')}
          {tab === 'global' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => {
            setTab('game');
            if (!selectedGame && games?.length) setSelectedGame(games[0].slug);
          }}
          className={cn(
            'relative px-2 pb-3 text-sm font-bold transition-all',
            tab === 'game' ? 'text-indigo-600' : 'text-gray-500'
          )}
        >
          {t('leaderboard.per_game')}
          {tab === 'game' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />
          )}
        </button>
      </div>

      {tab === 'game' && (
        <GameSelector
          games={games ?? []}
          value={selectedGame}
          onChange={setSelectedGame}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : leadData?.entries?.length ? (
        <div className="space-y-4">
          {leadData.user_rank && (
            <div className="flex items-center justify-between rounded-2xl bg-indigo-600 p-4 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-black">
                  #{leadData.user_rank.rank}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    {t('leaderboard.your_rank')}
                  </p>
                  <p className="font-bold">{user?.username}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{leadData.user_rank.score.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {tab === 'global' ? t('profile.total_xp') : t('game.highscore')}
                </p>
              </div>
            </div>
          )}

          <LeaderboardTable
            entries={leadData.entries}
            currentUserId={user?.id}
            isXP={tab === 'global'}
            userRank={leadData.user_rank}
            nearbyEntries={leadData.nearby_entries}
          />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">{t('leaderboard.empty')}</p>
        </div>
      )}
    </div>
  );
}
