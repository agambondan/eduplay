'use client';

import { BattleshipCell, BattleshipMatch } from '@/types/multiplayer';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bot,
  Clock,
  Crosshair,
  Gift,
  Loader2,
  RotateCcw,
  Shield,
  Target,
  UserPlus,
  Zap,
} from 'lucide-react';
import { battleshipApi } from '@/lib/api/multiplayer';
import { useAds } from '@/lib/hooks/useAds';
import { useAuthStore } from '@/lib/stores/authStore';
import { cn } from '@/lib/utils/cn';
import { BannerAd } from '@/components/ads/BannerAd';
import { InterstitialAd } from '@/components/ads/InterstitialAd';
import { RewardedAd } from '@/components/ads/RewardedAd';
import { GameContainer } from '@/components/ui/GameContainer';

type Difficulty = 'easy' | 'medium' | 'hard';
type Coord = { row: number; col: number };

const BOARD_SIZE = 8;
const FLEET_SIZE = 15;
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
};

export default function BattleshipMathPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [vsBot, setVsBot] = useState(true);
  const [opponentUsername, setOpponentUsername] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const {
    isInterstitialOpen,
    showInterstitial,
    closeInterstitial,
    isRewardedOpen,
    showRewarded,
    closeRewarded,
    handleReward,
    rewardText,
  } = useAds();

  const listQuery = useQuery({
    queryKey: ['battleship-matches'],
    queryFn: battleshipApi.list,
    enabled: Boolean(accessToken),
  });

  const matchQuery = useQuery({
    queryKey: ['battleship-match', selectedId],
    queryFn: () => battleshipApi.get(selectedId!),
    enabled: Boolean(accessToken && selectedId),
    refetchInterval: (query) => (query.state.data?.status === 'active' ? 5000 : false),
  });

  const match = matchQuery.data;

  const createMutation = useMutation({
    mutationFn: () =>
      battleshipApi.create({
        difficulty,
        vs_bot: vsBot,
        bot_difficulty: difficulty,
        opponent_username: vsBot ? undefined : opponentUsername.trim(),
      }),
    onSuccess: (created) => {
      setSelectedId(created.id);
      setFeedback(null);
      queryClient.invalidateQueries({ queryKey: ['battleship-matches'] });
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message }),
  });

  const targetMutation = useMutation({
    mutationFn: (target: Coord) => battleshipApi.target(match!.id, target.row, target.col),
    onSuccess: (updated) => {
      queryClient.setQueryData(['battleship-match', updated.id], updated);
      setAnswer('');
      setFeedback(null);
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message }),
  });

  const shotMutation = useMutation({
    mutationFn: () => battleshipApi.shot(match!.id, Number(answer.trim())),
    onSuccess: (updated) => {
      queryClient.setQueryData(['battleship-match', updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ['battleship-matches'] });
      setAnswer('');
      setFeedback({
        type: updated.status === 'finished' ? 'success' : 'success',
        message: updated.status === 'finished' ? 'Match selesai.' : 'Giliran diproses.',
      });
      if (updated.status === 'finished' || updated.log[0]?.includes('menenggelamkan')) {
        showInterstitial();
      }
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message }),
  });

  const revealMutation = useMutation({
    mutationFn: (id: string) => battleshipApi.reveal(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['battleship-match', updated.id], updated);
      setFeedback({ type: 'success', message: 'Area radar terbuka.' });
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message }),
  });

  const resignMutation = useMutation({
    mutationFn: () => battleshipApi.resign(match!.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['battleship-match', updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ['battleship-matches'] });
    },
  });

  if (!accessToken) {
    return (
      <>
        <BackButton onBack={() => router.push('/games')} />
        <GameContainer maxWidth="max-w-lg">
          <div className="py-16 text-center">
            <Crosshair className="mx-auto h-12 w-12 text-slate-400" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              Battleship Math
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Login diperlukan karena match disimpan di server dan bisa dilanjutkan lintas sesi.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 min-h-11 rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white dark:bg-white dark:text-slate-950"
            >
              Login
            </button>
          </div>
        </GameContainer>
      </>
    );
  }

  return (
    <>
      <BackButton onBack={() => router.push('/games')} />
      {!match ? (
        <MenuScreen
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          vsBot={vsBot}
          setVsBot={setVsBot}
          opponentUsername={opponentUsername}
          setOpponentUsername={setOpponentUsername}
          matches={listQuery.data || []}
          loading={listQuery.isLoading}
          creating={createMutation.isPending}
          feedback={feedback}
          onCreate={() => createMutation.mutate()}
          onSelect={setSelectedId}
        />
      ) : (
        <MatchScreen
          match={match}
          answer={answer}
          setAnswer={setAnswer}
          feedback={feedback}
          loading={matchQuery.isFetching || targetMutation.isPending || shotMutation.isPending}
          onBack={() => {
            setSelectedId(null);
            setFeedback(null);
          }}
          onTarget={(target) => targetMutation.mutate(target)}
          onShot={() => shotMutation.mutate()}
          onReveal={() =>
            showRewarded('Reveal area 3x3 radar lawan', () => revealMutation.mutate(match.id))
          }
          revealing={revealMutation.isPending}
          onResign={() => resignMutation.mutate()}
        />
      )}
      <InterstitialAd isOpen={isInterstitialOpen} onClose={closeInterstitial} />
      <RewardedAd
        isOpen={isRewardedOpen}
        onClose={closeRewarded}
        onReward={handleReward}
        rewardText={rewardText}
      />
    </>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <ArrowLeft className="h-4 w-4" />
      Kembali
    </button>
  );
}

function MenuScreen({
  difficulty,
  setDifficulty,
  vsBot,
  setVsBot,
  opponentUsername,
  setOpponentUsername,
  matches,
  loading,
  creating,
  feedback,
  onCreate,
  onSelect,
}: {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  vsBot: boolean;
  setVsBot: (v: boolean) => void;
  opponentUsername: string;
  setOpponentUsername: (v: string) => void;
  matches: BattleshipMatch[];
  loading: boolean;
  creating: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <GameContainer maxWidth="max-w-5xl">
      <div className="grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <BannerAd slotId="battleship-math-lobby" />
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950">
            <Crosshair className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Battleship Math</h1>
            <p className="mt-3 max-w-2xl text-gray-500 dark:text-slate-400">
              Pilih koordinat, jawab soal matematika dari server, lalu tembakan diproses. Mode bot
              dan tantang username sama-sama tersimpan di backend.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  difficulty === level
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                )}
              >
                <div className="text-sm font-bold">{DIFFICULTY_LABELS[level]}</div>
                <div className="mt-1 text-xs opacity-75">Soal {level}</div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex gap-2">
              <button
                onClick={() => setVsBot(true)}
                className={cn(
                  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold',
                  vsBot
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                    : 'border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-300'
                )}
              >
                <Bot className="h-4 w-4" />
                Vs Bot
              </button>
              <button
                onClick={() => setVsBot(false)}
                className={cn(
                  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold',
                  !vsBot
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                    : 'border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-300'
                )}
              >
                <UserPlus className="h-4 w-4" />
                Tantang User
              </button>
            </div>

            {!vsBot && (
              <input
                value={opponentUsername}
                onChange={(event) => setOpponentUsername(event.target.value)}
                placeholder="username lawan"
                className="mt-3 min-h-11 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900"
              />
            )}

            {feedback && (
              <div
                className={cn(
                  'mt-3 rounded-lg px-3 py-2 text-sm',
                  feedback.type === 'error'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                )}
              >
                {feedback.message}
              </div>
            )}

            <button
              onClick={onCreate}
              disabled={creating || (!vsBot && opponentUsername.trim().length < 3)}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
              Mulai Match
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
              <Shield className="h-5 w-5 text-emerald-600" />
              Match Aktif
            </div>
            <div className="mt-4 space-y-2">
              {loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
              {!loading && matches.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-slate-400">Belum ada match.</p>
              )}
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => onSelect(match.id)}
                  className="w-full rounded-lg border border-gray-200 p-3 text-left hover:border-emerald-400 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {match.opponent_name}
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                      {match.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {match.my_turn ? 'Giliranmu' : 'Menunggu lawan'} · {match.difficulty}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameContainer>
  );
}

function MatchScreen({
  match,
  answer,
  setAnswer,
  feedback,
  loading,
  onBack,
  onTarget,
  onShot,
  onReveal,
  revealing,
  onResign,
}: {
  match: BattleshipMatch;
  answer: string;
  setAnswer: (v: string) => void;
  feedback: { type: 'success' | 'error'; message: string } | null;
  loading: boolean;
  onBack: () => void;
  onTarget: (target: Coord) => void;
  onShot: () => void;
  onReveal: () => void;
  revealing: boolean;
  onResign: () => void;
}) {
  const myHits = useMemo(() => countHits(match.target_board), [match.target_board]);
  const opponentHits = useMemo(() => countHits(match.my_board), [match.my_board]);
  const question = match.pending_question;
  const [now, setNow] = useState(() => Date.now());
  const timerTarget = question ? match.pending_expires_at : match.turn_expires_at;
  const timeLeft = formatTimeLeft(timerTarget, now);

  useEffect(() => {
    if (match.status !== 'active') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [match.status, timerTarget]);

  return (
    <GameContainer maxWidth="max-w-6xl">
      <div className="space-y-5 py-6">
        <BannerAd slotId="battleship-math-match" />
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Battleship Math</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {match.status === 'finished'
                ? 'Match selesai'
                : match.my_turn
                  ? 'Giliranmu menyerang'
                  : `Menunggu ${match.opponent_name}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Stat label="Skor" value={match.my_score} />
            <Stat label="Kamu" value={`${myHits}/${FLEET_SIZE}`} />
            <Stat label="Lawan" value={`${opponentHits}/${FLEET_SIZE}`} />
            {match.status === 'active' && timeLeft && <Stat label="Timer" value={timeLeft} />}
          </div>
        </div>

        {feedback && (
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-sm',
              feedback.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            )}
          >
            {feedback.message}
          </div>
        )}

        {match.status === 'finished' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <div className="text-lg font-bold">
              {match.winner_side === match.my_side ? 'Kamu menang' : 'Kamu kalah'}
            </div>
            <button
              onClick={onBack}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
            >
              <RotateCcw className="h-4 w-4" />
              Kembali ke Lobby
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px_1fr]">
          <BattleBoard title="Armada Kamu" board={match.my_board} disabled />

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                {match.my_turn ? (
                  <Target className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Bot className="h-5 w-5 text-indigo-600" />
                )}
                Panel Tembakan
              </div>
              {match.status === 'active' && timeLeft && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <Clock className="h-4 w-4" />
                  {question ? 'Waktu jawab' : 'Turn expire'}: {timeLeft}
                </div>
              )}

              {question ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Target {cellName(question.target)}. Jawab untuk menembak.
                  </p>
                  <div className="rounded-xl bg-slate-100 p-4 text-center text-2xl font-black text-slate-900 dark:bg-slate-900 dark:text-white">
                    {question.text}
                  </div>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onShot();
                    }}
                    inputMode="numeric"
                    className="min-h-11 w-full rounded-xl border border-gray-200 px-4 text-center text-lg font-bold outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900"
                    autoFocus
                  />
                  <button
                    onClick={onShot}
                    disabled={loading || answer.trim() === ''}
                    className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Tembak'}
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                  {match.my_turn
                    ? 'Klik sel di radar lawan untuk membuka soal dari server.'
                    : 'Match akan otomatis refresh tiap beberapa detik.'}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="text-sm font-bold text-gray-900 dark:text-white">Log Match</div>
              <div className="mt-3 space-y-2">
                {match.log.map((item, index) => (
                  <p
                    key={`${item}-${index}`}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {item}
                  </p>
                ))}
              </div>
              {match.status === 'active' && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={onReveal}
                    disabled={match.reveal_used || loading || revealing}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {revealing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                    {match.reveal_used ? 'Reveal Dipakai' : 'Reward Reveal'}
                  </button>
                  <button
                    onClick={onResign}
                    className="min-h-11 w-full rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  >
                    Menyerah
                  </button>
                </div>
              )}
            </div>
          </div>

          <BattleBoard
            title="Radar Lawan"
            board={match.target_board}
            selectedTarget={question?.target}
            onSelect={onTarget}
            disabled={!match.my_turn || Boolean(question) || match.status === 'finished' || loading}
          />
        </div>
      </div>
    </GameContainer>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-100 px-3 py-2 font-semibold text-gray-700 dark:bg-slate-900 dark:text-slate-200">
      <span className="text-gray-400">{label}</span> {value}
    </div>
  );
}

function BattleBoard({
  title,
  board,
  disabled = false,
  selectedTarget,
  onSelect,
}: {
  title: string;
  board: BattleshipCell[][];
  disabled?: boolean;
  selectedTarget?: Coord | null;
  onSelect?: (target: Coord) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-3 text-center text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
      <div className="mx-auto grid max-w-[360px] grid-cols-[24px_repeat(8,minmax(0,1fr))] gap-1">
        <div />
        {Array.from({ length: BOARD_SIZE }, (_, index) => (
          <div key={index} className="text-center text-xs font-bold text-gray-400">
            {index + 1}
          </div>
        ))}
        {board.map((row, rowIndex) => (
          <div key={ROW_LABELS[rowIndex]} className="contents">
            <div className="flex items-center justify-center text-xs font-bold text-gray-400">
              {ROW_LABELS[rowIndex]}
            </div>
            {row.map((cell, colIndex) => {
              const isSelected =
                selectedTarget?.row === rowIndex && selectedTarget.col === colIndex;
              const isKnownShip = cell.ship;
              const isRevealed = cell.revealed && !cell.hit && !cell.miss && !isKnownShip;
              const label = `${title} ${ROW_LABELS[rowIndex]}${colIndex + 1}`;

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  aria-label={label}
                  onClick={() => onSelect?.({ row: rowIndex, col: colIndex })}
                  disabled={disabled || cell.hit || cell.miss}
                  className={cn(
                    'aspect-square min-h-8 rounded-md border text-xs font-black transition-colors',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500',
                    cell.hit && 'border-rose-500 bg-rose-500 text-white',
                    cell.miss &&
                      'border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
                    !cell.hit &&
                      !cell.miss &&
                      isKnownShip &&
                      'border-emerald-600 bg-emerald-100 dark:bg-emerald-950',
                    isRevealed &&
                      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
                    !cell.hit &&
                      !cell.miss &&
                      !isKnownShip &&
                      !isRevealed &&
                      'border-sky-200 bg-sky-50 hover:border-sky-400 hover:bg-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-500',
                    isSelected && 'ring-2 ring-emerald-500',
                    disabled && 'cursor-default'
                  )}
                >
                  {cell.hit ? 'X' : cell.miss ? '-' : isKnownShip ? 'S' : isRevealed ? '·' : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function countHits(board: BattleshipCell[][]) {
  return board.flat().filter((cell) => cell.hit).length;
}

function cellName({ row, col }: Coord) {
  return `${ROW_LABELS[row]}${col + 1}`;
}

function formatTimeLeft(target?: string, now = Date.now()) {
  if (!target) return '';
  const remaining = new Date(target).getTime() - now;
  if (remaining <= 0) return '00:00';
  const totalSeconds = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
