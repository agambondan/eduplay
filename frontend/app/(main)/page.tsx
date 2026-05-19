'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { UserStats } from '@/types/user';

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
