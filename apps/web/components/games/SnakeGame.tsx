'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { cn } from '@/lib/utils/cn';
import { ResultScreen } from '@/components/ui/ResultScreen';

const CELL = 20;
const COLS = 20;
const ROWS = 20;
const W = COLS * CELL;
const H = ROWS * CELL;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pt = { x: number; y: number };

function rand(max: number) {
  return Math.floor(Math.random() * max);
}

function newFood(snake: Pt[]): Pt {
  let f: Pt;
  do {
    f = { x: rand(COLS), y: rand(ROWS) };
  } while (snake.some((s) => s.x === f.x && s.y === f.y));
  return f;
}

interface Props {
  isDaily?: boolean;
}

export default function SnakeGame({ isDaily }: Props) {
  const game = useGame('snake', 'Snake Classic', 'arcade');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }],
    dir: 'RIGHT' as Dir,
    nextDir: 'RIGHT' as Dir,
    food: { x: 15, y: 10 },
    score: 0,
    alive: true,
  });
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  const speed = game.difficulty === 'easy' ? 180 : game.difficulty === 'medium' ? 110 : 65;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { snake, food } = stateRef.current;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += CELL) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // food
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // snake
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#6366f1' : `hsl(${240 - i * 3}, 70%, ${60 - i * 0.5}%)`;
      const r = isHead ? 6 : 4;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, r);
      ctx.fill();
    });
  }, []);

  const tick = useCallback(async () => {
    const s = stateRef.current;
    if (!s.alive) return;

    s.dir = s.nextDir;
    const head = s.snake[0];
    const next: Pt = {
      x: (head.x + (s.dir === 'RIGHT' ? 1 : s.dir === 'LEFT' ? -1 : 0) + COLS) % COLS,
      y: (head.y + (s.dir === 'DOWN' ? 1 : s.dir === 'UP' ? -1 : 0) + ROWS) % ROWS,
    };

    if (s.snake.slice(1).some((seg) => seg.x === next.x && seg.y === next.y)) {
      s.alive = false;
      clearInterval(loopRef.current!);
      game.setScore(s.score);
      setDisplayScore(s.score);
      setGameOver(true);
      game.endGame();
      const res = await game.submitScore();
      setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
      return;
    }

    const ate = next.x === s.food.x && next.y === s.food.y;
    s.snake = [next, ...s.snake];
    if (ate) {
      s.score += 10;
      setDisplayScore(s.score);
      s.food = newFood(s.snake);
    } else {
      s.snake.pop();
    }

    draw();
  }, [draw, game]);

  const startRound = useCallback(() => {
    if (loopRef.current) clearInterval(loopRef.current);
    const initSnake = [{ x: 10, y: 10 }];
    stateRef.current = {
      snake: initSnake,
      dir: 'RIGHT',
      nextDir: 'RIGHT',
      food: newFood(initSnake),
      score: 0,
      alive: true,
    };
    setGameOver(false);
    setResult(null);
    setDisplayScore(0);
    draw();
    loopRef.current = setInterval(tick, speed);
  }, [draw, tick, speed]);

  useEffect(() => {
    if (game.isPlaying) startRound();
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [game.isPlaying]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      const s = stateRef.current;
      const opposite: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
      if (d !== opposite[s.dir]) s.nextDir = d;
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSwipe = useCallback(() => {
    let startX = 0,
      startY = 0;
    const touch = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const s = stateRef.current;
      const opposite: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
      let d: Dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        d = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        d = dy > 0 ? 'DOWN' : 'UP';
      }
      if (d !== opposite[s.dir]) s.nextDir = d;
    };
    const canvas = canvasRef.current;
    canvas?.addEventListener('touchstart', touch, { passive: true });
    canvas?.addEventListener('touchend', end, { passive: true });
    return () => {
      canvas?.removeEventListener('touchstart', touch);
      canvas?.removeEventListener('touchend', end);
    };
  }, []);

  useEffect(handleSwipe, [handleSwipe]);

  if (!game.isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Snake Classic</h2>
        <p className="text-center text-gray-500 dark:text-slate-400">
          Makan bola oranye, hindari menabrak dirimu sendiri!
          <br />
          <span className="text-sm">Desktop: WASD / Arrow Keys • Mobile: Swipe</span>
        </p>
        <div className="flex gap-3">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => game.startGame(d)}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold capitalize text-white hover:bg-indigo-700"
            >
              {d === 'easy' ? 'Lambat' : d === 'medium' ? 'Sedang' : 'Cepat'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <ResultScreen
        score={displayScore}
        xpEarned={result?.xp ?? 0}
        isNewHighscore={result?.highscore}
        gameSlug="snake"
        gameName="Snake Classic"
        description={`Panjang ${stateRef.current.snake.length} • ${displayScore / 10} makanan`}
        onReplay={() => game.startGame(game.difficulty)}
      />
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 py-2 sm:py-4">
      <div className="flex items-center gap-4 text-sm font-bold">
        <span className="text-indigo-600 dark:text-indigo-400">Skor: {displayScore}</span>
        <span className="text-gray-500 dark:text-slate-400">
          Panjang: {stateRef.current.snake.length}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="h-auto w-[min(96vw,70dvh,520px)] rounded-xl border border-slate-700 shadow-xl"
        style={{ touchAction: 'none' }}
      />
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {[
          { label: '↑', dir: 'UP' as Dir, col: 2 },
          { label: '←', dir: 'LEFT' as Dir, col: 1 },
          { label: '↓', dir: 'DOWN' as Dir, col: 2 },
          { label: '→', dir: 'RIGHT' as Dir, col: 3 },
        ].map(({ label, dir, col }) => (
          <button
            key={dir}
            onPointerDown={() => {
              const s = stateRef.current;
              const opposite: Record<Dir, Dir> = {
                UP: 'DOWN',
                DOWN: 'UP',
                LEFT: 'RIGHT',
                RIGHT: 'LEFT',
              };
              if (dir !== opposite[s.dir]) s.nextDir = dir;
            }}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-xl text-white active:bg-slate-500',
              col === 1 && 'col-start-1',
              col === 2 && 'col-start-2',
              col === 3 && 'col-start-3'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
