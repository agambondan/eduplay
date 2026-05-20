'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { cn } from '@/lib/utils/cn';

const EMOJIS = ['🦁', '🐯', '🐻', '🦊', '🐸', '🦋', '🌸', '⭐', '🎯', '🎲', '🚀', '🌈'];

interface Card {
    id: number;
    emoji: string;
    flipped: boolean;
    matched: boolean;
}

function buildDeck(size: number): Card[] {
    const pool = EMOJIS.slice(0, size / 2);
    const pairs = [...pool, ...pool];
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

interface Props {
    isDaily?: boolean;
}

export default function MemoryMatch({ isDaily }: Props) {
    const { t } = useLocale();
    const game = useGame('memory-match', 'Memory Match', 'logic');

    const [cards, setCards] = useState<Card[]>([]);
    const [flipped, setFlipped] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lockRef = useRef(false);

    const gridSize = game.difficulty === 'easy' ? 12 : game.difficulty === 'medium' ? 16 : 20;

    const startRound = useCallback(() => {
        setCards(buildDeck(gridSize));
        setFlipped([]);
        setMoves(0);
        setGameOver(false);
        setResult(null);
        setElapsed(0);
        lockRef.current = false;
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }, [gridSize]);

    useEffect(() => {
        if (game.isPlaying) {
            startRound();
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [game.isPlaying]);

    const handleFlip = useCallback(
        async (id: number) => {
            if (lockRef.current || !game.isPlaying) return;
            const card = cards[id];
            if (card.flipped || card.matched) return;

            const newCards = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
            setCards(newCards);
            const newFlipped = [...flipped, id];
            setFlipped(newFlipped);

            if (newFlipped.length === 2) {
                lockRef.current = true;
                setMoves((m) => m + 1);
                const [a, b] = newFlipped;
                if (newCards[a].emoji === newCards[b].emoji) {
                    const matched = newCards.map((c) =>
                        c.id === a || c.id === b ? { ...c, matched: true } : c,
                    );
                    setCards(matched);
                    setFlipped([]);
                    lockRef.current = false;

                    if (matched.every((c) => c.matched)) {
                        clearInterval(timerRef.current!);
                        const score = Math.max(0, 2000 - moves * 20 - elapsed * 5);
                        game.setScore(score);
                        setGameOver(true);
                        game.endGame();
                        const res = await game.submitScore();
                        setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
                    }
                } else {
                    setTimeout(() => {
                        setCards((prev) =>
                            prev.map((c) =>
                                c.id === a || c.id === b ? { ...c, flipped: false } : c,
                            ),
                        );
                        setFlipped([]);
                        lockRef.current = false;
                    }, 900);
                }
            }
        },
        [cards, flipped, game, moves, elapsed],
    );

    if (!game.isPlaying && !gameOver) {
        return (
            <div className='flex flex-col items-center gap-6 py-8'>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>Memory Match</h2>
                <p className='text-center text-gray-500 dark:text-slate-400'>
                    Cocokkan semua pasangan kartu secepat mungkin!
                </p>
                <div className='flex gap-3'>
                    {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                            key={d}
                            onClick={() => game.startGame(d)}
                            className='rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white capitalize hover:bg-indigo-700'
                        >
                            {d === 'easy' ? 'Mudah' : d === 'medium' ? 'Sedang' : 'Sulit'}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (gameOver) {
        return (
            <ResultScreen
                score={game.score}
                xpEarned={result?.xp ?? 0}
                isNewHighscore={result?.highscore}
                gameSlug='memory-match'
                gameName='Memory Match'
                description={`${moves} langkah dalam ${elapsed}s`}
                onReplay={() => game.startGame(game.difficulty)}
            />
        );
    }

    const cols = gridSize === 12 ? 4 : gridSize === 16 ? 4 : 5;

    return (
        <div className='flex flex-col items-center gap-4'>
            <ScoreBoard score={game.score} />
            <div className='flex gap-6 text-sm text-gray-500 dark:text-slate-400'>
                <span>Langkah: <strong>{moves}</strong></span>
                <span>Waktu: <strong>{elapsed}s</strong></span>
                <span>
                    Cocok:{' '}
                    <strong>{cards.filter((c) => c.matched).length / 2}/{gridSize / 2}</strong>
                </span>
            </div>
            <div
                className='grid gap-3'
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
                {cards.map((card) => (
                    <motion.button
                        key={card.id}
                        onClick={() => handleFlip(card.id)}
                        className={cn(
                            'flex h-16 w-16 items-center justify-center rounded-xl text-3xl shadow transition-all',
                            card.matched
                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                : card.flipped
                                  ? 'bg-indigo-100 dark:bg-indigo-900/30'
                                  : 'bg-gray-200 dark:bg-slate-700',
                        )}
                        whileTap={{ scale: 0.92 }}
                    >
                        <AnimatePresence mode='wait'>
                            {card.flipped || card.matched ? (
                                <motion.span
                                    key='face'
                                    initial={{ rotateY: 90 }}
                                    animate={{ rotateY: 0 }}
                                    exit={{ rotateY: 90 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    {card.emoji}
                                </motion.span>
                            ) : (
                                <motion.span
                                    key='back'
                                    initial={{ rotateY: -90 }}
                                    animate={{ rotateY: 0 }}
                                    className='text-gray-400 dark:text-slate-500'
                                >
                                    ?
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
