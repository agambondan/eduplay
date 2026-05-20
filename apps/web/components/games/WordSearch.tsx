'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';
import { ResultScreen } from '@/components/ui/ResultScreen';
import { HowToPlay } from '@/components/ui/HowToPlay';
import { cn } from '@/lib/utils/cn';
import { Pause } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

const WORD_LIST = [
  'BUNGA',
  'CINTA',
  'DUNIA',
  'GAJAH',
  'HAKIM',
  'JALAN',
  'KANAN',
  'LAWAN',
  'MAKAN',
  'NALAR',
  'PAGAR',
  'SALAM',
  'TAMAN',
  'UDARA',
  'WAJAH',
  'YAKIN',
  'ZAMAN',
  'ABADI',
  'BAKAT',
  'CALON',
];

interface WordSearchGame {
  grid: string[][];
  words: { word: string; found: boolean; cells: [number, number][] }[];
  size: number;
}

function generateGrid(size: number, wordsToPlace: string[]): WordSearchGame {
  const grid = Array(size)
    .fill(0)
    .map(() => Array(size).fill(''));
  const placedWords: { word: string; found: boolean; cells: [number, number][] }[] = [];

  for (const word of wordsToPlace) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const direction = Math.floor(Math.random() * 3); // 0: horizontal, 1: vertical, 2: diagonal
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);

      let canPlace = true;
      const cells: [number, number][] = [];

      for (let i = 0; i < word.length; i++) {
        let r = row,
          c = col;
        if (direction === 0) c += i;
        else if (direction === 1) r += i;
        else {
          r += i;
          c += i;
        }

        if (r >= size || c >= size || (grid[r][c] !== '' && grid[r][c] !== word[i])) {
          canPlace = false;
          break;
        }
        cells.push([r, c]);
      }

      if (canPlace) {
        cells.forEach(([r, c], i) => {
          grid[r][c] = word[i];
        });
        placedWords.push({ word, found: false, cells });
        placed = true;
      }
    }
  }

  // Fill empty cells
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return { grid, words: placedWords, size };
}

export default function WordSearch() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } = useGame('word-search');
  const { t } = useLocale();
  const [game, setGame] = useState<WordSearchGame | null>(null);
  const [selection, setSelection] = useState<[number, number][]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const handleStart = useCallback(() => {
    const shuffled = [...WORD_LIST].sort(() => Math.random() - 0.5).slice(0, 6);
    setGame(generateGrid(10, shuffled));
    setSelection([]);
    setGameOver(false);
    setResult(null);
    startGame('medium');
  }, [startGame]);

  const onPointerDown = (r: number, c: number) => {
    if (gameOver || !isPlaying) return;
    setIsSelecting(true);
    setSelection([[r, c]]);
  };

  const onPointerEnter = (r: number, c: number) => {
    if (!isSelecting || gameOver || !isPlaying) return;

    const start = selection[0];
    const dr = r - start[0];
    const dc = c - start[1];

    // Allow only horizontal, vertical, or diagonal
    if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const newSelection: [number, number][] = [];
      const sr = dr === 0 ? 0 : dr / steps;
      const sc = dc === 0 ? 0 : dc / steps;

      for (let i = 0; i <= steps; i++) {
        newSelection.push([start[0] + i * sr, start[1] + i * sc]);
      }
      setSelection(newSelection);
    }
  };

  const onPointerUp = useCallback(async () => {
    if (!isSelecting || !game) return;
    setIsSelecting(false);

    const selectedWord = selection.map(([r, c]) => game.grid[r][c]).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    const wordIndex = game.words.findIndex(
      (w) => !w.found && (w.word === selectedWord || w.word === reversedWord)
    );

    if (wordIndex !== -1) {
      const newWords = [...game.words];
      newWords[wordIndex].found = true;
      setGame({ ...game, words: newWords });
      addScore(50);

      if (newWords.every((w) => w.found)) {
        setGameOver(true);
        endGame();
        const res = await submitScore();
        if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
      }
    }
    setSelection([]);
  }, [isSelecting, game, selection, addScore, endGame, submitScore]);

  useEffect(() => {
    window.addEventListener('pointerup', onPointerUp);
    return () => window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerUp]);

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('game.word_search.title')}</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.word_search.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: "👁️", text: "Cari semua kata yang ada di daftar dalam grid huruf" },
            { emoji: "👆", text: "Tap dan drag/swipe untuk memilih kata di grid" },
            { emoji: "🔍", text: "Kata bisa tersembunyi horizontal, vertikal, atau diagonal!" },
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
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex w-full max-w-md items-center justify-between">
        <Timer
          initialSeconds={180}
          onTimeUp={() => {
            setGameOver(true);
            endGame();
          }}
          isRunning={isPlaying && !gameOver}
        />
        <ScoreBoard score={score} />
        <button onClick={pauseGame} className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800' aria-label={t('game.pause_label')}>
          <Pause className='h-4 w-4' />
        </button>
      </div>

      <div className="flex flex-col items-start gap-8 md:flex-row">
        {game && (
          <div
            className="grid select-none grid-cols-10 gap-1 rounded-xl bg-gray-200 p-2 dark:bg-slate-700"
            style={{ touchAction: 'none' }}
          >
            {game.grid.map((row, r) =>
              row.map((char, c) => {
                const isSelected = selection.some(([sr, sc]) => sr === r && sc === c);
                const isFound = game.words.some(
                  (w) => w.found && w.cells.some(([fr, fc]) => fr === r && fc === c)
                );
                return (
                  <div
                    key={`${r}-${c}`}
                    onPointerDown={() => onPointerDown(r, c)}
                    onPointerEnter={() => onPointerEnter(r, c)}
                    className={cn(
                      'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-sm font-bold transition-colors sm:h-10 sm:w-10 sm:text-base',
                      isFound
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    {char}
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="w-full space-y-4 md:w-48">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white">
            Daftar Kata
          </h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {game?.words.map((w, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-bold transition-all',
                  w.found
                    ? 'bg-emerald-50 text-emerald-600 line-through opacity-50 dark:bg-emerald-900/20'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                )}
              >
                {w.word}
              </div>
            ))}
          </div>
        </div>
      </div>

      {gameOver && result && (
        <div className="w-full max-w-sm">
          <ResultScreen
            score={score}
            xpEarned={result.xp}
            isNewHighscore={result.highscore}
            gameSlug="word-search"
            gameName="Word Search"
            onReplay={handleStart}
            description={t('game.all_found')}
          />
        </div>
      )}
    </div>
  );
}
