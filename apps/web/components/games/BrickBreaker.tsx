'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause } from 'lucide-react';
import { CanvasEngine, Entity, InputManager, Vector2 } from '@/lib/game-engines/CanvasEngine';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useGame } from '@/lib/hooks/useGame';
import { useIsTouchDevice } from '@/lib/hooks/useIsTouchDevice';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 640;

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

class BallEntity extends Entity {
  radius = 8;
  trail: { x: number; y: number; life: number }[] = [];

  constructor() {
    super();
    this.position = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 140 };
    this.velocity = { x: 3, y: -3 };
  }

  update(dt: number) {
    this.trail.push({ x: this.position.x, y: this.position.y, life: 1 });
    if (this.trail.length > 8) this.trail.shift();
    this.trail.forEach((t) => (t.life -= 0.12 * dt * 60));

    this.position.x += this.velocity.x * dt * 60;
    this.position.y += this.velocity.y * dt * 60;
  }

  render(ctx: CanvasRenderingContext2D) {
    this.trail.forEach((t) => {
      ctx.globalAlpha = Math.max(0, t.life * 0.3);
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,68,68,0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(
      this.position.x - 2,
      this.position.y - 2,
      0,
      this.position.x,
      this.position.y,
      this.radius
    );
    ballGrad.addColorStop(0, '#fca5a5');
    ballGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = ballGrad;
    ctx.fill();
  }
}

class PaddleEntity extends Entity {
  width = 75;
  height = 10;

  constructor() {
    super();
    this.position = { x: CANVAS_WIDTH / 2 - 37.5, y: CANVAS_HEIGHT - 10 };
  }

  update(dt: number, input: InputManager) {
    const p = input.getPointerPosition();
    if (p.x > 0 && p.x < CANVAS_WIDTH) {
      this.position.x = p.x - this.width / 2;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const paddleGrad = ctx.createLinearGradient(
      this.position.x,
      0,
      this.position.x + this.width,
      0
    );
    paddleGrad.addColorStop(0, '#34d399');
    paddleGrad.addColorStop(1, '#059669');
    const pr = 6;
    ctx.beginPath();
    ctx.moveTo(this.position.x + pr, this.position.y);
    ctx.lineTo(this.position.x + this.width - pr, this.position.y);
    ctx.quadraticCurveTo(
      this.position.x + this.width,
      this.position.y,
      this.position.x + this.width,
      this.position.y + pr
    );
    ctx.lineTo(this.position.x + this.width, this.position.y + this.height);
    ctx.lineTo(this.position.x, this.position.y + this.height);
    ctx.lineTo(this.position.x, this.position.y + pr);
    ctx.quadraticCurveTo(this.position.x, this.position.y, this.position.x + pr, this.position.y);
    ctx.closePath();
    ctx.fillStyle = paddleGrad;
    ctx.fill();
  }
}

class BrickEntity extends Entity {
  width = 60;
  height = 20;
  isSpecial = false;
  status = 1;
  rowIndex = 0;

  constructor(x: number, y: number, isSpecial: boolean, rowIndex: number) {
    super();
    this.position = { x, y };
    this.isSpecial = isSpecial;
    this.rowIndex = rowIndex;
  }

  update() {}

  render(ctx: CanvasRenderingContext2D) {
    if (this.status === 0) return;

    const brickGradients: [string, string][] = [
      ['#6366f1', '#3730a3'],
      ['#8b5cf6', '#6d28d9'],
      ['#22d3ee', '#0891b2'],
      ['#34d399', '#059669'],
      ['#fbbf24', '#d97706'],
    ];

    const [g1, g2] = this.isSpecial
      ? ['#f59e0b', '#b45309']
      : brickGradients[this.rowIndex % brickGradients.length];

    const brickGrad = ctx.createLinearGradient(
      this.position.x,
      this.position.y,
      this.position.x,
      this.position.y + this.height
    );
    brickGrad.addColorStop(0, g1);
    brickGrad.addColorStop(1, g2);

    const r = 4;
    ctx.beginPath();
    ctx.moveTo(this.position.x + r, this.position.y);
    ctx.lineTo(this.position.x + this.width - r, this.position.y);
    ctx.quadraticCurveTo(
      this.position.x + this.width,
      this.position.y,
      this.position.x + this.width,
      this.position.y + r
    );
    ctx.lineTo(this.position.x + this.width, this.position.y + this.height - r);
    ctx.quadraticCurveTo(
      this.position.x + this.width,
      this.position.y + this.height,
      this.position.x + this.width - r,
      this.position.y + this.height
    );
    ctx.lineTo(this.position.x + r, this.position.y + this.height);
    ctx.quadraticCurveTo(
      this.position.x,
      this.position.y + this.height,
      this.position.x,
      this.position.y + this.height - r
    );
    ctx.lineTo(this.position.x, this.position.y + r);
    ctx.quadraticCurveTo(this.position.x, this.position.y, this.position.x + r, this.position.y);
    ctx.closePath();
    ctx.fillStyle = brickGrad;
    ctx.fill();

    if (this.isSpecial) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', this.position.x + this.width / 2, this.position.y + this.height / 2);
    }
  }
}

class GameControllerEntity extends Entity {
  ball: BallEntity;
  paddle: PaddleEntity;
  bricks: BrickEntity[] = [];
  onWin: () => void;
  onLose: () => void;
  onHitBrick: (isSpecial: boolean) => void;

  constructor(
    ball: BallEntity,
    paddle: PaddleEntity,
    onWin: () => void,
    onLose: () => void,
    onHitBrick: (isSpecial: boolean) => void
  ) {
    super();
    this.ball = ball;
    this.paddle = paddle;
    this.onWin = onWin;
    this.onLose = onLose;
    this.onHitBrick = onHitBrick;
  }

  update(dt: number) {
    const ball = this.ball;
    const paddle = this.paddle;

    if (
      ball.position.x + ball.velocity.x * dt * 60 > CANVAS_WIDTH - ball.radius ||
      ball.position.x + ball.velocity.x * dt * 60 < ball.radius
    ) {
      ball.velocity.x = -ball.velocity.x;
    }

    if (ball.position.y + ball.velocity.y * dt * 60 < ball.radius) {
      ball.velocity.y = -ball.velocity.y;
    } else if (ball.position.y + ball.velocity.y * dt * 60 > CANVAS_HEIGHT - ball.radius) {
      if (
        ball.position.x > paddle.position.x &&
        ball.position.x < paddle.position.x + paddle.width
      ) {
        ball.velocity.y = -ball.velocity.y;
      } else {
        this.onLose();
        return;
      }
    }

    for (const b of this.bricks) {
      if (b.status === 1) {
        if (
          ball.position.x > b.position.x &&
          ball.position.x < b.position.x + b.width &&
          ball.position.y > b.position.y &&
          ball.position.y < b.position.y + b.height
        ) {
          ball.velocity.y = -ball.velocity.y;
          b.status = 0;
          this.onHitBrick(b.isSpecial);
          break;
        }
      }
    }

    if (this.bricks.length > 0 && this.bricks.every((b) => b.status === 0)) {
      this.onWin();
    }
  }

  render() {}
}

export default function BrickBreaker() {
  // `isPaused` here is the app-wide pause flag (shared with the global
  // `PauseOverlay` rendered in the root layout) — toggling it via
  // pauseGame()/togglePause() is how every other game implements Pause.
  const { score, isPlaying, isPaused, startGame, endGame, addScore, submitScore, pauseGame } =
    useGame('brick-breaker');
  const { t } = useLocale();
  const isTouch = useIsTouchDevice();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  // Separate, local pause for the in-canvas math challenge modal.
  const [quizOpen, setQuizOpen] = useState(false);
  const quizFocusRef = useFocusTrap(quizOpen);

  // Unlike every other (DOM/turn-based) game, this one drives its own
  // requestAnimationFrame loop via CanvasEngine, so the global pause flag
  // alone won't stop the simulation — mirror it into the engine explicitly.
  useEffect(() => {
    if (!isPlaying) return;
    if (isPaused) {
      engineRef.current?.pause();
    } else if (!quizOpen) {
      engineRef.current?.resume();
    }
  }, [isPaused, isPlaying, quizOpen]);

  const handleGameOver = useCallback(
    (isWin: boolean) => {
      setGameOver(true);
      engineRef.current?.stop();
      endGame();
      submitScore().then((res) => {
        setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
      });
    },
    [endGame, submitScore]
  );

  const handleHitBrick = useCallback(
    (isSpecial: boolean) => {
      addScore(10);
      if (isSpecial) {
        setQuizOpen(true);
        engineRef.current?.pause();
        setCurrentQuestion(generateMathQuestion());
      }
    },
    [addScore]
  );

  // Kept fresh via effect so `initEngine` below can stay referentially stable
  // (handleGameOver's identity changes every score update through submitScore).
  const handleGameOverRef = useRef(handleGameOver);
  const handleHitBrickRef = useRef(handleHitBrick);
  useEffect(() => {
    handleGameOverRef.current = handleGameOver;
    handleHitBrickRef.current = handleHitBrick;
  }, [handleGameOver, handleHitBrick]);

  const initEngine = useCallback(() => {
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

    const ball = new BallEntity();
    ball.zIndex = 2;

    const paddle = new PaddleEntity();
    paddle.zIndex = 2;

    const bricks: BrickEntity[] = [];
    const brickRows = 5;
    const brickCols = 8;
    const brickWidth = 60;
    const brickHeight = 20;
    const brickPadding = 10;
    const brickOffsetTop = 30;
    const brickOffsetLeft = 30;

    for (let c = 0; c < brickCols; c++) {
      for (let r = 0; r < brickRows; r++) {
        const x = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const y = r * (brickHeight + brickPadding) + brickOffsetTop;
        const brick = new BrickEntity(x, y, Math.random() > 0.85, r);
        brick.zIndex = 1;
        bricks.push(brick);
        engine.entities.add(brick);
      }
    }

    const controller = new GameControllerEntity(
      ball,
      paddle,
      () => handleGameOverRef.current(true),
      () => handleGameOverRef.current(false),
      (isSpecial) => handleHitBrickRef.current(isSpecial)
    );
    controller.bricks = bricks;
    controller.zIndex = 3;

    engine.entities.add(bg);
    engine.entities.add(ball);
    engine.entities.add(paddle);
    engine.entities.add(controller);

    engine.start();
  }, []);

  // The canvas only mounts once `isPlaying` flips true, so the engine must be
  // created here (post-render) rather than synchronously inside handleStart.
  useEffect(() => {
    if (isPlaying) initEngine();
  }, [isPlaying, initEngine]);

  const handleStart = () => {
    setGameOver(false);
    setResult(null);
    setCurrentQuestion(null);
    setQuizOpen(false);
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
    setQuizOpen(false);
    engineRef.current?.resume();
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
          {t('game.brick_breaker.title')}
        </h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.brick_breaker.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: '🎮', text: 'Tap kiri/kanan layar untuk menggerakkan paddle' },
            { emoji: '🧱', text: 'Pantulkan bola untuk menghancurkan semua brick' },
            {
              emoji: '➕',
              text: 'Brick berwarna menyimpan soal matematika — jawab untuk bonus poin!',
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
    <>
      <div className="relative flex w-full flex-col items-center gap-4 py-2 sm:gap-6 sm:py-4">
        <div className="flex w-full max-w-md items-center justify-between">
          <div className="text-sm font-bold text-gray-500">Brick Breaker</div>
          <ScoreBoard score={score} />
          <button
            onClick={pauseGame}
            disabled={quizOpen}
            className="touch-target flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-slate-800"
            aria-label={t('game.pause_label')}
          >
            <Pause className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="relative w-full max-w-[600px] overflow-hidden rounded-xl border-4 border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block h-auto w-full cursor-none touch-none"
          />

          {quizOpen && currentQuestion && (
            <div
              ref={quizFocusRef}
              role="dialog"
              aria-modal="true"
              className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
            >
              <div className="animate-in zoom-in max-w-xs rounded-3xl bg-white p-8 text-center shadow-2xl duration-300 dark:bg-slate-800">
                <span className="text-xs font-black uppercase tracking-widest text-amber-500">
                  Tantangan!
                </span>
                <h2
                  aria-live="polite"
                  className="mb-6 mt-2 text-3xl font-black text-gray-900 dark:text-white"
                >
                  {currentQuestion.text}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className="touch-target rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition-colors hover:bg-indigo-700 active:scale-95"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
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

      <p className="text-xs text-gray-400">
        {isTouch ? 'Geser jari untuk menggerakkan paddle' : t('game.mouse_instructions')}
      </p>
    </>
  );
}
