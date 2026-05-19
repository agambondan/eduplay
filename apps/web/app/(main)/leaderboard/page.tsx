'use client';

import { useQuery } from '@tanstack/react-query';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { gamesApi } from '@/lib/api/games';
import { useState } from 'react';
import { LeaderboardTable } from '@/components/ui/LeaderboardTable';
import { useAuthStore } from '@/lib/stores/authStore';
import { cn } from '@/lib/utils/cn';
import { Loader2, Trophy, Globe } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'global' | 'game'>('global');
  const [period, setPeriod] = useState<'all' | 'weekly'>('all');
  const [selectedGame, setSelectedGame] = useState<string>('');

  const { data: games } = useQuery({ queryKey: ['games'], queryFn: gamesApi.list });

  const { data: leadData, isLoading } = useQuery({
    queryKey: ['leaderboard', tab, selectedGame, period],
    queryFn: () => {
      if (tab === 'global') return leaderboardApi.getGlobalLeaderboard(period);
      return leaderboardApi.getGameLeaderboard(selectedGame, period);
    },
    enabled: tab === 'global' || !!selectedGame,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Lihat siapa yang paling pintar!
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
            Weekly
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
          Global XP
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
          Per-Game Highscore
          {tab === 'game' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />
          )}
        </button>
      </div>

      {tab === 'game' && (
        <div className="flex flex-wrap gap-2">
          {games?.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGame(g.slug)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
                selectedGame === g.slug
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/20'
                  : 'border-gray-100 bg-white text-gray-500 dark:border-slate-700 dark:bg-slate-800'
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
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
                    Peringkat Kamu
                  </p>
                  <p className="font-bold">{user?.username}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{leadData.user_rank.score.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {tab === 'global' ? 'Total XP' : 'Highscore'}
                </p>
              </div>
            </div>
          )}

          <LeaderboardTable
            entries={leadData.entries}
            currentUserId={user?.id}
            isXP={tab === 'global'}
          />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">Belum ada data skor untuk kategori ini.</p>
        </div>
      )}
    </div>
  );
}
