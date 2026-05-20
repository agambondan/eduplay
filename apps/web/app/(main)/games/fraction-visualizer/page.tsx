'use client';

import { useCallback, useEffect, useState } from 'react';
import { GameContainer } from '@/components/ui/GameContainer';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { useGame } from '@/lib/hooks/useGame';

type Mode = 'identify' | 'compare' | 'simplify';

interface Question {
    mode: Mode;
    numerator: number;
    denominator: number;
    numerator2?: number;
    denominator2?: number;
    correctAnswer: string;
    options: string[];
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

function simplify(n: number, d: number): [number, number] {
    const g = gcd(Math.abs(n), Math.abs(d));
    return [n / g, d / g];
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(difficulty: string): Question {
    const maxDenom = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 16;
    const mode: Mode =
        difficulty === 'easy'
            ? 'identify'
            : (['identify', 'compare', 'simplify'] as Mode[])[randInt(0, 2)];

    if (mode === 'identify') {
        const d = randInt(2, maxDenom);
        const n = randInt(1, d - 1);
        const correct = `${n}/${d}`;
        const wrongs = new Set<string>();
        while (wrongs.size < 3) {
            const wn = randInt(1, d);
            const wd = randInt(2, maxDenom);
            const w = `${wn}/${wd}`;
            if (w !== correct) wrongs.add(w);
        }
        const opts = [...wrongs, correct].sort(() => Math.random() - 0.5);
        return { mode, numerator: n, denominator: d, correctAnswer: correct, options: opts };
    }

    if (mode === 'compare') {
        const d = randInt(2, maxDenom);
        const n1 = randInt(1, d - 1);
        let n2 = randInt(1, d - 1);
        while (n2 === n1) n2 = randInt(1, d - 1);
        const correct = n1 > n2 ? `${n1}/${d}` : `${n2}/${d}`;
        return {
            mode,
            numerator: n1,
            denominator: d,
            numerator2: n2,
            denominator2: d,
            correctAnswer: correct,
            options: [`${n1}/${d}`, `${n2}/${d}`, 'Sama besar', `${Math.min(n1, n2)}/${d + 1}`].sort(
                () => Math.random() - 0.5,
            ),
        };
    }

    // simplify
    const [sn, sd] = [randInt(2, 6), randInt(2, 6)];
    const mul = randInt(2, 4);
    const n = sn * mul;
    const d = sd * mul;
    const [cn, cd] = simplify(n, d);
    const correct = `${cn}/${cd}`;
    const wrongs = new Set<string>();
    while (wrongs.size < 3) {
        const wn = randInt(1, 8);
        const wd = randInt(2, 8);
        const g = gcd(wn, wd);
        const ws = `${wn / g}/${wd / g}`;
        if (ws !== correct) wrongs.add(ws);
    }
    return {
        mode,
        numerator: n,
        denominator: d,
        correctAnswer: correct,
        options: [...wrongs, correct].sort(() => Math.random() - 0.5),
    };
}

function FractionBar({ numerator, denominator, color = 'bg-indigo-500' }: { numerator: number; denominator: number; color?: string }) {
    return (
        <div className="flex h-10 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-slate-600">
            {Array.from({ length: denominator }, (_, i) => (
                <div
                    key={i}
                    className={`flex-1 border-r border-white/50 last:border-r-0 transition-colors ${i < numerator ? color : 'bg-gray-100 dark:bg-slate-700'}`}
                />
            ))}
        </div>
    );
}

export default function FractionVisualizerPage() {
    const [difficulty, setDifficulty] = useState('easy');
    const [question, setQuestion] = useState<Question | null>(null);
    const [answered, setAnswered] = useState<string | null>(null);
    const [qCount, setQCount] = useState(0);
    const { isPlaying, score, startGame, endGame, addScore } = useGame();

    const TOTAL_Q = 8;

    const next = useCallback(() => {
        setQuestion(generateQuestion(difficulty));
        setAnswered(null);
    }, [difficulty]);

    const init = useCallback(() => {
        setQCount(0);
        setAnswered(null);
        startGame();
        setQuestion(generateQuestion(difficulty));
    }, [difficulty, startGame]);

    useEffect(() => {
        init();
    }, []);

    const handleAnswer = (opt: string) => {
        if (answered) return;
        setAnswered(opt);
        if (opt === question?.correctAnswer) addScore(20);

        setTimeout(() => {
            const next_count = qCount + 1;
            if (next_count >= TOTAL_Q) {
                endGame(score + (opt === question?.correctAnswer ? 20 : 0), difficulty as any);
            } else {
                setQCount(next_count);
                next();
            }
        }, 900);
    };

    if (!isPlaying && qCount >= TOTAL_Q) {
        return (
            <ResultScreen
                score={score}
                gameSlug="fraction-visualizer"
                onReplay={init}
                extraStats={[{ label: 'Soal selesai', value: `${TOTAL_Q}` }]}
            />
        );
    }

    if (!question) return null;

    const modeLabel =
        question.mode === 'identify'
            ? 'Pilih pecahan yang ditampilkan'
            : question.mode === 'compare'
              ? 'Pecahan mana yang lebih besar?'
              : 'Sederhanakan pecahan ini';

    return (
        <GameContainer maxWidth="max-w-lg">
            <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {['easy', 'medium', 'hard'].map((d) => (
                            <button
                                key={d}
                                onClick={() => { setDifficulty(d); init(); }}
                                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                                    difficulty === d
                                        ? 'bg-indigo-600 text-white'
                                        : 'border border-gray-200 text-gray-500 dark:border-slate-600'
                                }`}
                            >
                                {d === 'easy' ? 'Mudah' : d === 'medium' ? 'Sedang' : 'Sulit'}
                            </button>
                        ))}
                    </div>
                    <span className="text-sm font-bold text-indigo-600">
                        {qCount + 1}/{TOTAL_Q} · {score} pts
                    </span>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="mb-4 text-center text-sm font-semibold text-gray-500">{modeLabel}</p>

                    {question.mode === 'identify' && (
                        <div className="space-y-2">
                            <FractionBar numerator={question.numerator} denominator={question.denominator} />
                            <p className="text-center text-xs text-gray-400">
                                {question.numerator} dari {question.denominator} bagian terisi
                            </p>
                        </div>
                    )}

                    {question.mode === 'compare' && (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-indigo-600">
                                    {question.numerator}/{question.denominator}
                                </p>
                                <FractionBar
                                    numerator={question.numerator}
                                    denominator={question.denominator}
                                    color="bg-indigo-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-purple-600">
                                    {question.numerator2}/{question.denominator2}
                                </p>
                                <FractionBar
                                    numerator={question.numerator2!}
                                    denominator={question.denominator2!}
                                    color="bg-purple-500"
                                />
                            </div>
                        </div>
                    )}

                    {question.mode === 'simplify' && (
                        <div className="space-y-2">
                            <p className="text-center text-3xl font-extrabold text-gray-800 dark:text-white">
                                <span>{question.numerator}</span>
                                <span className="mx-2 block h-0.5 w-12 bg-gray-700 dark:bg-gray-300" />
                                <span>{question.denominator}</span>
                            </p>
                            <FractionBar numerator={question.numerator} denominator={question.denominator} />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {question.options.map((opt) => {
                        const isCorrect = opt === question.correctAnswer;
                        const isSelected = opt === answered;
                        return (
                            <button
                                key={opt}
                                onClick={() => handleAnswer(opt)}
                                disabled={!!answered}
                                className={`rounded-xl border-2 px-4 py-3 text-center text-lg font-bold transition-all ${
                                    answered
                                        ? isCorrect
                                            ? 'border-green-400 bg-green-50 text-green-700 dark:bg-green-900/30'
                                            : isSelected
                                              ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30'
                                              : 'border-gray-200 text-gray-400 opacity-50'
                                        : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-400 active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
                                }`}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
            </div>
        </GameContainer>
    );
}
