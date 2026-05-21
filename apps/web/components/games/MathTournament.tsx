'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bot,
  Brackets,
  CalendarClock,
  Check,
  Copy,
  Crown,
  Eye,
  Loader2,
  Play,
  Plus,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import { BannerAd } from '@/components/ads/BannerAd'
import { tournamentsApi } from '@/lib/api/multiplayer'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils/cn'
import { Tournament, TournamentMatch, TournamentPlayer } from '@/types/multiplayer'

const difficultyLabels: Record<string, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
}

const modeLabels: Record<string, string> = {
  quick: 'Quick',
  open_daily: 'Daily Open',
  open_weekly: 'Weekly Open',
}

export default function MathTournament() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('Quick Math Tournament')
  const [difficulty, setDifficulty] = useState('medium')
  const [mode, setMode] = useState<'quick' | 'open_daily' | 'open_weekly'>('quick')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentsApi.list,
    enabled: !!user,
  })

  const activeTournament = useMemo(() => {
    if (!tournaments?.length) return null
    if (selectedId) return tournaments.find((item) => item.id === selectedId) ?? tournaments[0]
    return tournaments[0]
  }, [selectedId, tournaments])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tournaments'] })

  const createMutation = useMutation({
    mutationFn: () => tournamentsApi.create({ name, difficulty, mode, max_players: maxPlayers }),
    onSuccess: (tournament) => {
      setSelectedId(tournament.id)
      setError('')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal membuat tournament'),
  })

  const joinMutation = useMutation({
    mutationFn: (id: string) => tournamentsApi.join(id),
    onSuccess: (tournament) => {
      setSelectedId(tournament.id)
      setError('')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal join tournament'),
  })

  const joinByCode = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setError('Masukkan invite code tournament')
      return
    }
    joinMutation.mutate(code)
  }

  const startMutation = useMutation({
    mutationFn: (id: string) => tournamentsApi.start(id),
    onSuccess: (tournament) => {
      setSelectedId(tournament.id)
      setError('')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal mulai tournament'),
  })

  const reportMutation = useMutation({
    mutationFn: ({
      tournamentId,
      match,
      winner,
    }: {
      tournamentId: string
      match: TournamentMatch
      winner: TournamentPlayer
    }) =>
      tournamentsApi.reportMatch(tournamentId, match.id, {
        winner_player_id: winner.id,
        player1_score: winner.id === match.player1?.id ? 120 : 80,
        player2_score: winner.id === match.player2?.id ? 120 : 80,
      }),
    onSuccess: (tournament) => {
      setSelectedId(tournament.id)
      setError('')
      invalidate()
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal report hasil match'),
  })

  if (!user) {
    return (
      <main className="container max-w-md py-16">
        <Link
          href="/games"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <section className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Math Tournament</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Masuk dulu untuk membuat atau join bracket.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Login
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="container max-w-6xl py-8">
      <Link
        href="/games"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Brackets className="h-4 w-4" /> Single Elimination
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Math Tournament</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-slate-400">
            Buat bracket 4, 8, atau 16 pemain. Slot kosong otomatis diisi bot saat host mulai.
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Plus className="h-5 w-5 text-indigo-500" /> Buat Tournament
            </h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Nama
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Mode
                </span>
                <div className="grid gap-2">
                  {(['quick', 'open_daily', 'open_weekly'] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setMode(value)
                        if (value === 'quick') setName('Quick Math Tournament')
                        if (value === 'open_daily') setName('Daily Math Tournament')
                        if (value === 'open_weekly') setName('Weekly Math Tournament')
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                        mode === value
                          ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                          : 'border-gray-200 text-gray-600 hover:border-violet-200 dark:border-slate-600 dark:text-slate-300'
                      )}
                    >
                      {modeLabels[value]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Difficulty
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(difficultyLabels).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setDifficulty(value)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                        difficulty === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-200 dark:border-slate-600 dark:text-slate-300'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Ukuran Bracket
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 8, 16].map((value) => (
                    <button
                      key={value}
                      onClick={() => setMaxPlayers(value)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                        maxPlayers === value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'border-gray-200 text-gray-600 hover:border-emerald-200 dark:border-slate-600 dark:text-slate-300'
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Buat Bracket
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Copy className="h-5 w-5 text-emerald-500" /> Join via Code
            </h2>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="INVITE CODE"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold uppercase tracking-wide outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900"
              />
              <button
                onClick={joinByCode}
                disabled={joinMutation.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Join
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Users className="h-5 w-5 text-violet-500" /> Tournament Aktif
            </h2>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : tournaments?.length ? (
              <div className="space-y-2">
                {tournaments.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors',
                      activeTournament?.id === item.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                        : 'border-gray-200 hover:border-indigo-200 dark:border-slate-700'
                    )}
                  >
                    <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                      <span>{difficultyLabels[item.difficulty] ?? item.difficulty}</span>
                      <span>{modeLabels[item.mode] ?? item.mode}</span>
                      <span>{item.players.length}/{item.max_players}</span>
                      <span className="capitalize">{item.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">Belum ada tournament.</p>
            )}
          </section>
        </aside>

        <section className="min-h-[520px] rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <BannerAd slotId="tournament-bracket-top" />
          {activeTournament ? (
            <TournamentDetail
              tournament={activeTournament}
              userId={user.id}
              onJoin={() => joinMutation.mutate(activeTournament.id)}
              onStart={() => startMutation.mutate(activeTournament.id)}
              onReport={(match, winner) =>
                reportMutation.mutate({ tournamentId: activeTournament.id, match, winner })
              }
              busy={joinMutation.isPending || startMutation.isPending || reportMutation.isPending}
            />
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <Trophy className="mb-4 h-14 w-14 text-gray-300" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pilih atau buat tournament</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                Bracket akan muncul di sini setelah tournament dibuat.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function TournamentDetail({
  tournament,
  userId,
  onJoin,
  onStart,
  onReport,
  busy,
}: {
  tournament: Tournament
  userId: string
  onJoin: () => void
  onStart: () => void
  onReport: (match: TournamentMatch, winner: TournamentPlayer) => void
  busy: boolean
}) {
  const isHost = tournament.host_id === userId
  const isJoined = tournament.players.some((player) => player.user_id === userId)
  const isEliminated = tournament.players.some(
    (player) => player.user_id === userId && player.status === 'eliminated'
  )
  const champion = tournament.players.find((player) => player.user_id === tournament.champion_id)
  const rounds = groupMatchesByRound(tournament.matches)
  const copyInviteCode = () => navigator.clipboard?.writeText(tournament.invite_code)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start md:justify-between dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{tournament.name}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {difficultyLabels[tournament.difficulty] ?? tournament.difficulty}
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {modeLabels[tournament.mode] ?? tournament.mode}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {tournament.players.length}/{tournament.max_players} pemain
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 capitalize dark:bg-slate-700 dark:text-slate-200">
              {tournament.status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
            <button
              onClick={copyInviteCode}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 font-bold text-gray-700 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-200"
            >
              <Copy className="h-3.5 w-3.5" /> {tournament.invite_code}
            </button>
            {tournament.scheduled_start_at && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Mulai {formatDateTime(tournament.scheduled_start_at)}
              </span>
            )}
            {tournament.current_round_ends_at && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Round selesai {formatDateTime(tournament.current_round_ends_at)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tournament.status === 'registration' && !isJoined && (
            <button
              onClick={onJoin}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              <Users className="h-4 w-4" /> Join
            </button>
          )}
          {tournament.status === 'registration' && isHost && (
            <button
              onClick={onStart}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Play className="h-4 w-4" /> Mulai
            </button>
          )}
        </div>
      </div>

      {isEliminated && tournament.status === 'active' && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
          <Eye className="mr-2 inline h-4 w-4" />
          Kamu sudah eliminated. Bracket dan skor match yang selesai tetap bisa dipantau di sini.
        </div>
      )}

      {tournament.status === 'finished' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">Champion</div>
              <div className="text-xl font-extrabold text-gray-900 dark:text-white">
                {champion?.display_name ?? 'Champion'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Users className="h-5 w-5 text-indigo-500" /> Peserta
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {tournament.players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold text-indigo-600 dark:bg-slate-800">
                {player.is_bot ? <Bot className="h-5 w-5" /> : player.seed || '?'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {player.display_name}
                </div>
                <div className="text-xs capitalize text-gray-500 dark:text-slate-400">
                  {player.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Brackets className="h-5 w-5 text-violet-500" /> Bracket
        </h3>
        {tournament.matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-slate-700">
            <Swords className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-semibold text-gray-700 dark:text-slate-200">
              Bracket dibuat saat host menekan mulai.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {rounds.map(([round, matches]) => (
              <div key={round} className="space-y-3">
                <div className="text-sm font-extrabold text-gray-500 dark:text-slate-400">
                  Round {round}
                </div>
                {matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tournamentId={tournament.id}
                    userId={userId}
                    onReport={onReport}
                    busy={busy}
                    canReport={tournament.status === 'active'}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MatchCard({
  match,
  tournamentId,
  userId,
  onReport,
  busy,
  canReport,
}: {
  match: TournamentMatch
  tournamentId: string
  userId: string
  onReport: (match: TournamentMatch, winner: TournamentPlayer) => void
  busy: boolean
  canReport: boolean
}) {
  const players = [match.player1, match.player2].filter(Boolean) as TournamentPlayer[]
  const isFinished = match.status === 'finished'
  const canPlay = match.status === 'active' && players.some((player) => player.user_id === userId)
  const canWatch = match.status === 'active' && !canPlay

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-400">
        <span>Match {match.position}</span>
        <span className="capitalize">{match.status}</span>
      </div>
      <div className="space-y-2">
        {players.map((player, index) => {
          const score = index === 0 ? match.player1_score : match.player2_score
          const won = match.winner_player_id === player.id
          return (
            <div
              key={player.id}
              className={cn(
                'flex items-center justify-between rounded-lg border px-3 py-2',
                won
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950'
                  : 'border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-800'
              )}
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                {player.is_bot && <Bot className="h-4 w-4 text-gray-400" />}
                <span className="truncate">{player.display_name}</span>
              </span>
              <span className="flex items-center gap-2 text-sm font-extrabold text-gray-700 dark:text-slate-200">
                {isFinished && score}
                {won && <Check className="h-4 w-4 text-emerald-500" />}
              </span>
            </div>
          )
        })}
        {players.length < 2 && (
          <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400 dark:border-slate-700">
            Menunggu pemenang round sebelumnya
          </div>
        )}
      </div>

      {canReport && !isFinished && players.length === 2 && (
        <div className="mt-3 grid gap-2">
          {canPlay && (
            <Link
              href={buildMathBattleHref(tournamentId, match)}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-bold text-white hover:bg-indigo-700"
            >
              Mainkan Math Battle
            </Link>
          )}
          {canWatch && (
            <Link
              href={buildMathBattleHref(tournamentId, match, true)}
              className="rounded-lg border border-sky-200 px-3 py-2 text-center text-xs font-bold text-sky-700 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950"
            >
              Tonton Match
            </Link>
          )}
          <div className="grid grid-cols-2 gap-2">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => onReport(match, player)}
              disabled={busy}
              className="rounded-lg border border-indigo-200 px-2 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
            >
              {player.display_name} Menang
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}

function buildMathBattleHref(tournamentId: string, match: TournamentMatch, spectator = false) {
  const params = new URLSearchParams({
    room_id: match.room_id,
    tournament_id: tournamentId,
    match_id: match.id,
    p1_id: match.player1?.id ?? '',
    p1_user: match.player1?.user_id ?? '',
    p2_id: match.player2?.id ?? '',
    p2_user: match.player2?.user_id ?? '',
  })
  if (spectator) params.set('spectator', '1')
  return `/games/math-battle?${params.toString()}`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function groupMatchesByRound(matches: TournamentMatch[]) {
  const grouped = new Map<number, TournamentMatch[]>()
  matches.forEach((match) => {
    grouped.set(match.round, [...(grouped.get(match.round) ?? []), match])
  })
  return Array.from(grouped.entries()).sort(([a], [b]) => a - b)
}
