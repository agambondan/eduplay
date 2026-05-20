'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pause } from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';

type Board = number[][];
type Direction = 'up' | 'down' | 'left' | 'right';

function createEmptyBoard(): Board {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandomTile(board: Board): Board {
  const empty: [number, number][] = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newBoard = board.map((row) => [...row]);
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function rotateBoard(board: Board): Board {
  const n = board.length;
  return board[0].map((_, c) => board.map((row) => row[c]).reverse());
}

function slideLeft(board: Board): { board: Board; score: number; moved: boolean } {
  let totalScore = 0;
  let moved = false;
  const newBoard = board.map((row) => {
    const filtered = row.filter((v) => v !== 0);
    const merged: number[] = [];
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const val = filtered[i] * 2;
        merged.push(val);
        totalScore += val;
        i += 2;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }
    while (merged.length < 4) merged.push(0);
    if (merged.some((v, idx) => v !== row[idx])) moved = true;
    return merged;
  });
  return { board: newBoard, score: totalScore, moved };
}

function move(board: Board, dir: Direction): { board: Board; score: number; moved: boolean } {
  let rotated = board;
  const rotations: Record<Direction, number> = { left: 0, down: 1, right: 2, up: 3 };
  for (let i = 0; i < rotations[dir]; i++) rotated = rotateBoard(rotated);
  const result = slideLeft(rotated);
  let final = result.board;
  for (let i = 0; i < (4 - rotations[dir]) % 4; i++) final = rotateBoard(final);
  return { board: final, score: result.score, moved: result.moved };
}

function isGameOver(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return false;
      if (c < 3 && board[r][c] === board[r][c + 1]) return false;
      if (r < 3 && board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
}

const TILE_COLORS: Record<number, string> = {
  0: 'bg-gray-200 dark:bg-slate-700',
  2: 'bg-gray-100 text-gray-800 dark:bg-slate-600 dark:text-white',
  4: 'bg-amber-100 text-gray-800 dark:bg-amber-900/40 dark:text-amber-200',
  8: 'bg-orange-300 text-white',
  16: 'bg-orange-400 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-red-500 text-white',
  128: 'bg-amber-400 text-white text-2xl',
  256: 'bg-amber-500 text-white text-2xl',
  512: 'bg-amber-600 text-white text-2xl',
  1024: 'bg-amber-700 text-white text-xl',
  2048: 'bg-yellow-400 text-white text-xl font-black',
};

export default function Game2048() {
  const { t } = useLocale();
  const { score, isPlaying, addScore, setScore, startGame, endGame, submitScore, pauseGame } =
    useGame('2048');
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const handleStart = () => {
    let b = createEmptyBoard();
    b = addRandomTile(b);
    b = addRandomTile(b);
    setBoard(b);
    setGameOver(false);
    setResult(null);
    setScore(0);
    startGame('medium');
  };

  const handleMove = useCallback(
    async (dir: Direction) => {
      if (!isPlaying || gameOver) return;
      const { board: newBoard, score: gained, moved } = move(board, dir);
      if (!moved) return;
      const withTile = addRandomTile(newBoard);
      setBoard(withTile);
      if (gained > 0) addScore(gained);
      if (isGameOver(withTile)) {
        setGameOver(true);
        endGame();
        const res = await submitScore();
        setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
      }
    },
    [board, isPlaying, gameOver, addScore, endGame, submitScore]
  );

  useEffect(() => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };
    const handler = (e: KeyboardEvent) => {
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove]);

  useEffect(() => {
    let startX = 0,
      startY = 0;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? 'right' : 'left');
      else handleMove(dy > 0 ? 'down' : 'up');
    };
    window.addEventListener('touchstart', onStart);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [handleMove]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('game.2048.title')}</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.2048.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: '👆', text: 'Swipe atau gunakan tombol panah untuk menggeser semua tile' },
            { emoji: '🔢', text: 'Dua tile dengan angka sama akan bergabung menjadi 2× lipat' },
            { emoji: '🏆', text: 'Gabungkan terus hingga mencapai tile 2048!' },
          ]}
        />
        <button
          onClick={handleStart}
          className="rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-emerald-600"
        >
          {t('game.start')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-4">
        <ScoreBoard score={score} />
        <button
          onClick={pauseGame}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          aria-label={t('game.pause_label')}
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-xl bg-gray-300 p-2 dark:bg-slate-600">
        {board.flat().map((val, i) => (
          <div
            key={i}
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-lg text-lg font-bold transition-all sm:h-20 sm:w-20',
              TILE_COLORS[val] || 'bg-purple-600 text-lg text-white'
            )}
          >
            {val > 0 ? val : ''}
          </div>
        ))}
      </div>

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="2048"
            gameName={t('game.2048.title')}
            onReplay={handleStart}
            description={t('game.over')}
          />
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-slate-500">{t('game.keyboard_instructions')}</p>
    </div>
  );
}
