'use client';

import { useState, useCallback } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { cn } from '@/lib/utils/cn';

interface CapitalQuestion {
  question: string;
  answer: string;
  options: string[];
  type: 'country-to-capital' | 'capital-to-country';
}

const CAPITAL_DATA = [
  { country: 'Indonesia', capital: 'Jakarta' },
  { country: 'Malaysia', capital: 'Kuala Lumpur' },
  { country: 'Singapore', capital: 'Singapura' },
  { country: 'Japan', capital: 'Tokyo' },
  { country: 'South Korea', capital: 'Seoul' },
  { country: 'Germany', capital: 'Berlin' },
  { country: 'France', capital: 'Paris' },
  { country: 'Italy', capital: 'Roma' },
  { country: 'United Kingdom', capital: 'London' },
  { country: 'United States', capital: 'Washington DC' },
  { country: 'Brazil', capital: 'Brasilia' },
  { country: 'Argentina', capital: 'Buenos Aires' },
  { country: 'Australia', capital: 'Canberra' },
  { country: 'Canada', capital: 'Ottawa' },
  { country: 'India', capital: 'New Delhi' },
  { country: 'China', capital: 'Beijing' },
  { country: 'Thailand', capital: 'Bangkok' },
  { country: 'Vietnam', capital: 'Hanoi' },
];

function generateQuestion(): CapitalQuestion {
  const target = CAPITAL_DATA[Math.floor(Math.random() * CAPITAL_DATA.length)];
  const isC2Cap = Math.random() > 0.5;

  const answer = isC2Cap ? target.capital : target.country;
  const pool = isC2Cap ? CAPITAL_DATA.map((d) => d.capital) : CAPITAL_DATA.map((d) => d.country);

  const options = new Set<string>([answer]);
  while (options.size < 4) {
    const wrong = pool[Math.floor(Math.random() * pool.length)];
    if (wrong !== answer) options.add(wrong);
  }

  return {
    question: isC2Cap
      ? `Ibukota dari ${target.country}?`
      : `Negara yang beribukota di ${target.capital}?`,
    answer,
    options: [...options].sort(() => Math.random() - 0.5),
    type: isC2Cap ? 'country-to-capital' : 'capital-to-country',
  };
}

export default function CapitalQuiz() {
  const { score, isPlaying, addScore, startGame, endGame, submitScore } = useGame('capital-quiz');
  const [question, setQuestion] = useState<CapitalQuestion | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [streak, setStreak] = useState(0);

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion());
    setFeedback(null);
  }, []);

  const handleStart = () => {
    setQuestionCount(0);
    setGameOver(false);
    setResult(null);
    setStreak(0);
    nextQuestion();
    startGame('easy');
  };

  const handleAnswer = async (selected: string) => {
    if (feedback || !question) return;

    const isCorrect = selected === question.answer;
    if (isCorrect) {
      setFeedback('correct');
      const newStreak = streak + 1;
      setStreak(newStreak);
      const multiplier = newStreak >= 3 ? 2 : 1;
      addScore(10 * multiplier);
    } else {
      setFeedback('wrong');
      setStreak(0);
      addScore(-3);
    }

    setQuestionCount((c) => c + 1);

    if (questionCount + 1 >= 15) {
      setTimeout(async () => {
        setGameOver(true);
        endGame();
        const res = await submitScore();
        if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
      }, 600);
    } else {
      setTimeout(() => nextQuestion(), 600);
    }
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Capital City Quiz</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          Tebak ibukota negara! Streak 3x = poin 2x!
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
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex items-center gap-4">
        <ScoreBoard score={score} />
        <div className="flex flex-col items-center rounded-lg bg-orange-100 px-3 py-1.5 dark:bg-orange-900/20">
          <span className="text-xs font-bold uppercase text-orange-500">Streak</span>
          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{streak}x</span>
        </div>
        <span className="text-sm text-gray-500 dark:text-slate-400">Soal {questionCount}/15</span>
      </div>

      {question && (
        <div className="w-full max-w-md space-y-4">
          <p className="text-center text-xl font-bold text-gray-900 dark:text-white">
            {question.question}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={feedback !== null}
                className={cn(
                  'rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all',
                  feedback === null
                    ? 'border-gray-200 bg-white text-gray-800 hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
                    : opt === question.answer
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameOver && (
        <div className="space-y-2 text-center">
          <p className="text-lg font-bold text-emerald-600">Selesai!</p>
          {result && (
            <div className="text-sm text-gray-500">
              <p>+{result.xp} XP</p>
              {result.highscore && <p className="font-bold text-amber-500">New Highscore!</p>}
            </div>
          )}
          <button
            onClick={handleStart}
            className="rounded-lg bg-indigo-600 px-6 py-2 font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Main Lagi
          </button>
        </div>
      )}
    </div>
  );
}
