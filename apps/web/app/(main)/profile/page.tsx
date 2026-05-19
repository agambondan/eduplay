'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { UserStats } from '@/types/user';
import { Achievement } from '@/types/game';
import { XPBadge } from '@/components/ui/XPBadge';
import { StreakCounter } from '@/components/ui/StreakCounter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Trophy, Gamepad2 } from 'lucide-react';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    api
      .get('/user/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => {});
    api
      .get('/user/achievements')
      .then((res) => setAchievements(res.data.data || []))
      .catch(() => {});
  }, []);

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const nextLevelXP = level < 2 ? 100 : (level - 1) * 200 + (level - 1) * level;
  const currentLevelXP = level < 2 ? 0 : (level - 2) * 200 + (level - 2) * (level - 1);
  const progress = nextLevelXP > currentLevelXP ? xp - currentLevelXP : 0;
  const needed = nextLevelXP - currentLevelXP;

  if (!user) {
    return (
      <div className="container max-w-md py-20 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Profil Kamu</h1>
          <p className="mb-6 text-gray-500 dark:text-slate-400">
            Login untuk melihat progress, level, dan achievement kamu!
          </p>
          <Link
            href="/login"
            className="block w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Profil</h1>

      <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-inner">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">{user?.username}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">{user?.email}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <XPBadge level={level} xp={xp} />
            <StreakCounter streak={user?.streak || 0} active={(user?.streak || 0) > 0} />
          </div>
        </div>

        <ProgressBar
          value={progress}
          max={needed}
          label={`Level ${level} → ${level + 1}`}
          showValue
          colorClass="bg-indigo-600"
        />
      </div>

      {stats && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Gamepad2 className="h-5 w-5" /> Statistik
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-slate-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_games || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Total Games</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-slate-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_xp || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Total XP</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Trophy className="h-5 w-5" /> Achievements
        </h2>
        {achievements.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Belum ada achievement. Main game untuk membuka badge!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/20 dark:bg-amber-900/10"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 shadow-inner">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {ach.name}
                  </div>
                  <div className="truncate text-xs text-gray-500 dark:text-slate-400">
                    {ach.description}
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                  +{ach.xp_reward} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
