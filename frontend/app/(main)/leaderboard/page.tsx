'use client';

import { useQuery } from '@tanstack/react-query';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { gamesApi } from '@/lib/api/games';
import { useState } from 'react';
import { LeaderboardTable } from '@/components/ui/LeaderboardTable';
import { useAuthStore } from '@/lib/stores/authStore';
import { cn } from '@/lib/utils/cn';
import { Loader2, Trophy, Global } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'global' | 'game'>('global');
  const [period, setPeriod] = useState<'all' | 'weekly'>('all');
  const [selectedGame, setSelectedGame] = useState<string>('');

  const { data: games } = useQuery({ queryKey: ['games'], queryFn: gamesApi.list });

  const { data: leadData, isLoading } = useQuery({
    queryKey: ['leaderboard', tab, selectedGame, period],
    queryFn: () => {
      if (tab === 'global') return leaderboardApi.global(period);
      return leaderboardApi.game(selectedGame, period);
    },
    enabled: tab === 'global' || !!selectedGame,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Lihat siapa yang paling pintar!</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setPeriod('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              period === 'all' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-gray-500"
            )}
          >All-Time</button>
          <button
            onClick={() => setPeriod('weekly')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              period === 'weekly' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-gray-500"
            )}
          >Weekly</button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-100 dark:border-slate-700">
        <button
          onClick={() => setTab('global')}
          className={cn(
            "pb-3 px-2 text-sm font-bold transition-all relative",
            tab === 'global' ? "text-indigo-600" : "text-gray-500"
          )}
        >
          Global XP
          {tab === 'global' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>
        <button
          onClick={() => {
            setTab('game');
            if (!selectedGame && games?.length) setSelectedGame(games[0].slug);
          }}
          className={cn(
            "pb-3 px-2 text-sm font-bold transition-all relative",
            tab === 'game' ? "text-indigo-600" : "text-gray-500"
          )}
        >
          Per-Game Highscore
          {tab === 'game' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>
      </div>

      {tab === 'game' && (
        <div className="flex flex-wrap gap-2">
          {games?.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGame(g.slug)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                selectedGame === g.slug 
                  ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" 
                  : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-500"
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : leadData?.entries?.length ? (
        <div className="space-y-4">
          {leadData.user_rank && (
            <div className="bg-indigo-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-lg shadow-indigo-200 dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black">
                  #{leadData.user_rank.rank}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">Peringkat Kamu</p>
                  <p className="font-bold">{user?.username}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{leadData.user_rank.score.toLocaleString()}</p>
                <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">{tab === 'global' ? 'Total XP' : 'Highscore'}</p>
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
        <div className="py-20 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-700">
           <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
           <p className="text-gray-500">Belum ada data skor untuk kategori ini.</p>
        </div>
      )}
    </div>
  );
}
