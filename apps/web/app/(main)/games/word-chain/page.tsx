'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { wordChainApi } from '@/lib/api/multiplayer'
import { GameContainer } from '@/components/ui/GameContainer'
import {
  ArrowLeft, Send, Bot, Users, Loader2, Check, X, Clock,
  Link2, Trophy, RefreshCw, Hash, User,
} from 'lucide-react'
import { WordChainGame, WordChainDetail } from '@/types/multiplayer'

type Screen = 'menu' | 'play' | 'list'

export default function WordChainPage() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [gameId, setGameId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()

  const { data: games, refetch: refetchGames } = useQuery({
    queryKey: ['wordchain'],
    queryFn: () => wordChainApi.list(),
    refetchInterval: screen === 'list' ? 5000 : false,
  })

  const { data: gameDetail, refetch: refetchGame } = useQuery({
    queryKey: ['wordchain', gameId, refreshKey],
    queryFn: () => wordChainApi.get(gameId!),
    enabled: !!gameId,
    refetchInterval: screen === 'play' ? 3000 : false,
  })

  if (screen === 'menu') {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6">
          <button onClick={() => router.push('/games')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
              <Link2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Word Chain</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Sambung kata Bahasa Indonesia. Huruf terakhir = huruf pertama kata berikutnya!
            </p>
          </div>
          <VsBotSection onStart={(id) => { setGameId(id); refetchGame(); setScreen('play') }} />
          <button
            onClick={() => setScreen('list')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 px-6 py-4 font-semibold text-gray-700 transition-all hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-600 dark:text-slate-300"
          >
            <Users className="h-5 w-5" /> Game Aktif ({games?.length || 0})
          </button>
        </div>
      </GameContainer>
    )
  }

  if (screen === 'list') {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6">
          <button onClick={() => setScreen('menu')} className="flex items-center gap-2 text-sm text-gray-500">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Game Aktif <span className="text-sm font-normal text-gray-500">({games?.length || 0})</span>
          </h2>
          {!games?.length ? (
            <div className="py-12 text-center text-gray-400">
              <Users className="mx-auto mb-3 h-10 w-10" />
              <p>Belum ada game aktif</p>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((g) => <GameCard key={g.id} game={g} onClick={() => { setGameId(g.id); setScreen('play') }} />)}
            </div>
          )}
        </div>
      </GameContainer>
    )
  }

  if (screen === 'play' && gameDetail) {
    return (
      <GamePlayScreen
        key={gameDetail.id}
        game={gameDetail}
        onBack={() => { setGameId(null); setScreen('menu') }}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />
    )
  }

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
    </GameContainer>
  )
}

function VsBotSection({ onStart }: { onStart: (id: string) => void }) {
  const [difficulty, setDifficulty] = useState('medium')
  const [username, setUsername] = useState('')
  const [vsBot, setVsBot] = useState(true)

  const botMutation = useMutation({
    mutationFn: () => wordChainApi.create({ vs_bot: true, bot_difficulty: difficulty }),
    onSuccess: (result) => onStart(result.id),
  })

  const challengeMutation = useMutation({
    mutationFn: () => wordChainApi.create({ opponent_username: username, vs_bot: false }),
    onSuccess: (result) => onStart(result.id),
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setVsBot(true)}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
            vsBot ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-400' : 'border-gray-200 dark:border-slate-600'
          }`}
        >
          <Bot className={`h-6 w-6 ${vsBot ? 'text-emerald-500' : 'text-gray-400'}`} />
          <span className={`text-sm font-semibold ${vsBot ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-slate-400'}`}>Vs Bot</span>
        </button>
        <button
          onClick={() => setVsBot(false)}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
            !vsBot ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-400' : 'border-gray-200 dark:border-slate-600'
          }`}
        >
          <User className={`h-6 w-6 ${!vsBot ? 'text-indigo-500' : 'text-gray-400'}`} />
          <span className={`text-sm font-semibold ${!vsBot ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-slate-400'}`}>Vs Teman</span>
        </button>
      </div>

      {vsBot ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'easy', label: 'Mudah', color: 'text-green-600 border-green-300 bg-green-50 dark:bg-green-950' },
              { key: 'medium', label: 'Sedang', color: 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950' },
              { key: 'hard', label: 'Sulit', color: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-950' },
            ].map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                  difficulty === d.key ? d.color : 'border-gray-200 text-gray-600 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => botMutation.mutate()}
            disabled={botMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {botMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bot className="h-5 w-5" />}
            Mulai vs Bot {difficulty === 'easy' ? 'Mudah' : difficulty === 'medium' ? 'Sedang' : 'Sulit'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !challengeMutation.isPending && username && challengeMutation.mutate()}
            placeholder="Username teman"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800"
          />
          <button
            onClick={() => challengeMutation.mutate()}
            disabled={!username || challengeMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {challengeMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Kirim Tantangan
          </button>
        </div>
      )}
    </div>
  )
}

function GameCard({ game, onClick }: { game: WordChainGame; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          game.is_vs_bot ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-indigo-100 dark:bg-indigo-900'
        }`}>
          {game.is_vs_bot ? <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{game.opponent_name}</p>
          <p className="text-xs text-gray-500">{game.player1_score} : {game.player2_score}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {game.my_turn ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            Giliranmu
          </span>
        ) : game.status === 'active' ? (
          <Clock className="h-4 w-4 text-amber-500" />
        ) : null}
        <span className="text-xl text-gray-300">→</span>
      </div>
    </button>
  )
}

function GamePlayScreen({ game, onBack, onRefresh }: { game: WordChainDetail; onBack: () => void; onRefresh: () => void }) {
  const [word, setWord] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: () => wordChainApi.submitWord(game.id, { word: word.toLowerCase().trim() }),
    onSuccess: (result) => {
      if (result.valid) {
        setFeedback({
          type: 'success',
          message: result.bot_response
            ? `Bot jawab: "${result.bot_response}"`
            : 'Kata valid! (+' + result.score_delta + ' pts)',
        })
        setWord('')
        setJustSubmitted(true)
        onRefresh()
      } else {
        setFeedback({ type: 'error', message: result.message || 'Kata tidak valid' })
      }
    },
    onError: (err: Error) => {
      setFeedback({ type: 'error', message: err.message })
    },
  })

  useEffect(() => {
    if (justSubmitted) {
      const timer = setTimeout(() => setJustSubmitted(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [justSubmitted])

  useEffect(() => {
    setFeedback(null)
  }, [game.current_word])

  const wordsUsed = game.words_used || []
  const lastWord = wordsUsed.length > 0 ? wordsUsed[wordsUsed.length - 1] : ''
  const lastLetter = lastWord ? [...lastWord].pop() || '' : ''

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="w-full space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          {game.status === 'active' && (
            <button onClick={() => onRefresh()} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-around">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{game.player1_score}</p>
              <p className="text-xs font-medium text-gray-500">Kamu</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-400">VS</p>
              {game.is_vs_bot && (
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  BOT
                </span>
              )}
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{game.player2_score}</p>
              <p className="text-xs font-medium text-gray-500">{game.opponent_name}</p>
            </div>
          </div>

          {game.status === 'finished' ? (
            <div className="py-6 text-center">
              <Trophy className="mx-auto mb-3 h-12 w-12 text-amber-400" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">Game Selesai!</p>
              <p className="mt-1 text-sm text-gray-500">
                {game.player1_score > game.player2_score ? 'Kamu menang!' :
                 game.player1_score < game.player2_score ? `${game.opponent_name} menang` : 'Seri!'}
              </p>
              <button
                onClick={onBack}
                className="mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg"
              >
                Kembali ke Menu
              </button>
            </div>
          ) : game.my_turn ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-center dark:from-emerald-950 dark:to-teal-950">
                {lastWord ? (
                  <>
                    <p className="mb-1 text-xs font-medium text-gray-500">Kata terakhir:</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {lastWord.slice(0, -1)}<span className="text-amber-500 underline decoration-2 underline-offset-4">{lastLetter}</span>
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-slate-300">
                      Cari kata berawalan &ldquo;<span className="text-lg font-bold text-amber-500">{lastLetter}</span>&rdquo;
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-semibold text-gray-600">Mulai dengan kata pertama!</p>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  {lastLetter && (
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                      <span className="text-lg font-bold text-amber-500">{lastLetter}</span>
                    </div>
                  )}
                  <input
                    value={word}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z]/g, '')
                      if (lastLetter && val.startsWith(lastLetter.toLowerCase())) {
                        setWord(val)
                      } else if (!lastLetter) {
                        setWord(val)
                      } else if (val === '') {
                        setWord('')
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && word.length >= 3 && mutation.mutate()}
                    placeholder={lastLetter ? `Mulai dengan "${lastLetter.toUpperCase()}"...` : 'Ketik kata...'}
                    className={`w-full rounded-xl border-2 p-3.5 text-sm focus:outline-none dark:bg-slate-800 ${
                      lastLetter ? 'pl-8' : ''
                    } ${
                      mutation.isPending ? 'border-gray-200' :
                      feedback?.type === 'success' ? 'border-green-400 bg-green-50' :
                      feedback?.type === 'error' ? 'border-red-400 bg-red-50' :
                      'border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600'
                    }`}
                    disabled={mutation.isPending}
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={word.length < 3 || mutation.isPending}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                >
                  {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>

              {feedback && (
                <div className={`flex items-center gap-2 rounded-xl p-3.5 text-sm font-medium ${
                  feedback.type === 'success'
                    ? 'border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
                    : 'border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400'
                }`}>
                  {feedback.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                  {feedback.message}
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-gray-300" />
              <p className="font-semibold text-gray-700 dark:text-slate-300">Menunggu giliran {game.opponent_name}...</p>
              {lastWord && (
                <p className="mt-2 text-sm text-gray-400">
                  Kata terakhir: <span className="font-bold">{lastWord}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {wordsUsed.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                Riwayat Kata ({wordsUsed.length})
              </h3>
            </div>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {wordsUsed.map((w, i) => (
                <span
                  key={i}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    i % 2 === 0
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                      : game.is_vs_bot && i % 2 === 1
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameContainer>
  )
}
