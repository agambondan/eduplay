'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { cn } from '@/lib/utils/cn';
import { Pause } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

type Difficulty = 'easy' | 'medium' | 'hard';
type CellState = 'empty' | 'filled' | 'crossed';

// Nonogram puzzle data structures
interface NonogramPuzzle {
  grid: number[][]; // 1 for filled, 0 for empty
  rowClues: number[][];
  colClues: number[][];
  size: number;
}

// Simple pre-defined patterns for v1.1
// In a real app, these might be generated or fetched from an API
const PUZZLES = {
  easy: [
    // 5x5 Smiley
    {
      grid: [
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0],
      ],
    },
    // 5x5 Square
    {
      grid: [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
      ],
    },
  ],
  medium: [
    // 7x7 Heart
    {
      grid: [
        [0, 1, 1, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
      ],
    },
  ],
  hard: [
    // 10x10 Space Invader
    {
      grid: [
        [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
      ],
    },
  ],
};

function generateClues(grid: number[][]) {
  const size = grid.length;
  const rowClues: number[][] = [];
  const colClues: number[][] = [];

  // Generate row clues
  for (let r = 0; r < size; r++) {
    const clues = [];
    let count = 0;
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) clues.push(count);
    if (clues.length === 0) clues.push(0);
    rowClues.push(clues);
  }

  // Generate column clues
  for (let c = 0; c < size; c++) {
    const clues = [];
    let count = 0;
    for (let r = 0; r < size; r++) {
      if (grid[r][c] === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) clues.push(count);
    if (clues.length === 0) clues.push(0);
    colClues.push(clues);
  }

  return { rowClues, colClues };
}

function selectPuzzle(diff: Difficulty): NonogramPuzzle {
  const list = PUZZLES[diff];
  const puzzle = list[Math.floor(Math.random() * list.length)];
  const { rowClues, colClues } = generateClues(puzzle.grid);
  return {
    grid: puzzle.grid,
    rowClues,
    colClues,
    size: puzzle.grid.length,
  };
}

export default function Nonogram() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } = useGame('nonogram');
  const { t } = useLocale();

  const [puzzle, setPuzzle] = useState<NonogramPuzzle | null>(null);
  const [board, setBoard] = useState<CellState[][]>([]);
  const [diff, setDiff] = useState<Difficulty>('easy');
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [mode, setMode] = useState<'fill' | 'cross'>('fill');

  // Drag state for smooth painting
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<CellState | null>(null);

  const handleStart = () => {
    const p = selectPuzzle(diff);
    setPuzzle(p);

    // Initialize empty board
    const emptyBoard = Array(p.size)
      .fill(0)
      .map(() => Array(p.size).fill('empty'));
    setBoard(emptyBoard);

    setGameOver(false);
    setResult(null);
    startGame(diff);
  };

  const checkWin = useCallback(
    (currentBoard: CellState[][]) => {
      if (!puzzle) return false;

      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          const isFilled = currentBoard[r][c] === 'filled';
          const shouldBeFilled = puzzle.grid[r][c] === 1;

          // If a cell is filled when it shouldn't be, or empty when it should be filled
          if (isFilled !== shouldBeFilled) {
            return false;
          }
        }
      }
      return true;
    },
    [puzzle]
  );

  const handleWin = useCallback(async () => {
    setGameOver(true);
    endGame();

    // Calculate score based on difficulty and size
    const baseScore = diff === 'easy' ? 100 : diff === 'medium' ? 250 : 500;
    addScore(baseScore);

    const res = await submitScore();
    if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
  }, [diff, addScore, endGame, submitScore]);

  const handleCellAction = useCallback(
    (r: number, c: number, actionMode?: CellState) => {
      if (gameOver || !isPlaying) return;

      setBoard((prev) => {
        const newBoard = [...prev.map((row) => [...row])];
        const currentState = newBoard[r][c];

        // Determine what state to apply
        let targetState: CellState;

        if (actionMode) {
          // If an explicit action mode was provided (during drag)
          targetState = actionMode;
        } else {
          // Toggle logic for single clicks
          if (mode === 'fill') {
            targetState = currentState === 'filled' ? 'empty' : 'filled';
          } else {
            targetState = currentState === 'crossed' ? 'empty' : 'crossed';
          }
        }

        newBoard[r][c] = targetState;

        // Only check win if we filled something
        if (targetState === 'filled' && checkWin(newBoard)) {
          setTimeout(handleWin, 100);
        }

        return newBoard;
      });
    },
    [gameOver, isPlaying, mode, checkWin, handleWin]
  );

  const handleTimeUp = useCallback(async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
  }, [endGame, submitScore]);

  // Pointer events for drag-to-paint
  const onPointerDown = (r: number, c: number, e: React.PointerEvent) => {
    if (gameOver || !isPlaying) return;

    e.preventDefault();
    setIsDragging(true);

    const currentState = board[r][c];
    let action: CellState;

    if (mode === 'fill') {
      action = currentState === 'filled' ? 'empty' : 'filled';
    } else {
      action = currentState === 'crossed' ? 'empty' : 'crossed';
    }

    setDragAction(action);
    handleCellAction(r, c, action);
  };

  const onPointerEnter = (r: number, c: number) => {
    if (isDragging && dragAction) {
      handleCellAction(r, c, dragAction);
    }
  };

  useEffect(() => {
    const handlePointerUp = () => {
      setIsDragging(false);
      setDragAction(null);
    };

    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('game.nonogram.title')}</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.nonogram.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: "🔢", text: "Angka di tepi = blok berisi berurutan (contoh: '3 2' = blok 3 lalu blok 2 terpisah)" },
            { emoji: "👆", text: "Tap cell untuk mengisi (hitam), tap lagi untuk tandai × (kosong)" },
            { emoji: "🎨", text: "Isi semua cell dengan benar untuk mengungkap gambar tersembunyi!" },
          ]}
        />
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
          {t('game.start')}
        </button>
      </div>
    );
  }

  const timeLimit = diff === 'easy' ? 300 : diff === 'medium' ? 600 : 900;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex w-full max-w-md items-center justify-between">
        <Timer
          initialSeconds={timeLimit}
          onTimeUp={handleTimeUp}
          isRunning={isPlaying && !gameOver}
        />

        {/* Toggle Mode */}
        <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setMode('fill')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-bold transition-all',
              mode === 'fill'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300'
            )}
          >
            Isi
          </button>
          <button
            onClick={() => setMode('cross')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-bold transition-all',
              mode === 'cross'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-300'
            )}
          >
            Silang (X)
          </button>
        </div>

        <ScoreBoard score={score} />
        <button onClick={pauseGame} className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800' aria-label={t('game.pause_label')}>
          <Pause className='h-4 w-4' />
        </button>
      </div>

      {puzzle && (
        <div className="max-w-full overflow-auto p-4">
          <div className="inline-block select-none" style={{ touchAction: 'none' }}>
            {/* Top Clues */}
            <div className="ml-[60px] flex sm:ml-[80px]">
              {puzzle.colClues.map((clueCol, c) => (
                <div
                  key={`col-${c}`}
                  className="flex h-24 w-8 flex-col items-center justify-end border-r border-gray-200 bg-gray-50 pb-2 sm:h-32 sm:w-10 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  {clueCol.map((num, i) => (
                    <span
                      key={i}
                      className="text-xs font-bold leading-tight text-gray-700 sm:text-sm dark:text-slate-300"
                    >
                      {num === 0 ? '' : num}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            {/* Grid with Left Clues */}
            <div>
              {board.map((row, r) => (
                <div key={`row-${r}`} className="flex">
                  {/* Left Clues */}
                  <div className="flex h-8 w-[60px] items-center justify-end border-b border-gray-200 bg-gray-50 pr-2 sm:h-10 sm:w-[80px] dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex gap-1.5">
                      {puzzle.rowClues[r].map((num, i) => (
                        <span
                          key={i}
                          className="text-xs font-bold text-gray-700 sm:text-sm dark:text-slate-300"
                        >
                          {num === 0 ? '' : num}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Playable Cells */}
                  {row.map((cellState, c) => (
                    <div
                      key={`cell-${r}-${c}`}
                      onPointerDown={(e) => onPointerDown(r, c, e)}
                      onPointerEnter={() => onPointerEnter(r, c)}
                      className={cn(
                        'flex h-8 w-8 cursor-pointer items-center justify-center border-b border-r transition-colors sm:h-10 sm:w-10',
                        (c + 1) % 5 === 0
                          ? 'border-r-gray-400 dark:border-r-slate-500'
                          : 'border-gray-200 dark:border-slate-700',
                        (r + 1) % 5 === 0
                          ? 'border-b-gray-400 dark:border-b-slate-500'
                          : 'border-gray-200 dark:border-slate-700',
                        cellState === 'filled'
                          ? 'bg-indigo-600 dark:bg-indigo-500'
                          : 'bg-white hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-800'
                      )}
                    >
                      {cellState === 'crossed' && (
                        <span className="select-none text-xl font-bold leading-none text-rose-500">
                          ×
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="nonogram"
            gameName="Nonogram"
            onReplay={handleStart}
            description={t('game.done')}
          />
        </div>
      )}
    </div>
  );
}
