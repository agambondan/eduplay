'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, LogIn, RotateCcw, Share2, Star, TrendingUp, Trophy } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

interface Achievement {
  name: string;
  xp_reward: number;
}

interface ResultScreenProps {
  score: number;
  xpEarned: number;
  isNewHighscore?: boolean;
  previousHighscore?: number;
  levelUp?: boolean;
  newLevel?: number;
  achievementsUnlocked?: Achievement[];
  gameSlug: string;
  gameName: string;
  onReplay?: () => void;
  shareText?: string;
  description?: string;
  guestMode?: boolean;
}

export function ResultScreen({
  score,
  xpEarned,
  isNewHighscore,
  previousHighscore,
  levelUp,
  newLevel,
  achievementsUnlocked = [],
  gameSlug,
  gameName,
  onReplay,
  shareText,
  description,
  guestMode,
}: ResultScreenProps) {
  const { t } = useLocale();
  const [displayScore, setDisplayScore] = useState(0);
  const [displayXp, setDisplayXp] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setDisplayScore(Math.min(Math.floor((score / steps) * step), score));
      setDisplayXp(Math.min(Math.floor((xpEarned / steps) * step), xpEarned));
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [score, xpEarned]);

  const handleShare = () => {
    const text = shareText || `Aku dapat ${score} poin di ${gameName}! Main yuk di EduPlay 🎮`;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({ title: 'EduPlay', text, url }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(`${text} ${url}`)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-6 py-8 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {description && (
        <p aria-live="assertive" className="text-sm text-gray-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {/* Score */}
      <motion.div
        aria-live="polite"
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="mb-1 text-sm font-semibold uppercase tracking-widest text-gray-400">
          {t('game.score')}
        </div>
        <div className="font-mono text-6xl font-black text-gray-900 dark:text-white">
          {displayScore.toLocaleString('id-ID')}
        </div>
        {isNewHighscore && (
          <motion.div
            className="mt-2 flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          >
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            {t('game.new_highscore')}
            {previousHighscore ? ` (+${score - previousHighscore})` : ''}
          </motion.div>
        )}
      </motion.div>

      {/* XP Earned / Guest mode */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {guestMode ? (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-5 py-3 dark:bg-amber-900/10">
            <LogIn className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {t('game.guest_prompt')}
            </span>
          </div>
        ) : xpEarned > 0 ? (
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-5 py-3 dark:bg-indigo-900/20">
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-indigo-700 dark:text-indigo-300">
              +{displayXp} {t('profile.xp')}
            </span>
            {levelUp && newLevel && (
              <span className="ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                {t('profile.level')} {newLevel}!
              </span>
            )}
          </div>
        ) : null}
      </motion.div>

      {/* Achievements */}
      {achievementsUnlocked.length > 0 && (
        <motion.div
          className="w-full space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t('achievement.unlocked')}
          </div>
          {achievementsUnlocked.map((ach) => (
            <div
              key={ach.name}
              className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 dark:border-amber-900/20 dark:bg-amber-900/10"
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="flex-1 text-left text-sm font-bold text-gray-900 dark:text-white">
                {ach.name}
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                +{ach.xp_reward} {t('profile.xp')}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="flex w-full flex-col gap-3 pt-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        {onReplay && (
          <motion.button
            onClick={onReplay}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw className="h-4 w-4" />
            {t('game.replay')}
          </motion.button>
        )}
        <div className="flex gap-3">
          <Link
            href="/games"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
          >
            <Home className="h-4 w-4" />
            {t('game.all_games')}
          </Link>
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
            aria-live="polite"
          >
            <Share2 className="h-4 w-4" />
            {copied ? 'Disalin!' : t('game.share')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
