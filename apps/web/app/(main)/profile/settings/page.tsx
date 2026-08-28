'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Check, Globe, Loader2, Monitor, Moon, Shield, Sun, Trash2, Zap } from 'lucide-react';
import api from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { useThemeStore } from '@/lib/stores/themeStore';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useThemeStore();
  const { t, locale, setLocale } = useLocale();

  const [username, setUsername] = useState(user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [weeklyEmail, setWeeklyEmail] = useState(user?.weekly_email_opt_in || false);
  const [emailLoading, setEmailLoading] = useState(false);

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

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-700">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Email Mingguan</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Rekap mingguan: game, XP, streak & achievement
            </div>
          </div>
          <button
            onClick={async () => {
              setEmailLoading(true);
              try {
                const newVal = !weeklyEmail;
                await api.patch('/user/me', { weekly_email_opt_in: newVal });
                setWeeklyEmail(newVal);
              } catch {}
              setEmailLoading(false);
            }}
            disabled={emailLoading}
            className={`relative h-6 w-11 rounded-full transition-colors ${weeklyEmail ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'}`}
            role="switch"
            aria-checked={weeklyEmail}
          >
            {emailLoading ? (
              <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-gray-500" />
            ) : (
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${weeklyEmail ? 'left-5' : 'left-0.5'}`}
              />
            )}
          </button>
        </div>
      </section>

      {/* Subscription */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Zap className="h-5 w-5 text-amber-500" /> Premium
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Nikmati EduPlay tanpa iklan! Dukung pengembangan platform.
        </p>
        <SubscribeSection />
      </section>

      {/* Language */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Globe className="h-5 w-5" /> {t('settings.language')}
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
          {t('settings.language_desc')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setLocale('id')}
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-center font-bold transition-all ${locale === 'id' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400'}`}
          >
            🇮🇩 Indonesia
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-center font-bold transition-all ${locale === 'en' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400'}`}
          >
            🇬🇧 English
          </button>
        </div>
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

function SubscribeSection() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    plan?: string;
    status?: string;
    expires_at?: string;
  } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    import('@/lib/api/multiplayer').then(({ subscribeApi }) => {
      subscribeApi
        .status()
        .then((s) => setStatus(s))
        .catch(() => {})
        .finally(() => setChecking(false));
    });
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { subscribeApi } = await import('@/lib/api/multiplayer');
      const result = await subscribeApi.create();
      if (result.redirect_url) {
        window.open(result.redirect_url, '_blank');
      }
    } catch {}
    setLoading(false);
  };

  if (checking)
    return (
      <div className="mt-3 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );

  if (status?.status === 'active') {
    return (
      <div className="mt-3 rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-950">
        <p className="font-bold text-emerald-700 dark:text-emerald-300">Premium Aktif</p>
        {status.expires_at && (
          <p className="mt-1 text-xs text-gray-500">
            Berlaku hingga: {new Date(status.expires_at).toLocaleDateString('id-ID')}
          </p>
        )}
        <Check className="mx-auto mt-2 h-6 w-6 text-emerald-500" />
      </div>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
      Langganan Premium — Bebas Iklan
    </button>
  );
}
