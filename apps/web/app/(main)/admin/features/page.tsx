'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';

const DEFAULT_FLAGS = [
  { key: 'ENABLE_DARK_MODE', label: 'Dark Mode', description: 'Toggle dark mode untuk semua user' },
  { key: 'ENABLE_SOUNDS', label: 'Sound Effects', description: 'Toggle sound effects' },
  { key: 'ENABLE_AI_QUESTIONS', label: 'AI Questions', description: 'Jika nonaktif, gunakan fallback questions' },
  { key: 'ENABLE_PUSH_NOTIFICATIONS', label: 'Push Notifications', description: 'Toggle push notification system' },
  { key: 'ENABLE_DAILY_CHALLENGE', label: 'Daily Challenge', description: 'Toggle daily challenge section' },
  { key: 'ENABLE_ACHIEVEMENTS', label: 'Achievements', description: 'Toggle achievement system' },
  { key: 'MAINTENANCE_MODE', label: 'Maintenance Mode', description: 'Tampilkan halaman maintenance' },
  { key: 'SHOW_BANNER_ADS', label: 'Banner Ads', description: 'Toggle banner ads' },
  { key: 'SHOW_INTERSTITIAL_ADS', label: 'Interstitial Ads', description: 'Toggle interstitial ads' },
];

export default function AdminFeaturesPage() {
  const { t } = useLocale();
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchFlags = () => {
    setLoading(true);
    api.get('/admin/feature-flags')
      .then((r) => setFlags(r.data.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFlags(); }, []);

  const toggleFlag = async (key: string, current: string) => {
    const newValue = current === 'enabled' ? 'disabled' : 'enabled';
    await api.post(`/admin/feature-flags/${key}`, { value: newValue });
    setFlags((prev) => ({ ...prev, [key]: newValue }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.feature_flags')}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Toggle fitur on/off tanpa redeploy</p>
        </div>
        <button onClick={fetchFlags} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {t('admin.refresh')}
        </button>
      </div>

      <div className="space-y-3">
        {DEFAULT_FLAGS.map(({ key, label, description }) => {
          const value = flags[key];
          const isEnabled = value === 'enabled';

          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                    {key}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{description}</p>
                {value && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{t('admin.flag_current')}: <span className="font-mono">{value}</span></p>
                )}
              </div>
              <button
                onClick={() => toggleFlag(key, value || 'disabled')}
                className={`relative ml-4 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}

        {!loading && Object.keys(flags).length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">
            Belum ada feature flags yang di-set. Klik toggle untuk membuat flag baru.
          </p>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-900/10">
        <h3 className="mb-1 text-sm font-semibold text-indigo-700 dark:text-indigo-400">Info</h3>
        <p className="text-xs text-indigo-600 dark:text-indigo-300">
          {t('admin.flag_info')}
        </p>
      </div>
    </div>
  );
}
