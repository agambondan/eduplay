'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const { t } = useLocale();

  useEffect(() => {
    api.get(`/admin/users?page=${page}&limit=20`).then((r) => {
      setUsers(r.data.data.users);
      setTotal(r.data.data.total);
    }).catch(() => {});
  }, [page]);

  const toggleBan = async (id: string, isActive: boolean) => {
    const action = isActive ? 'ban' : 'unban';
    await api.post(`/admin/users/${id}/${action}`);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: !isActive } : u));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">{t('admin.users')} ({total})</h1>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              {['Username', t('auth.email'), t('profile.level'), t('profile.xp'), t('profile.streak'), 'Role', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
            {users.map((u) => (
              <tr key={u.id} className="text-sm text-gray-700 dark:text-slate-300">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.level}</td>
                <td className="px-4 py-3">{u.xp}</td>
                <td className="px-4 py-3">{u.streak}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Banned'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleBan(u.id, u.is_active)}
                    className={`rounded px-2 py-1 text-xs font-medium ${u.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {u.is_active ? 'Ban' : 'Unban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded bg-gray-200 px-3 py-1 text-sm disabled:opacity-50">Prev</button>
        <span className="px-3 py-1 text-sm">{page}</span>
        <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="rounded bg-gray-200 px-3 py-1 text-sm disabled:opacity-50">{t('common.next')}</button>
      </div>
    </div>
  );
}
