'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Flag, Loader2, RotateCcw, Shield, Swords, Trophy, Wifi, WifiOff, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { multiplayerApi } from '@/lib/api/multiplayer';
import { useAuthStore } from '@/lib/stores/authStore';
import { cn } from '@/lib/utils/cn';
import { GameContainer } from '@/components/ui/GameContainer';
import { ShareButton } from '@/components/ui/ShareButton';
import { GameOverResult, QuickMatchResult } from '@/types/multiplayer';
import { BannerAd } from '@/components/ads/BannerAd';
import { InterstitialAd } from '@/components/ads/InterstitialAd';

type Screen = 'menu' | 'room';
type GameState = 'waiting' | 'countdown' | 'playing' | 'finished';
type Theme = 'world' | 'asia' | 'asean' | 'europe' | 'hard';

interface PlayerInfo {
  id: string;
  username: string;
  level: number;
  score: number;
}

interface FlagQuestion {
  id: string;
  text: string;
  options: string[];
  question_number: number;
  total: number;
  flag_code: string;
  region?: string;
}

interface FlagAnswerResult {
  player_id: string;
  username: string;
  team: 'A' | 'B';
  is_correct: boolean;
  score_delta: number;
  team_score: number;
  team_scores: Record<'A' | 'B', number>;
  correct_answer?: string;
  resolved: boolean;
  message: string;
}

interface FlagGameOverResult extends GameOverResult {
  team_scores?: Record<'A' | 'B', number>;
  winning_team?: 'A' | 'B' | 'draw';
}

export default function FlagTeamBattlePage() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [matchInfo, setMatchInfo] = useState<QuickMatchResult | null>(null);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => router.push('/games')}
        className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      {screen === 'menu' && (
        <MenuScreen
          onStart={(result) => {
            setMatchInfo(result);
            setScreen('room');
          }}
        />
      )}
      {screen === 'room' && matchInfo && (
        <BattleRoom matchInfo={matchInfo} onBack={() => setScreen('menu')} />
      )}
    </>
  );
}

function MenuScreen({ onStart }: { onStart: (result: QuickMatchResult) => void }) {
  const [difficulty, setDifficulty] = useState('medium');
  const [theme, setTheme] = useState<Theme>('world');
  const [error, setError] = useState('');

  const searchMutation = useMutation({
    mutationFn: () => multiplayerApi.quickMatch('flag-team-battle', difficulty, theme),
    onSuccess: (result) => onStart(result),
    onError: (err: Error) => setError(err.message),
  });

  const botMutation = useMutation({
    mutationFn: () => multiplayerApi.quickMatchBot('flag-team-battle', difficulty, false, theme),
    onSuccess: (result) =>
      onStart({
        match_id: result.match_id,
        room_id: result.room_id,
        opponent_name: result.bot.name,
        status: 'bot',
      }),
    onError: (err: Error) => setError(err.message),
  });

  return (
    <GameContainer maxWidth="max-w-3xl">
      <div className="space-y-6 pt-10">
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Flag className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Flag Quiz Team Battle
              </h1>
              <p className="mt-2 max-w-xl text-gray-500 dark:text-slate-400">
                Buzzer bendera 2v2 real-time. Server mengunci jawaban tercepat, menghitung skor tim, dan mengisi slot kosong dengan bot.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoPill icon={<Zap className="h-4 w-4" />} label="10 ronde" />
              <InfoPill icon={<Shield className="h-4 w-4" />} label="2v2 team" />
              <InfoPill icon={<Trophy className="h-4 w-4" />} label="streak bonus" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
              <Swords className="h-4 w-4 text-emerald-500" />
              Setup Match
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-3 gap-2">
              {['easy', 'medium', 'hard'].map((value) => (
                <button
                  key={value}
                  onClick={() => setDifficulty(value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition-colors',
                    difficulty === value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-sm font-medium text-gray-600 dark:text-slate-300">
              Regional Theme
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as Theme)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="world">All World</option>
                <option value="asia">Asia Focus</option>
                <option value="asean">ASEAN Special</option>
                <option value="europe">Europe</option>
                <option value="hard">Hard Mode</option>
              </select>
            </label>

            <div className="mt-4 space-y-3">
              <button
                onClick={() => searchMutation.mutate()}
                disabled={searchMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {searchMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wifi className="h-5 w-5" />}
                Cari Tim
              </button>
              <button
                onClick={() => botMutation.mutate()}
                disabled={botMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {botMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                Main dengan Bot
              </button>
            </div>
          </div>
        </div>
        <BannerAd slotId="flag-team-battle-lobby" />
      </div>
    </GameContainer>
  );
}

function BattleRoom({ matchInfo, onBack }: { matchInfo: QuickMatchResult; onBack: () => void }) {
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [teams, setTeams] = useState<Record<string, 'A' | 'B'>>({});
  const [teamScores, setTeamScores] = useState<Record<'A' | 'B', number>>({ A: 0, B: 0 });
  const [currentQuestion, setCurrentQuestion] = useState<FlagQuestion | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [lastResult, setLastResult] = useState<FlagAnswerResult | null>(null);
  const [gameResult, setGameResult] = useState<FlagGameOverResult | null>(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [status, setStatus] = useState('Menyiapkan room...');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);
  const questionStartedAt = useRef(0);
  const gameStateRef = useRef<GameState>('waiting');
  const myTeamRef = useRef<'A' | 'B' | undefined>(undefined);
  const token = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const router = useRouter();

  const myTeam = userId ? teams[userId] : undefined;
  const opponentTeam = myTeam === 'A' ? 'B' : 'A';
  const isFinished = gameState === 'finished';

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    myTeamRef.current = myTeam;
  }, [myTeam]);

  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown <= 0) {
      setStatus('Menunggu soal pertama...');
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, gameState]);

  const handleMessage = useCallback(
    (msg: { type: string; payload: any }) => {
      switch (msg.type) {
        case 'room_joined':
        case 'players_updated':
          if (msg.payload.players) setPlayers(msg.payload.players);
          setStatus('Menunggu pemain dan bot...');
          break;
        case 'player_joined':
          setPlayers((current) => {
            if (current.some((player) => player.id === msg.payload.id)) return current;
            return [...current, msg.payload];
          });
          break;
        case 'flag_team_assigned':
          setTeams(msg.payload.teams ?? {});
          setTeamScores(msg.payload.team_scores ?? { A: 0, B: 0 });
          setStatus('Tim siap. Match segera dimulai.');
          break;
        case 'game_starting':
          setGameState('countdown');
          setCountdown(msg.payload.countdown ?? 3);
          break;
        case 'flag_question':
          setGameState('playing');
          setCurrentQuestion(msg.payload);
          setAnswerLocked(false);
          setLastResult(null);
          setStatus('Buzz jawaban tercepat untuk timmu.');
          questionStartedAt.current = Date.now();
          break;
        case 'flag_answer_result': {
          const result = msg.payload as FlagAnswerResult;
          setLastResult(result);
          setTeamScores(result.team_scores);
          if (result.resolved || result.team === myTeamRef.current) setAnswerLocked(true);
          setStatus(result.message);
          break;
        }
        case 'flag_round_timeout':
          setAnswerLocked(true);
          setTeamScores(msg.payload.team_scores ?? { A: 0, B: 0 });
          setStatus(`Waktu habis. Jawaban: ${msg.payload.correct_answer}`);
          break;
        case 'game_over':
          setGameState('finished');
          setGameResult(msg.payload);
          setShowInterstitial(true);
          if (msg.payload.team_scores) setTeamScores(msg.payload.team_scores);
          break;
        case 'player_disconnected':
          setStatus('Salah satu pemain terputus, menunggu reconnect.');
          break;
        case 'player_reconnected':
          setStatus('Pemain reconnect.');
          break;
        case 'error':
          setStatus(msg.payload.message || msg.payload.code || 'Terjadi error');
          break;
      }
    },
    []
  );

  const connect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    shouldReconnect.current = true;
    if (!token) {
      setStatus('Login diperlukan untuk memainkan multiplayer.');
      return;
    }
    const apiBase = (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '');
    const ws = new WebSocket(`${apiBase.replace('http', 'ws')}/api/v1/ws/game/${matchInfo.room_id}?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          type: 'join_room',
          payload: { room_id: matchInfo.room_id, token },
        })
      );
    };

    ws.onclose = () => {
      setConnected(false);
      if (shouldReconnect.current && gameStateRef.current !== 'finished') {
        reconnectTimer.current = setTimeout(() => connect(), 2000);
      }
    };

    ws.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data));
      } catch {}
    };

    wsRef.current = ws;
  }, [handleMessage, matchInfo.room_id, token]);

  useEffect(() => {
    connect();
    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const submitAnswer = (answer: string) => {
    if (!currentQuestion || answerLocked || gameState !== 'playing') return;
    const elapsedMs = Math.max(100, questionStartedAt.current ? Date.now() - questionStartedAt.current : 100);
    setAnswerLocked(true);
    wsRef.current?.send(
      JSON.stringify({
        type: 'submit_flag_answer',
        payload: {
          room_id: matchInfo.room_id,
          question_id: currentQuestion.id,
          answer,
          time_taken_ms: elapsedMs,
        },
      })
    );
  };

  const myTeamPlayers = useMemo(() => players.filter((player) => teams[player.id] === myTeam), [myTeam, players, teams]);
  const opponentPlayers = useMemo(
    () => players.filter((player) => teams[player.id] === opponentTeam),
    [opponentTeam, players, teams]
  );

  if (gameResult) {
    const isDraw = gameResult.winning_team === 'draw';
    const isWin = !isDraw && gameResult.winning_team === myTeam;
    const finalMine = myTeam ? teamScores[myTeam] : 0;
    const finalOpponent = opponentTeam ? teamScores[opponentTeam] : 0;

    return (
      <GameContainer maxWidth="max-w-xl">
        <InterstitialAd isOpen={showInterstitial} onClose={() => setShowInterstitial(false)} />
        <div className="space-y-6 pt-10 text-center">
          <div
            className={cn(
              'mx-auto flex h-20 w-20 items-center justify-center rounded-lg text-white shadow-sm',
              isDraw ? 'bg-gray-500' : isWin ? 'bg-emerald-600' : 'bg-rose-600'
            )}
          >
            <Trophy className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isDraw ? 'Match Seri' : isWin ? 'Tim Kamu Menang' : 'Tim Lawan Menang'}
            </h1>
            <p className="mt-2 text-gray-500 dark:text-slate-400">
              Skor akhir {finalMine} - {finalOpponent}
            </p>
          </div>
          <ShareButton
            title="Flag Quiz Team Battle - EduPlay"
            text={`Skor Flag Quiz Team Battle: ${finalMine}-${finalOpponent}.`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              <RotateCcw className="h-4 w-4" />
              Main Lagi
            </button>
            <button
              onClick={() => router.push('/games')}
              className="rounded-lg border border-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Kembali
            </button>
          </div>
        </div>
      </GameContainer>
    );
  }

  return (
    <GameContainer maxWidth="max-w-4xl">
      <div className="space-y-5 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Batal
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {connected ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
            {connected ? 'Terhubung' : 'Reconnect...'}
          </div>
        </div>

        {gameState === 'waiting' && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-emerald-500" />
            <p className="font-semibold text-gray-900 dark:text-white">Menyiapkan 2v2 room</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{status}</p>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-7xl font-bold text-emerald-600">{countdown}</p>
            <p className="mt-2 font-semibold text-gray-500">Bersiap buzz!</p>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'countdown') && (
          <div className="grid grid-cols-2 gap-3">
            <ScorePanel label="Tim Kamu" score={myTeam ? teamScores[myTeam] : 0} tone="emerald" players={myTeamPlayers} />
            <ScorePanel label="Tim Lawan" score={opponentTeam ? teamScores[opponentTeam] : 0} tone="rose" players={opponentPlayers} />
          </div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Ronde {currentQuestion.question_number}/{currentQuestion.total}
                </p>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buzzer Battle</h1>
              </div>
              <p className="max-w-xs text-right text-sm font-medium text-gray-500 dark:text-slate-300">{status}</p>
            </div>

            <div className="flex flex-col items-center gap-5">
              <div className="relative h-32 w-44 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900">
                <Image
                  src={`/flags/${currentQuestion.flag_code}.svg`}
                  alt="Bendera negara untuk ronde ini"
                  fill
                  className="object-contain p-3"
                  priority
                />
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => submitAnswer(option)}
                    disabled={answerLocked}
                    className={cn(
                      'min-h-12 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors',
                      lastResult?.correct_answer === option
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </GameContainer>
  );
}

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">
      {icon}
      {label}
    </div>
  );
}

function ScorePanel({
  label,
  score,
  tone,
  players,
}: {
  label: string;
  score: number;
  tone: 'emerald' | 'rose';
  players: PlayerInfo[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-white',
            tone === 'emerald' ? 'bg-emerald-600' : 'bg-rose-600'
          )}
        >
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {players.length > 0 ? players.map((player) => player.username).join(' / ') : 'Menunggu slot'}
          </p>
        </div>
      </div>
      <span className="text-3xl font-bold text-gray-900 dark:text-white">{score}</span>
    </div>
  );
}
