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

interface Question {
  id: string;
  text: string;
  options: string[];
  question_number: number;
  total: number;
}

interface GameOverInfo {
  winner_id: string;
  xp_earned: number;
  results: { player_id: string; username: string; score: number; correct: number }[];
}

export default function MathRelayPage() {
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
        <RelayScreen
          token={token!}
          roomID={matchInfo.room_id}
          userID={user?.id || ''}
          username={user?.username || 'Kamu'}
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
    mutationFn: () => multiplayerApi.quickMatchBot('math-relay', 'medium'),
    onSuccess: (result) => onStart(result),
  });

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
          <Users className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Math Relay</h1>
        <p className="text-gray-500 dark:text-slate-400">
          Game matematika estafet tim! 2-4 player saling bergantian jawab soal.
        </p>
        <button
          onClick={() => botMutation.mutate()}
          disabled={botMutation.isPending}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
        >
          {botMutation.isPending ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : (
            'Mulai / Cari Tim'
          )}
        </button>
      </div>
    </GameContainer>
  );
}

function RelayScreen({
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
  const [question, setQuestion] = useState<Question | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [questionNum, setQuestionNum] = useState(0);
  const [totalQ, setTotalQ] = useState(20);
  const [timeLeft, setTimeLeft] = useState(8);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [correct, setCorrect] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; scoreDelta: number } | null>(
    null
  );
  const [gameOver, setGameOver] = useState(false);
  const resultRef = useRef<GameOverInfo | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        if (msg.type === 'relay_start') {
          setTotalQ(msg.payload.total_questions);
        }
        if (msg.type === 'relay_question') {
          setQuestion(msg.payload.question);
          setCurrentPlayer(msg.payload.current_player);
          setCurrentPlayerName('');
          setQuestionNum(msg.payload.question_number);
          setTimeLeft(8);
          setLastResult(null);
          setMessage('');
          if (questionTimerRef.current) clearInterval(questionTimerRef.current);
          const start = Date.now();
          questionTimerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - start) / 1000);
            setTimeLeft(Math.max(0, 8 - elapsed));
          }, 200);
        }
        if (msg.type === 'relay_timeout') {
          setMessage('Waktu habis!');
          if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        }
        if (msg.type === 'answer_result') {
          setLastResult({
            isCorrect: msg.payload.is_correct,
            scoreDelta: msg.payload.score_delta,
          });
          setScores((prev) => ({ ...prev, [msg.payload.player_id]: msg.payload.new_score }));
        }
        if (msg.type === 'opponent_progress') {
          setCorrect((prev) => ({
            ...prev,
            [msg.payload.player_id]: msg.payload.questions_answered,
          }));
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
    return () => {
      ws.close();
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [token, roomID, onResult]);

  const handleAnswer = (answer: string) => {
    if (!question || gameOver) return;
    wsRef.current?.send(
      JSON.stringify({
        type: 'submit_answer',
        payload: {
          room_id: roomID,
          question_id: question.id,
          answer,
          time_taken_ms: (8 - timeLeft) * 1000,
        },
      })
    );
  };

  if (!question) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm text-gray-500">Menunggu game dimulai...</p>
        </div>
      </GameContainer>
    );
  }

  const isMyTurn = currentPlayer === userID;
  const progressPct = Math.round((questionNum / totalQ) * 100);

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="w-full space-y-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono font-bold ${timeLeft <= 3 ? 'text-red-500' : 'text-gray-700 dark:text-slate-300'}`}
            >
              ⏱ {timeLeft}s
            </span>
          </div>
          <div className="mx-4 flex-1">
            <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700">
              <div
                className="h-2 rounded-full bg-orange-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-gray-500">
            {questionNum}/{totalQ}
          </span>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-orange-50 to-red-50 p-4 text-center dark:from-orange-950 dark:to-red-950">
          <p className="mb-1 text-xs text-gray-500">
            {isMyTurn ? 'Giliranmu!' : `Giliran: ${currentPlayerName || 'Player lain'}`}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{question.text}</p>
        </div>

        {lastResult && (
          <div
            className={`rounded-xl p-3 text-center text-sm font-bold ${
              lastResult.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {lastResult.isCorrect
              ? `Benar! +${lastResult.scoreDelta} poin`
              : `Salah ${lastResult.scoreDelta}`}
          </div>
        )}

        {message && (
          <div className="rounded-xl bg-gray-100 p-3 text-center text-sm font-semibold text-gray-600">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              disabled={!isMyTurn || gameOver}
              className="rounded-xl border-2 border-gray-200 px-6 py-4 text-lg font-bold transition-all
                hover:border-orange-400 hover:bg-orange-50 disabled:opacity-40
                dark:border-slate-600 dark:hover:border-orange-500 dark:hover:bg-orange-950"
            >
              {opt}
            </button>
          ))}
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
  const myResult = result.results?.find((r) => r.player_id === userID);
  const isWin = result.winner_id === userID;

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 py-8 text-center">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-lg ${
            isWin
              ? 'from-orange-400 to-red-500 shadow-orange-200'
              : 'from-gray-300 to-gray-400 shadow-gray-200'
          }`}
        >
          {isWin ? (
            <Medal className="h-12 w-12 text-white" />
          ) : (
            <Trophy className="h-12 w-12 text-white opacity-50" />
          )}
        </div>
        <h1 className={`text-3xl font-extrabold ${isWin ? 'text-orange-600' : 'text-gray-500'}`}>
          {isWin ? 'Kamu Menang!' : 'Permainan Selesai'}
        </h1>

        <div className="space-y-2">
          {result.results?.map((r) => (
            <div
              key={r.player_id}
              className={`rounded-xl border p-4 text-left ${
                r.player_id === userID
                  ? 'border-orange-200 bg-orange-50 dark:bg-orange-950'
                  : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              <p className="font-bold text-gray-900 dark:text-white">
                {r.username} {r.player_id === userID ? '(Kamu)' : ''}
              </p>
              <p className="text-sm text-gray-500">
                {r.score} poin • {r.correct} benar
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gradient-to-br from-orange-50 to-red-50 p-4 dark:from-orange-950 dark:to-red-950">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
            <Zap className="h-4 w-4" /> +{result.xp_earned || 50} XP
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReplay}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg hover:bg-orange-600"
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
