'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { Settings, Users, Gamepad2, BarChart3, Flag } from 'lucide-react';

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

  useEffect(() => {
    api.get('/user/me').then((r) => setUser(r.data.data)).catch(() => {});
    api.get('/admin/dashboard')
      .then((r) => setStats(r.data.data))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">Access Denied</p>
          <p className="text-sm text-gray-500">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        {user && <p className="text-sm text-gray-500">{user.username} ({user.role})</p>}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={<Users />} label="Total Users" value={stats?.total_users ?? '-'} />
        <StatCard icon={<Gamepad2 />} label="Total Games" value={stats?.total_games ?? '-'} />
        <StatCard icon={<BarChart3 />} label="Game Sessions" value={stats?.total_sessions ?? '-'} />
        <StatCard icon={<Flag />} label="Active Today" value={stats?.active_today ?? '-'} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AdminSection title="User Management" href="/admin/users" icon={<Users />} />
        <AdminSection title="Game Management" href="/admin/games" icon={<Gamepad2 />} />
        <AdminSection title="Feature Flags" href="/admin/features" icon={<Settings />} />
        <AdminSection title="Leaderboard" href="/admin/leaderboard" icon={<BarChart3 />} />
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
  return (
    <a
      href={href}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="text-indigo-500">{icon}</div>
      <div>
        <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
        <div className="text-sm text-gray-500 dark:text-slate-400">Manage {title.toLowerCase()}</div>
      </div>
    </a>
  );
}
