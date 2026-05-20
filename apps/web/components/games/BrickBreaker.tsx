'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { Timer } from '@/components/ui/Timer';
import { cn } from '@/lib/utils/cn';
import { Pause } from 'lucide-react';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { useLocale } from '@/lib/i18n';

interface Question {
  text: string;
  answer: number;
  options: number[];
}

function generateMathQuestion(): Question {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const answer = a + b;
  const options = new Set<number>([answer]);
  while (options.size < 4) {
    options.add(answer + Math.floor(Math.random() * 10) - 5);
  }
  return {
    text: `${a} + ${b} = ?`,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5),
  };
}

export default function BrickBreaker() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } = useGame('brick-breaker');
  const { t } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Game state refs to avoid re-renders during animation loop
  const gameState = useRef({
    ball: { x: 200, y: 300, dx: 3, dy: -3, radius: 8 },
    paddle: { x: 175, width: 75, height: 10 },
    bricks: [] as { x: number; y: number; status: number; isSpecial: boolean }[],
    brickRows: 5,
    brickCols: 8,
    brickWidth: 60,
    brickHeight: 20,
    brickPadding: 10,
    brickOffsetTop: 30,
    brickOffsetLeft: 30,
    trail: [] as { x: number; y: number; life: number }[],
  });

  const initBricks = useCallback(() => {
    const bricks = [];
    for (let c = 0; c < gameState.current.brickCols; c++) {
      for (let r = 0; r < gameState.current.brickRows; r++) {
        bricks.push({
          x: 0,
          y: 0,
          status: 1,
          isSpecial: Math.random() > 0.85, // 15% chance of being a question brick
        });
      }
    }
    gameState.current.bricks = bricks;
  }, []);

  const handleStart = () => {
    initBricks();
    gameState.current.ball = { x: 200, y: 300, dx: 3, dy: -3, radius: 8 };
    gameState.current.paddle.x = 175;
    setGameOver(false);
    setResult(null);
    setCurrentQuestion(null);
    setIsPaused(false);
    startGame('medium');
  };

  const handleAnswer = (selected: number) => {
    if (!currentQuestion) return;
    if (selected === currentQuestion.answer) {
      addScore(50);
    } else {
      addScore(-10);
    }
    setCurrentQuestion(null);
    setIsPaused(false);
  };

  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

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

      // Draw Bricks with gradient
      const brickColors = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706'];
      const brickGradients: [string, string][] = [
        ['#6366f1', '#3730a3'],
        ['#8b5cf6', '#6d28d9'],
        ['#22d3ee', '#0891b2'],
        ['#34d399', '#059669'],
        ['#fbbf24', '#d97706'],
      ];
      gameState.current.bricks.forEach((b, i) => {
        if (b.status === 1) {
          const bc = Math.floor(i / gameState.current.brickRows);
          const br = i % gameState.current.brickRows;
          const brickX =
            bc * (gameState.current.brickWidth + gameState.current.brickPadding) +
            gameState.current.brickOffsetLeft;
          const brickY =
            br * (gameState.current.brickHeight + gameState.current.brickPadding) +
            gameState.current.brickOffsetTop;
          b.x = brickX;
          b.y = brickY;
          const [g1, g2] = b.isSpecial ? ['#f59e0b', '#b45309'] : brickGradients[br % brickGradients.length];
          const brickGrad = ctx.createLinearGradient(brickX, brickY, brickX, brickY + gameState.current.brickHeight);
          brickGrad.addColorStop(0, g1);
          brickGrad.addColorStop(1, g2);

          // Rounded rect
          const r = 4;
          ctx.beginPath();
          ctx.moveTo(brickX + r, brickY);
          ctx.lineTo(brickX + gameState.current.brickWidth - r, brickY);
          ctx.quadraticCurveTo(brickX + gameState.current.brickWidth, brickY, brickX + gameState.current.brickWidth, brickY + r);
          ctx.lineTo(brickX + gameState.current.brickWidth, brickY + gameState.current.brickHeight - r);
          ctx.quadraticCurveTo(brickX + gameState.current.brickWidth, brickY + gameState.current.brickHeight, brickX + gameState.current.brickWidth - r, brickY + gameState.current.brickHeight);
          ctx.lineTo(brickX + r, brickY + gameState.current.brickHeight);
          ctx.quadraticCurveTo(brickX, brickY + gameState.current.brickHeight, brickX, brickY + gameState.current.brickHeight - r);
          ctx.lineTo(brickX, brickY + r);
          ctx.quadraticCurveTo(brickX, brickY, brickX + r, brickY);
          ctx.closePath();
          ctx.fillStyle = brickGrad;
          ctx.fill();

          // Special brick indicator
          if (b.isSpecial) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', brickX + gameState.current.brickWidth / 2, brickY + gameState.current.brickHeight / 2);
          }
        }
      });

      // Draw ball trail
      gameState.current.trail.push({ x: gameState.current.ball.x, y: gameState.current.ball.y, life: 1 });
      if (gameState.current.trail.length > 8) gameState.current.trail.shift();
      gameState.current.trail.forEach((t, i) => {
        t.life -= 0.12;
        ctx.globalAlpha = t.life * 0.3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, gameState.current.ball.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;
      });

      // Draw Ball with glow
      ctx.beginPath();
      ctx.arc(gameState.current.ball.x, gameState.current.ball.y, gameState.current.ball.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,68,68,0.2)';
      ctx.fill();
      ctx.closePath();
      ctx.beginPath();
      ctx.arc(
        gameState.current.ball.x,
        gameState.current.ball.y,
        gameState.current.ball.radius,
        0,
        Math.PI * 2
      );
      const ballGrad = ctx.createRadialGradient(
        gameState.current.ball.x - 2, gameState.current.ball.y - 2, 0,
        gameState.current.ball.x, gameState.current.ball.y, gameState.current.ball.radius
      );
      ballGrad.addColorStop(0, '#fca5a5');
      ballGrad.addColorStop(1, '#dc2626');
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.closePath();

      // Draw Paddle with gradient
      const paddleGrad = ctx.createLinearGradient(
        gameState.current.paddle.x, 0,
        gameState.current.paddle.x + gameState.current.paddle.width, 0
      );
      paddleGrad.addColorStop(0, '#34d399');
      paddleGrad.addColorStop(1, '#059669');
      const pr = 6;
      ctx.beginPath();
      ctx.moveTo(gameState.current.paddle.x + pr, canvas.height - gameState.current.paddle.height);
      ctx.lineTo(gameState.current.paddle.x + gameState.current.paddle.width - pr, canvas.height - gameState.current.paddle.height);
      ctx.quadraticCurveTo(gameState.current.paddle.x + gameState.current.paddle.width, canvas.height - gameState.current.paddle.height, gameState.current.paddle.x + gameState.current.paddle.width, canvas.height - gameState.current.paddle.height + pr);
      ctx.lineTo(gameState.current.paddle.x + gameState.current.paddle.width, canvas.height);
      ctx.lineTo(gameState.current.paddle.x, canvas.height);
      ctx.lineTo(gameState.current.paddle.x, canvas.height - gameState.current.paddle.height + pr);
      ctx.quadraticCurveTo(gameState.current.paddle.x, canvas.height - gameState.current.paddle.height, gameState.current.paddle.x + pr, canvas.height - gameState.current.paddle.height);
      ctx.closePath();
      ctx.fillStyle = paddleGrad;
      ctx.fill();

      // Collision detection
      gameState.current.bricks.forEach((b) => {
        if (b.status === 1) {
          if (
            gameState.current.ball.x > b.x &&
            gameState.current.ball.x < b.x + gameState.current.brickWidth &&
            gameState.current.ball.y > b.y &&
            gameState.current.ball.y < b.y + gameState.current.brickHeight
          ) {
            gameState.current.ball.dy = -gameState.current.ball.dy;
            b.status = 0;
            addScore(10);
            if (b.isSpecial) {
              setIsPaused(true);
              setCurrentQuestion(generateMathQuestion());
            }
          }
        }
      });

      // Wall collisions
      if (
        gameState.current.ball.x + gameState.current.ball.dx >
          canvas.width - gameState.current.ball.radius ||
        gameState.current.ball.x + gameState.current.ball.dx < gameState.current.ball.radius
      ) {
        gameState.current.ball.dx = -gameState.current.ball.dx;
      }
      if (gameState.current.ball.y + gameState.current.ball.dy < gameState.current.ball.radius) {
        gameState.current.ball.dy = -gameState.current.ball.dy;
      } else if (
        gameState.current.ball.y + gameState.current.ball.dy >
        canvas.height - gameState.current.ball.radius
      ) {
        if (
          gameState.current.ball.x > gameState.current.paddle.x &&
          gameState.current.ball.x < gameState.current.paddle.x + gameState.current.paddle.width
        ) {
          gameState.current.ball.dy = -gameState.current.ball.dy;
        } else {
          // Game Over
          setGameOver(true);
          endGame();
          submitScore().then((res) => {
            if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
          });
        }
      }

      gameState.current.ball.x += gameState.current.ball.dx;
      gameState.current.ball.y += gameState.current.ball.dy;

      // Win check
      if (gameState.current.bricks.every((b) => b.status === 0)) {
        setGameOver(true);
        endGame();
        submitScore().then((res) => {
          if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
        });
      }

      if (!gameOver && isPlaying && !isPaused) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isPaused, gameOver, addScore, endGame, submitScore]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const relativeX = e.clientX - canvas.offsetLeft;
    if (relativeX > 0 && relativeX < canvas.width) {
      gameState.current.paddle.x = relativeX - gameState.current.paddle.width / 2;
    }
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('game.brick_breaker.title')}</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.brick_breaker.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: "🎮", text: "Tap kiri/kanan layar untuk menggerakkan paddle" },
            { emoji: "🧱", text: "Pantulkan bola untuk menghancurkan semua brick" },
            { emoji: "➕", text: "Brick berwarna menyimpan soal matematika — jawab untuk bonus poin!" },
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
    <div className="relative flex flex-col items-center gap-6 py-6">
      <div className="flex w-full max-w-md items-center justify-between">
        <div className="text-sm font-bold text-gray-500">Brick Breaker</div>
        <ScoreBoard score={score} />
        <button onClick={pauseGame} className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800' aria-label={t('game.pause_label')}>
          <Pause className='h-4 w-4' />
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border-4 border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          onMouseMove={handleMouseMove}
          className="h-auto max-w-full cursor-none"
        />

        {isPaused && currentQuestion && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
            <div className="animate-in zoom-in max-w-xs rounded-3xl bg-white p-8 text-center shadow-2xl duration-300 dark:bg-slate-800">
              <span className="text-xs font-black uppercase tracking-widest text-amber-500">
                Tantangan!
              </span>
              <h2 className="mb-6 mt-2 text-3xl font-black text-gray-900 dark:text-white">
                {currentQuestion.text}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition-all hover:bg-indigo-700 active:scale-95"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            gameSlug="brick-breaker"
            gameName="Brick Breaker Soal"
            onReplay={handleStart}
            description={t('game.over')}
          />
        </div>
      )}

      <p className="text-xs text-gray-400">{t('game.mouse_instructions')}</p>
    </div>
  );
}
