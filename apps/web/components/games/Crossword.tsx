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

interface CrosswordCell {
  r: number;
  c: number;
  letter: string;
  isBlack: boolean;
  number?: number;
  userInput: string;
}

interface Clue {
  number: number;
  direction: 'across' | 'down';
  clue: string;
  answer: string;
  r: number;
  c: number;
}

const PUZZLE_DATA = {
  grid: [
    ['B', 'U', 'N', 'G', 'A'],
    ['U', '#', 'A', '#', 'B'],
    ['K', 'A', 'M', 'I', 'S'],
    ['U', '#', 'A', '#', 'A'],
    ['#', 'S', 'N', 'A', 'K'],
  ],
  clues: [
    {
      number: 1,
      direction: 'across',
      clue: 'Bagian tanaman yang indah',
      answer: 'BUNGA',
      r: 0,
      c: 0,
    },
    { number: 4, direction: 'across', clue: 'Hari setelah Rabu', answer: 'KAMIS', r: 2, c: 0 },
    {
      number: 6,
      direction: 'across',
      clue: 'Camilan ringan (Inggris)',
      answer: 'SNAK',
      r: 4,
      c: 1,
    },
    { number: 1, direction: 'down', clue: 'Sumber ilmu tertulis', answer: 'BUKU', r: 0, c: 0 },
    {
      number: 2,
      direction: 'down',
      clue: 'Nama orang atau kata ganti',
      answer: 'NAMA',
      r: 0,
      c: 2,
    },
    {
      number: 3,
      direction: 'down',
      clue: 'Ibukota Jawa Tengah (Singkat)',
      answer: 'SMG',
      r: 0,
      c: 4,
    },
    { number: 5, direction: 'down', clue: 'Satuan ukuran luas', answer: 'ARE', r: 2, c: 3 },
  ] as Clue[],
};

export default function Crossword() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore, pauseGame } = useGame('crossword');
  const { t } = useLocale();
  const [grid, setGrid] = useState<CrosswordCell[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ xp: number; highscore: boolean } | null>(null);

  const initGame = useCallback(() => {
    const newGrid: CrosswordCell[][] = PUZZLE_DATA.grid.map((row, r) =>
      row.map((char, c) => ({
        r,
        c,
        letter: char,
        isBlack: char === '#',
        userInput: '',
        number: PUZZLE_DATA.clues.find((clue) => clue.r === r && clue.c === c)?.number,
      }))
    );
    setGrid(newGrid);
    setGameOver(false);
    setResult(null);
    startGame('medium');
  }, [startGame]);

  useEffect(() => {
    if (isPlaying && grid.length === 0) initGame();
  }, [isPlaying, grid.length, initGame]);

  const handleInput = (r: number, c: number, val: string) => {
    if (gameOver || !isPlaying) return;
    const letter = val.toUpperCase().slice(-1);
    if (!/^[A-Z]?$/.test(letter)) return;

    const newGrid = [...grid.map((row) => [...row])];
    newGrid[r][c].userInput = letter;
    setGrid(newGrid);

    const isComplete = newGrid.every((row) =>
      row.every((cell) => cell.isBlack || cell.userInput === cell.letter)
    );

    if (isComplete) {
      handleWin();
    }
  };

  const handleWin = async () => {
    setGameOver(true);
    endGame();
    addScore(300);
    const res = await submitScore();
    if (res) setResult({ xp: res.xp_earned, highscore: res.new_highscore });
  };

  if (!isPlaying && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('game.crossword.title')}</h1>
        <p className="max-w-md text-center text-gray-500 dark:text-slate-400">
          {t('game.crossword.desc')}
        </p>
        <HowToPlay
          steps={[
            { emoji: "👆", text: "Ketuk kotak di grid untuk memilih arah kata (mendatar/menurun)" },
            { emoji: "💡", text: "Baca petunjuk yang muncul, lalu ketik jawabannya" },
            { emoji: "⌨️", text: "Kursor otomatis berpindah ke huruf berikutnya setelah diisi" },
          ]}
        />
        <button
          onClick={initGame}
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
          initialSeconds={300}
          onTimeUp={() => {
            setGameOver(true);
            endGame();
          }}
          isRunning={isPlaying && !gameOver}
        />
        <ScoreBoard score={score} />
        <button onClick={pauseGame} className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800' aria-label='Jeda permainan'>
          <Pause className='h-4 w-4' />
        </button>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="grid grid-cols-5 gap-1 rounded-lg border-2 border-gray-900 bg-gray-900 p-1 shadow-xl">
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={cn(
                  'relative flex h-12 w-12 items-center justify-center transition-all sm:h-14 sm:w-14',
                  cell.isBlack ? 'bg-gray-900' : 'bg-white dark:bg-slate-800'
                )}
              >
                {!cell.isBlack && (
                  <>
                    {cell.number && (
                      <span className="absolute left-1 top-0.5 text-[10px] font-bold text-gray-400">
                        {cell.number}
                      </span>
                    )}
                    <input
                      type="text"
                      value={cell.userInput}
                      onChange={(e) => handleInput(r, c, e.target.value)}
                      className={cn(
                        'h-full w-full bg-transparent text-center text-xl font-black uppercase focus:bg-indigo-50 focus:outline-none dark:text-white dark:focus:bg-indigo-900/20',
                        cell.userInput !== '' &&
                          cell.userInput !== cell.letter &&
                          gameOver &&
                          'text-red-500'
                      )}
                      maxLength={1}
                    />
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="max-h-[400px] w-full space-y-4 overflow-auto pr-2 md:w-64">
          <div>
            <h3 className="mb-2 border-b-2 border-indigo-500 font-bold text-gray-900 dark:text-white">
              Mendatar
            </h3>
            {PUZZLE_DATA.clues
              .filter((c) => c.direction === 'across')
              .map((clue) => (
                <p
                  key={`${clue.number}-a`}
                  className="mb-1 text-sm text-gray-600 dark:text-slate-400"
                >
                  <span className="mr-2 font-bold">{clue.number}.</span> {clue.clue}
                </p>
              ))}
          </div>
          <div>
            <h3 className="mb-2 border-b-2 border-emerald-500 font-bold text-gray-900 dark:text-white">
              Menurun
            </h3>
            {PUZZLE_DATA.clues
              .filter((c) => c.direction === 'down')
              .map((clue) => (
                <p
                  key={`${clue.number}-d`}
                  className="mb-1 text-sm text-gray-600 dark:text-slate-400"
                >
                  <span className="mr-2 font-bold">{clue.number}.</span> {clue.clue}
                </p>
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
            gameSlug="crossword"
            gameName="TTS Indonesia"
            onReplay={initGame}
            description={t('game.done')}
          />
        </div>
      )}
    </div>
  );
}
