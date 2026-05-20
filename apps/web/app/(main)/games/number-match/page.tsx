'use client';

import type { Metadata } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { GameContainer } from '@/components/ui/GameContainer';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';

const COLS = 9;
const INITIAL_ROWS = 9;

function generateInitialNumbers(): number[] {
    const nums: number[] = [];
    for (let i = 1; i <= 9; i++) {
        for (let j = 0; j < 9; j++) {
            nums.push(Math.ceil(Math.random() * 9));
        }
    }
    return nums;
}

function canPair(a: number, b: number): boolean {
    return a === b || a + b === 10;
}

function arePairablePositions(nums: number[], crossed: Set<number>, i: number, j: number): boolean {
    if (i === j) return false;
    if (crossed.has(i) || crossed.has(j)) return false;
    if (!canPair(nums[i], nums[j])) return false;

    const [lo, hi] = i < j ? [i, j] : [j, i];
    const loRow = Math.floor(lo / COLS);
    const hiRow = Math.floor(hi / COLS);

    if (loRow === hiRow) {
        for (let k = lo + 1; k < hi; k++) {
            if (!crossed.has(k)) return false;
        }
        return true;
    }

    for (let k = lo + 1; k < loRow * COLS + COLS; k++) {
        if (!crossed.has(k)) return false;
    }
    for (let r = loRow + 1; r < hiRow; r++) {
        for (let k = r * COLS; k < r * COLS + COLS; k++) {
            if (!crossed.has(k)) return false;
        }
    }
    for (let k = hiRow * COLS; k < hi; k++) {
        if (!crossed.has(k)) return false;
    }
    return true;
}

export default function NumberMatchPage() {
    const { t } = useLocale();
    const { isPlaying, score, startGame, endGame, addScore } = useGame();
    const [nums, setNums] = useState<number[]>([]);
    const [crossed, setCrossed] = useState<Set<number>>(new Set());
    const [selected, setSelected] = useState<number | null>(null);
    const [flash, setFlash] = useState<{ idx: number; ok: boolean } | null>(null);
    const [won, setWon] = useState(false);

    const init = useCallback(() => {
        setNums(generateInitialNumbers());
        setCrossed(new Set());
        setSelected(null);
        setFlash(null);
        setWon(false);
        startGame();
    }, [startGame]);

    useEffect(() => {
        init();
    }, []);

    const addRow = () => {
        const active = nums.filter((_, i) => !crossed.has(i));
        if (active.length === 0) return;
        setNums((prev) => [...prev, ...active]);
    };

    const handleSelect = (idx: number) => {
        if (crossed.has(idx) || won) return;
        if (selected === null) {
            setSelected(idx);
            return;
        }
        if (selected === idx) {
            setSelected(null);
            return;
        }
        if (arePairablePositions(nums, crossed, selected, idx)) {
            const next = new Set(crossed);
            next.add(selected);
            next.add(idx);
            setCrossed(next);
            addScore(10);
            setFlash({ idx, ok: true });
            setSelected(null);
            setTimeout(() => setFlash(null), 400);

            if (next.size === nums.length) {
                setWon(true);
                endGame(score + 10, 'easy');
            }
        } else {
            setFlash({ idx, ok: false });
            setSelected(null);
            setTimeout(() => setFlash(null), 400);
        }
    };

    const totalRows = Math.ceil(nums.length / COLS);
    const cells = Array.from({ length: totalRows * COLS }, (_, i) => i);

    if (!isPlaying && won) {
        return (
            <ResultScreen
                score={score}
                gameSlug="number-match"
                onReplay={init}
                extraStats={[{ label: 'Pasangan ditemukan', value: String(crossed.size / 2) }]}
            />
        );
    }

    return (
        <GameContainer maxWidth="max-w-lg">
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Number Match</h1>
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {score} pts
                        </span>
                        <button
                            onClick={addRow}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300"
                        >
                            + Baris
                        </button>
                    </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-slate-400">
                    Pilih dua angka yang <strong>sama</strong> atau <strong>berjumlah 10</strong>, dengan jalur bersih di antara keduanya.
                </p>

                <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
                >
                    {cells.map((i) => {
                        const num = nums[i];
                        const isCrossed = crossed.has(i);
                        const isSelected = selected === i;
                        const isFlashOk = flash?.idx === i && flash.ok;
                        const isFlashBad = flash?.idx === i && !flash.ok;

                        if (i >= nums.length) {
                            return <div key={i} />;
                        }

                        return (
                            <button
                                key={i}
                                onClick={() => handleSelect(i)}
                                disabled={isCrossed}
                                className={`aspect-square rounded text-sm font-bold transition-all ${
                                    isCrossed
                                        ? 'text-gray-200 line-through dark:text-slate-700'
                                        : isFlashOk
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40'
                                          : isFlashBad
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/40'
                                            : isSelected
                                              ? 'bg-indigo-500 text-white'
                                              : 'bg-white text-gray-800 hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {num}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{crossed.size / 2} pasangan ditemukan</span>
                    <span>{nums.length - crossed.size} angka tersisa</span>
                </div>
            </div>
        </GameContainer>
    );
}
