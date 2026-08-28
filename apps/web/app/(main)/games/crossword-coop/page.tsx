'use client';

import type { QuickMatchBotResult } from '@/types/multiplayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Home, Loader2, Medal, RotateCcw, Trophy, Users, Zap } from 'lucide-react';
import { multiplayerApi } from '@/lib/api/multiplayer';
import { useAuthStore } from '@/lib/stores/authStore';
import { GameContainer } from '@/components/ui/GameContainer';

type Screen = 'menu' | 'playing' | 'result';

interface PuzzleData {
  id: string;
  title: string;
  grid: string[][];
  gridSize: number;
  clues: { n: number; d: 'across' | 'down'; c: string; a: string; r: number; col: number }[];
}

interface GameOverInfo {
  winner_id: string;
  xp_earned: number;
  results: {
    player_id: string;
    username: string;
    score: number;
    correct: number;
    is_winner: boolean;
  }[];
}

export default function CrosswordCoopPage() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [matchInfo, setMatchInfo] = useState<QuickMatchBotResult | null>(null);
  const [gameResult, setGameResult] = useState<GameOverInfo | null>(null);
  const onGameResult = useCallback((info: GameOverInfo) => {
    setGameResult(info);
    setScreen('result');
  }, []);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  return (
    <>
      <button
        onClick={() => router.push('/games')}
        className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>
      {screen === 'menu' && (
        <MenuScreen
          onStart={(result) => {
            setMatchInfo(result);
            setScreen('playing');
          }}
        />
      )}
      {screen === 'playing' && matchInfo && (
        <CoopScreen
          token={token!}
          roomID={matchInfo.room_id}
          userID={user?.id || ''}
          username={user?.username || ''}
          onResult={onGameResult}
        />
      )}
      {screen === 'result' && gameResult && (
        <ResultScreen
          result={gameResult}
          userID={user?.id || ''}
          onReplay={() => setScreen('menu')}
        />
      )}
    </>
  );
}

function MenuScreen({ onStart }: { onStart: (result: QuickMatchBotResult) => void }) {
  const botMutation = useMutation({
    mutationFn: () => multiplayerApi.quickMatchBot('crossword-coop', 'medium'),
    onSuccess: (result) => onStart(result),
  });

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg">
          <Users className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Crossword Co-op</h1>
        <p className="text-gray-500 dark:text-slate-400">
          Isi TTS bersama-sama! Semua pemain kerja sama selesaikan puzzle. Siapa MVP?
        </p>
        <button
          onClick={() => botMutation.mutate()}
          disabled={botMutation.isPending}
          className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
        >
          {botMutation.isPending ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : (
            'Mulai / Gabung Tim'
          )}
        </button>
      </div>
    </GameContainer>
  );
}

function CoopScreen({
  token,
  roomID,
  userID,
  username,
  onResult,
}: {
  token: string;
  roomID: string;
  userID: string;
  username: string;
  onResult: (info: GameOverInfo) => void;
}) {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [filledCells, setFilledCells] = useState<Set<string>>(new Set());
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [gameOver, setGameOver] = useState(false);
  const [players, setPlayers] = useState<string[]>([]);
  const resultRef = useRef<GameOverInfo | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1')
      .replace(/\/api\/v1\/?$/, '')
      .replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/game/${roomID}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () =>
      ws.send(JSON.stringify({ type: 'join_room', payload: { room_id: roomID, token } }));

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'crossword_start') {
          const p = msg.payload as PuzzleData;
          setPuzzle(p);
        }
        if (msg.type === 'crossword_cell') {
          const key = `${msg.payload.row}-${msg.payload.col}`;
          setFilledCells((prev) => new Set(prev).add(key));
          setPlayerCounts((prev) => ({
            ...prev,
            [msg.payload.player_id]: msg.payload.player_count || 0,
          }));
        }
        if (msg.type === 'room_state') {
          if (msg.payload.players) {
            setPlayers(msg.payload.players.map((p: any) => p.username));
          }
        }
        if (msg.type === 'room_joined') {
          if (msg.payload.players) {
            setPlayers(msg.payload.players.map((p: any) => p.username));
          }
        }
        if (msg.type === 'game_over') {
          setGameOver(true);
          resultRef.current = msg.payload as GameOverInfo;
          setTimeout(() => {
            if (resultRef.current) onResult(resultRef.current);
          }, 1500);
        }
      } catch {}
    };
    return () => ws.close();
  }, [token, roomID, onResult]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (gameOver || !puzzle || puzzle.grid[r][c] === '#') return;
      const key = `${r}-${c}`;
      if (filledCells.has(key)) return;
      if (selected && selected[0] === r && selected[1] === c) {
        setDirection((d) => (d === 'across' ? 'down' : 'across'));
        return;
      }
      setSelected([r, c]);
      setDirection('across');
    },
    [selected, puzzle, gameOver, filledCells]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selected || !puzzle || gameOver) return;
      const [r, c] = selected;
      const key = `${r}-${c}`;
      if (filledCells.has(key)) return;

      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const isAcross = direction === 'across';
        let nr = r,
          nc = c;
        if (isAcross) {
          nc = c + 1;
          if (nc >= puzzle.gridSize) {
            nr = r + 1;
            nc = 0;
          }
        } else {
          nr = r + 1;
          if (nr >= puzzle.gridSize) {
            nr = 0;
            nc = 0;
          }
        }
        if (nr < puzzle.gridSize && nc < puzzle.gridSize && puzzle.grid[nr][nc] !== '#')
          setSelected([nr, nc]);
        return;
      }

      const letter = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return;
      if (puzzle.grid[r][c] === '#') return;

      wsRef.current?.send(
        JSON.stringify({
          type: 'crossword_cell',
          payload: { room_id: roomID, row: r, col: c, letter },
        })
      );
      setSelected(null);
    },
    [selected, puzzle, gameOver, direction, filledCells, roomID]
  );

  if (!puzzle) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <p className="text-sm text-gray-500">Menunggu pemain lain...</p>
        </div>
      </GameContainer>
    );
  }

  const totalCells = puzzle.grid.flat().filter((c) => c !== '#').length;
  const filledCount = filledCells.size;
  const progressPct = Math.round((filledCount / totalCells) * 100);
  const myCount = playerCounts[userID] || 0;

  return (
    <GameContainer maxWidth="max-w-xl">
      <div className="w-full space-y-4 py-4" onKeyDown={handleKeyDown}>
        <div className="flex items-center justify-between text-sm">
          <p className="font-bold text-teal-600">{puzzle.title}</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-teal-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{progressPct}%</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {players.map((name, i) => (
            <span
              key={i}
              className="rounded-full bg-teal-100 px-2.5 py-1 font-medium text-teal-700 dark:bg-teal-900 dark:text-teal-300"
            >
              {name} {playerCounts[name] ? `(${playerCounts[name]})` : ''}
            </span>
          ))}
        </div>

        <div
          className="mx-auto grid gap-0 overflow-hidden rounded border-2 border-gray-800"
          style={{
            gridTemplateColumns: `repeat(${puzzle.gridSize}, minmax(0, 1fr))`,
            maxWidth: `${puzzle.gridSize * 44}px`,
          }}
        >
          {puzzle.grid.map((row, r) =>
            row.map((cell, c) => {
              if (cell === '#')
                return <div key={`${r}-${c}`} className="aspect-square bg-gray-900" />;
              const key = `${r}-${c}`;
              const isFilled = filledCells.has(key);
              const isSel = selected && selected[0] === r && selected[1] === c;
              const num = puzzle.clues.find((cl) => cl.r === r && cl.col === c)?.n;

              return (
                <button
                  key={key}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative flex aspect-square items-center justify-center border border-gray-300 text-lg font-bold outline-none transition-colors dark:border-slate-600
                    ${isFilled ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' : ''}
                    ${isSel && !isFilled ? 'bg-yellow-300 dark:bg-yellow-600' : !isFilled ? 'bg-white dark:bg-slate-700' : ''}
                    ${isFilled ? '' : ''}`}
                >
                  {num && (
                    <span className="absolute left-1 top-0.5 text-[9px] font-normal text-gray-500">
                      {num}
                    </span>
                  )}
                  {isFilled ? cell : ''}
                </button>
              );
            })
          )}
        </div>

        <div className="rounded-xl bg-teal-50 p-3 text-center text-sm dark:bg-teal-950">
          <p className="font-semibold text-teal-700 dark:text-teal-300">
            Kontribusimu: {myCount} sel ({Math.round((myCount / Math.max(totalCells, 1)) * 100)}%)
          </p>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex-1 space-y-1">
            <p className="font-bold text-indigo-600">Mendatar</p>
            {puzzle.clues
              .filter((cl) => cl.d === 'across')
              .map((cl) => (
                <p key={`a${cl.n}`} className="text-xs text-gray-600 dark:text-slate-400">
                  <span className="font-bold">{cl.n}.</span> {cl.c}
                </p>
              ))}
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-bold text-emerald-600">Menurun</p>
            {puzzle.clues
              .filter((cl) => cl.d === 'down')
              .map((cl) => (
                <p key={`d${cl.n}`} className="text-xs text-gray-600 dark:text-slate-400">
                  <span className="font-bold">{cl.n}.</span> {cl.c}
                </p>
              ))}
          </div>
        </div>
      </div>
    </GameContainer>
  );
}

function ResultScreen({
  result,
  userID,
  onReplay,
}: {
  result: GameOverInfo;
  userID: string;
  onReplay: () => void;
}) {
  const router = useRouter();
  const isMvp = result.winner_id === userID;
  const myResult = result.results?.find((r) => r.player_id === userID);
  const sorted = [...(result.results || [])].sort((a, b) => b.score - a.score);

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 py-8 text-center">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-lg ${
            isMvp
              ? 'from-amber-400 to-orange-500 shadow-amber-200'
              : 'from-teal-400 to-emerald-500 shadow-teal-200'
          }`}
        >
          <Medal className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-teal-600">Puzzle Selesai!</h1>
        {isMvp && <p className="text-lg font-bold text-amber-600">Kamu MVP! 🏆</p>}

        <div className="space-y-2">
          {sorted.map((r, i) => (
            <div
              key={r.player_id}
              className={`rounded-xl border p-4 text-left ${
                i === 0
                  ? 'border-amber-200 bg-amber-50 dark:bg-amber-950'
                  : r.player_id === userID
                    ? 'border-teal-200 bg-teal-50 dark:bg-teal-950'
                    : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {i === 0 && <span className="text-lg">👑</span>}
                <p className="font-bold text-gray-900 dark:text-white">
                  {r.username} {r.player_id === userID ? '(Kamu)' : ''}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {r.score} sel •{' '}
                {Math.round(
                  (r.score / Math.max(result.results?.reduce((a, b) => a + b.score, 0) || 1, 1)) *
                    100
                )}
                % kontribusi
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 p-4 dark:from-teal-950 dark:to-emerald-950">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
            <Zap className="h-4 w-4" /> +{result.xp_earned || 75} XP
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReplay}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 font-bold text-white shadow-lg hover:bg-teal-600"
          >
            <RotateCcw className="h-5 w-5" /> Main Lagi
          </button>
          <button
            onClick={() => router.push('/games')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 font-bold text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300"
          >
            <Home className="h-5 w-5" /> Hub
          </button>
        </div>
      </div>
    </GameContainer>
  );
}
