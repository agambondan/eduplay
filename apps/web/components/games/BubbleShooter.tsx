'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';
import { cn } from '@/lib/utils/cn';

interface Bubble {
  x: number;
  y: number;
  radius: number;
  value: number;
  color: string;
  isTarget: boolean;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function BubbleShooter() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore } = useGame('bubble-shooter');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [targetSum, setTargetSum] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const gameState = useRef({
    bubbles: [] as Bubble[],
    cannonX: 300,
    projectiles: [] as { x: number; y: number; dx: number; dy: number; value: number }[],
    lastSpawn: 0,
  });

  const spawnBubble = useCallback(() => {
    const radius = 25;
    const x = Math.random() * (600 - radius * 2) + radius;
    const value = Math.floor(Math.random() * 10) + 1;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    gameState.current.bubbles.push({
      x,
      y: -radius,
      radius,
      value,
      color,
      isTarget: false,
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

      // Draw Cannon (bottom center)
      ctx.beginPath();
      ctx.arc(gameState.current.cannonX, canvas.height, 30, Math.PI, 0);
      ctx.fillStyle = '#3730a3';
      ctx.fill();
      ctx.closePath();

      // Update & Draw Projectiles
      gameState.current.projectiles.forEach((p, pi) => {
        p.x += p.dx;
        p.y += p.dy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(p.value.toString(), p.x, p.y + 4);

        // Collision with bubbles
        gameState.current.bubbles.forEach((b, bi) => {
          const dist = Math.sqrt((p.x - b.x) ** 2 + (p.y - b.y) ** 2);
          if (dist < p.radius + b.radius + 10) {
            // simplified collision
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

      // Update & Draw Bubbles
      gameState.current.bubbles.forEach((b, i) => {
        b.y += 0.5; // slow fall

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(b.value.toString(), b.x, b.y + 6);

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bubble Shooter Math</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          Tembak bubble dengan angka yang jika dijumlahkan dengan bubble target hasilnya pas!
        </p>
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
      <div className="flex w-full max-w-md items-center justify-between">
        <div className="rounded-xl border border-amber-200 bg-amber-100 px-4 py-2 dark:bg-amber-900/40">
          <span className="text-xs font-bold uppercase text-amber-600">Target Sum:</span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{targetSum}</div>
        </div>
        <ScoreBoard score={score} />
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

      {gameOver && (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-black text-red-500">GAME OVER</h2>
          <div className="rounded-2xl border bg-white p-6 shadow-xl dark:bg-slate-800">
            <ScoreBoard score={score} label="Final Score" />
            {result && (
              <p className="mt-2 text-sm font-bold text-gray-500">+{result.xp} XP Earned</p>
            )}
          </div>
          <button
            onClick={handleStart}
            className="rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Main Lagi
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400">Klik untuk menembak, gerakkan mouse untuk membidik</p>
    </div>
  );
}
