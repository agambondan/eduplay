'use client';

import { Difficulty } from '@/types/game';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Heart, Pause, Play, Sparkles, Zap } from 'lucide-react';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { useSoundStore } from '@/lib/stores/soundStore';
import { cn } from '@/lib/utils/cn';
import { haptics } from '@/lib/utils/haptics';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';

interface ColorDef {
  name: string; // e.g. "Merah"
  colorClass: string; // CSS color or hex
  textClass: string;
  bgClass: string;
}

const COLOR_PALETTE: ColorDef[] = [
  { name: 'MERAH', colorClass: '#ef4444', textClass: 'text-red-500', bgClass: 'bg-red-500' },
  { name: 'BIRU', colorClass: '#3b82f6', textClass: 'text-blue-500', bgClass: 'bg-blue-500' },
  { name: 'HIJAU', colorClass: '#22c55e', textClass: 'text-green-500', bgClass: 'bg-green-500' },
  { name: 'KUNING', colorClass: '#eab308', textClass: 'text-yellow-500', bgClass: 'bg-yellow-500' },
  { name: 'UNGU', colorClass: '#a855f7', textClass: 'text-purple-500', bgClass: 'bg-purple-500' },
  { name: 'ORANYE', colorClass: '#f97316', textClass: 'text-orange-500', bgClass: 'bg-orange-500' },
];

type TargetRule = 'COLOR' | 'TEXT';

interface RoundState {
  wordIndex: number;
  inkColorIndex: number;
  rule: TargetRule;
  options: number[]; // palette indices
  correctOption: number;
}

function generateRound(diff: Difficulty): RoundState {
  const paletteCount = COLOR_PALETTE.length;
  const wordIndex = Math.floor(Math.random() * paletteCount);

  // Pick ink color (often different from word for Stroop conflict)
  let inkColorIndex = Math.floor(Math.random() * paletteCount);
  if (Math.random() < 0.75) {
    while (inkColorIndex === wordIndex) {
      inkColorIndex = Math.floor(Math.random() * paletteCount);
    }
  }

  // Rule: in easy, mostly ask for INK color. In medium/hard, alternate
  let rule: TargetRule = 'COLOR';
  if (diff === 'medium') {
    rule = Math.random() < 0.5 ? 'COLOR' : 'TEXT';
  } else if (diff === 'hard') {
    rule = Math.random() < 0.5 ? 'COLOR' : 'TEXT';
  }

  const correctOption = rule === 'COLOR' ? inkColorIndex : wordIndex;

  // 4 choices
  const opts = new Set<number>([correctOption]);
  while (opts.size < 4) {
    opts.add(Math.floor(Math.random() * paletteCount));
  }

  // Shuffle options
  const options = Array.from(opts).sort(() => Math.random() - 0.5);

  return {
    wordIndex,
    inkColorIndex,
    rule,
    options,
    correctOption,
  };
}

export default function ColorShift() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } =
    useGame('color-shift', 'Color Shift', 'arcade');
  const { t } = useLocale();
  const playSound = useSoundStore((s) => s.playSound);

  const [diff, setDiff] = useState<Difficulty>('medium');
  const [round, setRound] = useState<RoundState | null>(null);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [flashFeedback, setFlashFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const nextQuestion = useCallback(
    (targetDiff: Difficulty = diff) => {
      setRound(generateRound(targetDiff));
    },
    [diff]
  );

  const handleStart = (selectedDiff: Difficulty = diff) => {
    setCorrectCount(0);
    setWrongCount(0);
    setStreak(0);
    setLives(3);
    setGameOver(false);
    setResult(null);
    setDiff(selectedDiff);
    nextQuestion(selectedDiff);
    startGame(selectedDiff);
  };

  const handleSelectOption = (chosenIdx: number) => {
    if (!round || gameOver || !isPlaying) return;

    if (chosenIdx === round.correctOption) {
      // Correct!
      playSound('correct');
      haptics.light();
      setFlashFeedback('correct');
      const comboBonus = Math.min(streak * 10, 50);
      const points = 50 + comboBonus;
      addScore(points);
      setStreak((s) => s + 1);
      setCorrectCount((c) => c + 1);
    } else {
      // Wrong!
      playSound('wrong');
      haptics.error();
      setFlashFeedback('wrong');
      setStreak(0);
      setWrongCount((w) => w + 1);

      if (diff === 'hard') {
        const nextLives = lives - 1;
        setLives(nextLives);
        if (nextLives <= 0) {
          handleGameOver();
          return;
        }
      }
    }

    setTimeout(() => {
      setFlashFeedback(null);
      nextQuestion(diff);
    }, 180);
  };

  const handleGameOver = useCallback(async () => {
    setGameOver(true);
    endGame();
    const res = await submitScore();
    setResult({ xp: res?.xp_earned ?? 0, highscore: res?.new_highscore ?? false });
  }, [endGame, submitScore]);

  const handleTimeUp = useCallback(async () => {
    await handleGameOver();
  }, [handleGameOver]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-red-500 shadow-lg shadow-pink-500/30 text-white font-black">
          <Eye className="h-8 w-8" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Color Shift</h1>
          <p className="max-w-md text-gray-500 dark:text-slate-400">
            Tantangan efek Stroop! Latih fokus dan kecepatan otak membedakan teks tulisan vs warna
            tinta visual.
          </p>
        </div>

        <HowToPlay
          steps={[
            {
              emoji: '🎨',
              text: 'Perhatikan instruksi di atas kata: "WARNA TINTA" atau "ARTI KATA"',
            },
            {
              emoji: '🧠',
              text: 'Abaikan jebakan! Otak akan reflek membaca tulisan daripada warna sebenarnya',
            },
            {
              emoji: '⚡',
              text: 'Jawab secepat mungkin dalam 60 detik. Mode Sulit hanya punya 3 nyawa!',
            },
          ]}
        />

        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={cn(
                'rounded-xl px-5 py-2.5 font-bold capitalize transition-all',
                diff === d
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {d === 'easy' ? 'Mudah (Tinta Saja)' : d === 'medium' ? 'Sedang (Bergantian)' : 'Sulit (3 Nyawa)'}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleStart(diff)}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 px-10 py-4 text-xl font-black text-white shadow-lg shadow-pink-500/30 transition-transform active:scale-95 hover:brightness-105"
        >
          <Play className="h-6 w-6 fill-current" />
          Mulai Main
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4 max-w-md mx-auto">
      {/* Top Bar */}
      <div className="flex w-full items-center justify-between px-2">
        <Timer initialSeconds={60} onTimeUp={handleTimeUp} isRunning={isPlaying && !gameOver} />

        {diff === 'hard' && (
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((l) => (
              <Heart
                key={l}
                className={cn(
                  'h-5 w-5 transition-colors',
                  l <= lives ? 'text-red-500 fill-red-500' : 'text-gray-300 dark:text-slate-700'
                )}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {streak > 2 && (
            <span className="flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-600 dark:bg-pink-950/40 dark:text-pink-400">
              <Zap className="h-3.5 w-3.5 fill-current" />
              {streak}x Combo
            </span>
          )}
          <ScoreBoard score={score} />
        </div>
      </div>

      {!gameOver && round && (
        <div className="w-full space-y-6">
          {/* Target Rule Header */}
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              PILIH BERDASARKAN:
            </span>
            <div
              className={cn(
                'mt-1 inline-block rounded-xl px-4 py-1.5 text-sm font-black uppercase tracking-wide',
                round.rule === 'COLOR'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 ring-2 ring-purple-500/30'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 ring-2 ring-amber-500/30'
              )}
            >
              {round.rule === 'COLOR' ? '🎨 WARNA TINTA VISUAL' : '🔤 ARTI KATA (BACA)'}
            </div>
          </div>

          {/* Main Stroop Card */}
          <motion.div
            key={`${round.wordIndex}-${round.inkColorIndex}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className={cn(
              'flex h-44 flex-col items-center justify-center rounded-3xl border-2 bg-white p-6 shadow-sm transition-colors dark:bg-slate-800',
              flashFeedback === 'correct' && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
              flashFeedback === 'wrong' && 'border-rose-500 bg-rose-50 dark:bg-rose-950/30',
              !flashFeedback && 'border-gray-200 dark:border-slate-700'
            )}
          >
            <span
              className="select-none font-black text-5xl sm:text-6xl tracking-wider"
              style={{ color: COLOR_PALETTE[round.inkColorIndex].colorClass }}
            >
              {COLOR_PALETTE[round.wordIndex].name}
            </span>
          </motion.div>

          {/* Option Buttons (4 choices) */}
          <div className="grid grid-cols-2 gap-3">
            {round.options.map((optIdx) => {
              const opt = COLOR_PALETTE[optIdx];
              return (
                <motion.button
                  key={optIdx}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleSelectOption(optIdx)}
                  className="flex h-16 items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white font-black text-lg text-gray-800 shadow-sm hover:border-indigo-400 hover:shadow-md active:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-indigo-500"
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: opt.colorClass }}
                  />
                  {opt.name}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Result Screen */}
      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="color-shift"
            gameName="Color Shift"
            onReplay={() => handleStart(diff)}
            description={`Jawaban Benar: ${correctCount} | Salah: ${wrongCount}`}
            breakdown={[
              { label: 'Benar', value: correctCount },
              { label: 'Salah', value: wrongCount },
              { label: 'Skor Akhir', value: score },
              { label: 'Tingkat Kesulitan', value: diff.toUpperCase() },
            ]}
          />
        </div>
      )}
    </div>
  );
}
