'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pause } from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Equation {
  text: string;
  answer: number;
}

function generateEquation(difficulty: Difficulty): Equation {
  let a = 0,
    b = 0,
    op = '+',
    answer = 0;

  if (difficulty === 'easy') {
    const ops = ['+', '-'];
    op = ops[Math.floor(Math.random() * ops.length)];
    a = Math.floor(Math.random() * 15) + 1;
    b = Math.floor(Math.random() * 15) + 1;
    if (op === '-') {
      if (a < b) [a, b] = [b, a]; // Keep positive
      answer = a - b;
    } else {
      answer = a + b;
    }
  } else if (difficulty === 'medium') {
    const ops = ['+', '-', '×'];
    op = ops[Math.floor(Math.random() * ops.length)];
    if (op === '×') {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a * b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      if (a < b) [a, b] = [b, a];
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
    }
  } else {
    // Hard
    const ops = ['+', '-', '×', '÷'];
    op = ops[Math.floor(Math.random() * ops.length)];
    if (op === '×') {
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 15) + 1;
      answer = a * b;
    } else if (op === '÷') {
      b = Math.floor(Math.random() * 15) + 1;
      answer = Math.floor(Math.random() * 15) + 1;
      a = b * answer;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 200) + 1;
      b = Math.floor(Math.random() * 200) + 1;
      if (a < b) [a, b] = [b, a];
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 200) + 1;
      b = Math.floor(Math.random() * 200) + 1;
      answer = a + b;
    }
  }

  return { text: `${a} ${op} ${b}`, answer };
}

export default function MentalMath() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } =
    useGame('mental-math');
  const { t } = useLocale();

  const [eq, setEq] = useState<Equation | null>(null);
  const [input, setInput] = useState('');
  const [diff, setDiff] = useState<Difficulty>('easy');
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [count, setCount] = useState(0);

  const nextQuestion = useCallback(() => {
    setEq(generateEquation(diff));
    setInput('');
  }, [diff]);

  const handleStart = () => {
    setCount(0);
    setGameOver(false);
    setResult(null);
    startGame(diff);
  };

  useEffect(() => {
    if (isPlaying) {
      nextQuestion();
    }
  }, [isPlaying, nextQuestion]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (!eq) return;

    // Fast check: if the user typed the exact correct number, submit immediately for speed!
    const parsed = parseInt(val, 10);
    if (parsed === eq.answer) {
      addScore(10);
      setCount((c) => c + 1);
      nextQuestion();
    }
  };

  const handleTimeUp = useCallback(async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
  }, [endGame, submitScore]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('game.mental_math.title')}
        </h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.mental_math.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: '🧮', text: 'Soal hitung cepat ditampilkan satu per satu' },
            {
              emoji: '⌨️',
              text: 'Ketik jawaban langsung — otomatis lanjut ke soal berikutnya setelah benar',
            },
            { emoji: '📈', text: 'Mode Hard = soal lebih kompleks dengan skor lebih besar' },
          ]}
        />
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={cn(
                'rounded-lg px-4 py-2 font-medium capitalize transition-colors',
                diff === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {d}
            </button>
          ))}
        </div>
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
        <Timer initialSeconds={60} onTimeUp={handleTimeUp} isRunning={isPlaying && !gameOver} />
        <ScoreBoard score={score} />
        <button
          onClick={pauseGame}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          aria-label="Jeda permainan"
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>

      {eq && !gameOver && (
        <div className="w-full max-w-md space-y-6 text-center">
          <p className="font-mono text-5xl font-black text-gray-900 dark:text-white">{eq.text}</p>
          <div className="flex justify-center">
            <input
              type="number"
              value={input}
              onChange={handleInputChange}
              className="w-48 rounded-xl border-2 border-gray-200 px-4 py-3 text-center font-mono text-3xl font-bold focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="?"
              autoFocus
            />
          </div>
          <p className="text-xs text-gray-400">Jawab langsung untuk lanjut</p>
        </div>
      )}

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="mental-math"
            gameName="Mental Math Speed"
            onReplay={handleStart}
            description={`Soal terjawab: ${count}`}
          />
        </div>
      )}
    </div>
  );
}
