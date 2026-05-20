'use client';

import { useCallback, useEffect, useState } from 'react';
import { Delete, Pause, RotateCcw } from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';

type Board = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

const CLUES: Record<Difficulty, number> = { easy: 38, medium: 30, hard: 24 };
const TIME: Record<Difficulty, number> = { easy: 600, medium: 450, hard: 300 };
const MAX_ERRORS = 3;
const DIFF_LABEL: Record<Difficulty, { label: string; color: string; desc: string }> = {
  easy: {
    label: 'Mudah',
    color:
      'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
    desc: '38 angka diberikan',
  },
  medium: {
    label: 'Sedang',
    color:
      'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
    desc: '30 angka diberikan',
  },
  hard: {
    label: 'Sulit',
    color:
      'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
    desc: '24 angka diberikan',
  },
};

function generateSudoku(diff: Difficulty): { puzzle: Board; solution: Board } {
  const solution = generateSolution();
  const puzzle: Board = solution.map((row) => [...row]);
  const remove = 81 - CLUES[diff];
  const positions = Array.from({ length: 81 }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (let i = 0; i < remove; i++) {
    const pos = positions[i];
    puzzle[Math.floor(pos / 9)][pos % 9] = null;
  }
  return { puzzle, solution };
}

function generateSolution(): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillBoard(board);
  return board;
}

function fillBoard(board: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const n of nums) {
        if (isValid(board, r, c, n)) {
          board[r][c] = n;
          if (fillBoard(board)) return true;
          board[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function isValid(board: number[][], r: number, c: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === n || board[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++) {
    for (let j = bc; j < bc + 3; j++) {
      if (board[i][j] === n) return false;
    }
  }
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Sudoku() {
  const { t } = useLocale();
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } =
    useGame('sudoku');
  const [puzzle, setPuzzle] = useState<Board>([]);
  const [solution, setSolution] = useState<Board>([]);
  const [current, setCurrent] = useState<Board>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [diff, setDiff] = useState<Difficulty>('easy');
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const handleStart = () => {
    const { puzzle: p, solution: s } = generateSudoku(diff);
    setPuzzle(p);
    setSolution(s);
    setCurrent(p.map((row) => [...row]));
    setSelected(null);
    setErrors(new Set());
    setErrorCount(0);
    setGameOver(false);
    setResult(null);
    startGame(diff);
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver) return;
    setSelected([r, c]);
  };

  const handleWin = async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
  };

  const handleTimeUp = useCallback(async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
  }, [endGame, submitScore]);

  const handleNumberInput = useCallback(
    (num: number | null) => {
      if (!selected || gameOver) return;
      const [r, c] = selected;
      if (puzzle[r]?.[c] !== null) return;

      const newCurrent = current.map((row) => [...row]);
      newCurrent[r][c] = num;
      setCurrent(newCurrent);

      const newErrors = new Set(errors);
      const key = `${r}-${c}`;
      let newErrorCount = errorCount;
      if (num !== null && num !== solution[r][c]) {
        newErrors.add(key);
        newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);
      } else {
        newErrors.delete(key);
      }
      setErrors(newErrors);

      if (num === null) return;

      if (newErrorCount >= MAX_ERRORS) {
        handleTimeUp();
        return;
      }

      const isSolved = newCurrent.every((row, ri) =>
        row.every((cell, ci) => cell === solution[ri][ci])
      );
      if (isSolved) {
        const timeBonus = 500;
        const errorPenalty = newErrorCount * 10;
        addScore(Math.max(timeBonus - errorPenalty, 50));
        handleWin();
      }
    },
    [selected, gameOver, puzzle, current, solution, errors, errorCount, addScore, handleTimeUp]
  );

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setSelected((prev) => {
          const [r, c] = prev ?? [0, 0];
          if (e.key === 'ArrowUp') return [Math.max(0, r - 1), c];
          if (e.key === 'ArrowDown') return [Math.min(8, r + 1), c];
          if (e.key === 'ArrowLeft') return [r, Math.max(0, c - 1)];
          return [r, Math.min(8, c + 1)];
        });
        return;
      }
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= 9) {
        e.preventDefault();
        handleNumberInput(digit);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleNumberInput(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, gameOver, handleNumberInput]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('game.sudoku.title')}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">{t('game.sudoku.desc')}</p>
        </div>
        <HowToPlay
          steps={[
            { emoji: '9️⃣', text: 'Isi setiap baris, kolom, dan kotak 3×3 dengan angka 1–9' },
            {
              emoji: '❌',
              text: 'Setiap angka hanya boleh muncul SEKALI per baris, kolom, dan kotak 3×3',
            },
            { emoji: '💡', text: 'Tap cell kosong, lalu pilih angka dari pad di bawah grid' },
          ]}
        />

        <div
          className="flex w-full flex-col gap-2"
          role="radiogroup"
          aria-label={t('game.difficulty.easy')}
        >
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
            const cfg = DIFF_LABEL[d];
            return (
              <button
                key={d}
                onClick={() => setDiff(d)}
                role="radio"
                aria-checked={diff === d}
                className={cn(
                  'flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all',
                  diff === d
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800'
                )}
              >
                <div className="text-left">
                  <div className="font-bold text-gray-900 dark:text-white">
                    {t('game.difficulty.' + d)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{cfg.desc}</div>
                </div>
                <span
                  className={cn('rounded-full border px-2.5 py-0.5 text-xs font-bold', cfg.color)}
                >
                  {d}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleStart}
          className="w-full rounded-xl bg-indigo-600 py-3 text-lg font-bold text-white transition-colors hover:bg-indigo-700"
          aria-label={t('game.menu_play_aria')}
        >
          {t('game.start')}
        </button>
      </div>
    );
  }

  const selRow = selected?.[0] ?? -1;
  const selCol = selected?.[1] ?? -1;
  const selNum = selected ? current[selRow]?.[selCol] : null;
  const selBox = selected ? [Math.floor(selRow / 3), Math.floor(selCol / 3)] : null;

  return (
    <div className={cn('mx-auto flex w-full flex-col items-center gap-4 py-4', isPlaying ? 'max-w-xl' : 'max-w-sm')}>
      {/* Status bar */}
      <div className="flex w-full items-center justify-between gap-2">
        <Timer
          initialSeconds={TIME[diff]}
          onTimeUp={handleTimeUp}
          isRunning={isPlaying && !gameOver}
        />
        <div aria-live="polite" className="flex items-center gap-2">
          {errorCount > 0 && (
            <span
              aria-live="polite"
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-bold',
                errorCount >= MAX_ERRORS - 1
                  ? 'bg-red-200 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {errorCount}/{MAX_ERRORS} {t('game.sudoku_errors').replace('{n}', '')}
            </span>
          )}
          <ScoreBoard score={score} />
          <button
            onClick={pauseGame}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
            aria-label={t('game.pause_label')}
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="w-full overflow-hidden rounded-lg border-2 border-gray-800 dark:border-slate-400">
        <div className="grid grid-cols-9" role="grid" aria-label="Papan Sudoku 9x9">
          {current.map((row, r) =>
            row.map((cell, c) => {
              const isGiven = puzzle[r]?.[c] !== null;
              const isSelected = selRow === r && selCol === c;
              const isRelated =
                !isSelected &&
                (selRow === r ||
                  selCol === c ||
                  (selBox !== null &&
                    Math.floor(r / 3) === selBox[0] &&
                    Math.floor(c / 3) === selBox[1]));
              const isSameNum = !isSelected && selNum !== null && selNum !== 0 && cell === selNum;
              const hasError = errors.has(`${r}-${c}`);
              const thickRight = c === 2 || c === 5;
              const thickBottom = r === 2 || r === 5;

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  role="gridcell"
                  aria-label={`Baris ${r + 1}, kolom ${c + 1}${cell ? `, angka ${cell}` : ', kosong'}${isGiven ? ', diberikan' : ''}`}
                  className={cn(
                    'aspect-square w-full border-b border-r border-gray-300 text-sm font-bold transition-colors dark:border-slate-600',
                    thickRight && 'border-r-2 border-r-gray-700 dark:border-r-slate-400',
                    thickBottom && 'border-b-2 border-b-gray-700 dark:border-b-slate-400',
                    c === 8 && 'border-r-0',
                    r === 8 && 'border-b-0',
                    isSelected
                      ? 'bg-indigo-500 text-white'
                      : isSameNum
                        ? 'bg-indigo-100 dark:bg-indigo-900/40'
                        : isRelated
                          ? 'bg-gray-100 dark:bg-slate-700/60'
                          : isGiven
                            ? 'bg-gray-50 dark:bg-slate-700/30'
                            : 'bg-white dark:bg-slate-800',
                    hasError &&
                      !isSelected &&
                      'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                    !isSelected &&
                      !hasError &&
                      !isGiven &&
                      cell &&
                      'text-indigo-600 dark:text-indigo-400',
                    isGiven && !isSelected && 'text-gray-800 dark:text-slate-200'
                  )}
                >
                  {cell || ''}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Number pad */}
      <div
        className="grid w-full grid-cols-5 gap-2"
        role="group"
        aria-label={t('game.input_number')}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleNumberInput(n)}
            aria-label={`Isi angka ${n}`}
            className={cn(
              'aspect-square rounded-xl border-2 border-indigo-200 bg-white text-lg font-bold text-indigo-700 transition-all hover:border-indigo-500 hover:bg-indigo-50 active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-indigo-400 dark:hover:border-indigo-400',
              selNum === n &&
                'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
            )}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => handleNumberInput(null)}
          aria-label={t('game.erase')}
          className="aspect-square rounded-xl border-2 border-gray-200 bg-white text-gray-500 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500 active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-red-500 dark:hover:text-red-400"
        >
          <Delete className="mx-auto h-5 w-5" />
        </button>
      </div>

      {/* Restart */}
      {!gameOver && (
        <button
          onClick={handleStart}
          className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-slate-300"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('game.restart')}
        </button>
      )}

      {/* Game over */}
      {gameOver && result === null && (
        <div className="flex items-center justify-center py-8 text-gray-400 dark:text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      )}
      {gameOver && result !== null && (
        <div className="w-full">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="sudoku"
            gameName={t('game.sudoku.title')}
            onReplay={handleStart}
            description={
              errorCount < MAX_ERRORS &&
              current.flat().every((cell, i) => cell === solution.flat()[i])
                ? t('game.done')
                : errorCount >= MAX_ERRORS
                  ? `${errorCount} kesalahan — coba lagi!`
                  : t('game.time_up')
            }
          />
        </div>
      )}
    </div>
  );
}
