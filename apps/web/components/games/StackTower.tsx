'use client';

import { Difficulty } from '@/types/game';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Flame, Pause, Play, RotateCcw, Trophy, Zap } from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { useSoundStore } from '@/lib/stores/soundStore';
import { cn } from '@/lib/utils/cn';
import { haptics } from '@/lib/utils/haptics';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';

interface Block {
  x: number;
  y: number;
  width: number;
  color: string;
}

interface FallingPiece {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  vy: number;
}

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 480;
const BLOCK_HEIGHT = 28;

export default function StackTower() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore } = useGame(
    'stack-tower',
    'Stack Tower',
    'arcade'
  );
  const { t } = useLocale();
  const playSound = useSoundStore((s) => s.playSound);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [diff, setDiff] = useState<Difficulty>('medium');
  const [level, setLevel] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  // Mutable game state ref for high-fps animation loop
  const stateRef = useRef<{
    blocks: Block[];
    falling: FallingPiece[];
    currentX: number;
    currentWidth: number;
    direction: number; // 1 or -1
    speed: number;
    cameraY: number;
    targetCameraY: number;
    isRunning: boolean;
    combo: number;
    maxCombo: number;
    score: number;
    level: number;
    diff: Difficulty;
  }>({
    blocks: [],
    falling: [],
    currentX: 0,
    currentWidth: 160,
    direction: 1,
    speed: 3,
    cameraY: 0,
    targetCameraY: 0,
    isRunning: false,
    combo: 0,
    maxCombo: 0,
    score: 0,
    level: 0,
    diff: 'medium',
  });

  const getBlockColor = (index: number) => {
    // Elegant cyclical pastel/vibrant hues
    const hue = (index * 14 + 180) % 360;
    return `hsl(${hue}, 80%, 55%)`;
  };

  const initGame = useCallback((selectedDiff: Difficulty) => {
    const startW = selectedDiff === 'easy' ? 200 : selectedDiff === 'medium' ? 160 : 120;
    const baseSpeed = selectedDiff === 'easy' ? 2.5 : selectedDiff === 'medium' ? 3.5 : 5.0;

    const baseBlock: Block = {
      x: (CANVAS_WIDTH - startW) / 2,
      y: CANVAS_HEIGHT - BLOCK_HEIGHT * 2,
      width: startW,
      color: getBlockColor(0),
    };

    stateRef.current = {
      blocks: [baseBlock],
      falling: [],
      currentX: 0,
      currentWidth: startW,
      direction: 1,
      speed: baseSpeed,
      cameraY: 0,
      targetCameraY: 0,
      isRunning: true,
      combo: 0,
      maxCombo: 0,
      score: 0,
      level: 0,
      diff: selectedDiff,
    };

    setLevel(0);
    setCombo(0);
    setMaxCombo(0);
    setGameOver(false);
    setResult(null);
  }, []);

  const handleStart = (selectedDiff: Difficulty = diff) => {
    setDiff(selectedDiff);
    initGame(selectedDiff);
    startGame(selectedDiff);
  };

  const handleFinish = useCallback(async () => {
    stateRef.current.isRunning = false;
    setGameOver(true);
    endGame();
    playSound('lose');
    haptics.error();

    const res = await submitScore(stateRef.current.score);
    setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
  }, [endGame, playSound, submitScore]);

  // Player action: place the current block
  const placeBlock = useCallback(() => {
    const s = stateRef.current;
    if (!s.isRunning) return;

    const topBlock = s.blocks[s.blocks.length - 1];
    const diffX = s.currentX - topBlock.x;
    const absDiff = Math.abs(diffX);

    // Perfect placement tolerance: 4 pixels
    const isPerfect = absDiff <= 4;

    if (absDiff >= s.currentWidth) {
      // Missed completely!
      s.falling.push({
        x: s.currentX,
        y: topBlock.y - BLOCK_HEIGHT,
        width: s.currentWidth,
        height: BLOCK_HEIGHT,
        color: getBlockColor(s.blocks.length),
        vy: 1,
      });
      handleFinish();
      return;
    }

    let newWidth = s.currentWidth;
    let newX = s.currentX;

    if (isPerfect) {
      // Snap to perfect!
      newX = topBlock.x;
      s.combo += 1;
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;

      // Bonus growth every 5 combo
      if (s.combo % 5 === 0 && newWidth < 220) {
        newWidth = Math.min(newWidth + 15, 220);
      }

      playSound('correct');
      haptics.success();
      const pts = 50 + s.combo * 20;
      s.score += pts;
      addScore(pts);
    } else {
      // Sliced overhang!
      newWidth = s.currentWidth - absDiff;
      s.combo = 0;

      // Create falling sliced piece
      const fallingX = diffX > 0 ? topBlock.x + topBlock.width : s.currentX;
      s.falling.push({
        x: fallingX,
        y: topBlock.y - BLOCK_HEIGHT,
        width: absDiff,
        height: BLOCK_HEIGHT,
        color: getBlockColor(s.blocks.length),
        vy: 1,
      });

      playSound('click');
      haptics.light();
      s.score += 25;
      addScore(25);
    }

    if (diffX > 0 && !isPerfect) {
      newX = topBlock.x;
    }

    const newBlock: Block = {
      x: newX,
      y: topBlock.y - BLOCK_HEIGHT,
      width: newWidth,
      color: getBlockColor(s.blocks.length),
    };

    s.blocks.push(newBlock);
    s.currentWidth = newWidth;
    s.currentX = 0;
    s.direction = 1;
    s.level += 1;

    // Gradual speed acceleration
    s.speed = Math.min(s.speed + 0.08, 9.0);

    // Smooth camera shift up as tower climbs
    if (s.blocks.length > 5) {
      s.targetCameraY = (s.blocks.length - 5) * BLOCK_HEIGHT;
    }

    setLevel(s.level);
    setCombo(s.combo);
    setMaxCombo(s.maxCombo);
  }, [addScore, handleFinish, playSound]);

  // Main Canvas render & physics loop
  useEffect(() => {
    let animationId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const s = stateRef.current;

      // Update camera smooth lerp
      s.cameraY += (s.targetCameraY - s.cameraY) * 0.1;

      // Clear canvas with subtle gradient
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background subtle grid / depth
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      // Apply camera vertical scroll
      ctx.translate(0, s.cameraY);

      // 1. Draw stacked blocks
      for (let i = 0; i < s.blocks.length; i++) {
        const b = s.blocks[i];
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.width, BLOCK_HEIGHT - 2, 4);
        ctx.fill();

        // Top glossy highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(b.x + 2, b.y, b.width - 4, 3);
      }

      // 2. Update & Draw falling pieces
      for (let i = s.falling.length - 1; i >= 0; i--) {
        const f = s.falling[i];
        f.y += f.vy;
        f.vy += 0.45; // gravity

        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.max(0, 1 - (f.y - (CANVAS_HEIGHT - s.cameraY)) / 200);
        ctx.beginPath();
        ctx.roundRect(f.x, f.y, f.width, f.height - 2, 4);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (f.y > CANVAS_HEIGHT + 300) {
          s.falling.splice(i, 1);
        }
      }

      // 3. Update & Draw active sliding block
      if (s.isRunning && s.blocks.length > 0) {
        s.currentX += s.speed * s.direction;
        if (s.currentX + s.currentWidth >= CANVAS_WIDTH) {
          s.currentX = CANVAS_WIDTH - s.currentWidth;
          s.direction = -1;
        } else if (s.currentX <= 0) {
          s.currentX = 0;
          s.direction = 1;
        }

        const activeY = s.blocks[s.blocks.length - 1].y - BLOCK_HEIGHT;
        ctx.fillStyle = getBlockColor(s.blocks.length);
        ctx.beginPath();
        ctx.roundRect(s.currentX, activeY, s.currentWidth, BLOCK_HEIGHT - 2, 4);
        ctx.fill();

        // Top glossy highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(s.currentX + 2, activeY, s.currentWidth - 4, 3);
      }

      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowDown') {
        e.preventDefault();
        placeBlock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [placeBlock]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 text-white font-black">
          <Box className="h-8 w-8" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Stack Tower</h1>
          <p className="max-w-md text-gray-500 dark:text-slate-400">
            Tumpuk balok setinggi mungkin! Presisi timing adalah kunci. Bagian balok yang meleset
            akan terpotong.
          </p>
        </div>

        <HowToPlay
          steps={[
            { emoji: '🧱', text: 'Tap layar atau tekan Spasi saat balok pas di atas balok bawah' },
            {
              emoji: '✂️',
              text: 'Bagian balok yang keluar dari batas akan terpotong dan mengecil',
            },
            {
              emoji: '✨',
              text: 'Dapatkan "Perfect" beruntun untuk combo poin dan mengembalikan ukuran balok!',
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
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {d === 'easy' ? 'Mudah (Lebar)' : d === 'medium' ? 'Sedang' : 'Sulit (Cepat)'}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleStart(diff)}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-10 py-4 text-xl font-black text-white shadow-lg shadow-blue-500/30 transition-transform active:scale-95 hover:brightness-105"
        >
          <Play className="h-6 w-6 fill-current" />
          Mulai Susun
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 max-w-sm mx-auto select-none">
      {/* HUD Bar */}
      <div className="flex w-full items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Lantai:</span>
            <span className="font-mono text-lg font-black text-indigo-600 dark:text-indigo-400">
              {level}
            </span>
          </div>

          {combo > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Flame className="h-3.5 w-3.5 fill-current" />
              {combo}x
            </span>
          )}
        </div>

        <ScoreBoard score={score} />
      </div>

      {/* Canvas Game Area */}
      {!gameOver ? (
        <div
          onClick={placeBlock}
          className="relative cursor-pointer overflow-hidden rounded-3xl border-4 border-slate-700 shadow-2xl active:opacity-95"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block h-full w-full touch-none"
          />

          <div className="pointer-events-none absolute bottom-4 inset-x-0 text-center">
            <span className="rounded-full bg-slate-900/60 backdrop-blur-sm px-4 py-1.5 text-xs font-bold text-slate-300">
              Tap layar atau Spasi untuk tumpuk
            </span>
          </div>
        </div>
      ) : null}

      {/* Result Screen */}
      {gameOver && result && (
        <div className="w-full">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="stack-tower"
            gameName="Stack Tower"
            onReplay={() => handleStart(diff)}
            description={`Tinggi Menara: ${level} Lantai | Max Combo: ${maxCombo}x`}
            breakdown={[
              { label: 'Tinggi Menara', value: `${level} Lantai` },
              { label: 'Max Combo Perfect', value: `${maxCombo}x` },
              { label: 'Skor Akhir', value: score },
              { label: 'Tingkat Kesulitan', value: diff.toUpperCase() },
            ]}
          />
        </div>
      )}
    </div>
  );
}
