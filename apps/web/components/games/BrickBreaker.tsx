'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';
import { cn } from '@/lib/utils/cn';

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
  const { score, isPlaying, startGame, endGame, addScore, submitScore } = useGame('brick-breaker');
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

      // Draw Bricks
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
          ctx.beginPath();
          ctx.rect(brickX, brickY, gameState.current.brickWidth, gameState.current.brickHeight);
          ctx.fillStyle = b.isSpecial ? '#f59e0b' : '#4f46e5';
          ctx.fill();
          ctx.closePath();
        }
      });

      // Draw Ball
      ctx.beginPath();
      ctx.arc(
        gameState.current.ball.x,
        gameState.current.ball.y,
        gameState.current.ball.radius,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.closePath();

      // Draw Paddle
      ctx.beginPath();
      ctx.rect(
        gameState.current.paddle.x,
        canvas.height - gameState.current.paddle.height,
        gameState.current.paddle.width,
        gameState.current.paddle.height
      );
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.closePath();

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Brick Breaker Soal</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          Hancurkan brick dan jawab tantangan matematika untuk bonus poin!
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
    <div className="relative flex flex-col items-center gap-6 py-6">
      <div className="flex w-full max-w-md items-center justify-between">
        <div className="text-sm font-bold text-gray-500">Brick Breaker</div>
        <ScoreBoard score={score} />
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

      {gameOver && (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-red-500">
            Game Over!
          </h2>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <ScoreBoard score={score} label="Final Score" />
            {result && (
              <p className="mt-4 text-sm font-bold text-gray-500">+{result.xp} XP Earned</p>
            )}
          </div>
          <button
            onClick={handleStart}
            className="rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-indigo-700"
          >
            Main Lagi
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400">Gunakan mouse untuk menggerakkan papan</p>
    </div>
  );
}
