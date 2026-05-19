'use client';

import { useState, useCallback } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';
import { cn } from '@/lib/utils/cn';

type Board = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

const CLUES: Record<Difficulty, number> = { easy: 38, medium: 30, hard: 24 };

function generateSudoku(diff: Difficulty): { puzzle: Board; solution: Board } {
  const solution = generateSolution();
  const puzzle = solution.map((row) => [...row]);
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
  const { score, isPlaying, startGame, endGame, addScore, submitScore } = useGame('sudoku');
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
    if (puzzle[r][c] !== null) return;
    setSelected([r, c]);
  };

  const handleNumberInput = useCallback(
    (num: number) => {
      if (!selected || gameOver) return;
      const [r, c] = selected;
      if (puzzle[r][c] !== null) return;

      const newCurrent = current.map((row) => [...row]);
      newCurrent[r][c] = num;
      setCurrent(newCurrent);

      const newErrors = new Set(errors);
      const key = `${r}-${c}`;
      if (num !== solution[r][c]) {
        newErrors.add(key);
        setErrorCount((e) => e + 1);
      } else {
        newErrors.delete(key);
      }
      setErrors(newErrors);

      const isSolved = newCurrent.every((row, ri) =>
        row.every((cell, ci) => cell === solution[ri][ci])
      );
      if (isSolved) {
        const timeBonus = 500;
        const errorPenalty = errorCount * 10;
        addScore(Math.max(timeBonus - errorPenalty, 50));
        handleWin();
      }
    },
    [selected, gameOver, puzzle, current, solution, errors, errorCount, addScore]
  );

  const handleWin = async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
  };

  const handleTimeUp = useCallback(async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
  }, [endGame, submitScore]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sudoku</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          Isi grid 9x9 dengan angka 1-9!
        </p>
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={cn(
                'rounded-lg px-4 py-2 font-medium capitalize transition-colors',
                diff === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={handleStart}
          className="rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-emerald-600"
        >
          Mulai!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-4">
        <Timer
          initialSeconds={diff === 'easy' ? 600 : diff === 'medium' ? 450 : 300}
          onTimeUp={handleTimeUp}
          isRunning={isPlaying && !gameOver}
        />
        <ScoreBoard score={score} />
      </div>

      <div className="grid grid-cols-9 border-2 border-gray-800 dark:border-slate-300">
        {current.map((row, r) =>
          row.map((cell, c) => {
            const isOriginal = puzzle[r]?.[c] !== null;
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const hasError = errors.has(`${r}-${c}`);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center border border-gray-300 text-sm font-bold transition-colors sm:h-10 sm:w-10 dark:border-slate-600',
                  c % 3 === 2 && c < 8 && 'border-r-2 border-r-gray-800 dark:border-r-slate-300',
                  r % 3 === 2 && r < 8 && 'border-b-2 border-b-gray-800 dark:border-b-slate-300',
                  isOriginal
                    ? 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-white'
                    : 'bg-white dark:bg-slate-800',
                  isSelected && 'bg-indigo-100 dark:bg-indigo-900/30',
                  hasError && 'bg-red-50 text-red-500 dark:bg-red-900/20',
                  !isOriginal && !hasError && cell && 'text-indigo-600 dark:text-indigo-400'
                )}
              >
                {cell || ''}
              </button>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleNumberInput(n)}
            className="h-10 w-10 rounded-lg bg-indigo-600 font-bold text-white transition-colors hover:bg-indigo-700"
          >
            {n}
          </button>
        ))}
      </div>

      {gameOver && (
        <div className="space-y-2 text-center">
          <p
            className={cn(
              'text-lg font-bold',
              errors.size === 0 ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {errors.size === 0 && current.flat().every((c, i) => c === solution.flat()[i])
              ? 'Selamat! Puzzle Solved!'
              : 'Game Over!'}
          </p>
          {result && (
            <div className="text-sm text-gray-500">
              <p>+{result.xp} XP</p>
              {result.highscore && <p className="font-bold text-amber-500">New Highscore!</p>}
            </div>
          )}
          <button
            onClick={handleStart}
            className="rounded-lg bg-indigo-600 px-6 py-2 font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Main Lagi
          </button>
        </div>
      )}
    </div>
  );
}
