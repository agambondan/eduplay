'use client';

import { useState, useCallback } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { cn } from '@/lib/utils/cn';

interface SpellQuestion {
  word: string;
  scrambled: string[];
  hint: string;
}

const SPELL_DATA = [
  { word: 'BELAJAR', hint: 'Proses memperoleh ilmu atau kepintaran.' },
  { word: 'PINTAR', hint: 'Kondisi memiliki kecerdasan tinggi.' },
  { word: 'SEKOLAH', hint: 'Lembaga atau tempat untuk belajar mengajar.' },
  { word: 'BUKU', hint: 'Kumpulan kertas berjilid berisi tulisan atau gambar.' },
  { word: 'GURU', hint: 'Orang yang pekerjaannya mengajar.' },
  { word: 'ILMU', hint: 'Pengetahuan tentang suatu bidang.' },
];

function generateQuestion(): SpellQuestion {
  const item = SPELL_DATA[Math.floor(Math.random() * SPELL_DATA.length)];
  return {
    word: item.word,
    scrambled: item.word.split('').sort(() => Math.random() - 0.5),
    hint: item.hint,
  };
}

export default function SpellingBee() {
  const { score, isPlaying, addScore, startGame, endGame, submitScore } = useGame('spelling-bee');
  const [question, setQuestion] = useState<SpellQuestion | null>(null);
  const [userLetters, setUserLetters] = useState<string[]>([]);
  const [remainingLetters, setRemainingLetters] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const nextQuestion = useCallback(() => {
    const q = generateQuestion();
    setQuestion(q);
    setUserLetters([]);
    setRemainingLetters(q.scrambled);
    setFeedback(null);
  }, []);

  const handleStart = () => {
    setQuestionCount(0);
    setGameOver(false);
    setResult(null);
    nextQuestion();
    startGame('easy');
  };

  const handleAddLetter = (letter: string, index: number) => {
    if (feedback) return;
    setUserLetters([...userLetters, letter]);
    setRemainingLetters(remainingLetters.filter((_, idx) => idx !== index));
  };

  const handleRemoveLetter = (index: number) => {
    if (feedback) return;
    const letter = userLetters[index];
    setRemainingLetters([...remainingLetters, letter]);
    setUserLetters(userLetters.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (!question || feedback) return;

    const answer = userLetters.join('');
    const isCorrect = answer === question.word;

    if (isCorrect) {
      setFeedback('correct');
      addScore(15);
    } else {
      setFeedback('wrong');
      addScore(-3);
    }

    setQuestionCount((c) => c + 1);

    if (questionCount + 1 >= 5) {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Spelling Bee</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          Susun kembali huruf acak menjadi kata yang benar!
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
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-4">
        <ScoreBoard score={score} />
        <span className="text-sm text-gray-500 dark:text-slate-400">Soal {questionCount}/5</span>
      </div>

      {question && (
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-xl bg-indigo-50 p-4 text-center dark:bg-slate-800">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
              Definisi Clue
            </span>
            <p className="mt-1 font-semibold text-gray-700 dark:text-slate-300">{question.hint}</p>
          </div>

          <div className="flex min-h-[48px] flex-wrap justify-center gap-2 rounded-xl bg-gray-100 p-3 dark:bg-slate-700">
            {userLetters.map((l, i) => (
              <button
                key={i}
                onClick={() => handleRemoveLetter(i)}
                className="h-10 w-10 rounded-lg bg-indigo-600 text-lg font-bold text-white shadow-sm"
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {remainingLetters.map((l, i) => (
              <button
                key={i}
                onClick={() => handleAddLetter(l, i)}
                className="h-10 w-10 rounded-lg border border-gray-300 bg-white text-lg font-bold text-gray-900 shadow-sm active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {l}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={userLetters.length === 0 || feedback !== null}
            className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            Kirim
          </button>
        </div>
      )}

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
