'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { cn } from '@/lib/utils/cn';

const WORD_LIST = [
  'bunga',
  'cinta',
  'dunia',
  'gajah',
  'hakim',
  'jalan',
  'kanan',
  'lawan',
  'makan',
  'nalar',
  'pagar',
  'rakan',
  'salam',
  'taman',
  'udara',
  'wajah',
  'yakin',
  'zaman',
  'abadi',
  'bakat',
  'calon',
  'damai',
  'empat',
  'fakta',
  'galak',
  'harga',
  'ilham',
  'janji',
  'kabar',
  'layar',
  'mahal',
  'nakal',
  'obral',
  'paham',
  'rapat',
  'sabar',
  'tanah',
  'ujung',
  'viral',
  'waktu',
  'akhir',
  'bahan',
  'capai',
  'dafar',
  'etika',
  'fatwa',
  'gagal',
  'halal',
  'ihsan',
  'jarak',
  'kabel',
  'lapar',
  'mandi',
  'nafas',
  'opini',
  'pesan',
  'rajin',
  'salah',
  'tabah',
  'ulang',
];

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

interface LetterCell {
  letter: string;
  status: LetterStatus;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

function getRandomWord(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)].toUpperCase();
}

export default function Wordle({ isDaily = false }: { isDaily?: boolean }) {
  const { score, isPlaying, addScore, startGame, endGame, submitScore } = useGame('wordle');
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<LetterCell[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [usedLetters, setUsedLetters] = useState<Record<string, LetterStatus>>({});
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const handleStart = () => {
    setTargetWord(getRandomWord());
    setGuesses([]);
    setCurrentGuess('');
    setAttempt(0);
    setGameOver(false);
    setWon(false);
    setUsedLetters({});
    setResult(null);
    startGame('medium');
  };

  const evaluateGuess = useCallback(
    (guess: string): LetterCell[] => {
      const result: LetterCell[] = [];
      const targetArr = targetWord.split('');
      const remaining = [...targetArr];

      for (let i = 0; i < 5; i++) {
        if (guess[i] === targetArr[i]) {
          result.push({ letter: guess[i], status: 'correct' });
          remaining[i] = '';
        } else {
          result.push({ letter: guess[i], status: 'empty' });
        }
      }

      for (let i = 0; i < 5; i++) {
        if (result[i].status === 'correct') continue;
        const idx = remaining.indexOf(guess[i]);
        if (idx !== -1) {
          result[i].status = 'present';
          remaining[idx] = '';
        } else {
          result[i].status = 'absent';
        }
      }

      return result;
    },
    [targetWord]
  );

  const handleSubmitGuess = useCallback(async () => {
    if (currentGuess.length !== 5 || gameOver) return;

    const evaluated = evaluateGuess(currentGuess);
    const newGuesses = [...guesses, evaluated];
    setGuesses(newGuesses);

    const newUsed = { ...usedLetters };
    evaluated.forEach(({ letter, status }) => {
      const prev = newUsed[letter];
      if (status === 'correct' || !prev || prev !== 'correct') {
        newUsed[letter] = status;
      }
    });
    setUsedLetters(newUsed);

    const isWin = currentGuess === targetWord;
    const newAttempt = attempt + 1;
    setAttempt(newAttempt);
    setCurrentGuess('');

    if (isWin) {
      const scoreMap: Record<number, number> = { 1: 100, 2: 80, 3: 60, 4: 40, 5: 20, 6: 10 };
      addScore(scoreMap[newAttempt] || 10);
      setWon(true);
      setGameOver(true);
      endGame();
      const res = await submitScore();
      if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
    } else if (newAttempt >= 6) {
      setGameOver(true);
      endGame();
      const res = await submitScore();
      if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
    }
  }, [
    currentGuess,
    gameOver,
    evaluateGuess,
    guesses,
    usedLetters,
    targetWord,
    attempt,
    addScore,
    endGame,
    submitScore,
  ]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver) return;
      if (key === 'ENTER') {
        handleSubmitGuess();
      } else if (key === '⌫' || key === 'BACKSPACE') {
        setCurrentGuess((g) => g.slice(0, -1));
      } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((g) => g + key);
      }
    },
    [gameOver, currentGuess, handleSubmitGuess]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKey(e.key.toUpperCase());
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const statusColor: Record<LetterStatus, string> = {
    correct: 'bg-emerald-500 text-white border-emerald-500',
    present: 'bg-amber-500 text-white border-amber-500',
    absent: 'bg-gray-400 text-white border-gray-400 dark:bg-slate-600',
    empty: 'border-gray-300 dark:border-slate-600',
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wordle Indonesia</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          Tebak kata 5 huruf Bahasa Indonesia dalam 6 percobaan!
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
        <span className="text-sm text-gray-500 dark:text-slate-400">Percobaan {attempt}/6</span>
      </div>

      <div className="grid gap-1.5">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, col) => {
              const guessRow = guesses[row];
              const isCurrentRow = row === attempt && !gameOver;
              const cell = guessRow?.[col];
              const letter = cell?.letter || (isCurrentRow ? currentGuess[col] || '' : '');
              const status = cell?.status || 'empty';

              return (
                <div
                  key={col}
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl font-bold transition-all',
                    guessRow ? statusColor[status] : 'border-gray-300 dark:border-slate-600',
                    isCurrentRow && currentGuess[col] && 'border-gray-500 dark:border-slate-400'
                  )}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {gameOver && (
        <div className="space-y-2 text-center">
          <p className={cn('text-lg font-bold', won ? 'text-emerald-600' : 'text-red-500')}>
            {won ? 'Selamat! Kata benar!' : `Game Over! Kata: ${targetWord}`}
          </p>
          {result && (
            <div className="text-sm text-gray-500 dark:text-slate-400">
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

      <div className="mt-2 flex flex-col gap-1.5">
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map((key) => {
              const keyStatus = usedLetters[key];
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className={cn(
                    'min-w-[32px] rounded-md px-2.5 py-3 text-sm font-bold transition-colors',
                    key.length > 1 ? 'px-3 text-xs' : '',
                    keyStatus
                      ? statusColor[keyStatus]
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                  )}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
