'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import { userApi } from '@/lib/api/user';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';
import { Stats } from '@/types/user';
import { Achievement } from '@/types/game';
import { XPBadge } from '@/components/ui/XPBadge';
import { StreakCounter } from '@/components/ui/StreakCounter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Trophy, Gamepad2, TrendingUp, ShieldCheck, Crown, Loader2, Upload } from 'lucide-react';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [subscription, setSubscription] = useState<{ id: string; plan: string; status: string; started_at: string; expires_at: string } | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    api
      .get('/user/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => {});
    api
      .get('/user/achievements')
      .then((res) => setAchievements(res.data.data || []))
      .catch(() => {});
    api
      .get('/subscribe/status')
      .then((res) => setSubscription(res.data.data))
      .catch(() => {});
  }, []);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await api.post('/subscribe/');
      setSubscription(res.data.data);
    } catch {
      // ignore
    } finally {
      setSubscribing(false);
    }
  };

  const setUser = useAuthStore((state) => state.setUser);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAvatarUrl = user?.avatar_color && (user.avatar_color.startsWith('http') || user.avatar_color.startsWith('/uploads'));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!avatarFile) return;
    setUploading(true);
    try {
      const url = await userApi.uploadAvatar(avatarFile);
      setUser({ ...user!, avatar_color: url });
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const nextLevelXP = (200 * level * (level + 1)) / 2;
  const currentLevelXP = level > 1 ? (200 * (level - 1) * level) / 2 : 0;
  const progress = xp - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;

  if (!user) {
    return (
      <div className="container max-w-md py-20 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Profil Kamu</h1>
          <p className="mb-6 text-gray-500 dark:text-slate-400">
            Login untuk melihat progress, level, dan achievement kamu!
          </p>
          <Link
            href="/login"
            className="block w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Profil</h1>

      <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-4">
          {isAvatarUrl ? (
            <img src={user.avatar_color} alt="avatar" className="h-16 w-16 rounded-full object-cover shadow-inner" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-inner">
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">{user?.username}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">{user?.email}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <XPBadge level={level} xp={xp} />
            <StreakCounter streak={user?.streak || 0} active={(user?.streak || 0) > 0} />
          </div>
        </div>

        <ProgressBar
          value={progress}
          max={needed}
          label={`Level ${level} → ${level + 1}`}
          showValue
          colorClass="bg-indigo-600"
        />

        <div className="border-t border-gray-100 pt-4 dark:border-slate-700">
          <h3 className="mb-3 text-sm font-bold text-gray-700 dark:text-slate-300">Ganti Foto Profil</h3>
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <img src={avatarPreview} alt="preview" className="h-14 w-14 rounded-full object-cover shadow-inner" />
            ) : isAvatarUrl ? (
              <img src={user.avatar_color} alt="avatar" className="h-14 w-14 rounded-full object-cover shadow-inner" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-inner">
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Pilih File
            </button>
            <button
              onClick={handleUpload}
              disabled={!avatarFile || uploading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? 'Mengupload...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Gamepad2 className="h-5 w-5" /> Statistik
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-slate-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_games || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Total Games</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-slate-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_xp || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Total XP</div>
            </div>
          </div>
        </div>
      )}

      {/* Progress History Graph */}
      {stats && stats.history && stats.history.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-indigo-500" /> Progress XP 7 Hari Terakhir
          </h2>
          <div className="flex h-40 items-end justify-between gap-3 px-2 pt-6">
            {stats.history.map((pt, i) => {
              const maxXP = Math.max(...stats.history.map((p) => p.xp), 1);
              const heightPct = (pt.xp / maxXP) * 80; // max 80% height
              return (
                <div key={i} className="group flex flex-1 flex-col items-center">
                  <div className="mb-1 font-mono text-[10px] font-black text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                    +{pt.xp}
                  </div>
                  <div
                    className="min-h-[4px] w-full rounded-t-lg bg-indigo-100 transition-all duration-500 ease-out group-hover:bg-indigo-500 dark:bg-slate-700 dark:group-hover:bg-indigo-400"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="mt-2 rotate-12 text-[9px] font-bold text-gray-400 sm:rotate-0">
                    {pt.date.split('-').slice(1).join('/')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Trophy className="h-5 w-5" /> Achievements
        </h2>
        {achievements.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Belum ada achievement. Main game untuk membuka badge!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/20 dark:bg-amber-900/10"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 shadow-inner">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {ach.name}
                  </div>
                  <div className="truncate text-xs text-gray-500 dark:text-slate-400">
                    {ach.description}
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                  +{ach.xp_reward} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <ShieldCheck className="h-5 w-5" /> Subscription
        </h2>
        {subscription ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/10">
              <Crown className="h-8 w-8 text-indigo-600" />
              <div>
                <div className="font-bold text-gray-900 dark:text-white capitalize">{subscription.plan}</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  {subscription.status === 'active' ? (
                    <span className="text-emerald-600 font-bold">Aktif</span>
                  ) : (
                    <span className="text-gray-400">{subscription.status}</span>
                  )}
                  {' — '}Bebas Iklan
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Langganan dimulai {new Date(subscription.started_at).toLocaleDateString('id-ID')}
              {subscription.expires_at && `, berakhir ${new Date(subscription.expires_at).toLocaleDateString('id-ID')}`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Langganan premium untuk nikmati game tanpa iklan dan fitur eksklusif lainnya!
            </p>
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-bold text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60"
            >
              {subscribing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Crown className="h-5 w-5" />
              )}
              {subscribing ? 'Memproses...' : 'Langganan Premium — Rp 0 (Masa Trial)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
