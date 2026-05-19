'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { dailyApi } from '@/lib/api/daily';
import { useState, useEffect } from 'react';
import { Timer } from '@/components/ui/Timer';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Loader2, Calendar, Trophy } from 'lucide-react';
import MathQuiz from '@/components/games/MathQuiz';
import Wordle from '@/components/games/Wordle';
import { useAuthStore } from '@/lib/stores/authStore';
import Link from 'next/link';

export default function DailyChallengePage() {
  const { user } = useAuthStore();
  const {
    data: challenge,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: dailyApi.get,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-gray-500">Memuat tantangan harian...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-md py-20 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-indigo-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Daily Challenge</h1>
          <p className="mb-6 text-gray-500 dark:text-slate-400">
            Login untuk mengikuti tantangan harian dan dapatkan 2x XP!
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

  if (challenge?.user_submitted) {
    return (
      <div className="container max-w-md py-20 text-center">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-8 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-900/20">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="mb-2 text-2xl font-bold text-emerald-900 dark:text-emerald-400">
            Selesai!
          </h1>
          <p className="mb-6 text-emerald-700 dark:text-emerald-500">
            Kamu sudah menyelesaikan tantangan harian hari ini. Kembali lagi besok ya!
          </p>
          <Link
            href="/games"
            className="block w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition-colors hover:bg-emerald-600"
          >
            Main Game Lain
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Daily Challenge</h1>
        <p className="mt-1 font-bold text-indigo-600 dark:text-indigo-400">Reward: 2x XP</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {challenge?.game.slug === 'math-quiz' && <MathQuiz isDaily />}
        {challenge?.game.slug === 'wordle' && <Wordle isDaily />}
        {/* Fallback to math quiz if logic not specific */}
        {!['math-quiz', 'wordle'].includes(challenge?.game.slug || '') && (
          <div className="py-10 text-center">
            <p className="text-gray-500">
              Tantangan harian hari ini: <span className="font-bold">{challenge?.game.name}</span>
            </p>
            <Link
              href={`/games/${challenge?.game.slug}`}
              className="mt-4 inline-block font-bold text-indigo-600 underline"
            >
              Main Sekarang
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
