'use client';

import type { QuickMatchBotResult } from '@/types/multiplayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Clock, Flag, Home, Loader2, Medal, RotateCcw, Trophy, Zap } from 'lucide-react';
import { multiplayerApi } from '@/lib/api/multiplayer';
import { useAuthStore } from '@/lib/stores/authStore';
import { GameContainer } from '@/components/ui/GameContainer';

type Screen = 'menu' | 'playing' | 'result';

interface GameOverInfo {
  winner_id: string;
  xp_earned: number;
  results: {
    player_id: string;
    username: string;
    score: number;
    correct: number;
    wrong: number;
    is_winner: boolean;
  }[];
}

export default function SudokuRacePage() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [matchInfo, setMatchInfo] = useState<QuickMatchBotResult | null>(null);
  const [gameResult, setGameResult] = useState<GameOverInfo | null>(null);
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
        <RaceScreen
          token={token!}
          roomID={matchInfo.room_id}
          userID={user?.id || ''}
          onResult={(info) => {
            setGameResult(info);
            setScreen('result');
          }}
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
    mutationFn: () => multiplayerApi.quickMatchBot('sudoku', 'medium'),
    onSuccess: (result) => onStart(result),
  });

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-12 text-center">
        <h1 className="text-3xl font-bold">Sudoku Race</h1>
        <p className="text-gray-500">
          Selesaikan puzzle Sudoku yang sama. Siapa lebih cepat = menang!
        </p>
        <button
          onClick={() => botMutation.mutate()}
          disabled={botMutation.isPending}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-4 font-semibold text-white shadow-lg disabled:opacity-50"
        >
          {botMutation.isPending ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : (
            'Cari Lawan / Vs Bot'
          )}
        </button>
      </div>
    </GameContainer>
  );
}

function RaceScreen({
  token,
  roomID,
  userID,
  onResult,
}: {
  token: string;
  roomID: string;
  userID: string;
  onResult: (info: GameOverInfo) => void;
}) {
  const [puzzle, setPuzzle] = useState<number[][] | null>(null);
  const [userGrid, setUserGrid] = useState<number[][]>([]);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errorCells, setErrorCells] = useState<Set<string>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
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
        if (msg.type === 'sudoku_start') {
          const p = msg.payload.puzzle as number[][];
          setPuzzle(p);
          setUserGrid(p.map((row) => [...row]));
          setTimeLeft(600);
        }
        if (msg.type === 'sudoku_cell_ok') {
          setUserGrid((prev) => {
            const newGrid = prev.map((row) => [...row]);
            newGrid[msg.payload.row][msg.payload.col] = msg.payload.value;
            return newGrid;
          });
          setErrorCells((prev) => {
            const next = new Set(prev);
            next.delete(`${msg.payload.row}-${msg.payload.col}`);
            return next;
          });
          setMessage('');
        }
        if (msg.type === 'sudoku_error') {
          setMessage(msg.payload.message);
          if (msg.payload.row !== undefined && msg.payload.col !== undefined) {
            setErrorCells((prev) => {
              const next = new Set(prev);
              next.add(`${msg.payload.row}-${msg.payload.col}`);
              return next;
            });
          }
        }
        if (msg.type === 'opponent_progress') {
          setOpponentProgress(msg.payload.progress);
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
  }, [token, roomID]);

  useEffect(() => {
    if (!puzzle || gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          wsRef.current?.send(JSON.stringify({ type: 'leave_room', payload: { room_id: roomID } }));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [puzzle, gameOver, roomID]);

  const handleResign = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'leave_room', payload: { room_id: roomID } }));
    setGameOver(true);
  }, [roomID]);

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || !puzzle || puzzle[r][c] !== 0) return;
    setSelected([r, c]);
  };

  const handleNumber = (n: number) => {
    if (!selected || gameOver) return;
    const [r, c] = selected;
    wsRef.current?.send(
      JSON.stringify({
        type: 'submit_sudoku_cell',
        payload: { room_id: roomID, row: r, col: c, value: n },
      })
    );
    setSelected(null);
  };

  if (!puzzle) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </GameContainer>
    );
  }

  const filledCount = userGrid.flat().filter((v) => v > 0).length;
  const progressPct = Math.round((filledCount / 81) * 100);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <GameContainer maxWidth="max-w-xl">
      <div className="w-full space-y-4 py-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span
              className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-gray-700 dark:text-slate-300'}`}
            >
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex flex-1 items-center gap-4">
            <div className="flex-1 text-right">
              <p className="text-xs font-semibold text-indigo-600">Kamu</p>
              <div className="mt-0.5 h-2 rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className="h-2 rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{progressPct}%</p>
            </div>
            <span className="text-xs font-bold text-gray-400">VS</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-600">Lawan</p>
              <div className="mt-0.5 h-2 rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${opponentProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{opponentProgress}%</p>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-xl bg-red-50 p-2 text-center text-sm text-red-700">{message}</div>
        )}

        <div className="mx-auto grid w-fit grid-cols-9 gap-0 overflow-hidden rounded border-2 border-gray-800">
          {userGrid.map((row, r) =>
            row.map((cell, c) => {
              const isGiven = puzzle[r][c] !== 0;
              const isSel = selected && selected[0] === r && selected[1] === c;
              const isError = errorCells.has(`${r}-${c}`);
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`flex h-10 w-10 items-center justify-center text-sm font-bold transition-colors
                    ${isGiven ? 'text-gray-900 dark:text-slate-200' : isError ? 'text-red-600' : 'text-indigo-600'}
                    ${isSel ? 'bg-indigo-200 dark:bg-indigo-800' : isError ? 'bg-red-100 dark:bg-red-900/40' : ''}
                    ${!isGiven && !isSel && !isError ? 'hover:bg-gray-100 dark:hover:bg-slate-700' : ''}
                    ${c % 3 === 2 && c < 8 ? 'border-r-2 border-r-gray-800' : 'border-r border-r-gray-300 dark:border-slate-600'}
                    ${r % 3 === 2 && r < 8 ? 'border-b-2 border-b-gray-800' : 'border-b border-b-gray-300 dark:border-slate-600'}
                    ${isError ? 'border-red-300 dark:border-red-700' : ''}
                    dark:border-slate-600`}
                >
                  {cell > 0 ? cell : ''}
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleNumber(n)}
              disabled={gameOver}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-lg font-bold hover:bg-indigo-200 disabled:opacity-50 dark:bg-indigo-900 dark:text-white"
            >
              {n}
            </button>
          ))}
        </div>

        {!gameOver && (
          <button
            onClick={handleResign}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-900 dark:text-red-400"
          >
            <Flag className="h-4 w-4" /> Resign
          </button>
        )}
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
  const isWin = result.winner_id === userID;
  const myResult = result.results?.find((r) => r.player_id === userID);
  const opponentResult = result.results?.find((r) => r.player_id !== userID);
  const myScore = myResult?.score ?? 0;
  const oppScore = opponentResult?.score ?? 0;

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 py-8 text-center">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-lg ${
            isWin
              ? 'from-purple-400 to-indigo-500 shadow-purple-200'
              : 'from-gray-300 to-gray-400 shadow-gray-200 dark:from-slate-600 dark:to-slate-700'
          }`}
        >
          {isWin ? (
            <Medal className="h-12 w-12 text-white" />
          ) : (
            <Trophy className="h-12 w-12 text-white opacity-50" />
          )}
        </div>

        <h1
          className={`text-3xl font-extrabold ${isWin ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'}`}
        >
          {isWin ? 'Kamu Menang!' : 'Kamu Kalah'}
        </h1>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{myScore}</p>
              <p className="mt-1 text-xs text-gray-500">Selmu</p>
            </div>
            <div className="text-2xl font-bold text-gray-300">:</div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{oppScore}</p>
              <p className="mt-1 text-xs text-gray-500">{opponentResult?.username || 'Lawan'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 p-4 dark:from-purple-950 dark:to-indigo-950">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
            <Zap className="h-4 w-4" /> +{result.xp_earned || 50} XP
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReplay}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 font-bold text-white shadow-lg transition-all hover:bg-purple-600"
          >
            <RotateCcw className="h-5 w-5" /> Main Lagi
          </button>
          <button
            onClick={() => router.push('/games')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 font-bold text-gray-600 transition-all hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300"
          >
            <Home className="h-5 w-5" /> Hub
          </button>
        </div>
      </div>
    </GameContainer>
  );
}
