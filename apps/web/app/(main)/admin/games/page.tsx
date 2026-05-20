'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';

interface AdminGame {
  id: string;
  slug: string;
  name: string;
  category: string;
  is_active: boolean;
  total_plays: number;
  created_at: string;
}

export default function AdminGamesPage() {
  const { t } = useLocale();
  const [games, setGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = () => {
    setLoading(true);
    api
      .get('/admin/games')
      .then((r) => setGames(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const toggleGame = async (id: string) => {
    await api.post(`/admin/games/${id}/toggle`);
    setGames((prev) => prev.map((g) => (g.id === id ? { ...g, is_active: !g.is_active } : g)));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('admin.game_mgmt')} ({games.length})
        </h1>
        <button
          onClick={fetchGames}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {t('admin.refresh')}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              {['Name', 'Slug', t('game.category'), 'Total Plays', 'Status', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
            {games.map((g) => (
              <tr key={g.id} className="text-sm text-gray-700 dark:text-slate-300">
                <td className="px-4 py-3 font-medium">{g.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{g.slug}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                    {t('category.' + g.category)}
                  </span>
                </td>
                <td className="px-4 py-3">{g.total_plays}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${g.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {g.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleGame(g.id)}
                    className={`rounded px-3 py-1 text-xs font-medium ${g.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {g.is_active ? t('admin.deactivate') : t('admin.activate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
