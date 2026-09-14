'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause } from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useIsTouchDevice } from '@/lib/hooks/useIsTouchDevice';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import {
  CanvasEngine,
  Entity,
} from '@/lib/game-engines/CanvasEngine';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const GRADIENT_COLORS: Record<string, [string, string]> = {
  '#4f46e5': ['#6366f1', '#3730a3'],
  '#10b981': ['#34d399', '#059669'],
  '#f59e0b': ['#fbbf24', '#d97706'],
  '#ef4444': ['#f87171', '#dc2626'],
  '#8b5cf6': ['#a78bfa', '#7c3aed'],
};
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 640;

class BackgroundGrid extends Entity {
  update() {}

  render(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  }
}

class BubbleEntity extends Entity {
  radius = 25;
  value = 1;
  color = '#4f46e5';

  constructor(x: number, y: number, value: number, color: string) {
    super();
    this.position = { x, y };
    this.value = value;
    this.color = color;
  }

  update(dt: number) {
    this.position.y += 0.5 * dt * 60;
  }

  render(ctx: CanvasRenderingContext2D) {
    const [c1, c2] = GRADIENT_COLORS[this.color] || ['#6366f1', '#3730a3'];

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = this.color + '30';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(
      this.position.x - 5,
      this.position.y - 5,
      0,
      this.position.x,
      this.position.y,
      this.radius
    );
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.position.x - 6, this.position.y - 6, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.value.toString(), this.position.x, this.position.y);
  }

  isOffScreen(): boolean {
    return this.position.y + this.radius > CANVAS_HEIGHT - 20;
  }
}

class ProjectileEntity extends Entity {
  radius = 10;
  value = 1;

  constructor(x: number, y: number, dx: number, dy: number, value: number) {
    super();
    this.position = { x, y };
    this.velocity = { x: dx, y: dy };
    this.value = value;
  }

  update(dt: number) {
    this.position.x += this.velocity.x * dt * 60;
    this.position.y += this.velocity.y * dt * 60;
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99,102,241,0.2)';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    const pGrad = ctx.createRadialGradient(
      this.position.x - 2,
      this.position.y - 2,
      0,
      this.position.x,
      this.position.y,
      this.radius
    );
    pGrad.addColorStop(0, '#818cf8');
    pGrad.addColorStop(1, '#3730a3');
    ctx.fillStyle = pGrad;
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.value.toString(), this.position.x, this.position.y);
  }

  isOffScreen(): boolean {
    return (
      this.position.y <= 0 ||
      this.position.x <= 0 ||
      this.position.x >= CANVAS_WIDTH
    );
  }
}

class ParticleEntity extends Entity {
  life = 1;
  size = 4;
  color = '#fff';

  constructor(x: number, y: number, vx: number, vy: number, color: string) {
    super();
    this.position = { x, y };
    this.velocity = { x: vx, y: vy };
    this.color = color;
    this.size = 4 + Math.random() * 4;
    this.life = 1;
  }

  update(dt: number) {
    this.position.x += this.velocity.x * dt * 60;
    this.position.y += this.velocity.y * dt * 60;
    this.velocity.y += 0.05 * dt * 60;
    this.life -= 0.03 * dt * 60;
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }
}

class CannonEntity extends Entity {
  radius = 30;

  constructor() {
    super();
    this.position = { x: 300, y: CANVAS_HEIGHT };
  }

  update() {}

  render(ctx: CanvasRenderingContext2D) {
    const cGrad = ctx.createRadialGradient(
      this.position.x,
      this.position.y - 10,
      0,
      this.position.x,
      this.position.y,
      35
    );
    cGrad.addColorStop(0, '#6366f1');
    cGrad.addColorStop(1, '#312e81');
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, Math.PI, 0);
    ctx.fillStyle = cGrad;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y - 5, 10, Math.PI, 0);
    ctx.fillStyle = '#4338ca';
    ctx.fill();
    ctx.closePath();
  }
}

class GameControllerEntity extends Entity {
  cannon: CannonEntity;
  bubbles: BubbleEntity[] = [];
  projectiles: ProjectileEntity[] = [];
  particles: ParticleEntity[] = [];
  targetSum = 0;
  lastSpawn = 0;
  onGameOver: () => void;
  onScore: (delta: number) => void;
  onNewTarget: (sum: number) => void;

  constructor(
    cannon: CannonEntity,
    onGameOver: () => void,
    onScore: (delta: number) => void,
    onNewTarget: (sum: number) => void
  ) {
    super();
    this.cannon = cannon;
    this.onGameOver = onGameOver;
    this.onScore = onScore;
    this.onNewTarget = onNewTarget;
  }

  update(dt: number) {
    const now = performance.now();

    if (now - this.lastSpawn > 2000) {
      this.spawnBubble();
      this.lastSpawn = now;
    }

    for (const b of this.bubbles) {
      b.update(dt);
    }

    for (const p of this.projectiles) {
      p.update(dt);
    }

    for (const pt of this.particles) {
      pt.update(dt);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.isOffScreen()) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (let j = this.bubbles.length - 1; j >= 0; j--) {
        const b = this.bubbles[j];
        const dist = Math.sqrt(
          (p.position.x - b.position.x) ** 2 + (p.position.y - b.position.y) ** 2
        );
        if (dist < p.radius + b.radius + 10) {
          for (let k = 0; k < 12; k++) {
            const angle = (Math.PI * 2 * k) / 12;
            const speed = 2 + Math.random() * 3;
            this.particles.push(
              new ParticleEntity(
                b.position.x,
                b.position.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                b.color
              )
            );
          }

          if (p.value + b.value === this.targetSum) {
            this.onScore(20);
            this.bubbles.splice(j, 1);
            this.targetSum = Math.floor(Math.random() * 15) + 5;
            this.onNewTarget(this.targetSum);
          } else {
            this.onScore(-5);
          }
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (this.bubbles[i].isOffScreen()) {
        this.onGameOver();
        break;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const b of this.bubbles) {
      b.render(ctx);
    }
    for (const p of this.projectiles) {
      p.render(ctx);
    }
    for (const pt of this.particles) {
      pt.render(ctx);
    }
  }

  spawnBubble() {
    const radius = 25;
    const x = Math.random() * (CANVAS_WIDTH - radius * 2) + radius;
    const value = Math.floor(Math.random() * 10) + 1;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.bubbles.push(new BubbleEntity(x, -radius, value, color));
  }

  fireProjectile(targetX: number, targetY: number) {
    const dx = targetX - this.cannon.position.x;
    const dy = targetY - this.cannon.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const speed = 7;
    const value = Math.floor(Math.random() * 9) + 1;
    this.projectiles.push(
      new ProjectileEntity(
        this.cannon.position.x,
        this.cannon.position.y - 10,
        (dx / dist) * speed,
        (dy / dist) * speed,
        value
      )
    );
  }
}

export default function BubbleShooter() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } =
    useGame('bubble-shooter');
  const { t } = useLocale();
  const isTouch = useIsTouchDevice();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [targetSum, setTargetSum] = useState(0);

  const handleGameOver = useCallback(() => {
    setGameOver(true);
    engineRef.current?.stop();
    endGame();
    submitScore().then((res) => {
      setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
    });
  }, [endGame, submitScore]);

  const handleScore = useCallback(
    (delta: number) => {
      addScore(delta);
    },
    [addScore]
  );

  const handleNewTarget = useCallback((sum: number) => {
    setTargetSum(sum);
  }, []);

  const handleStart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (engineRef.current) engineRef.current.stop();

    const engine = new CanvasEngine(canvas, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      fixedTimestep: 1 / 60,
      pixelRatio: 1,
    });
    engineRef.current = engine;

    const bg = new BackgroundGrid();
    bg.zIndex = 0;

    const cannon = new CannonEntity();
    cannon.zIndex = 2;

    const controller = new GameControllerEntity(
      cannon,
      handleGameOver,
      handleScore,
      handleNewTarget
    );
    controller.targetSum = Math.floor(Math.random() * 15) + 5;
    setTargetSum(controller.targetSum);
    controller.zIndex = 3;

    engine.entities.add(bg);
    engine.entities.add(cannon);
    engine.entities.add(controller);

    setGameOver(false);
    setResult(null);
    engine.start();
    startGame('medium');
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const pY = (e.clientY - rect.top) * (canvas.height / rect.height);

    engineRef.current?.entities.getAll().forEach((entity) => {
      if (entity instanceof GameControllerEntity) {
        entity.fireProjectile(pX, pY);
      }
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    engineRef.current?.entities.getAll().forEach((entity) => {
      if (entity instanceof CannonEntity) {
        entity.position.x = x;
      }
    });
  };

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('game.bubble_shooter.title')}
        </h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.bubble_shooter.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: '🎯', text: 'Perhatikan angka TARGET yang ditampilkan di tengah layar' },
            { emoji: '🔢', text: 'Pilih bubble yang nilainya melengkapi target saat dijumlahkan' },
            {
              emoji: '💥',
              text: 'Tembak sebelum waktu habis — semakin cepat semakin besar skormu!',
            },
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
    <div className="flex w-full flex-col items-center gap-4 py-2 sm:py-4">
      <div className="flex w-full max-w-md items-center justify-between">
        <div className="rounded-xl border border-amber-200 bg-amber-100 px-4 py-2 dark:bg-amber-900/40">
          <span className="text-xs font-bold uppercase text-amber-600">
            {t('game.target_sum')}:
          </span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{targetSum}</div>
        </div>
        <ScoreBoard score={score} />
        <button
          onClick={pauseGame}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          aria-label={t('game.pause_label')}
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>

      <div className="relative w-full max-w-[600px] overflow-hidden rounded-2xl border-4 border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          className="block h-auto w-full cursor-crosshair touch-none"
        />
      </div>

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            gameSlug="bubble-shooter"
            gameName="Bubble Shooter Math"
            onReplay={handleStart}
            description={t('game.over')}
          />
        </div>
      )}

      <p className="text-xs text-gray-400">
        {isTouch
          ? 'Tap untuk menembak, geser jari untuk membidik'
          : 'Klik untuk menembak, gerakkan mouse untuk membidik'}
      </p>
    </div>
  );
}