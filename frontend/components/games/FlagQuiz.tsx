'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { cn } from '@/lib/utils/cn';

interface FlagItem {
  country: string;
  code: string; // ISO 2-letter code for SVG filename (lowercase)
}

const FLAGS: FlagItem[] = [
  { country: 'Indonesia', code: 'id' },
  { country: 'Malaysia', code: 'my' },
  { country: 'Singapore', code: 'sg' },
  { country: 'Japan', code: 'jp' },
  { country: 'South Korea', code: 'kr' },
  { country: 'Germany', code: 'de' },
  { country: 'France', code: 'fr' },
  { country: 'Italy', code: 'it' },
  { country: 'United Kingdom', code: 'gb' },
  { country: 'United States', code: 'us' },
  { country: 'Brazil', code: 'br' },
  { country: 'Argentina', code: 'ar' },
  { country: 'Australia', code: 'au' },
  { country: 'Canada', code: 'ca' },
  { country: 'India', code: 'in' },
  { country: 'China', code: 'cn' },
  { country: 'Thailand', code: 'th' },
  { country: 'Vietnam', code: 'vn' },
];

function generateQuestion() {
  const correct = FLAGS[Math.floor(Math.random() * FLAGS.length)];
  const options = new Set<string>([correct.country]);
  while (options.size < 4) {
    const opt = FLAGS[Math.floor(Math.random() * FLAGS.length)].country;
    options.add(opt);
  }
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return { correct, options: shuffled };
}

export default function FlagQuiz() {
  const { score, isPlaying, addScore, startGame, endGame, submitScore } = useGame('flag-quiz');
  const [question, setQuestion] = useState<{correct: FlagItem; options: string[]} | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [count, setCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{xp:number; highscore:boolean}|null>(null);

  const next = useCallback(() => {
    setQuestion(generateQuestion());
    setFeedback(null);
  }, []);

  const handleStart = () => {
    setCount(0);
    setGameOver(false);
    setResult(null);
    next();
    startGame('easy');
  };

  const handleAnswer = async (choice: string) => {
    if (!question || feedback) return;
    const isCorrect = choice === question.correct.country;
    if (isCorrect) {
      setFeedback('correct');
      addScore(8);
    } else {
      setFeedback('wrong');
      addScore(-2);
    }
    setCount((c)=>c+1);
    if (count+1 >= 12) {
      setTimeout(async()=>{
        setGameOver(true);
        endGame();
        const res = await submitScore();
        if (res) setResult({xp:res.xp_earned, highscore:res.new_highscore});
      },600);
    } else {
      setTimeout(()=>next(),600);
    }
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Flag Quiz</h1>
        <p className="text-gray-500 dark:text-slate-400 text-center max-w-md">Tebak nama negara dari bendera geometri.</p>
        <button onClick={handleStart} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-lg transition-colors">Mulai!</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-4">
        <ScoreBoard score={score} />
        <span className="text-sm text-gray-500 dark:text-slate-400">Soal {count}/12</span>
      </div>

      {question && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 relative">
            <Image
              src={`/flags/${question.correct.code}.svg`}
              alt="Bendera"
              fill
              className="object-contain"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {question.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={feedback !== null}
                className={cn(
                  'py-2 px-3 rounded-xl font-medium border-2 transition-colors',
                  feedback===null
                    ? 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-white'
                    : opt===question.correct.country
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-500'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <p className={cn('text-lg font-bold animate-pulse', feedback==='correct' ? 'text-emerald-500' : 'text-red-500')}> {feedback==='correct' ? 'Benar!' : 'Salah!'} </p>
      )}

      {gameOver && (
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-emerald-600">Selesai!</p>
          {result && (
            <div className="text-sm text-gray-500">
              <p>+{result.xp} XP</p>
              {result.highscore && <p className="text-amber-500 font-bold">New Highscore!</p>}
            </div>
          )}
          <button onClick={handleStart} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">Main Lagi</button>
        </div>
      )}
    </div>
  );
}
