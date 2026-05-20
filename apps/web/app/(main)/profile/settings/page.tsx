'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bell, Check, Globe, Loader2, Monitor, Moon, Shield, Sun, Trash2 } from 'lucide-react';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { useThemeStore } from '@/lib/stores/themeStore';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useThemeStore();
  const { t } = useLocale();

  const [username, setUsername] = useState(user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  const saveProfile = async () => {
    if (!username.trim() || username === user?.username) return;
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await api.patch('/user/profile', { username });
      setProfileMsg('Profil berhasil diperbarui!');
    } catch {
      setProfileMsg('Gagal menyimpan. Coba lagi.');
    } finally {
      setSavingProfile(false);
    }
  };

  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (!pushEnabled) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await api.post('/push/subscribe', sub.toJSON());
        setPushEnabled(true);
      } else {
        await api.post('/push/unsubscribe');
        setPushEnabled(false);
      }
    } catch {
      // ignore
    } finally {
      setPushLoading(false);
    }
  };

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('settings.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('settings.dark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: t('settings.system'), icon: <Monitor className="h-4 w-4" /> },
  ];

  if (!user) {
    return (
      <div className="container max-w-md py-20 text-center">
        <p className="mb-4 text-gray-500">Login untuk mengakses pengaturan.</p>
        <Link
          href="/login"
          className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>

      {/* Profile */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Shield className="h-5 w-5" /> {t('profile.title')}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div className="flex items-center justify-between">
            {profileMsg && (
              <span
                className={`flex items-center gap-1 text-sm ${profileMsg.includes('berhasil') ? 'text-emerald-600' : 'text-red-500'}`}
              >
                {profileMsg.includes('berhasil') && <Check className="h-4 w-4" />}
                {profileMsg}
              </span>
            )}
            <button
              onClick={saveProfile}
              disabled={savingProfile || !username.trim() || username === user.username}
              className="ml-auto flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Moon className="h-5 w-5" /> {t('settings.theme')}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {themes.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all ${
                theme === value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Bell className="h-5 w-5" /> {t('settings.notifications')}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Push Notification</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Reminder Daily Challenge & streak
            </div>
          </div>
          <button
            onClick={togglePush}
            disabled={pushLoading}
            className={`relative h-6 w-11 rounded-full transition-colors ${pushEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'}`}
            role="switch"
            aria-checked={pushEnabled}
          >
            {pushLoading ? (
              <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-gray-500" />
            ) : (
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${pushEnabled ? 'left-5' : 'left-0.5'}`}
              />
            )}
          </button>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Globe className="h-5 w-5" /> {t('settings.language')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">{t('settings.language_desc')}</p>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm dark:border-red-900/20 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400">
          <Trash2 className="h-5 w-5" /> Zona Bahaya
        </h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Hapus akun secara permanen. Semua data, skor, dan achievement akan hilang dan tidak bisa
            dipulihkan.
          </p>
          <input
            type="text"
            placeholder='Ketik "HAPUS" untuk konfirmasi'
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
          <button
            disabled={confirmDelete !== 'HAPUS' || deletingAccount}
            onClick={async () => {
              setDeletingAccount(true);
              try {
                await api.delete('/user/me');
                logout();
              } catch {
                setDeletingAccount(false);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {deletingAccount ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Hapus Akun Permanen
          </button>
        </div>
      </section>
    </div>
  );
}
