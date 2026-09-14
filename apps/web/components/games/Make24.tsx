'use client';

import { Difficulty } from '@/types/game';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Delete,
  HelpCircle,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { useSoundStore } from '@/lib/stores/soundStore';
import { cn } from '@/lib/utils/cn';
import { haptics } from '@/lib/utils/haptics';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';

// --- 24 SOLVER & EVALUATOR ---

type Op = '+' | '-' | '*' | '/';

interface ExpressionNode {
  type: 'num' | 'op';
  val: string;
  cardIndex?: number; // 0..3 for tracking which card was used
}

function applyOp(a: number, b: number, op: Op): number | null {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      if (Math.abs(b) < 1e-7) return null;
      return a / b;
  }
}

function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = getPermutations(remaining);
    for (const p of perms) {
      result.push([current, ...p]);
    }
  }
  return result;
}

const OPS: Op[] = ['+', '-', '*', '/'];

export function solve24(nums: number[]): string | null {
  const perms = getPermutations(nums);

  for (const [a, b, c, d] of perms) {
    for (const op1 of OPS) {
      for (const op2 of OPS) {
        for (const op3 of OPS) {
          // 1. ((a op1 b) op2 c) op3 d
          const r1_1 = applyOp(a, b, op1);
          if (r1_1 !== null) {
            const r1_2 = applyOp(r1_1, c, op2);
            if (r1_2 !== null) {
              const r1_3 = applyOp(r1_2, d, op3);
              if (r1_3 !== null && Math.abs(r1_3 - 24) < 1e-5) {
                return `((${a} ${op1} ${b}) ${op2} ${c}) ${op3} ${d}`;
              }
            }
          }

          // 2. (a op1 (b op2 c)) op3 d
          const r2_1 = applyOp(b, c, op2);
          if (r2_1 !== null) {
            const r2_2 = applyOp(a, r2_1, op1);
            if (r2_2 !== null) {
              const r2_3 = applyOp(r2_2, d, op3);
              if (r2_3 !== null && Math.abs(r2_3 - 24) < 1e-5) {
                return `(${a} ${op1} (${b} ${op2} ${c})) ${op3} ${d}`;
              }
            }
          }

          // 3. (a op1 b) op2 (c op3 d)
          const r3_1 = applyOp(a, b, op1);
          const r3_2 = applyOp(c, d, op3);
          if (r3_1 !== null && r3_2 !== null) {
            const r3_3 = applyOp(r3_1, r3_2, op2);
            if (r3_3 !== null && Math.abs(r3_3 - 24) < 1e-5) {
              return `(${a} ${op1} ${b}) ${op2} (${c} ${op3} ${d})`;
            }
          }

          // 4. a op1 ((b op2 c) op3 d)
          const r4_1 = applyOp(b, c, op2);
          if (r4_1 !== null) {
            const r4_2 = applyOp(r4_1, d, op3);
            if (r4_2 !== null) {
              const r4_3 = applyOp(a, r4_2, op1);
              if (r4_3 !== null && Math.abs(r4_3 - 24) < 1e-5) {
                return `${a} ${op1} ((${b} ${op2} ${c}) ${op3} ${d})`;
              }
            }
          }

          // 5. a op1 (b op2 (c op3 d))
          const r5_1 = applyOp(c, d, op3);
          if (r5_1 !== null) {
            const r5_2 = applyOp(b, r5_1, op2);
            if (r5_2 !== null) {
              const r5_3 = applyOp(a, r5_2, op1);
              if (r5_3 !== null && Math.abs(r5_3 - 24) < 1e-5) {
                return `${a} ${op1} (${b} ${op2} (${c} ${op3} ${d}))`;
              }
            }
          }
        }
      }
    }
  }
  return null;
}

// Safe mathematical expression evaluator using Shunting Yard
export function evaluateSafeTokens(tokens: string[]): { val: number | null; error: string | null } {
  if (tokens.length === 0) return { val: null, error: null };

  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '×': 2, '÷': 2 };
  const output: (number | string)[] = [];
  const opStack: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!isNaN(Number(t))) {
      output.push(Number(t));
    } else if (t === '(') {
      opStack.push(t);
    } else if (t === ')') {
      while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
        output.push(opStack.pop()!);
      }
      if (opStack.length === 0) {
        return { val: null, error: 'Kurung tutup tanpa kurung buka' };
      }
      opStack.pop(); // discard '('
    } else if (t in precedence) {
      const p = precedence[t];
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1] !== '(' &&
        precedence[opStack[opStack.length - 1]] >= p
      ) {
        output.push(opStack.pop()!);
      }
      opStack.push(t);
    } else {
      return { val: null, error: 'Karakter tidak dikenal' };
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!;
    if (top === '(') {
      return { val: null, error: 'Kurung buka belum ditutup' };
    }
    output.push(top);
  }

  // Evaluate RPN
  const valStack: number[] = [];
  for (const item of output) {
    if (typeof item === 'number') {
      valStack.push(item);
    } else {
      if (valStack.length < 2) {
        return { val: null, error: 'Format perhitungan belum lengkap' };
      }
      const b = valStack.pop()!;
      const a = valStack.pop()!;
      let res = 0;
      if (item === '+') res = a + b;
      else if (item === '-') res = a - b;
      else if (item === '*' || item === '×') res = a * b;
      else if (item === '/' || item === '÷') {
        if (Math.abs(b) < 1e-7) return { val: null, error: 'Tidak bisa membagi dengan 0' };
        res = a / b;
      }
      valStack.push(res);
    }
  }

  if (valStack.length !== 1) {
    return { val: null, error: 'Format perhitungan tidak valid' };
  }

  return { val: valStack[0], error: null };
}

function generateSolvableNumbers(diff: Difficulty): { nums: number[]; solution: string } {
  const max = diff === 'easy' ? 9 : diff === 'medium' ? 10 : 13;
  const min = 1;

  for (let attempt = 0; attempt < 500; attempt++) {
    const candidate = [
      Math.floor(Math.random() * (max - min + 1)) + min,
      Math.floor(Math.random() * (max - min + 1)) + min,
      Math.floor(Math.random() * (max - min + 1)) + min,
      Math.floor(Math.random() * (max - min + 1)) + min,
    ];
    const sol = solve24(candidate);
    if (sol) {
      return { nums: candidate, solution: sol };
    }
  }
  // Fallback guaranteed puzzle
  return { nums: [3, 8, 3, 3], solution: '(8 - (3 / 3)) * 3' };
}

export default function Make24() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } =
    useGame('make-24', 'Make 24', 'math');
  const { t } = useLocale();
  const playSound = useSoundStore((s) => s.playSound);

  const [diff, setDiff] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<number[]>([]);
  const [usedCards, setUsedCards] = useState<boolean[]>([false, false, false, false]);
  const [expression, setExpression] = useState<ExpressionNode[]>([]);
  const [currentSolution, setCurrentSolution] = useState<string>('');
  const [solvedCount, setSolvedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showHint, setShowHint] = useState(false);

  const newPuzzle = useCallback(
    (targetDiff: Difficulty = diff) => {
      const { nums, solution } = generateSolvableNumbers(targetDiff);
      setCards(nums);
      setCurrentSolution(solution);
      setUsedCards([false, false, false, false]);
      setExpression([]);
      setFeedback(null);
      setShowHint(false);
    },
    [diff]
  );

  const handleStart = (selectedDiff: Difficulty = diff) => {
    setSolvedCount(0);
    setStreak(0);
    setGameOver(false);
    setResult(null);
    setDiff(selectedDiff);
    newPuzzle(selectedDiff);
    startGame(selectedDiff);
  };

  const handleCardClick = (cardIdx: number) => {
    if (usedCards[cardIdx]) return;
    playSound('click');
    haptics.light();

    const newUsed = [...usedCards];
    newUsed[cardIdx] = true;
    setUsedCards(newUsed);

    setExpression((prev) => [
      ...prev,
      { type: 'num', val: String(cards[cardIdx]), cardIndex: cardIdx },
    ]);
    setFeedback(null);
  };

  const handleOperatorClick = (op: string) => {
    playSound('pop');
    haptics.light();
    setExpression((prev) => [...prev, { type: 'op', val: op }]);
    setFeedback(null);
  };

  const handleBackspace = () => {
    if (expression.length === 0) return;
    playSound('click');
    haptics.light();

    const last = expression[expression.length - 1];
    if (last.type === 'num' && last.cardIndex !== undefined) {
      const newUsed = [...usedCards];
      newUsed[last.cardIndex] = false;
      setUsedCards(newUsed);
    }
    setExpression((prev) => prev.slice(0, -1));
    setFeedback(null);
  };

  const handleClear = () => {
    playSound('click');
    setUsedCards([false, false, false, false]);
    setExpression([]);
    setFeedback(null);
  };

  const handleCheck = () => {
    // Must use all 4 cards
    const allUsed = usedCards.every(Boolean);
    if (!allUsed) {
      playSound('wrong');
      haptics.error();
      setFeedback({ msg: 'Semua 4 kartu angka harus digunakan!', type: 'error' });
      return;
    }

    const tokenList = expression.map((e) => e.val);
    const { val, error } = evaluateSafeTokens(tokenList);

    if (error !== null || val === null) {
      playSound('wrong');
      haptics.error();
      setFeedback({ msg: error || 'Perhitungan tidak valid', type: 'error' });
      return;
    }

    if (Math.abs(val - 24) < 1e-5) {
      // SUCCESS!
      playSound('correct');
      haptics.success();
      const points = 100 + streak * 20;
      addScore(points);
      setSolvedCount((c) => c + 1);
      setStreak((s) => s + 1);
      setFeedback({ msg: `🎉 Benar! Tepat 24 (+${points} poin)`, type: 'success' });

      setTimeout(() => {
        newPuzzle(diff);
      }, 1000);
    } else {
      playSound('wrong');
      haptics.error();
      const formatted = Number.isInteger(val) ? val : val.toFixed(2);
      setFeedback({
        msg: `Hasil ekspresi kamu: ${formatted} (Bukan 24)`,
        type: 'error',
      });
      setStreak(0);
    }
  };

  const handleSkip = () => {
    playSound('pop');
    setStreak(0);
    newPuzzle(diff);
  };

  const handleTimeUp = useCallback(async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
  }, [endGame, submitScore]);

  // Live expression preview
  const currentTokens = expression.map((e) => e.val);
  const liveEval = evaluateSafeTokens(currentTokens);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 text-white font-black text-2xl">
          24
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Make 24</h1>
          <p className="max-w-md text-gray-500 dark:text-slate-400">
            Gunakan 4 angka yang diberikan dan operasi matematika dasar (+, -, ×, ÷) agar hasilnya
            tepat 24!
          </p>
        </div>

        <HowToPlay
          steps={[
            { emoji: '🎴', text: 'Setiap ronde menampilkan 4 kartu angka yang harus dipakai semua' },
            {
              emoji: '➕',
              text: 'Gunakan operator +, -, ×, ÷ dan tanda kurung ( ) untuk menyusun rumus',
            },
            {
              emoji: '🎯',
              text: 'Capai hasil tepat 24 dalam batas waktu 60 detik untuk raih skor tertinggi!',
            },
          ]}
        />

        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={cn(
                'rounded-xl px-5 py-2.5 font-bold capitalize transition-all',
                diff === d
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {d === 'easy' ? 'Mudah (1-9)' : d === 'medium' ? 'Sedang (1-10)' : 'Sulit (1-13)'}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleStart(diff)}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-10 py-4 text-xl font-black text-white shadow-lg shadow-orange-500/30 transition-transform active:scale-95 hover:brightness-105"
        >
          <Play className="h-6 w-6 fill-current" />
          Mulai Main
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4 max-w-lg mx-auto">
      {/* Header Bar */}
      <div className="flex w-full items-center justify-between px-2">
        <Timer initialSeconds={60} onTimeUp={handleTimeUp} isRunning={isPlaying && !gameOver} />
        <div className="flex items-center gap-3">
          {streak > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
              <Zap className="h-3.5 w-3.5 fill-current" />
              {streak}x Combo
            </span>
          )}
          <ScoreBoard score={score} />
        </div>
      </div>

      {!gameOver && (
        <div className="w-full space-y-4">
          {/* Target Banner */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-900/5 dark:bg-white/5 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Target Target
            </span>
            <span className="text-2xl font-black text-amber-500">= 24</span>
            <button
              onClick={handleSkip}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              Lewati Soal
            </button>
          </div>

          {/* 4 Number Cards */}
          <div className="grid grid-cols-4 gap-3">
            {cards.map((num, idx) => {
              const isUsed = usedCards[idx];
              return (
                <button
                  key={idx}
                  onClick={() => handleCardClick(idx)}
                  disabled={isUsed}
                  className={cn(
                    'flex h-20 sm:h-24 flex-col items-center justify-center rounded-2xl border-2 font-mono text-3xl sm:text-4xl font-black transition-all shadow-sm active:scale-95',
                    isUsed
                      ? 'border-dashed border-gray-300 bg-gray-100/50 text-gray-300 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-700 opacity-40 cursor-not-allowed'
                      : 'border-amber-400 bg-white text-gray-900 hover:border-amber-500 hover:shadow-md dark:border-amber-500/40 dark:bg-slate-800 dark:text-white'
                  )}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* Expression Display Box */}
          <div className="relative min-h-[72px] flex flex-col items-center justify-center rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-slate-800/80">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {expression.length === 0 ? (
                <span className="text-sm font-medium text-gray-400 dark:text-slate-500">
                  Tap angka & operator di bawah...
                </span>
              ) : (
                expression.map((node, i) => (
                  <span
                    key={i}
                    className={cn(
                      'rounded-lg px-2.5 py-1 font-mono text-xl sm:text-2xl font-bold shadow-sm',
                      node.type === 'num'
                        ? 'bg-amber-500 text-white'
                        : 'bg-indigo-600 text-white dark:bg-indigo-500'
                    )}
                  >
                    {node.val}
                  </span>
                ))
              )}
            </div>

            {/* Live calculation indicator */}
            {expression.length > 0 && liveEval.val !== null && (
              <span className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                = {Number.isInteger(liveEval.val) ? liveEval.val : liveEval.val.toFixed(2)}
              </span>
            )}
          </div>

          {/* Feedback message */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl p-2.5 text-center text-sm font-bold',
                feedback.type === 'success' &&
                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
                feedback.type === 'error' &&
                  'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
                feedback.type === 'info' &&
                  'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
              )}
            >
              {feedback.msg}
            </motion.div>
          )}

          {/* Operator keypad & controls */}
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2">
              {['+', '-', '×', '÷', '(', ')'].map((op) => (
                <button
                  key={op}
                  onClick={() => handleOperatorClick(op)}
                  className="flex h-12 items-center justify-center rounded-xl bg-gray-100 font-mono text-2xl font-black text-gray-800 hover:bg-gray-200 active:scale-95 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 transition-transform"
                >
                  {op}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleBackspace}
                className="flex h-12 items-center justify-center gap-1 rounded-xl bg-gray-200 font-bold text-gray-700 hover:bg-gray-300 active:scale-95 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                title="Hapus satu"
              >
                <Delete className="h-5 w-5" />
              </button>
              <button
                onClick={handleClear}
                className="flex h-12 items-center justify-center rounded-xl bg-gray-200 font-bold text-gray-700 hover:bg-gray-300 active:scale-95 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 text-sm"
              >
                Reset
              </button>
              <button
                onClick={() => setShowHint(true)}
                className="flex h-12 items-center justify-center gap-1 rounded-xl bg-amber-100 font-bold text-amber-800 hover:bg-amber-200 active:scale-95 dark:bg-amber-950/40 dark:text-amber-300 text-sm"
              >
                <Lightbulb className="h-4 w-4" />
                Hint
              </button>
              <button
                onClick={handleCheck}
                className="flex h-12 items-center justify-center gap-1 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20 text-sm"
              >
                <Check className="h-5 w-5" />
                Cek
              </button>
            </div>
          </div>

          {/* Hint modal / text */}
          {showHint && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-center text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
              💡 Salah satu solusi: <span className="font-mono font-bold">{currentSolution}</span>
            </div>
          )}
        </div>
      )}

      {/* Result Screen */}
      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="make-24"
            gameName="Make 24"
            onReplay={() => handleStart(diff)}
            description={`Teka-teki terselesaikan: ${solvedCount}`}
            breakdown={[
              { label: 'Terselesaikan', value: solvedCount },
              { label: 'Skor Akhir', value: score },
              { label: 'Tingkat Kesulitan', value: diff.toUpperCase() },
            ]}
          />
        </div>
      )}
    </div>
  );
}
