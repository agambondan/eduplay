'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { Settings, Users, Gamepad2, BarChart3, Flag } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/Skeleton';

interface DashboardStats {
  total_users: number;
  total_games: number;
  total_sessions: number;
  active_today: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { t } = useLocale();

  useEffect(() => {
    let count = 0;
    const tick = () => { count++; if (count === 2) setLoading(false); };

    api.get('/user/me').then((r) => { setUser(r.data.data); tick(); }).catch(() => tick());
    api.get('/admin/dashboard')
      .then((r) => { setStats(r.data.data); tick(); })
      .catch((e) => { setError(e.response?.data?.message || 'Failed to load'); tick(); });
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">{t('admin.access_denied')}</p>
          <p className="text-sm text-gray-500">{t('admin.access_required')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.title')}</h1>
        {loading ? (
          <Skeleton className="mt-1 h-4 w-40" />
        ) : user ? (
          <p className="text-sm text-gray-500">{user.username} ({user.role})</p>
        ) : null}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <Skeleton className="mb-2 h-5 w-5" />
                <Skeleton className="mb-1 h-7 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard icon={<Users />} label={t('admin.users_total')} value={stats?.total_users ?? '-'} />
            <StatCard icon={<Gamepad2 />} label={t('admin.games_total')} value={stats?.total_games ?? '-'} />
            <StatCard icon={<BarChart3 />} label={t('admin.sessions_total')} value={stats?.total_sessions ?? '-'} />
            <StatCard icon={<Flag />} label={t('admin.active_today')} value={stats?.active_today ?? '-'} />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AdminSection title={t('admin.users')} href="/admin/users" icon={<Users />} />
        <AdminSection title={t('admin.game_mgmt')} href="/admin/games" icon={<Gamepad2 />} />
        <AdminSection title={t('admin.feature_flags')} href="/admin/features" icon={<Settings />} />
        <AdminSection title={t('admin.leaderboard_mgmt')} href="/admin/leaderboard" icon={<BarChart3 />} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 text-gray-400 dark:text-slate-500">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function AdminSection({ title, href, icon }: { title: string; href: string; icon: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <a
      href={href}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="text-indigo-500">{icon}</div>
      <div>
        <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
        <div className="text-sm text-gray-500 dark:text-slate-400">{t('admin.manage')}</div>
      </div>
    </a>
  );
}
