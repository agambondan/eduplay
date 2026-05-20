'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause } from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';

interface Bubble {
  x: number;
  y: number;
  radius: number;
  value: number;
  color: string;
  gradient: CanvasGradient;
  isTarget: boolean;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const GRADIENT_COLORS: Record<string, [string, string]> = {
  '#4f46e5': ['#6366f1', '#3730a3'],
  '#10b981': ['#34d399', '#059669'],
  '#f59e0b': ['#fbbf24', '#d97706'],
  '#ef4444': ['#f87171', '#dc2626'],
  '#8b5cf6': ['#a78bfa', '#7c3aed'],
};

export default function BubbleShooter() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } =
    useGame('bubble-shooter');
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [targetSum, setTargetSum] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const gameState = useRef({
    bubbles: [] as Bubble[],
    cannonX: 300,
    projectiles: [] as {
      x: number;
      y: number;
      dx: number;
      dy: number;
      value: number;
      radius: number;
    }[],
    lastSpawn: 0,
    particles: [] as Particle[],
  });

  const spawnBubble = useCallback(() => {
    const radius = 25;
    const x = Math.random() * (600 - radius * 2) + radius;
    const value = Math.floor(Math.random() * 10) + 1;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const [c1, c2] = GRADIENT_COLORS[color];
    const grad = document.createElement('canvas').getContext('2d')!;
    const g = grad.createRadialGradient(0, 0, 0, 0, 0, radius);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);

    gameState.current.bubbles.push({
      x,
      y: -radius,
      radius,
      value,
      color,
      gradient: g,
      isTarget: false,
      opacity: 1,
    });
  }, []);

  const handleStart = () => {
    gameState.current.bubbles = [];
    gameState.current.projectiles = [];
    setTargetSum(Math.floor(Math.random() * 15) + 5);
    setGameOver(false);
    setResult(null);
    startGame('medium');
  };

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn bubbles
      if (time - gameState.current.lastSpawn > 2000) {
        spawnBubble();
        gameState.current.lastSpawn = time;
      }

      // Draw background grid
      ctx.strokeStyle = 'rgba(0,0,0,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Cannon with gradient
      const cGrad = ctx.createRadialGradient(
        gameState.current.cannonX,
        canvas.height - 10,
        0,
        gameState.current.cannonX,
        canvas.height,
        35
      );
      cGrad.addColorStop(0, '#6366f1');
      cGrad.addColorStop(1, '#312e81');
      ctx.beginPath();
      ctx.arc(gameState.current.cannonX, canvas.height, 30, Math.PI, 0);
      ctx.fillStyle = cGrad;
      ctx.fill();
      ctx.closePath();

      // Cannon barrel
      ctx.beginPath();
      ctx.arc(gameState.current.cannonX, canvas.height - 5, 10, Math.PI, 0);
      ctx.fillStyle = '#4338ca';
      ctx.fill();
      ctx.closePath();

      // Draw projectiles with glow
      gameState.current.projectiles.forEach((p, pi) => {
        p.x += p.dx;
        p.y += p.dy;

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,0.2)';
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        const pGrad = ctx.createRadialGradient(p.x - 2, p.y - 2, 0, p.x, p.y, 10);
        pGrad.addColorStop(0, '#818cf8');
        pGrad.addColorStop(1, '#3730a3');
        ctx.fillStyle = pGrad;
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.value.toString(), p.x, p.y);

        // Collision with bubbles
        gameState.current.bubbles.forEach((b, bi) => {
          const dist = Math.sqrt((p.x - b.x) ** 2 + (p.y - b.y) ** 2);
          if (dist < p.radius + b.radius + 10) {
            // Particle burst
            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12;
              const speed = 2 + Math.random() * 3;
              gameState.current.particles.push({
                x: b.x,
                y: b.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: b.color,
                size: 4 + Math.random() * 4,
              });
            }

            if (p.value + b.value === targetSum) {
              addScore(20);
              gameState.current.bubbles.splice(bi, 1);
              setTargetSum(Math.floor(Math.random() * 15) + 5);
            } else {
              addScore(-5);
            }
            gameState.current.projectiles.splice(pi, 1);
          }
        });
      });

      // Update & Draw Particles
      gameState.current.particles.forEach((pt, i) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.05;
        pt.life -= 0.03;

        if (pt.life <= 0) {
          gameState.current.particles.splice(i, 1);
          return;
        }

        ctx.globalAlpha = pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;
      });

      // Update & Draw Bubbles with gradient
      gameState.current.bubbles.forEach((b) => {
        b.y += 0.5;

        // Glow
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = b.color + '30';
        ctx.fill();
        ctx.closePath();

        // Bubble body with gradient
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(b.x - 5, b.y - 5, 0, b.x, b.y, b.radius);
        const [c1, c2] = GRADIENT_COLORS[b.color];
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.closePath();

        // Highlight
        ctx.beginPath();
        ctx.arc(b.x - 6, b.y - 6, b.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.value.toString(), b.x, b.y);

        // Ground collision
        if (b.y + b.radius > canvas.height - 20) {
          setGameOver(true);
          endGame();
          submitScore().then((res) => {
            if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
          });
        }
      });

      // Cleanup off-screen projectiles
      gameState.current.projectiles = gameState.current.projectiles.filter(
        (p) => p.y > 0 && p.x > 0 && p.x < canvas.width
      );

      if (!gameOver && isPlaying) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    animationFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, gameOver, targetSum, addScore, endGame, submitScore, spawnBubble]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - gameState.current.cannonX;
    const dy = mouseY - canvas.height;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const speed = 7;
    gameState.current.projectiles.push({
      x: gameState.current.cannonX,
      y: canvas.height - 10,
      dx: (dx / dist) * speed,
      dy: (dy / dist) * speed,
      value: Math.floor(Math.random() * 9) + 1,
      radius: 10,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameState.current.cannonX = e.clientX - rect.left;
  };

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
    <div className="flex flex-col items-center gap-4 py-6">
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

      <div className="relative overflow-hidden rounded-2xl border-4 border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <canvas
          ref={canvasRef}
          width={600}
          height={500}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="h-auto max-w-full cursor-crosshair"
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

      <p className="text-xs text-gray-400">Klik untuk menembak, gerakkan mouse untuk membidik</p>
    </div>
  );
}
