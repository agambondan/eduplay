'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { cn } from '@/lib/utils/cn';

const WORD_BANK = [
    'buku', 'meja', 'kursi', 'pintu', 'jendela', 'pohon', 'bunga', 'langit',
    'hujan', 'angin', 'tanah', 'air', 'api', 'batu', 'pasir', 'daun',
    'sungai', 'gunung', 'laut', 'danau', 'hutan', 'padang', 'bukit', 'lembah',
    'kota', 'desa', 'jalan', 'rumah', 'sekolah', 'pasar', 'kantor', 'taman',
    'merah', 'biru', 'hijau', 'kuning', 'putih', 'hitam', 'ungu', 'oranye',
    'besar', 'kecil', 'panjang', 'pendek', 'tinggi', 'rendah', 'lebar', 'sempit',
    'cepat', 'lambat', 'kuat', 'lemah', 'keras', 'lembut', 'panas', 'dingin',
    'senang', 'sedih', 'marah', 'takut', 'berani', 'sabar', 'rajin', 'malas',
];

function buildWordList(count: number) {
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
    const list: string[] = [];
    while (list.length < count) list.push(...shuffled);
    return list.slice(0, count);
}

interface Props {
    isDaily?: boolean;
}

export default function TypingSpeed({ isDaily }: Props) {
    const game = useGame('typing-speed', 'Typing Speed', 'language');
    const DURATION = 60;

    const [words, setWords] = useState<string[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [input, setInput] = useState('');
    const [correct, setCorrect] = useState(0);
    const [wrong, setWrong] = useState(0);
    const [timeLeft, setTimeLeft] = useState(DURATION);
    const [gameOver, setGameOver] = useState(false);
    const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const wordCount = game.difficulty === 'easy' ? 40 : game.difficulty === 'medium' ? 60 : 80;

    const startRound = useCallback(() => {
        setWords(buildWordList(wordCount));
        setCurrentIdx(0);
        setInput('');
        setCorrect(0);
        setWrong(0);
        setTimeLeft(DURATION);
        setGameOver(false);
        setResult(null);
        setTimeout(() => inputRef.current?.focus(), 100);
        timerRef.current = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
    }, [wordCount]);

    useEffect(() => {
        if (game.isPlaying) startRound();
        return () => { if (timerRef.current) clearInterval(timerRef.current!); };
    }, [game.isPlaying]);

    useEffect(() => {
        if (timeLeft === 0 && game.isPlaying) {
            const wpm = Math.round((correct / DURATION) * 60);
            game.setScore(wpm * 10);
            setGameOver(true);
            game.endGame();
            game.submitScore().then((res) =>
                setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false }),
            );
        }
    }, [timeLeft]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.endsWith(' ') || val.endsWith('\n')) {
            const typed = val.trim();
            if (typed === words[currentIdx]) {
                setCorrect((c) => c + 1);
            } else if (typed.length > 0) {
                setWrong((w) => w + 1);
            }
            setCurrentIdx((i) => i + 1);
            setInput('');
        } else {
            setInput(val);
        }
    };

    const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 100;
    const wpm = Math.round((correct / Math.max(1, DURATION - timeLeft)) * 60);

    if (!game.isPlaying && !gameOver) {
        return (
            <div className='flex flex-col items-center gap-6 py-8'>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>Typing Speed</h2>
                <p className='text-center text-gray-500 dark:text-slate-400'>
                    Ketik kata yang muncul secepat mungkin dalam 60 detik!
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
        const finalWpm = Math.round((correct / DURATION) * 60);
        return (
            <ResultScreen
                score={game.score}
                xpEarned={result?.xp ?? 0}
                isNewHighscore={result?.highscore}
                gameSlug='typing-speed'
                gameName='Typing Speed'
                description={`${finalWpm} WPM • Akurasi ${accuracy}% • ${correct} kata`}
                onReplay={() => game.startGame(game.difficulty)}
            />
        );
    }

    const visibleStart = Math.max(0, currentIdx - 10);
    const visible = words.slice(visibleStart, visibleStart + 30);

    return (
        <div className='flex flex-col items-center gap-5'>
            <div className='flex w-full justify-between text-sm font-bold'>
                <span className='text-indigo-600 dark:text-indigo-400'>WPM: {wpm}</span>
                <span className={cn(timeLeft <= 10 ? 'text-red-500' : 'text-gray-700 dark:text-slate-300')}>
                    {timeLeft}s
                </span>
                <span className='text-emerald-600 dark:text-emerald-400'>Akurasi: {accuracy}%</span>
            </div>

            <div className='w-full rounded-2xl bg-gray-100 p-4 font-mono text-lg leading-relaxed dark:bg-slate-800'>
                <div className='flex flex-wrap gap-x-2 gap-y-1'>
                    {visible.map((word, i) => {
                        const absIdx = visibleStart + i;
                        return (
                            <span
                                key={absIdx}
                                className={cn(
                                    'rounded px-0.5',
                                    absIdx < currentIdx
                                        ? 'text-gray-300 dark:text-slate-600'
                                        : absIdx === currentIdx
                                          ? 'bg-indigo-200 font-bold text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                                          : 'text-gray-700 dark:text-slate-300',
                                )}
                            >
                                {word}
                            </span>
                        );
                    })}
                </div>
            </div>

            <input
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={(e) => e.key === 'Enter' && handleInput({ target: { value: input + ' ' } } as any)}
                className={cn(
                    'w-full rounded-xl border-2 bg-white px-4 py-3 text-lg font-mono focus:outline-none dark:bg-slate-900 dark:text-white',
                    input.length > 0 && words[currentIdx]?.startsWith(input)
                        ? 'border-emerald-400 dark:border-emerald-600'
                        : input.length > 0
                          ? 'border-red-400 dark:border-red-600'
                          : 'border-gray-300 dark:border-slate-600',
                )}
                placeholder='Ketik kata di sini, tekan spasi untuk lanjut…'
                autoComplete='off'
                autoCorrect='off'
                spellCheck={false}
            />

            <div className='flex gap-6 text-sm text-gray-500 dark:text-slate-400'>
                <span>✅ {correct}</span>
                <span>❌ {wrong}</span>
            </div>
        </div>
    );
}
