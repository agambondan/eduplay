'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { cn } from '@/lib/utils/cn';
import { Pause } from 'lucide-react';

interface TimelineEvent {
  year: number;
  event: string;
}

const EVENTS: TimelineEvent[] = [
  { year: 1945, event: 'Proklamasi Kemerdekaan Indonesia' },
  { year: 1928, event: 'Sumpah Pemuda' },
  { year: 1908, event: 'Kebangkitan Nasional (Budi Utomo)' },
  { year: 1949, event: 'Pengakuan Kedaulatan oleh Belanda' },
  { year: 1966, event: 'Supersemar' },
  { year: 1998, event: 'Era Reformasi Dimulai' },
  { year: 1955, event: 'Konferensi Asia Afrika (KAA)' },
  { year: 2004, event: 'Pemilu Presiden Langsung Pertama' },
  { year: 1942, event: 'Pendaratan Tentara Jepang di Indonesia' },
  { year: 1917, event: 'Revolusi Rusia' },
  { year: 1914, event: 'Awal Perang Dunia I' },
  { year: 1939, event: 'Awal Perang Dunia II' },
  { year: 1969, event: 'Manusia Pertama Mendarat di Bulan' },
  { year: 1989, event: 'Runtuhnya Tembok Berlin' },
  { year: 2020, event: 'Pandemi COVID-19 Melanda Dunia' },
];

export default function TimelineHistory() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } =
    useGame('timeline-history');

  const [currentEvent, setCurrentEvent] = useState<TimelineEvent | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [count, setCount] = useState(0);

  const nextQuestion = useCallback(() => {
    const target = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    setCurrentEvent(target);

    const opts = new Set<number>([target.year]);
    while (opts.size < 4) {
      const offset = (Math.floor(Math.random() * 10) + 1) * (Math.random() > 0.5 ? 1 : -1);
      opts.add(target.year + offset);
    }
    setOptions([...opts].sort((a, b) => a - b));
    setFeedback(null);
  }, []);

  const handleStart = () => {
    setCount(0);
    setGameOver(false);
    setResult(null);
    nextQuestion();
    startGame('medium');
  };

  const handleAnswer = async (year: number) => {
    if (feedback || !currentEvent) return;

    if (year === currentEvent.year) {
      setFeedback('correct');
      addScore(20);
    } else {
      setFeedback('wrong');
      addScore(-5);
    }

    setCount((c) => c + 1);
    if (count + 1 >= 10) {
      setTimeout(async () => {
        setGameOver(true);
        endGame();
        const res = await submitScore();
        if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
      }, 600);
    } else {
      setTimeout(nextQuestion, 600);
    }
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Timeline History</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          Uji pengetahuan sejarahmu! Tebak tahun kejadian penting di Indonesia dan Dunia.
        </p>
        <HowToPlay
          steps={[
            { emoji: "📜", text: "Sebuah peristiwa sejarah Indonesia atau dunia ditampilkan" },
            { emoji: "📅", text: "Geser slider untuk menebak tahun kejadian peristiwa tersebut" },
            { emoji: "🎯", text: "Semakin dekat tebakanmu dengan tahun yang benar, semakin besar skormu!" },
          ]}
        />
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
      <div className="flex w-full max-w-md items-center justify-between">
        <Timer
          initialSeconds={90}
          onTimeUp={() => {
            setGameOver(true);
            endGame();
          }}
          isRunning={isPlaying && !gameOver}
        />
        <ScoreBoard score={score} />
        <span className="text-sm font-bold text-gray-500">{count}/10</span>
        <button onClick={pauseGame} className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800' aria-label='Jeda permainan'>
          <Pause className='h-4 w-4' />
        </button>
      </div>

      {currentEvent && !gameOver && (
        <div className="animate-in fade-in zoom-in w-full max-w-lg space-y-8 duration-300">
          <div className="rounded-3xl border-2 border-indigo-100 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
              Kapan terjadi peristiwa:
            </p>
            <h2 className="mt-4 text-3xl font-black leading-snug text-indigo-600 dark:text-indigo-400">
              {currentEvent.event}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {options.map((year) => (
              <button
                key={year}
                onClick={() => handleAnswer(year)}
                disabled={feedback !== null}
                className={cn(
                  'rounded-2xl border-2 px-6 py-4 text-xl font-bold transition-all active:scale-95',
                  feedback === null
                    ? 'border-gray-200 bg-white text-gray-800 hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                    : year === currentEvent.year
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            gameSlug="timeline-history"
            gameName="Timeline History"
            onReplay={handleStart}
            description={`${count}/10 soal dijawab`}
          />
        </div>
      )}
    </div>
  );
}
