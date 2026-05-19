'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { Timer } from '@/components/ui/Timer';
import { cn } from '@/lib/utils/cn';

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
    { number: 1, direction: 'across', clue: 'Bagian tanaman yang indah', answer: 'BUNGA', r: 0, c: 0 },
    { number: 4, direction: 'across', clue: 'Hari setelah Rabu', answer: 'KAMIS', r: 2, c: 0 },
    { number: 6, direction: 'across', clue: 'Camilan ringan (Inggris)', answer: 'SNAK', r: 4, c: 1 },
    { number: 1, direction: 'down', clue: 'Sumber ilmu tertulis', answer: 'BUKU', r: 0, c: 0 },
    { number: 2, direction: 'down', clue: 'Nama orang atau kata ganti', answer: 'NAMA', r: 0, c: 2 },
    { number: 3, direction: 'down', clue: 'Ibukota Jawa Tengah (Singkat)', answer: 'SMG', r: 0, c: 4 },
    { number: 5, direction: 'down', clue: 'Satuan ukuran luas', answer: 'ARE', r: 2, c: 3 },
  ] as Clue[],
};

export default function Crossword() {
  const { score, isPlaying, startGame, endGame, addScore, submitScore } = useGame('crossword');
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">TTS Indonesia</h1>
        <p className="text-gray-500 dark:text-slate-400 text-center max-w-md">
          Isi teka-teki silang dengan kata-kata yang tepat!
        </p>
        <button
          onClick={initGame}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-lg transition-colors"
        >
          Mulai!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex items-center justify-between w-full max-w-md">
        <Timer initialSeconds={300} onTimeUp={() => { setGameOver(true); endGame(); }} isRunning={isPlaying && !gameOver} />
        <ScoreBoard score={score} />
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="grid grid-cols-5 gap-1 bg-gray-900 p-1 border-2 border-gray-900 rounded-lg shadow-xl">
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={cn(
                  'relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-all',
                  cell.isBlack ? 'bg-gray-900' : 'bg-white dark:bg-slate-800'
                )}
              >
                {!cell.isBlack && (
                  <>
                    {cell.number && (
                      <span className="absolute top-0.5 left-1 text-[10px] font-bold text-gray-400">
                        {cell.number}
                      </span>
                    )}
                    <input
                      type="text"
                      value={cell.userInput}
                      onChange={(e) => handleInput(r, c, e.target.value)}
                      className={cn(
                        'w-full h-full text-center text-xl font-black focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20 dark:text-white bg-transparent uppercase',
                        cell.userInput !== '' && cell.userInput !== cell.letter && gameOver && 'text-red-500'
                      )}
                      maxLength={1}
                    />
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="w-full md:w-64 space-y-4 max-h-[400px] overflow-auto pr-2">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white border-b-2 border-indigo-500 mb-2">Mendatar</h3>
            {PUZZLE_DATA.clues.filter(c => c.direction === 'across').map(clue => (
              <p key={`${clue.number}-a`} className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                <span className="font-bold mr-2">{clue.number}.</span> {clue.clue}
              </p>
            ))}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white border-b-2 border-emerald-500 mb-2">Menurun</h3>
            {PUZZLE_DATA.clues.filter(c => c.direction === 'down').map(clue => (
              <p key={`${clue.number}-d`} className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                <span className="font-bold mr-2">{clue.number}.</span> {clue.clue}
              </p>
            ))}
          </div>
        </div>
      </div>

      {gameOver && (
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-emerald-600">Selesai!</p>
          <button
            onClick={initGame}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
          >
            Main Lagi
          </button>
        </div>
      )}
    </div>
  );
}
