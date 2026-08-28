'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Medal, Trophy } from 'lucide-react';
import { type MpLeaderboardEntry, mpLeaderboardApi } from '@/lib/api/multiplayer';
import { GameContainer } from '@/components/ui/GameContainer';

export default function MpLeaderboardPage() {
  const router = useRouter();
  const [view, setView] = useState<'global' | string>('global');

  const { data: globalData, isLoading: globalLoading } = useQuery({
    queryKey: ['mp-leaderboard', 'global'],
    queryFn: () => mpLeaderboardApi.global(),
    refetchInterval: 30000,
  });

  const { data: userStats } = useQuery({
    queryKey: ['mp-user-stats'],
    queryFn: () => mpLeaderboardApi.myStats(),
  });

  const entries = globalData || [];

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
      <button
        onClick={() => router.push('/leaderboard')}
        className="flex items-center gap-2 text-sm text-gray-500"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Multiplayer Leaderboard
        </h1>
      </div>

      {userStats && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:border-indigo-900 dark:from-indigo-950 dark:to-purple-950">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Stats Kamu</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {userStats.total_matches}
              </p>
              <p className="text-xs text-gray-500">Match</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{userStats.total_wins}</p>
              <p className="text-xs text-gray-500">Menang</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-500">{userStats.total_losses}</p>
              <p className="text-xs text-gray-500">Kalah</p>
            </div>
            <div>
              <p className="text-lg font-bold text-indigo-600">
                {Math.round(userStats.win_rate * 100)}%
              </p>
              <p className="text-xs text-gray-500">WR</p>
            </div>
          </div>
        </div>
      )}

      {globalLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 rounded-2xl border p-4 ${
                i < 3
                  ? 'border-amber-200 bg-amber-50 dark:bg-amber-950'
                  : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold">
                {i === 0 ? (
                  <Medal className="h-6 w-6 text-amber-500" />
                ) : i === 1 ? (
                  <Medal className="h-6 w-6 text-gray-400" />
                ) : i === 2 ? (
                  <Medal className="h-6 w-6 text-orange-600" />
                ) : (
                  <span className="text-gray-400">{i + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white">{entry.username}</p>
                <p className="text-xs text-gray-500">
                  {entry.wins}W {entry.losses}L · {Math.round(entry.win_rate * 100)}% WR
                </p>
              </div>
              <p className="text-lg font-bold text-indigo-600">{entry.wins}</p>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="py-10 text-center text-gray-400">Belum ada data multiplayer</p>
          )}
        </div>
      )}
    </div>
  );
}
