'use client';

import { HowToPlay } from '@/components/ui/HowToPlay';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { contentApi } from '@/lib/api/content';
import { cn } from '@/lib/utils/cn';
import { Pause, Share2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const FALLBACK_WORD_LIST = [
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

function getRandomWord(wordList: string[]): string {
  return wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
}

export default function Wordle({ isDaily = false }: { isDaily?: boolean }) {
  const { t } = useLocale();
  const { score, isPlaying, addScore, startGame, endGame, submitScore, pauseGame } =
    useGame('wordle');

  const { data: wordsData } = useQuery({
    queryKey: ['content', 'words', 'wordle'],
    queryFn: () => contentApi.getWordleWords('id'),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const WORD_LIST = wordsData?.map((w) => w.word) ?? FALLBACK_WORD_LIST;

  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<LetterCell[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [usedLetters, setUsedLetters] = useState<Record<string, LetterStatus>>({});
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);
  const [gridCopied, setGridCopied] = useState(false);

  const handleStart = () => {
    setTargetWord(getRandomWord(WORD_LIST));
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

  const buildEmojiGrid = (): string => {
    const emojiMap: Record<LetterStatus, string> = {
      correct: '🟩',
      present: '🟨',
      absent: '⬜',
      empty: '⬜',
    };
    const rows = guesses.map((row) => row.map((cell) => emojiMap[cell.status]).join(''));
    const result = won ? `Berhasil dalam ${guesses.length}/6` : 'Gagal 😢';
    return `Wordle Indonesia — ${result}\n\n${rows.join('\n')}\n\nMain di EduPlay 🎮`;
  };

  const handleShareGrid = () => {
    const text = buildEmojiGrid();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({ title: 'EduPlay — Wordle Indonesia', text, url }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(`${text}\n${url}`)
        .then(() => {
          setGridCopied(true);
          setTimeout(() => setGridCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  const statusColor: Record<LetterStatus, string> = {
    correct: 'bg-emerald-500 text-white border-emerald-500',
    present: 'bg-amber-500 text-white border-amber-500',
    absent: 'bg-gray-400 text-white border-gray-400 dark:bg-slate-600',
    empty: 'border-gray-300 dark:border-slate-600',
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('game.wordle.title')}
        </h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.wordle.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: '🟩', text: 'Hijau = huruf benar di posisi yang tepat' },
            { emoji: '🟨', text: 'Kuning = huruf ada di kata, tapi salah posisi' },
            { emoji: '⬜', text: 'Abu-abu = huruf tidak ada dalam kata' },
          ]}
        />
        <button
          onClick={handleStart}
          className="touch-target rounded-xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-emerald-600"
          aria-label={t('game.menu_play_aria')}
        >
          {t('game.start')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div aria-live="polite" className="flex items-center gap-4">
        <ScoreBoard score={score} />
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {t('game.attempt').replace('{n}', String(attempt))}
        </span>
        <button
          onClick={pauseGame}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          aria-label={t('game.pause_label')}
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-1.5" role="grid" aria-label={t('game.grid_wordle')}>
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex gap-1.5" role="row">
            {Array.from({ length: 5 }).map((_, col) => {
              const guessRow = guesses[row];
              const isCurrentRow = row === attempt && !gameOver;
              const cell = guessRow?.[col];
              const letter = cell?.letter || (isCurrentRow ? currentGuess[col] || '' : '');
              const status = cell?.status || 'empty';

              return (
                <div
                  key={col}
                  role="gridcell"
                  aria-label={`Baris ${row + 1}, kolom ${col + 1}${cell ? `: ${cell.letter}, ${cell.status === 'correct' ? 'benar' : cell.status === 'present' ? 'ada di kata' : cell.status === 'absent' ? 'tidak ada' : 'kosong'}` : ''}`}
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl font-bold transition-all',
                    guessRow ? statusColor[status] : 'border-gray-300 dark:border-slate-600',
                    isCurrentRow && currentGuess[col] && 'border-gray-500 dark:border-slate-400'
                  )}
                >
                  {status === 'correct' && <span aria-hidden="true">{letter}</span>}
                  {status === 'present' && <span aria-hidden="true">{letter}</span>}
                  {status === 'absent' && <span aria-hidden="true">{letter}</span>}
                  {status === 'empty' && letter}
                  {!letter && <span aria-hidden="true">&nbsp;</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="wordle"
            gameName={t('game.wordle.title')}
            onReplay={handleStart}
            description={
              won
                ? t('game.congrats_word')
                : `${t('game.over')} ${t('game.reveal_target').replace('{word}', targetWord)}`
            }
          />
          <button
            onClick={handleShareGrid}
            aria-live="polite"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 py-3 font-bold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
          >
            <Share2 className="h-4 w-4" />
            {gridCopied ? 'Disalin!' : 'Bagikan Grid'}
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-col gap-1.5" role="group" aria-label={t('game.numpad')}>
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1" role="row">
            {row.map((key) => {
              const keyStatus = usedLetters[key];
              const ariaLabel =
                key === 'ENTER'
                  ? t('game.submit_answer')
                  : key === '⌫'
                    ? t('game.erase')
                    : t('game.key_label').replace('{key}', key);
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  aria-label={ariaLabel}
                  className={cn(
                    'touch-target flex items-center justify-center rounded-md px-2.5 py-3 text-sm font-bold transition-colors',
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
