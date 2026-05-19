"use client";

import { useAuthStore } from "@/lib/stores/authStore";
import { useEffect, useState } from "react";
import api from "@/lib/api/client";
import { UserStats } from "@/types/user";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    api.get("/user/stats").then((res) => setStats(res.data.data)).catch(() => {});
  }, []);

  const xpForNextLevel = (level: number) => {
    if (level < 1) return 100;
    return (level - 1) * 200 + (level - 1) * level;
  };

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const nextLevelXP = xpForNextLevel(level + 1);
  const progress = nextLevelXP > 0 ? Math.min(100, (xp / nextLevelXP) * 100) : 100;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profil</h1>

      <div className="rounded-lg bg-white p-6 shadow space-y-4">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{user?.username}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">{level}</div>
            <div className="text-xs text-gray-500">Level</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <div className="text-2xl font-bold text-indigo-600">{xp}</div>
            <div className="text-xs text-gray-500">Total XP</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{user?.streak || 0}</div>
            <div className="text-xs text-gray-500">🔥 Streak</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>XP Progress</span>
            <span>{xp} / {nextLevelXP}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {stats && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistik</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total_games || 0}</div>
              <div className="text-sm text-gray-500">Total Games</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total_xp || 0}</div>
              <div className="text-sm text-gray-500">Total XP</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
