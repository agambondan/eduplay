'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { UserStats } from '@/types/user';
import { DailyChallengeCard } from '@/components/ui/DailyChallengeCard';
import { XPBadge } from '@/components/ui/XPBadge';
import { StreakCounter } from '@/components/ui/StreakCounter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { GameCard } from '@/components/ui/GameCard';
import { xpUtils } from '@/lib/utils/xp';
import { useLocale } from '@/lib/i18n';
import { gamesApi } from '@/lib/api/games';
import {
  Trophy,
  Gamepad2,
  Calculator,
  BookOpen,
  Globe,
  Layers,
  FlaskConical,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

interface CategoryChip {
  id: string;
  icon: LucideIcon;
  gradient: string;
  count: number;
}

const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; gradient: string }> = {
  math: { icon: Calculator, gradient: 'from-blue-500 to-blue-600' },
  language: { icon: BookOpen, gradient: 'from-emerald-500 to-emerald-600' },
  geography: { icon: Globe, gradient: 'from-amber-500 to-orange-500' },
  logic: { icon: Layers, gradient: 'from-purple-500 to-purple-600' },
  science: { icon: FlaskConical, gradient: 'from-cyan-500 to-teal-500' },
  history: { icon: Clock, gradient: 'from-rose-500 to-rose-600' },
};

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<UserStats | null>(null);
  const { t } = useLocale();

  const { data: games } = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.list,
    staleTime: 60_000,
  });

  useEffect(() => {
    api
      .get('/user/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => {});
  }, []);

  const { level, xpInLevel, nextLevelXP } = xpUtils.getLevelProgress(user?.xp || 0);

  const categoryChips: CategoryChip[] = useMemo(() => {
    if (!games) return [];
    const counts: Record<string, number> = {};
    games.forEach((g) => {
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
    return Object.entries(CATEGORY_CONFIG)
      .map(([id, config]) => ({ id, icon: config.icon, gradient: config.gradient, count: counts[id] || 0 }))
      .filter((c) => c.count > 0);
  }, [games]);

  const avatarInitial = (user?.username || 'P')[0].toUpperCase();
  const avatarColor = user?.avatar_color || '#6366f1';

  return (
    <div className="space-y-8">
      <OnboardingFlow />

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="absolute right-20 top-12 h-16 w-16 rounded-full bg-white/[0.03]" />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black shadow-lg ring-2 ring-white/30"
              style={{ backgroundColor: avatarColor }}
            >
              {avatarInitial}
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-200">{getTimeGreeting()} 👋</p>
              <h1 className="text-2xl font-bold">{user?.username || 'Pelajar'}</h1>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                {t('app.tagline')}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <XPBadge level={level} xp={user?.xp || 0} />
            <StreakCounter streak={user?.streak || 0} active={(user?.streak || 0) > 0} />
          </div>
        </div>

        <div className="relative mt-6">
          <ProgressBar
            value={xpInLevel}
            max={nextLevelXP}
            label={`Level ${level} → ${level + 1}`}
            showValue
            colorClass="bg-white/60"
          />
        </div>
      </div>

      {categoryChips.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            {t('game.category')}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {categoryChips.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.id}
                  href={`/games?cat=${cat.id}`}
                  className="flex flex-shrink-0 items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-4 py-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${cat.gradient}`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                    {t(`category.${cat.id}`)}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                    {cat.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: t('profile.games_played'), value: stats.total_games || 0, icon: '🎮' },
            { label: t('profile.total_xp'), value: stats.total_xp || 0, icon: '⭐' },
            { label: t('profile.level'), value: level, icon: '🏅' },
            { label: t('profile.streak'), value: user?.streak || 0, icon: '🔥' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-1 text-xl font-black text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-xs font-medium text-gray-500 dark:text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <DailyChallengeCard />
        <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('leaderboard.title')}</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Lihat posisi kamu di antara pemain lain dan raih podium!
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="mt-6 inline-block w-full rounded-xl bg-amber-500 px-4 py-3 text-center font-bold text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            Lihat Ranking
          </Link>
        </div>
      </div>

      {stats && stats.highscores?.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Trophy className="h-5 w-5 text-amber-500" /> {t('game.highscore')}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {stats.highscores.slice(0, 8).map((hs) => (
              <Link
                key={hs.game_id}
                href={`/games/${hs.game_slug}`}
                className="rounded-xl bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100 dark:bg-slate-700/50 dark:hover:bg-slate-700"
              >
                <div className="text-sm font-bold capitalize text-gray-900 dark:text-white">
                  {hs.game_name || hs.game_slug.replace('-', ' ')}
                </div>
                <div className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {t('game.score')}: {hs.highscore}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {stats && stats.recent_sessions?.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Gamepad2 className="h-5 w-5" /> {t('game.recent_sessions')}
          </h2>
          <div className="space-y-2">
            {stats.recent_sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-slate-700/50"
              >
                <span className="font-medium capitalize text-gray-900 dark:text-white">
                  {session.game_slug?.replace('-', ' ')}
                </span>
                <span className="text-gray-500">{t('game.score')}: {session.score}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  +{session.xp_earned} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {games && games.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('game.all_games')}</h2>
            <Link
              href="/games"
              className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {t('common.view_all')} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {games.slice(0, 6).map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
