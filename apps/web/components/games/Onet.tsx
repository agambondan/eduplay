'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateBoard, findPath, shuffleBoard, hasValidMoves, applyGravity,
  DIFFICULTY, OnetConfig, Point, Gravity,
  fetchAdminConfig, applyAdminOverrides,
} from '@/lib/game-engines/onetEngine';
import { useGame } from '@/lib/hooks/useGame';
import { useLocale } from '@/lib/i18n';
import { GameContainer } from '@/components/ui/GameContainer';
import { cn } from '@/lib/utils/cn';
import { Sparkles, Shuffle, Lightbulb, Pause, Play, RotateCcw, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';

const ANIMATION_DURATION = 300;
const GRAVITY_ICONS: Record<string, typeof ArrowDown> = {
  down: ArrowDown, up: ArrowUp, left: ArrowLeft, right: ArrowRight,
};
const GRAVITY_NAMES: Record<string, string> = {
  none: 'No Gravity', down: 'Gravity Down', up: 'Gravity Up', left: 'Slide Left', right: 'Slide Right',
};

let resolvedDifficulty: Record<string, OnetConfig> | null = null;

export default function OnetGame() {
  const { t } = useLocale();
  const { isPlaying, startGame, endGame, addScore, submitScore } = useGame('onet', 'Onet', 'logic');
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [config, setConfig] = useState<OnetConfig | null>(null);
  const [board, setBoard] = useState<(number | null)[][]>([]);
  const [iconMap, setIconMap] = useState<Map<number, string>>(new Map());
  const [selected, setSelected] = useState<Point | null>(null);
  const [path, setPath] = useState<Point[]>([]);
  const [removing, setRemoving] = useState(false);
  const [timer, setTimer] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [shuffles, setShuffles] = useState(3);
  const [hints, setHints] = useState(3);
  const [hintPath, setHintPath] = useState<Point[]>([]);
  const [gravityLabel, setGravityLabel] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scoreRef = useRef(0);

  const init = useCallback(async (diff: string) => {
    if (!resolvedDifficulty) {
      const overrides = await fetchAdminConfig();
      resolvedDifficulty = applyAdminOverrides(DIFFICULTY, overrides);
    }
    const cfg = resolvedDifficulty[diff];
    setDifficulty(diff);
    setConfig(cfg);
    const { board: b, iconMap: im } = generateBoard(cfg);
    setBoard(b);
    setIconMap(im);
    setSelected(null);
    setPath([]);
    setRemoving(false);
    setTimer(cfg.timeLimit);
    setCombo(0);
    setGameOver(false);
    setPaused(false);
    setShuffles(3);
    setHints(3);
    setHintPath([]);
    setGravityLabel(GRAVITY_NAMES[cfg.gravity || 'none']);
    scoreRef.current = 0;
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (!isPlaying || gameOver || paused || timer <= 0) return;
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); finishGame(scoreRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, gameOver, paused, timer]);

  const finishGame = useCallback((finalScore: number) => {
    setGameOver(true); endGame(); submitScore(finalScore);
  }, [endGame, submitScore]);

  useEffect(() => {
    if (!isPlaying || gameOver || paused) return;
    if (!hasValidMoves(board) && getRemainingCount(board) > 0) {
      const newBoard = shuffleBoard(board);
      setBoard(newBoard);
      setShuffles((s) => Math.max(0, s - 1));
    }
    if (getRemainingCount(board) === 0 && !gameOver) {
      const bonus = timer * 10;
      finishGame(scoreRef.current + bonus);
    }
  }, [board, isPlaying, gameOver, paused, timer, finishGame]);

  const getRemainingCount = (b: (number | null)[][]) => {
    let count = 0;
    for (const row of b) for (const cell of row) if (cell !== null) count++;
    return count;
  };

  const handleCellClick = useCallback((row: number, col: number) => {
    if (removing || gameOver || paused || !config) return;
    if (board[row][col] === null) return;
    setHintPath([]);

    if (!selected) { setSelected({ row, col }); return; }
    if (selected.row === row && selected.col === col) { setSelected(null); return; }
    if (board[selected.row][selected.col] !== board[row][col]) { setSelected({ row, col }); return; }

    const result = findPath(board, selected, { row, col });
    if (!result.found) { setSelected({ row, col }); return; }

    setRemoving(true);
    setPath(result.path);
    setSelected(null);

    setTimeout(() => {
      let newBoard = board.map((r) => [...r]);
      newBoard[selected.row][selected.col] = null;
      newBoard[row][col] = null;
      newBoard = applyGravity(newBoard, (config.gravity || 'none') as Gravity);
      setBoard(newBoard);
      setPath([]);
      setRemoving(false);
      const newCombo = combo + 1;
      setCombo(newCombo);
      const pts = 100 + (newCombo - 1) * 50;
      scoreRef.current += pts;
      addScore(pts);
    }, ANIMATION_DURATION);
  }, [board, selected, removing, gameOver, paused, config, combo, addScore]);

  const handleShuffle = useCallback(() => {
    if (shuffles <= 0 || gameOver || paused) return;
    setBoard(shuffleBoard(board));
    setShuffles(shuffles - 1);
    setSelected(null);
    setHintPath([]);
  }, [board, shuffles, gameOver, paused]);

  const handleHint = useCallback(() => {
    if (hints <= 0 || gameOver || paused) return;
    const match = findAnyMatchLocal(board);
    if (match) {
      const result = findPath(board, match[0], match[1]);
      setHintPath(result.path);
      setHints(hints - 1);
      setTimeout(() => setHintPath([]), 2000);
    }
  }, [board, hints, gameOver, paused]);

  const handlePause = () => setPaused((p) => !p);

  const remaining = getRemainingCount(board);
  const total = config ? config.rows * config.cols : 0;
  const GravIcon = config ? GRAVITY_ICONS[config.gravity || 'none'] : null;

  return (
    <GameContainer maxWidth="max-w-2xl">
      {!difficulty ? (
        <div className="space-y-6 py-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Onet</h1>
          <p className="text-gray-500 dark:text-slate-400">
            Cocokkan tile berpasangan dengan jalur bersih. Maksimal 2 tikungan!
          </p>
          <div className="mx-auto grid max-w-xs gap-3">
            {Object.entries(DIFFICULTY).map(([key, cfg]) => {
              const GI = GRAVITY_ICONS[cfg.gravity || 'none'];
              return (
                <button
                  key={key}
                  onClick={() => init(key)}
                  className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-rose-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <span className="flex items-center gap-2 text-lg font-bold capitalize text-gray-900 dark:text-white">
                    {key}
                    {GI && <GI className="h-4 w-4 text-rose-400" />}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {cfg.rows}x{cfg.cols} &middot; {cfg.tileTypes} tipe &middot; {Math.floor(cfg.timeLimit / 60)}m &middot; {GRAVITY_NAMES[cfg.gravity || 'none']}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : gameOver ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {remaining === 0 ? 'Semua Terjawab!' : 'Waktu Habis!'}
          </h2>
          <p className="mt-2 text-4xl font-extrabold text-rose-500">{scoreRef.current}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">skor akhir</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => init(difficulty)} className="flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-rose-600">
              <RotateCcw className="h-5 w-5" /> Main Lagi
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-600 dark:text-slate-300">
                <span className="text-gray-900 dark:text-white">{scoreRef.current}</span> pts
              </div>
              {combo > 1 && (
                <div className="rounded-full bg-rose-100 px-3 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-900 dark:text-rose-300">
                  x{combo}
                </div>
              )}
              <div className="text-sm text-gray-500 dark:text-slate-400">
                {remaining}/{total}
              </div>
              {GravIcon && (
                <div className="flex items-center gap-1 text-xs text-gray-400" title={gravityLabel}>
                  <GravIcon className="h-3 w-3" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleHint} disabled={hints <= 0} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-700" title={`Hint (${hints})`}>
                <Lightbulb className="h-4 w-4" />
              </button>
              <button onClick={handleShuffle} disabled={shuffles <= 0} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-700" title={`Shuffle (${shuffles})`}>
                <Shuffle className="h-4 w-4" />
              </button>
              <button onClick={handlePause} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700">
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-1000" style={{ width: `${config ? (timer / config.timeLimit) * 100 : 0}%` }} />
          </div>
          <p className="text-right text-xs font-mono text-gray-400">
            {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
          </p>

          {paused ? (
            <div className="flex h-64 items-center justify-center"><p className="text-lg font-semibold text-gray-400">DIJEDA</p></div>
          ) : (
            <div className="mx-auto grid touch-none select-none gap-1" style={{ gridTemplateColumns: `repeat(${config?.cols || 8}, 1fr)`, maxWidth: `${(config?.cols || 8) * 52}px` }}>
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const isSelected = selected?.row === r && selected?.col === c;
                  const isPath = path.some((p) => p.row === r && p.col === c);
                  const isHint = hintPath.some((p) => p.row === r && p.col === c);
                  const isEmpty = cell === null;
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      disabled={isEmpty || removing}
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold transition-all duration-150',
                        isEmpty && 'invisible',
                        !isEmpty && 'border border-gray-200 bg-white shadow-sm hover:border-rose-400 hover:shadow-md dark:border-slate-600 dark:bg-slate-800',
                        isSelected && 'border-2 border-rose-500 shadow-md ring-2 ring-rose-200 dark:ring-rose-800',
                        isPath && 'border-2 border-emerald-500 bg-emerald-50 scale-105 dark:bg-emerald-900',
                        isHint && 'animate-pulse border-2 border-amber-400 bg-amber-50 dark:bg-amber-900',
                      )}
                    >
                      {!isEmpty && <span className="pointer-events-none">{iconMap.get(cell)}</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {!hasValidMoves(board) && remaining > 0 && (
            <p className="text-center text-sm font-medium text-amber-600">Tidak ada langkah. Shuffle otomatis...</p>
          )}
        </div>
      )}
    </GameContainer>
  );
}

function findAnyMatchLocal(board: (number | null)[][]): [Point, Point] | null {
  const rows = board.length;
  const cols = board[0].length;
  const cells: { value: number; point: Point }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== null) cells.push({ value: board[r][c]!, point: { row: r, col: c } });
    }
  }
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[i].value === cells[j].value) {
        const result = findPath(board, cells[i].point, cells[j].point);
        if (result.found) return [cells[i].point, cells[j].point];
      }
    }
  }
  return null;
}
