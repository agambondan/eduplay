'use client';

import type { QuickMatchBotResult } from '@/types/multiplayer';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Home, Loader2, Medal, RotateCcw, Share2, Trophy, Zap } from 'lucide-react';
import { multiplayerApi } from '@/lib/api/multiplayer';
import { useLatestRef } from '@/lib/hooks/useLatestRef';
import { useAuthStore } from '@/lib/stores/authStore';
import { useGameStore } from '@/lib/stores/gameStore';
import { GameKeyboard } from '@/components/games/GameKeyboard';
import { GameContainer } from '@/components/ui/GameContainer';

type Screen = 'menu' | 'playing' | 'result';

const ROWS = 6;
const COLS = 5;

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

export default function WordleDuelPage() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [matchInfo, setMatchInfo] = useState<QuickMatchBotResult | null>(null);
  const [gameResult, setGameResult] = useState<GameOverInfo | null>(null);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    useGameStore.getState().setPlaying(screen === 'playing');
    return () => {
      useGameStore.getState().setPlaying(false);
    };
  }, [screen]);

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
        <DuelScreen
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
    mutationFn: () => multiplayerApi.quickMatchBot('wordle', 'medium'),
    onSuccess: (result) => onStart(result),
  });

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wordle Duel</h1>
        <p className="text-gray-500 dark:text-slate-400">
          Tebak kata 5 huruf yang sama. Siapa lebih cepat & sedikit percobaan = menang!
        </p>
        <button
          onClick={() => botMutation.mutate()}
          disabled={botMutation.isPending}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
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

function DuelScreen({
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
  const [grid, setGrid] = useState<string[][]>(
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(''))
  );
  const [colors, setColors] = useState<string[][]>(
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(''))
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [opponentAttempts, setOpponentAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const resultRef = useRef<GameOverInfo | null>(null);
  const onResultRef = useLatestRef(onResult);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);
  const gameOverRef = useRef(false);

  const gridRef = useLatestRef(grid);
  const colorsRef = useLatestRef(colors);
  const currentRowRef = useLatestRef(currentRow);
  const currentColRef = useLatestRef(currentCol);

  const connect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1')
      .replace(/\/api\/v1\/?$/, '')
      .replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/game/${roomID}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join_room', payload: { room_id: roomID, token } }));
    };

    ws.onclose = () => {
      if (shouldReconnect.current && !gameOverRef.current) {
        reconnectTimer.current = setTimeout(() => connect(), 2000);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'wordle_result') {
          const curRow = currentRowRef.current;
          const newGrid = [...gridRef.current];
          const newColors = [...colorsRef.current];
          for (let i = 0; i < COLS; i++) {
            newGrid[curRow][i] = msg.payload.word[i] || '';
            newColors[curRow][i] =
              msg.payload.result[i] === 'G'
                ? 'bg-green-500'
                : msg.payload.result[i] === 'Y'
                  ? 'bg-yellow-500'
                  : 'bg-gray-500';
          }
          setGrid(newGrid);
          setColors(newColors);
          if (msg.payload.correct) {
            setMessage('Kamu menebak dengan benar!');
          } else {
            setCurrentRow(curRow + 1);
            setCurrentCol(0);
          }
        }
        if (msg.type === 'opponent_progress') {
          setOpponentAttempts(msg.payload.attempts);
        }
        if (msg.type === 'game_over') {
          gameOverRef.current = true;
          setGameOver(true);
          resultRef.current = msg.payload as GameOverInfo;
          setTimeout(() => {
            if (resultRef.current) onResultRef.current(resultRef.current);
          }, 1500);
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roomID]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();
    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const handleResign = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'leave_room', payload: { room_id: roomID } }));
  }, [roomID]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver || currentRowRef.current >= ROWS) return;
      const curRow = currentRowRef.current;
      const curCol = currentColRef.current;

      if (key === 'ENTER') {
        if (curCol !== COLS) return;
        wsRef.current?.send(
          JSON.stringify({
            type: 'submit_wordle_guess',
            payload: { room_id: roomID, word: gridRef.current[curRow].join('') },
          })
        );
      } else if (key === 'BACKSPACE') {
        if (curCol <= 0) return;
        const newGrid = [...gridRef.current];
        newGrid[curRow][curCol - 1] = '';
        setGrid(newGrid);
        setCurrentCol(curCol - 1);
      } else if (/^[a-zA-Z]$/.test(key) && curCol < COLS) {
        const newGrid = [...gridRef.current];
        newGrid[curRow][curCol] = key.toLowerCase();
        setGrid(newGrid);
        setCurrentCol(curCol + 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameOver, roomID]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleKey('ENTER');
      else if (e.key === 'Backspace') handleKey('BACK');
      else handleKey(e.key.toUpperCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const allKeys = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="w-full space-y-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <p className="text-lg font-bold text-indigo-600">Kamu</p>
          </div>
          <div className="text-center text-gray-400">VS</div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">Lawan</p>
            <p className="text-xs text-gray-400">Percobaan: {opponentAttempts}/6</p>
          </div>
        </div>

        {!gameOver && (
          <div className="flex justify-end">
            <button
              onClick={handleResign}
              className="text-xs font-semibold text-gray-400 underline-offset-2 hover:text-red-500 hover:underline"
            >
              Menyerah
            </button>
          </div>
        )}

        {message && (
          <div className="rounded-xl bg-green-50 p-3 text-center text-sm font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
            {message}
          </div>
        )}

        <div className="mx-auto grid w-fit gap-1.5">
          {grid.map((row, ri) => (
            <div key={ri} className="flex gap-1.5">
              {row.map((cell, ci) => (
                <div
                  key={ci}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl font-extrabold uppercase transition-all
                  ${colors[ri][ci] || (ri === currentRow ? 'border-2 border-gray-400' : 'border border-gray-300 bg-gray-50')}
                  ${colors[ri][ci] ? 'text-white' : 'text-gray-900'}
                  dark:border-slate-600 dark:bg-slate-800`}
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>

        <GameKeyboard
          onKeyPress={handleKey}
          disabled={gameOver}
          className="mx-auto mt-4 max-w-md"
        />
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
              ? 'from-emerald-400 to-teal-500 shadow-emerald-200'
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
          className={`text-3xl font-extrabold ${isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}
        >
          {isWin ? 'Kamu Menang! 🎉' : 'Kamu Kalah'}
        </h1>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{myScore}</p>
              <p className="mt-1 text-xs text-gray-500">Percobaanmu</p>
            </div>
            <div className="text-2xl font-bold text-gray-300">:</div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{oppScore}</p>
              <p className="mt-1 text-xs text-gray-500">{opponentResult?.username || 'Lawan'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald-950 dark:to-teal-950">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <Zap className="h-4 w-4" /> +{result.xp_earned || 50} XP
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReplay}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-white shadow-lg transition-all hover:bg-emerald-600"
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
