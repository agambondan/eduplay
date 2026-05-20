'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pause } from 'lucide-react';
import { contentApi } from '@/lib/api/content';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';

interface FlagItem {
  country: string;
  code: string; // ISO 2-letter code for SVG filename (lowercase)
}

const FALLBACK_FLAGS: FlagItem[] = [
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

function generateQuestion(FLAGS: FlagItem[]) {
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
  const { score, isPlaying, addScore, startGame, endGame, submitScore, pauseGame } =
    useGame('flag-quiz');
  const { t } = useLocale();

  const { data: flagsData } = useQuery({
    queryKey: ['content', 'flags'],
    queryFn: contentApi.getFlags,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const FLAGS =
    flagsData?.map((c) => ({ country: c.name, code: c.flag_code.toLowerCase() })) ?? FALLBACK_FLAGS;

  const [question, setQuestion] = useState<{ correct: FlagItem; options: string[] } | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [count, setCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const next = useCallback(() => {
    setQuestion(generateQuestion(FLAGS));
    setFeedback(null);
  }, [FLAGS]);

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
    setCount((c) => c + 1);
    if (count + 1 >= 12) {
      setTimeout(async () => {
        setGameOver(true);
        endGame();
        const res = await submitScore();
        if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
      }, 600);
    } else {
      setTimeout(() => next(), 600);
    }
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('game.flag_quiz.title')}
        </h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.flag_quiz.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: '🏳️', text: 'Bendera negara ditampilkan dalam bentuk visual geometri' },
            { emoji: '🔤', text: 'Pilih nama negara yang benar dari 4 pilihan yang tersedia' },
            {
              emoji: '⚡',
              text: 'Setiap jawaban benar menambah skor, jawaban salah mengurangi waktu!',
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
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-4">
        <ScoreBoard score={score} />
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {t('game.questions', { n: count, total: 12 })}
        </span>
        <button
          onClick={pauseGame}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          aria-label={t('game.pause_label')}
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>

      {question && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-32 w-32">
            <Image
              src={`/flags/${question.correct.code}.svg`}
              alt="Bendera"
              fill
              className="object-contain"
            />
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            {question.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={feedback !== null}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 font-medium transition-colors',
                  feedback === null
                    ? 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
                    : opt === question.correct.country
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

      {feedback && (
        <p
          className={cn(
            'animate-pulse text-lg font-bold',
            feedback === 'correct' ? 'text-emerald-500' : 'text-red-500'
          )}
        >
          {' '}
          {feedback === 'correct' ? 'Benar!' : 'Salah!'}{' '}
        </p>
      )}

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="flag-quiz"
            gameName="Flag Quiz"
            onReplay={handleStart}
            description={`${count}/12 soal dijawab`}
          />
        </div>
      )}
    </div>
  );
}
