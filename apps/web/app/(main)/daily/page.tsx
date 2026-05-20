'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { dailyApi } from '@/lib/api/daily';
import { DailyHistoryItem } from '@/lib/api/daily';
import { useState, useEffect } from 'react';
import { Timer } from '@/components/ui/Timer';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Loader2, Calendar, Trophy, CheckCircle2, XCircle, Flame } from 'lucide-react';
import MathQuiz from '@/components/games/MathQuiz';
import Wordle from '@/components/games/Wordle';
import { useAuthStore } from '@/lib/stores/authStore';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useLocale } from '@/lib/i18n';

export default function DailyChallengePage() {
  const { user } = useAuthStore();
  const { t } = useLocale();
  const [showHistory, setShowHistory] = useState(false);

  const {
    data: challenge,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: dailyApi.get,
  });

  const {
    data: history,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ['daily-history'],
    queryFn: dailyApi.history,
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-md py-20 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-indigo-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t('daily.title')}</h1>
          <p className="mb-6 text-gray-500 dark:text-slate-400">
            {t('daily.bonus')}
          </p>
          <Link
            href="/login"
            className="block w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
          >
            {t('auth.login')}
          </Link>
        </div>
      </div>
    );
  }

  if (challenge?.user_submitted) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="mb-8 text-center">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-8 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-900/20">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h1 className="mb-2 text-2xl font-bold text-emerald-900 dark:text-emerald-400">
              {t('daily.complete')}
            </h1>
            <p className="mb-6 text-emerald-700 dark:text-emerald-500">
              {t('daily.complete')}
            </p>
            <Link
              href="/games"
              className="block w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition-colors hover:bg-emerald-600"
            >
              {t('game.play')}
            </Link>
          </div>
        </div>

        {renderHistory()}
      </div>
    );
  }

  function renderHistory() {
    if (historyLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      );
    }

    const historyItems = history?.history ?? [];
    if (!history || historyItems.length === 0) return null;

    const today = new Date().toISOString().slice(0, 10);
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const completedDates = new Set(historyItems.map((h) => h.date));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Flame className="h-5 w-5 text-orange-500" /> {t('daily.history')}
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {showHistory ? t('common.back') : `${t('common.view_all')} (${history.total})`}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
              <Flame className="h-4 w-4" /> {history.streak} {t('streak.days')}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            {last7.map((date) => {
              const completed = completedDates.has(date);
              const isToday = date === today;
              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all',
                      completed
                        ? 'bg-emerald-500 text-white shadow-md'
                        : isToday
                          ? 'border-2 border-dashed border-gray-300 text-gray-400 dark:border-slate-600'
                          : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500'
                    )}
                  >
                    {completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">
                    {new Date(date).toLocaleDateString('id-ID', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {showHistory && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="space-y-2">
              {historyItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.game_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{item.date}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {item.score} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('daily.title')}</h1>
        <p className="mt-1 font-bold text-indigo-600 dark:text-indigo-400">{t('daily.bonus')}</p>
      </div>

      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {challenge?.game.slug === 'math-quiz' && <MathQuiz isDaily />}
        {challenge?.game.slug === 'wordle' && <Wordle isDaily />}
        {!['math-quiz', 'wordle'].includes(challenge?.game.slug || '') && (
          <div className="py-10 text-center">
            <p className="text-gray-500">
              {t('daily.title')}: <span className="font-bold">{challenge?.game.name}</span>
            </p>
            <Link
              href={`/games/${challenge?.game.slug}`}
              className="mt-4 inline-block font-bold text-indigo-600 underline"
            >
              {t('game.play')}
            </Link>
          </div>
        )}
      </div>

      {renderHistory()}
    </div>
  );
}
