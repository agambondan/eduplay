'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Home, LogIn, RotateCcw, Share2, Star, TrendingUp, Trophy } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';

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
    /** @deprecated pass nothing — ResultScreen reads isGuest from authStore automatically */
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
    const isGuestStore = useAuthStore((s) => s.isGuest);
    const isGuest = guestMode || isGuestStore;

    const [displayScore, setDisplayScore] = useState(0);
    const [displayXp, setDisplayXp] = useState(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const steps = 20;
        const interval = 800 / steps;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            setDisplayScore(Math.min(Math.floor((score / steps) * step), score));
            setDisplayXp(Math.min(Math.floor((xpEarned / steps) * step), xpEarned));
            if (step >= steps) clearInterval(timer);
        }, interval);
        return () => clearInterval(timer);
    }, [score, xpEarned]);

    const getShareContent = () => {
        const text =
            shareText || `Aku dapat ${score} poin di ${gameName}! Main yuk di EduPlay 🎮`;
        const url =
            typeof window !== 'undefined'
                ? `${window.location.origin}/games/${gameSlug}`
                : `https://eduplay.id/games/${gameSlug}`;
        return { text, url };
    };

    const handleNativeShare = () => {
        const { text, url } = getShareContent();
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

    const handleWhatsApp = () => {
        const { text, url } = getShareContent();
        const encoded = encodeURIComponent(`${text}\n${url}`);
        window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
    };

    const handleTwitter = () => {
        const { text, url } = getShareContent();
        const encoded = encodeURIComponent(text);
        const encodedUrl = encodeURIComponent(url);
        window.open(
            `https://twitter.com/intent/tweet?text=${encoded}&url=${encodedUrl}`,
            '_blank',
            'noopener,noreferrer',
        );
    };

    const handleCopyLink = () => {
        const { url } = getShareContent();
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <motion.div
            className='flex flex-col items-center gap-6 py-8 text-center'
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            {description && (
                <p aria-live='assertive' className='text-sm text-gray-500 dark:text-slate-400'>
                    {description}
                </p>
            )}

            {/* Score */}
            <motion.div
                aria-live='polite'
                className='flex flex-col items-center'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
            >
                <div className='mb-1 text-sm font-semibold uppercase tracking-widest text-gray-400'>
                    {t('game.score')}
                </div>
                <div className='font-mono text-6xl font-black text-gray-900 dark:text-white'>
                    {displayScore.toLocaleString('id-ID')}
                </div>
                {isNewHighscore && (
                    <motion.div
                        className='mt-2 flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                    >
                        <Star className='h-4 w-4 fill-amber-500 text-amber-500' />
                        {t('game.new_highscore')}
                        {previousHighscore ? ` (+${score - previousHighscore})` : ''}
                    </motion.div>
                )}
            </motion.div>

            {/* XP / Guest CTA */}
            <motion.div
                className='w-full'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
            >
                {isGuest ? (
                    <div className='flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800/30 dark:bg-amber-900/10'>
                        <div className='flex items-center gap-2'>
                            <LogIn className='h-5 w-5 text-amber-600 dark:text-amber-400' />
                            <span className='text-sm font-medium text-amber-700 dark:text-amber-300'>
                                {t('game.guest_prompt')}
                            </span>
                        </div>
                        <Link
                            href={`/register?from=${gameSlug}`}
                            className='flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700'
                        >
                            <LogIn className='h-4 w-4' />
                            {t('auth.register_free')}
                        </Link>
                    </div>
                ) : xpEarned > 0 ? (
                    <div className='flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-5 py-3 dark:bg-indigo-900/20'>
                        <TrendingUp className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
                        <span className='font-bold text-indigo-700 dark:text-indigo-300'>
                            +{displayXp} {t('profile.xp')}
                        </span>
                        {levelUp && newLevel && (
                            <span className='ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white'>
                                {t('profile.level')} {newLevel}!
                            </span>
                        )}
                    </div>
                ) : null}
            </motion.div>

            {/* Achievements */}
            {achievementsUnlocked.length > 0 && (
                <motion.div
                    className='w-full space-y-2'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                >
                    <div className='text-xs font-semibold uppercase tracking-widest text-gray-400'>
                        {t('achievement.unlocked')}
                    </div>
                    {achievementsUnlocked.map((ach) => (
                        <div
                            key={ach.name}
                            className='flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 dark:border-amber-900/20 dark:bg-amber-900/10'
                        >
                            <Trophy className='h-4 w-4 text-amber-500' />
                            <span className='flex-1 text-left text-sm font-bold text-gray-900 dark:text-white'>
                                {ach.name}
                            </span>
                            <span className='text-xs font-bold text-amber-600 dark:text-amber-400'>
                                +{ach.xp_reward} {t('profile.xp')}
                            </span>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Share row */}
            <motion.div
                className='w-full'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.3 }}
            >
                <div className='mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400'>
                    {t('game.share_result')}
                </div>
                <div className='flex justify-center gap-3'>
                    {/* WhatsApp */}
                    <button
                        onClick={handleWhatsApp}
                        aria-label='Bagikan ke WhatsApp'
                        className='flex h-11 w-11 items-center justify-center rounded-xl bg-green-500 text-white shadow-sm transition-colors hover:bg-green-600'
                    >
                        <svg
                            viewBox='0 0 24 24'
                            className='h-5 w-5 fill-current'
                            aria-hidden='true'
                        >
                            <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z' />
                            <path d='M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.849L0 24l6.335-1.508A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.787 9.787 0 0 1-5.034-1.388l-.36-.214-3.762.896.953-3.665-.237-.376A9.794 9.794 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z' />
                        </svg>
                    </button>

                    {/* Twitter / X */}
                    <button
                        onClick={handleTwitter}
                        aria-label='Bagikan ke Twitter/X'
                        className='flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white shadow-sm transition-colors hover:bg-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600'
                    >
                        <svg
                            viewBox='0 0 24 24'
                            className='h-4 w-4 fill-current'
                            aria-hidden='true'
                        >
                            <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.261 5.636 5.903-5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                        </svg>
                    </button>

                    {/* Native share / copy */}
                    <button
                        onClick={handleNativeShare}
                        aria-label='Bagikan atau salin'
                        className='flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    >
                        <Share2 className='h-4 w-4' />
                    </button>

                    {/* Copy link */}
                    <button
                        onClick={handleCopyLink}
                        aria-label='Salin tautan'
                        aria-live='polite'
                        className='flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    >
                        <Copy className='h-4 w-4' />
                    </button>
                </div>
                {copied && (
                    <p className='mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400'>
                        Tautan disalin!
                    </p>
                )}
            </motion.div>

            {/* Actions */}
            <motion.div
                className='flex w-full gap-3'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
            >
                {onReplay && (
                    <motion.button
                        onClick={onReplay}
                        className='flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition-colors hover:bg-indigo-700'
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <RotateCcw className='h-4 w-4' />
                        {t('game.replay')}
                    </motion.button>
                )}
                <Link
                    href='/games'
                    className='flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700'
                >
                    <Home className='h-4 w-4' />
                    {t('game.all_games')}
                </Link>
            </motion.div>
        </motion.div>
    );
}
