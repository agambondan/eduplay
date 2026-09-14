'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasEngine, Entity, InputManager } from '@/lib/game-engines/CanvasEngine';
import { useGame } from '@/lib/hooks/useGame';
import { useSoundStore } from '@/lib/stores/soundStore';
import { cn } from '@/lib/utils/cn';
import { haptics } from '@/lib/utils/haptics';
import { ResultScreen } from '@/components/ui/ResultScreen';

const CELL = 20;
const COLS = 20;
const ROWS = 20;
const W = COLS * CELL;
const H = ROWS * CELL;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pt = { x: number; y: number };

const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
const DIR_VEC: Record<Dir, Pt> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

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

class SnakeEntity extends Entity {
  segments: Pt[];
  dir: Dir = 'RIGHT';
  nextDir: Dir = 'RIGHT';
  food: Pt;
  alive = true;
  score = 0;
  moveTimer = 0;
  moveInterval: number;

  onEat: () => void;
  onDie: (score: number) => void;

  constructor(moveInterval: number, onEat: () => void, onDie: (score: number) => void) {
    super();
    this.segments = [{ x: 10, y: 10 }];
    this.food = newFood(this.segments);
    this.moveInterval = moveInterval;
    this.onEat = onEat;
    this.onDie = onDie;
  }

  setDirection(d: Dir) {
    if (d !== OPPOSITE[this.dir]) this.nextDir = d;
  }

  update(dt: number, input: InputManager) {
    if (!this.alive) return;

    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('w')) this.setDirection('UP');
    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('s')) this.setDirection('DOWN');
    if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('a')) this.setDirection('LEFT');
    if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('d')) this.setDirection('RIGHT');

    this.moveTimer += dt;
    if (this.moveTimer < this.moveInterval) return;
    this.moveTimer = 0;

    this.dir = this.nextDir;
    const head = this.segments[0];
    const v = DIR_VEC[this.dir];
    const next: Pt = {
      x: (head.x + v.x + COLS) % COLS,
      y: (head.y + v.y + ROWS) % ROWS,
    };

    if (this.segments.slice(1).some((seg) => seg.x === next.x && seg.y === next.y)) {
      this.alive = false;
      this.onDie(this.score);
      return;
    }

    const ate = next.x === this.food.x && next.y === this.food.y;
    this.segments = [next, ...this.segments];
    if (ate) {
      this.score += 10;
      this.food = newFood(this.segments);
      this.onEat();
    } else {
      this.segments.pop();
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(
      this.food.x * CELL + CELL / 2,
      this.food.y * CELL + CELL / 2,
      CELL / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    this.segments.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#6366f1' : `hsl(${240 - i * 3}, 70%, ${60 - i * 0.5}%)`;
      const r = isHead ? 6 : 4;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, r);
      ctx.fill();
    });
  }
}

class GridBackground extends Entity {
  update() {}

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

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
  }
}

interface Props {
  isDaily?: boolean;
}

export default function SnakeGame({ isDaily }: Props) {
  const { playSound } = useSoundStore();
  const game = useGame('snake', 'Snake Classic', 'arcade');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const snakeRef = useRef<SnakeEntity | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  const speedMap = { easy: 0.18, medium: 0.11, hard: 0.065 };

  const handleEat = useCallback(() => {
    playSound('pop');
    haptics.medium();
    if (snakeRef.current) {
      game.setScore(snakeRef.current.score);
      setDisplayScore(snakeRef.current.score);
    }
  }, [playSound, game]);

  const handleDie = useCallback(
    (finalScore: number) => {
      playSound('lose');
      haptics.error();
      game.setScore(finalScore);
      setDisplayScore(finalScore);
      setGameOver(true);
      game.endGame();
      game.submitScore().then((res) => {
        setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
      });
    },
    [playSound, game]
  );

  const startRound = useCallback(
    (difficulty: 'easy' | 'medium' | 'hard') => {
      setGameOver(false);
      setResult(null);
      setDisplayScore(0);

      const canvas = canvasRef.current;
      if (!canvas) return;

      if (engineRef.current) engineRef.current.stop();

      const engine = new CanvasEngine(canvas, {
        width: W,
        height: H,
        fixedTimestep: 1 / 60,
        pixelRatio: 1,
      });
      engineRef.current = engine;

      const bg = new GridBackground();
      bg.zIndex = 0;

      const snake = new SnakeEntity(speedMap[difficulty], handleEat, handleDie);
      snake.zIndex = 1;
      snakeRef.current = snake;

      engine.entities.add(bg);
      engine.entities.add(snake);

      engine.start();
      game.startGame(difficulty);
    },
    [game, handleEat, handleDie]
  );

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let startX = 0;
    let startY = 0;
    const touchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const touchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      let d: Dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        d = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        d = dy > 0 ? 'DOWN' : 'UP';
      }
      snakeRef.current?.setDirection(d);
    };

    canvas.addEventListener('touchstart', touchStart, { passive: true });
    canvas.addEventListener('touchend', touchEnd, { passive: true });
    return () => {
      canvas.removeEventListener('touchstart', touchStart);
      canvas.removeEventListener('touchend', touchEnd);
    };
  }, []);

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
              onClick={() => startRound(d)}
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
        description={`Panjang ${snakeRef.current?.segments.length ?? 1} • ${displayScore / 10} makanan`}
        onReplay={() => startRound(game.difficulty)}
      />
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 py-2 sm:py-4">
      <div className="flex items-center gap-4 text-sm font-bold">
        <span className="text-indigo-600 dark:text-indigo-400">Skor: {displayScore}</span>
        <span className="text-gray-500 dark:text-slate-400">
          Panjang: {snakeRef.current?.segments.length ?? 1}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="h-auto w-full max-w-[min(520px,70dvh)] rounded-xl border border-slate-700 shadow-xl"
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
            onPointerDown={() => snakeRef.current?.setDirection(dir)}
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
