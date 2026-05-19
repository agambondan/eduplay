'use client';

import { useState, useCallback } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { cn } from '@/lib/utils/cn';

export default function TimesTable() {
  const { score, isPlaying, addScore, startGame, endGame, submitScore } = useGame('times-table');
  const [selectedTable, setSelectedTable] = useState<number | 'mix'>(1);
  const [numA, setNumA] = useState(1);
  const [numB, setNumB] = useState(1);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const generateQuestion = useCallback((table: number | 'mix') => {
    const a = table === 'mix' ? Math.floor(Math.random() * 12) + 1 : table;
    const b = Math.floor(Math.random() * 12) + 1;
    setNumA(a);
    setNumB(b);
    setAnswer('');
    setFeedback(null);
  }, []);

  const handleStart = () => {
    setQuestionCount(0);
    setGameOver(false);
    setResult(null);
    generateQuestion(selectedTable);
    startGame('easy');
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback || !answer) return;

    const correctAns = numA * numB;
    const isCorrect = parseInt(answer) === correctAns;

    if (isCorrect) {
      setFeedback('correct');
      addScore(10);
    } else {
      setFeedback('wrong');
      addScore(-2);
    }

    setQuestionCount((c) => c + 1);

    if (questionCount + 1 >= 10) {
      setTimeout(async () => {
        setGameOver(true);
        endGame();
        const res = await submitScore();
        if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
      }, 600);
    } else {
      setTimeout(() => generateQuestion(selectedTable), 600);
    }
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Times Table Challenge</h1>
        <p className="text-gray-500 dark:text-slate-400 text-center max-w-md">Latih perkalian 1-12 dengan gamified drilling!</p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setSelectedTable(n)}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-sm border transition-colors',
                selectedTable === n ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              Tabel {n}
            </button>
          ))}
          <button
            onClick={() => setSelectedTable('mix')}
            className={cn(
              'col-span-4 px-4 py-2 rounded-lg font-bold text-sm border transition-colors',
              selectedTable === 'mix' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            Campuran (1-12)
          </button>
        </div>
        <button onClick={handleStart} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-lg transition-colors">
          Mulai!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-4">
        <ScoreBoard score={score} />
        <span className="text-sm text-gray-500 dark:text-slate-400">Soal {questionCount}/10</span>
      </div>

      <div className="text-center space-y-6">
        <p className="text-4xl font-bold font-mono text-gray-900 dark:text-white">
          {numA} × {numB} = ?
        </p>

        <form onSubmit={handleAnswerSubmit} className="flex gap-2">
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={feedback !== null}
            placeholder="Jawab..."
            className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-xl font-bold font-mono w-32 text-center bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={feedback !== null || !answer}
            className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
          >
            Submit
          </button>
        </form>

        {feedback && (
          <p className={cn('text-lg font-bold animate-pulse', feedback === 'correct' ? 'text-emerald-500' : 'text-red-500')}>
            {feedback === 'correct' ? 'Benar!' : 'Salah!'}
          </p>
        )}
      </div>

      {gameOver && (
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-emerald-600">Selesai!</p>
          {result && (
            <div className="text-sm text-gray-500">
              <p>+{result.xp} XP</p>
              {result.highscore && <p className="text-amber-500 font-bold">New Highscore!</p>}
            </div>
          )}
          <button onClick={handleStart} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
            Main Lagi
          </button>
        </div>
      )}
    </div>
  );
}
