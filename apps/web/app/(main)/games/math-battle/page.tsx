'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { multiplayerApi, tournamentsApi } from '@/lib/api/multiplayer'
import { useAuthStore } from '@/lib/stores/authStore'
import { GameContainer } from '@/components/ui/GameContainer'
import { InterstitialAd } from '@/components/ads/InterstitialAd'
import { ArrowLeft, Zap, Loader2, Wifi, WifiOff, Trophy, Target, Sparkles } from 'lucide-react'
import { ShareButton } from '@/components/ui/ShareButton'
import { useAds } from '@/lib/hooks/useAds'
import { QuickMatchResult, RealtimeQuestion, AnswerResult, GameOverResult } from '@/types/multiplayer'

type Screen = 'menu' | 'searching' | 'playing' | 'result'

type TournamentMatchParams = {
  tournamentId: string
  matchId: string
  player1Id: string
  player1UserId: string
  player2Id: string
  player2UserId: string
  spectator: boolean
}

export default function MathBattlePage() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [matchInfo, setMatchInfo] = useState<QuickMatchResult | null>(null)
  const [tournamentParams, setTournamentParams] = useState<TournamentMatchParams | null>(null)
  const router = useRouter()
  const handleGameStart = useCallback(() => setScreen('playing'), [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get('room_id')
    const tournamentId = params.get('tournament_id')
    const matchId = params.get('match_id')
    if (!roomId || !tournamentId || !matchId) return

    setTournamentParams({
      tournamentId,
      matchId,
      player1Id: params.get('p1_id') ?? '',
      player1UserId: params.get('p1_user') ?? '',
      player2Id: params.get('p2_id') ?? '',
      player2UserId: params.get('p2_user') ?? '',
      spectator: params.get('spectator') === '1',
    })
    setMatchInfo({
      match_id: matchId,
      room_id: roomId,
      opponent_name: 'Tournament opponent',
      status: 'tournament',
    })
    setScreen('searching')
  }, [])

  return (
    <>
      <button onClick={() => router.push('/games')} className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      {screen === 'menu' && <MenuScreen onStart={(result) => { setMatchInfo(result); setScreen('searching') }} />}
      {(screen === 'searching' || screen === 'playing') && matchInfo && (
        <SearchingScreen
          matchInfo={matchInfo}
          tournamentParams={tournamentParams}
          onGameStart={handleGameStart}
          onBack={() => tournamentParams ? router.push('/games/math-tournament') : setScreen('menu')}
        />
      )}
      {screen === 'result' && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>}
    </>
  )
}

function MenuScreen({ onStart }: { onStart: (r: QuickMatchResult) => void }) {
  const [difficulty, setDifficulty] = useState('medium')
  const [error, setError] = useState('')

  const searchMutation = useMutation({
    mutationFn: () => multiplayerApi.quickMatch('math-battle', difficulty),
    onSuccess: (result) => onStart(result),
    onError: (err: Error) => setError(err.message),
  })

  const botMutation = useMutation({
    mutationFn: (useRecommended: boolean) => multiplayerApi.quickMatchBot('math-battle', difficulty, useRecommended),
    onSuccess: (result) => onStart({
      match_id: result.match_id,
      room_id: result.room_id,
      opponent_name: result.bot.name,
      status: 'bot',
    }),
    onError: (err: Error) => setError(err.message),
  })

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Zap className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Math Battle</h1>
          <p className="mt-2 text-sm text-gray-500">Head-to-head real-time! Jawab soal lebih cepat dan benar dari lawan.</p>
        </div>

        {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-3 gap-2">
          {['easy', 'medium', 'hard'].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                difficulty === d
                  ? d === 'easy' ? 'border-green-500 bg-green-50 text-green-700' :
                    d === 'medium' ? 'border-amber-500 bg-amber-50 text-amber-700' :
                    'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-600 dark:border-slate-600'
              }`}
            >
              {d === 'easy' ? 'Mudah' : d === 'medium' ? 'Sedang' : 'Sulit'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => searchMutation.mutate()}
            disabled={searchMutation.isPending}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {searchMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wifi className="h-5 w-5" />}
            Cari Lawan
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 dark:bg-gray-950">atau</span></div>
          </div>

          <button
            onClick={() => botMutation.mutate(false)}
            disabled={botMutation.isPending}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 px-6 py-4 font-semibold text-gray-700 transition-all hover:border-indigo-300 dark:border-slate-600 dark:text-slate-300"
          >
            {botMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Target className="h-5 w-5" />}
            Lawan Bot ({difficulty === 'easy' ? 'Mudah' : difficulty === 'medium' ? 'Sedang' : 'Sulit'})
          </button>

          <button
            onClick={() => botMutation.mutate(true)}
            disabled={botMutation.isPending}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 px-6 py-4 font-semibold text-amber-800 transition-all hover:border-amber-300 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          >
            {botMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Lawan Bot Rekomendasi
          </button>
        </div>
      </div>
    </GameContainer>
  )
}

function SearchingScreen({
  matchInfo,
  tournamentParams,
  onGameStart,
  onBack,
}: {
  matchInfo: QuickMatchResult
  tournamentParams: TournamentMatchParams | null
  onGameStart: () => void
  onBack: () => void
}) {
  const [timer, setTimer] = useState(0)
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'playing' | 'finished'>('waiting')
  const [countdown, setCountdown] = useState(3)
  const [currentQ, setCurrentQ] = useState<RealtimeQuestion | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [opponentName, setOpponentName] = useState(matchInfo.opponent_name || 'Bot')
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null)
  const [gameResult, setGameResult] = useState<GameOverResult | null>(null)
  const [isSuddenDeath, setIsSuddenDeath] = useState(false)
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
  const questionStartedAt = useRef<number>(0)
  const gameStateRef = useRef(gameState)
  const token = useAuthStore((s) => s.accessToken)
  const userId = useAuthStore((s) => s.user?.id)
  const router = useRouter()
  const reportedTournamentResult = useRef(false)
  const interstitialShown = useRef(false)
  const { isInterstitialOpen, showInterstitial, closeInterstitial } = useAds()

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  const handleWSMessage = useCallback((msg: { type: string; payload: any }) => {
    switch (msg.type) {
      case 'room_joined':
        if (msg.payload.players?.length > 0) {
          const other = msg.payload.players.find((p: any) => p.id !== userId)
          if (other) setOpponentName(other.username)
        }
        break
      case 'room_state':
        if (msg.payload.players?.length > 0) {
          const me = msg.payload.players.find((p: any) => p.id === userId)
          const other = msg.payload.players.find((p: any) => p.id !== userId)
          if (me) setMyScore(me.score ?? 0)
          if (other) {
            setOpponentName(other.username)
            setOpponentScore(other.score ?? 0)
          }
        }
        if (msg.payload.state === 'countdown') {
          setGameState('countdown')
          onGameStart()
        }
        if (msg.payload.state === 'playing') {
          setGameState('playing')
          onGameStart()
          if (msg.payload.current_question) {
            setCurrentQ(msg.payload.current_question)
            questionStartedAt.current = Date.now()
          }
        }
        break
      case 'player_joined':
        setOpponentName(msg.payload.username)
        break
      case 'bot_joined':
        setOpponentName(msg.payload.username)
        break
      case 'player_disconnected':
        setOpponentDisconnected(true)
        break
      case 'player_reconnected':
        setOpponentDisconnected(false)
        break
      case 'game_starting':
        setGameState('countdown')
        setCountdown(msg.payload.countdown ?? 3)
        onGameStart()
        break
      case 'question':
        setGameState('playing')
        setCurrentQ(msg.payload)
        setLastResult(null)
        questionStartedAt.current = Date.now()
        break
      case 'answer_result':
        if (msg.payload.player_id === userId) {
          setLastResult(msg.payload)
          setMyScore(msg.payload.new_score)
        } else {
          setOpponentScore(msg.payload.new_score)
        }
        break
      case 'opponent_progress':
        if (msg.payload.player_id !== userId) {
          setOpponentScore(msg.payload.current_score)
        }
        break
      case 'sudden_death_start':
        setIsSuddenDeath(true)
        setLastResult(null)
        break
      case 'game_over':
        setGameState('finished')
        setGameResult(msg.payload)
        break
    }
  }, [onGameStart, userId])

  const connect = useCallback(() => {
    if (!token) return
    const apiBase = (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '')
    const ws = new WebSocket(`${apiBase.replace('http', 'ws')}/api/v1/ws/game/${matchInfo.room_id}?token=${token}`)

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({
        type: 'join_room',
        payload: { room_id: matchInfo.room_id, token },
      }))
    }

    ws.onclose = () => {
      setConnected(false)
      if (gameStateRef.current !== 'finished') {
        reconnectTimer.current = setTimeout(() => connect(), 2000)
      }
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleWSMessage(msg)
      } catch {}
    }

    wsRef.current = ws
  }, [token, matchInfo.room_id, handleWSMessage])

  useEffect(() => {
    const t = setInterval(() => setTimer((p) => p + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (gameState !== 'countdown') return
    if (countdown <= 0) { setGameState('playing'); return }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [gameState, countdown])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  useEffect(() => {
    if (!gameResult || !tournamentParams || reportedTournamentResult.current) return
    const winnerPlayerId = mapTournamentWinner(gameResult.winner_id, tournamentParams)
    if (!winnerPlayerId) return

    reportedTournamentResult.current = true
    tournamentsApi
      .reportMatch(tournamentParams.tournamentId, tournamentParams.matchId, {
        winner_player_id: winnerPlayerId,
        player1_score: tournamentPlayerScore(gameResult, tournamentParams.player1UserId),
        player2_score: tournamentPlayerScore(gameResult, tournamentParams.player2UserId),
      })
      .catch(() => {
        reportedTournamentResult.current = false
      })
  }, [gameResult, tournamentParams])

  useEffect(() => {
    if (!gameResult || !tournamentParams || tournamentParams.spectator || interstitialShown.current) return
    interstitialShown.current = true
    showInterstitial()
  }, [gameResult, showInterstitial, tournamentParams])

  const handleAnswer = (answer: string) => {
    if (!currentQ || gameState !== 'playing' || lastResult || tournamentParams?.spectator) return
    const elapsedMs = Math.max(200, questionStartedAt.current ? Date.now() - questionStartedAt.current : 200)
    wsRef.current?.send(JSON.stringify({
      type: 'submit_answer',
      payload: {
        room_id: matchInfo.room_id,
        question_id: currentQ.id,
        answer,
        time_taken_ms: elapsedMs,
      },
    }))
  }

  if (gameResult) {
    const myResult = gameResult.results?.find((r) => r.player_id === userId)
    const opponentResult = gameResult.results?.find((r) => r.player_id !== userId)
    const isWin = myResult?.is_winner ?? false
    const finalMyScore = myResult?.score ?? myScore
    const finalOpponentScore = opponentResult?.score ?? opponentScore

    return (
      <>
        <InterstitialAd isOpen={isInterstitialOpen} onClose={closeInterstitial} />
        <GameContainer maxWidth="max-w-lg">
          <div className="space-y-6 pt-8 text-center">
            <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${
              isWin ? 'from-amber-400 to-yellow-500' : 'from-gray-400 to-gray-500'
            }`}>
              {isWin ? <Trophy className="h-12 w-12 text-white" /> : <Target className="h-12 w-12 text-white" />}
            </div>
            <h1 className={`text-3xl font-extrabold ${isWin ? 'text-amber-500' : 'text-gray-500'}`}>
              {tournamentParams?.spectator ? 'Match Selesai' : isWin ? 'Kamu Menang!' : 'Kamu Kalah'}
            </h1>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center"><p className="text-3xl font-extrabold">{finalMyScore}</p><p className="text-sm text-gray-500">Skormu</p></div>
              <div className="text-2xl font-bold text-gray-300">:</div>
              <div className="text-center"><p className="text-3xl font-extrabold">{finalOpponentScore}</p><p className="text-sm text-gray-500">{opponentName}</p></div>
            </div>
            {myResult && (
              <p className="text-sm text-gray-500">{myResult.correct} benar · {myResult.wrong} salah</p>
            )}
            {!tournamentParams?.spectator && (
              <p className="text-sm font-semibold text-indigo-600">+{gameResult.xp_earned} XP</p>
            )}
            <ShareButton
              title="Math Battle - EduPlay"
              text={`Aku ${isWin ? 'menang' : 'kalah'} di Math Battle! Skor: ${finalMyScore} vs ${finalOpponentScore}. Main yuk!`}
            />
            <div className="flex gap-3">
              <button onClick={() => router.refresh()} className="flex-1 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white">Main Lagi</button>
              <button
                onClick={() => router.push(tournamentParams ? '/games/math-tournament' : '/games')}
                className="flex-1 rounded-xl border-2 border-gray-200 px-6 py-3 font-semibold text-gray-700"
              >
                {tournamentParams ? 'Bracket' : 'Kembali'}
              </button>
            </div>
          </div>
        </GameContainer>
      </>
    )
  }

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="w-full space-y-6 pt-8">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500"><ArrowLeft className="h-4 w-4" /> Batal</button>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            {connected ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-red-500" />}
            {connected ? 'Terhubung' : 'Putus'}
          </div>
        </div>

        {gameState === 'waiting' && (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-lg font-semibold">Mencari lawan...</p>
            <p className="mt-2 text-sm text-gray-500">{timer} detik</p>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="py-12 text-center">
            <p className="text-8xl font-extrabold text-indigo-600">{countdown}</p>
            <p className="mt-2 text-lg font-semibold text-gray-500">Bersiaplah!</p>
          </div>
        )}

        {!connected && gameState === 'playing' && (
          <div className="rounded-xl bg-amber-50 p-4 text-center text-sm font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Koneksi terputus. Mencoba reconnect...
          </div>
        )}

        {opponentDisconnected && gameState === 'playing' && (
          <div className="rounded-xl bg-gray-50 p-3 text-center text-sm text-gray-500 dark:bg-slate-800">
            Lawan terputus — menunggu reconnect (30 detik)
          </div>
        )}

        {gameState === 'playing' && (
          <>
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-4 dark:from-indigo-950 dark:to-purple-950">
              <div className="text-center">
                <p className="text-sm text-gray-500">KAMU</p>
                <p className="text-2xl font-extrabold text-indigo-600">{myScore}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-400">VS</p>
                <p className="text-xs text-gray-500">{opponentName}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">{opponentName}</p>
                <p className="text-2xl font-extrabold text-purple-600">{opponentScore}</p>
              </div>
            </div>

            {currentQ && (
              <div className="space-y-4">
                {isSuddenDeath && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    Sudden death: jawaban benar pertama menang.
                  </div>
                )}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="mb-1 text-xs text-gray-400">Soal {currentQ.question_number}/{currentQ.total}</p>
                  <h3 className="text-center text-xl font-bold text-gray-900 dark:text-white">{currentQ.text}</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {currentQ.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={!!lastResult || tournamentParams?.spectator}
                      className="rounded-xl border-2 border-gray-200 bg-white p-4 text-center text-lg font-bold transition-all hover:border-indigo-500 active:scale-95 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {lastResult && (
                  <div className={`rounded-xl p-4 text-center text-sm font-semibold ${
                    lastResult.is_correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {lastResult.is_correct ? `Benar! +${lastResult.score_delta} pts` : `Salah ${lastResult.score_delta} pts`}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </GameContainer>
  )
}

function mapTournamentWinner(winnerId: string, params: TournamentMatchParams) {
  if (winnerId === params.player1UserId) return params.player1Id
  if (winnerId === params.player2UserId) return params.player2Id
  if (winnerId.startsWith('bot_')) {
    if (!params.player1UserId) return params.player1Id
    if (!params.player2UserId) return params.player2Id
  }
  return ''
}

function tournamentPlayerScore(result: GameOverResult, userId: string) {
  if (userId) return result.results.find((item) => item.player_id === userId)?.score ?? 0
  return result.results.find((item) => item.player_id.startsWith('bot_'))?.score ?? 0
}
