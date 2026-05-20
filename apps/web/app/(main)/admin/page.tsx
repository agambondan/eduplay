'use client';

import { useEffect, useState } from 'react';
import { Users, Gamepad2, BarChart3, Flag } from 'lucide-react';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/Skeleton';

interface DashboardStats {
  total_users: number;
  total_games: number;
  total_sessions: number;
  active_today: number;
  dau: { date: string; count: number }[];
  game_popularity: { game_name: string; slug: string; count: number }[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { t } = useLocale();

  useEffect(() => {
    let count = 0;
    const tick = () => {
      count++;
      if (count === 2) setLoading(false);
    };

    api
      .get('/user/me')
      .then((r) => {
        setUser(r.data.data);
        tick();
      })
      .catch(() => tick());
    api
      .get('/admin/dashboard')
      .then((r) => {
        setStats(r.data.data);
        tick();
      })
      .catch((e) => {
        setError(e.response?.data?.message || 'Failed to load');
        tick();
      });
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">{t('admin.access_denied')}</p>
          <p className="text-sm text-gray-500">{t('admin.access_required')}</p>
        </div>
      </div>
    );
  }

  const maxDau = stats?.dau ? Math.max(...stats.dau.map((d) => d.count), 1) : 1;
  const maxGame = stats?.game_popularity
    ? Math.max(...stats.game_popularity.map((g) => g.count), 1)
    : 1;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.title')}</h1>
        {loading ? (
          <Skeleton className="mt-1 h-4 w-40" />
        ) : user ? (
          <p className="text-sm text-gray-500">
            {user.username} ({user.role})
          </p>
        ) : null}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <Skeleton className="mb-2 h-5 w-5" />
                <Skeleton className="mb-1 h-7 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          : [
              { icon: Users, label: t('admin.users_total'), value: stats?.total_users ?? '-' },
              { icon: Gamepad2, label: t('admin.games_total'), value: stats?.total_games ?? '-' },
              { icon: BarChart3, label: t('admin.sessions_total'), value: stats?.total_sessions ?? '-' },
              { icon: Flag, label: t('admin.active_today'), value: stats?.active_today ?? '-' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <s.icon className="mb-2 h-5 w-5 text-gray-400 dark:text-slate-500" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{s.label}</div>
              </div>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {stats?.dau && stats.dau.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Daily Active Users (7 Hari)
            </h2>
            <div className="flex items-end gap-2">
              {stats.dau.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {d.count}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-indigo-500 transition-all"
                    style={{ height: `${Math.max((d.count / maxDau) * 120, 4)}px` }}
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">
                    {new Date(d.date).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.game_popularity && stats.game_popularity.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Game Terpopuler
            </h2>
            <div className="space-y-3">
              {stats.game_popularity.map((g) => (
                <div key={g.slug} className="flex items-center gap-3">
                  <span className="w-2/5 truncate text-sm font-medium text-gray-900 dark:text-white">
                    {g.game_name}
                  </span>
                  <div className="flex-1">
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(g.count / maxGame) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-sm font-bold text-gray-600 dark:text-slate-300">
                    {g.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
