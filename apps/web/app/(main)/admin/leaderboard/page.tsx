'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

export default function AdminLeaderboardPage() {
  const { t } = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (status) {
      const t = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const handleReset = async () => {
    setResetting(true);
    setStatus(null);
    try {
      await api.post('/admin/leaderboard/reset');
      setStatus({ type: 'success', message: t('admin.reset_success') });
      setConfirmOpen(false);
    } catch {
      setStatus({ type: 'error', message: t('admin.reset_error') });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t('admin.leaderboard_mgmt')}</h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-slate-400">
        Reset leaderboard akan menghapus semua data peringkat di Redis. Data highscore di database tetap aman dan akan direkonstruksi.
      </p>

      {status && (
        <div className={`mb-6 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
          status.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {status.message}
        </div>
      )}

      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/10">
        <h2 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">{t('admin.danger_zone')}</h2>
        <p className="mb-4 text-sm text-red-600 dark:text-red-300">
          {t('admin.danger_desc')}
        </p>
        <button
          onClick={() => setConfirmOpen(true)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {t('admin.reset_leaderboard')}
        </button>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{t('admin.reset_confirm_title')}</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
              {t('admin.reset_confirm_desc')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                disabled={resetting}
              >
                {t('admin.reset_cancel')}
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {resetting ? t('common.loading') : t('admin.reset_confirm_yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
