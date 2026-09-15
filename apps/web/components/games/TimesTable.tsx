'use client';

import { useCallback, useState } from 'react';
import { Pause } from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { useSoundStore } from '@/lib/stores/soundStore';
import { cn } from '@/lib/utils/cn';
import { haptics } from '@/lib/utils/haptics';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { GameNumpad } from '@/components/games/GameNumpad';

export default function TimesTable() {
  const { score, isPlaying, addScore, startGame, endGame, submitScore, pauseGame } =
    useGame('times-table');
  const { playSound } = useSoundStore();
  const { t } = useLocale();
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

  const handleNumpadDigit = (d: number) => {
    if (feedback) return;
    setAnswer((prev) => prev + String(d));
  };

  const handleNumpadDelete = () => {
    if (feedback) return;
    setAnswer((prev) => prev.slice(0, -1));
  };

  const handleNumpadSubmit = () => {
    if (feedback || !answer) return;

    const correctAns = numA * numB;
    const isCorrect = parseInt(answer, 10) === correctAns;

    if (isCorrect) {
      setFeedback('correct');
      playSound('correct');
      haptics.success();
      addScore(10);
    } else {
      setFeedback('wrong');
      playSound('wrong');
      haptics.error();
      addScore(-2);
    }

    setQuestionCount((c) => c + 1);

    if (questionCount + 1 >= 10) {
      setTimeout(async () => {
        setGameOver(true);
        endGame();
        const res = await submitScore();
        setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
      }, 600);
    } else {
      setTimeout(() => generateQuestion(selectedTable), 600);
    }
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('game.times_table.title')}
        </h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.times_table.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: '🔢', text: 'Pilih tabel perkalian yang ingin dilatih (1–12)' },
            { emoji: '❓', text: 'Soal perkalian muncul satu per satu' },
            {
              emoji: '⚡',
              text: 'Ketik jawaban secepat mungkin — skor dipengaruhi kecepatan dan akurasi!',
            },
          ]}
        />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setSelectedTable(n)}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                selectedTable === n
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              Tabel {n}
            </button>
          ))}
          <button
            onClick={() => setSelectedTable('mix')}
            className={cn(
              'col-span-4 rounded-lg border px-4 py-2 text-sm font-bold transition-colors',
              selectedTable === 'mix'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            Campuran (1-12)
          </button>
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
      <div className="flex items-center gap-4">
        <ScoreBoard score={score} />
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {t('game.questions', { n: questionCount, total: 10 })}
        </span>
        <button
          onClick={pauseGame}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          aria-label={t('game.pause_label')}
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 text-center">
        <p className="font-mono text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
          {numA} × {numB} = {answer || '?'}
        </p>

        {feedback && (
          <p
            className={cn(
              'animate-pulse text-lg font-bold',
              feedback === 'correct' ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {feedback === 'correct' ? 'Benar!' : 'Salah!'}
          </p>
        )}

        <div className="flex justify-center pt-2">
          <GameNumpad
            onDigit={handleNumpadDigit}
            onDelete={handleNumpadDelete}
            onSubmit={handleNumpadSubmit}
            disabled={feedback !== null || gameOver}
            submitLabel="Kirim"
          />
        </div>
      </div>

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="times-table"
            gameName="Times Table Challenge"
            onReplay={handleStart}
            description={`${questionCount}/10 soal dijawab`}
          />
        </div>
      )}
    </div>
  );
}
