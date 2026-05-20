'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/lib/hooks/useGame';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { cn } from '@/lib/utils/cn';

const COLORS = [
    { id: 0, bg: 'bg-red-500', active: 'bg-red-300', label: 'Merah' },
    { id: 1, bg: 'bg-blue-500', active: 'bg-blue-300', label: 'Biru' },
    { id: 2, bg: 'bg-green-500', active: 'bg-green-300', label: 'Hijau' },
    { id: 3, bg: 'bg-yellow-400', active: 'bg-yellow-200', label: 'Kuning' },
];

type Phase = 'idle' | 'showing' | 'input' | 'fail' | 'done';

interface Props {
    isDaily?: boolean;
}

export default function SimonSays({ isDaily }: Props) {
    const game = useGame('simon-says', 'Simon Says', 'logic');

    const [sequence, setSequence] = useState<number[]>([]);
    const [playerSeq, setPlayerSeq] = useState<number[]>([]);
    const [phase, setPhase] = useState<Phase>('idle');
    const [lit, setLit] = useState<number | null>(null);
    const [level, setLevel] = useState(0);
    const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
    const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimeouts = () => timeouts.current.forEach(clearTimeout);

    const flashSequence = useCallback((seq: number[], speed: number) => {
        setPhase('showing');
        setLit(null);
        let t = 500;
        seq.forEach((color, i) => {
            const on = setTimeout(() => setLit(color), t);
            const off = setTimeout(() => setLit(null), t + speed * 0.6);
            timeouts.current.push(on, off);
            t += speed + 200;
        });
        const done = setTimeout(() => {
            setPhase('input');
            setPlayerSeq([]);
        }, t);
        timeouts.current.push(done);
    }, []);

    const addStep = useCallback(
        (prevSeq: number[]) => {
            const next = [...prevSeq, Math.floor(Math.random() * 4)];
            setSequence(next);
            const speed = game.difficulty === 'easy' ? 800 : game.difficulty === 'medium' ? 550 : 350;
            flashSequence(next, speed);
        },
        [flashSequence, game.difficulty],
    );

    const handleStart = useCallback(() => {
        clearTimeouts();
        setSequence([]);
        setPlayerSeq([]);
        setLevel(0);
        game.setScore(0);
        setResult(null);
        setPhase('idle');
        setTimeout(() => addStep([]), 400);
    }, [addStep, game]);

    useEffect(() => {
        if (game.isPlaying) handleStart();
        return () => clearTimeouts();
    }, [game.isPlaying]);

    const handlePress = useCallback(
        async (colorId: number) => {
            if (phase !== 'input') return;
            const newPlayer = [...playerSeq, colorId];
            const idx = newPlayer.length - 1;

            if (newPlayer[idx] !== sequence[idx]) {
                clearTimeouts();
                setPhase('fail');
                game.setScore(level * 100);
                game.endGame();
                const res = await game.submitScore();
                setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
                return;
            }

            setPlayerSeq(newPlayer);

            if (newPlayer.length === sequence.length) {
                const newLevel = level + 1;
                setLevel(newLevel);
                game.setScore(newLevel * 100);
                setPhase('showing');
                setTimeout(() => addStep(sequence), 600);
            }
        },
        [phase, playerSeq, sequence, level, game, addStep],
    );

    if (!game.isPlaying && phase !== 'fail') {
        return (
            <div className='flex flex-col items-center gap-6 py-8'>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>Simon Says</h2>
                <p className='text-center text-gray-500 dark:text-slate-400'>
                    Ingat urutan warna yang menyala, lalu ulangi dengan benar!
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

    if (phase === 'fail') {
        return (
            <ResultScreen
                score={game.score}
                xpEarned={result?.xp ?? 0}
                isNewHighscore={result?.highscore}
                gameSlug='simon-says'
                gameName='Simon Says'
                description={`Level ${level} tercapai`}
                onReplay={() => game.startGame(game.difficulty)}
            />
        );
    }

    return (
        <div className='flex flex-col items-center gap-6 py-4'>
            <div className='flex items-center gap-6'>
                <div className='text-center'>
                    <div className='text-3xl font-bold text-indigo-600 dark:text-indigo-400'>{level}</div>
                    <div className='text-xs text-gray-500 dark:text-slate-400'>Level</div>
                </div>
                <div className='text-center'>
                    <div className='text-3xl font-bold text-emerald-600 dark:text-emerald-400'>{game.score}</div>
                    <div className='text-xs text-gray-500 dark:text-slate-400'>Skor</div>
                </div>
            </div>

            <div className='text-sm font-medium text-gray-500 dark:text-slate-400 h-5'>
                {phase === 'showing' && '👀 Perhatikan urutan…'}
                {phase === 'input' && `🎮 Ulangi! (${playerSeq.length}/${sequence.length})`}
            </div>

            <div className='grid grid-cols-2 gap-4'>
                {COLORS.map((color) => (
                    <motion.button
                        key={color.id}
                        onClick={() => handlePress(color.id)}
                        disabled={phase !== 'input'}
                        className={cn(
                            'h-28 w-28 rounded-2xl shadow-lg transition-all duration-100',
                            lit === color.id ? color.active : color.bg,
                            phase !== 'input' ? 'cursor-default opacity-80' : 'hover:scale-105 active:scale-95',
                        )}
                        whileTap={phase === 'input' ? { scale: 0.92 } : {}}
                    />
                ))}
            </div>

            <div className='flex gap-2 mt-2'>
                {sequence.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-2 w-2 rounded-full',
                            i < playerSeq.length ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600',
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
