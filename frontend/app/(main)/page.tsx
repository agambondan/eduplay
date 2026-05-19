'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { Stats } from '@/types/user';
import { DailyChallengeCard } from '@/components/ui/DailyChallengeCard';
import { XPBadge } from '@/components/ui/XPBadge';
import { StreakCounter } from '@/components/ui/StreakCounter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { xpUtils } from '@/lib/utils/xp';
import { Trophy, Gamepad2 } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api
      .get('/user/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  }, []);

  const { level, xpInLevel, nextLevelXP } = xpUtils.getLevelProgress(user?.xp || 0);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-200">Selamat datang 👋</p>
            <h1 className="text-2xl font-bold">{user?.username || 'Pelajar'}</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <XPBadge level={level} xp={user?.xp || 0} />
            <StreakCounter streak={user?.streak || 0} active={(user?.streak || 0) > 0} />
          </div>
        </div>
        <ProgressBar
          value={xpInLevel}
          max={nextLevelXP}
          label={`Level ${level} → ${level + 1}`}
          showValue
          colorClass="bg-white/60"
        />
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Games', value: stats.total_games || 0, icon: '🎮' },
            { label: 'Total XP', value: stats.total_xp || 0, icon: '⭐' },
            { label: 'Level', value: level, icon: '🏅' },
            { label: 'Streak', value: user?.streak || 0, icon: '🔥' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-1 text-xl font-black text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-xs font-medium text-gray-500 dark:text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Daily + Leaderboard */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <DailyChallengeCard />
        <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Leaderboard</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Lihat posisi kamu di antara pemain lain dan raih podium!
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="mt-6 inline-block w-full rounded-xl bg-amber-500 px-4 py-3 text-center font-bold text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            Lihat Ranking
          </Link>
        </div>
      </div>

      {/* Recent sessions */}
      {stats && stats.recent_sessions?.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Gamepad2 className="h-5 w-5" /> Riwayat Terbaru
          </h2>
          <div className="space-y-2">
            {stats.recent_sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-slate-700/50"
              >
                <span className="font-medium capitalize text-gray-900 dark:text-white">
                  {session.game_slug?.replace('-', ' ')}
                </span>
                <span className="text-gray-500">Skor: {session.score}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  +{session.xp_earned} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Semua Game</h2>
          <Link
            href="/games"
            className="text-sm font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Lihat semua →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    api
      .get('/user/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <h1 className="text-2xl font-bold">Halo, {user?.username}! 👋</h1>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white/20 p-3 text-center">
            <div className="text-2xl font-bold">{user?.level || 1}</div>
            <div className="text-xs opacity-80">Level</div>
          </div>
          <div className="rounded-lg bg-white/20 p-3 text-center">
            <div className="text-2xl font-bold">{user?.xp || 0}</div>
            <div className="text-xs opacity-80">Total XP</div>
          </div>
          <div className="rounded-lg bg-white/20 p-3 text-center">
            <div className="text-2xl font-bold">{user?.streak || 0}</div>
            <div className="text-xs opacity-80">🔥 Streak</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Daily Challenge</h2>
          <p className="mt-2 text-sm text-gray-500">
            Selesaikan tantangan hari ini untuk bonus 2x XP!
          </p>
          <Link
            href="/daily"
            className="mt-4 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Mulai Sekarang
          </Link>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Leaderboard</h2>
          <p className="mt-2 text-sm text-gray-500">Lihat posisi kamu di antara pemain lain!</p>
          <Link
            href="/leaderboard"
            className="mt-4 inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400"
          >
            Lihat Ranking
          </Link>
        </div>
      </div>

      {stats && stats.recent_sessions?.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Riwayat Terbaru</h2>
          <div className="space-y-2">
            {stats.recent_sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-md bg-gray-50 p-3 text-sm"
              >
                <span className="font-medium">{session.game_slug}</span>
                <span className="text-gray-500">Skor: {session.score}</span>
                <span className="font-semibold text-indigo-600">+{session.xp_earned} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Semua Game</h2>
          <Link href="/games" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Lihat semua →
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Klik tombol di atas atau navigasi ke Games untuk memilih game.
        </p>
      </div>
    </div>
  );
}
