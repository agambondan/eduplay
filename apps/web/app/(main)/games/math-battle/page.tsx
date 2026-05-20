'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { multiplayerApi } from '@/lib/api/multiplayer'
import { useAuthStore } from '@/lib/stores/authStore'
import { GameContainer } from '@/components/ui/GameContainer'
import { ArrowLeft, Zap, Loader2, Wifi, WifiOff, Trophy, Target } from 'lucide-react'
import { QuickMatchResult, RealtimeQuestion, AnswerResult, GameOverResult } from '@/types/multiplayer'

type Screen = 'menu' | 'searching' | 'playing' | 'result'

export default function MathBattlePage() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [matchInfo, setMatchInfo] = useState<QuickMatchResult | null>(null)
  const router = useRouter()

  return (
    <>
      <button onClick={() => router.push('/games')} className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      {screen === 'menu' && <MenuScreen onStart={(result) => { setMatchInfo(result); setScreen('searching') }} />}
      {screen === 'searching' && matchInfo && <SearchingScreen matchInfo={matchInfo} onGameStart={() => setScreen('playing')} onBack={() => setScreen('menu')} />}
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
    mutationFn: () => multiplayerApi.quickMatchBot('math-battle', difficulty),
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
            onClick={() => botMutation.mutate()}
            disabled={botMutation.isPending}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 px-6 py-4 font-semibold text-gray-700 transition-all hover:border-indigo-300 dark:border-slate-600 dark:text-slate-300"
          >
            {botMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Target className="h-5 w-5" />}
            Lawan Bot ({difficulty === 'easy' ? 'Mudah' : difficulty === 'medium' ? 'Sedang' : 'Sulit'})
          </button>
        </div>
      </div>
    </GameContainer>
  )
}

function SearchingScreen({ matchInfo, onGameStart, onBack }: { matchInfo: QuickMatchResult; onGameStart: () => void; onBack: () => void }) {
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
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
  const token = useAuthStore((s) => s.accessToken)
  const userId = useAuthStore((s) => s.user?.id)
  const router = useRouter()

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
      if (gameState !== 'finished') {
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
  }, [token, matchInfo.room_id, gameState])

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

  const handleWSMessage = useCallback((msg: { type: string; payload: any }) => {
    switch (msg.type) {
      case 'room_joined':
        if (msg.payload.players?.length > 0) {
          const other = msg.payload.players.find((p: any) => p.id !== 'me')
          if (other) setOpponentName(other.username)
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
        break
      case 'answer_result':
        setLastResult(msg.payload)
        if (msg.payload.player_id === userId) {
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
      case 'game_over':
        setGameState('finished')
        setGameResult(msg.payload)
        break
    }
  }, [])

  const handleAnswer = (answer: string) => {
    if (!currentQ || gameState !== 'playing') return
    wsRef.current?.send(JSON.stringify({
      type: 'submit_answer',
      payload: {
        room_id: matchInfo.room_id,
        question_id: currentQ.id,
        answer,
        time_taken_ms: 0,
      },
    }))
  }

  if (gameResult) {
    const myResult = gameResult.results?.find((r) => r.player_id === userId)
    const isWin = myResult?.is_winner ?? false

    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-8 text-center">
          <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${
            isWin ? 'from-amber-400 to-yellow-500' : 'from-gray-400 to-gray-500'
          }`}>
            {isWin ? <Trophy className="h-12 w-12 text-white" /> : <Target className="h-12 w-12 text-white" />}
          </div>
          <h1 className={`text-3xl font-extrabold ${isWin ? 'text-amber-500' : 'text-gray-500'}`}>
            {isWin ? 'Kamu Menang!' : 'Kamu Kalah'}
          </h1>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center"><p className="text-3xl font-extrabold">{myScore}</p><p className="text-sm text-gray-500">Skormu</p></div>
            <div className="text-2xl font-bold text-gray-300">:</div>
            <div className="text-center"><p className="text-3xl font-extrabold">{opponentScore}</p><p className="text-sm text-gray-500">{opponentName}</p></div>
          </div>
          {myResult && (
            <p className="text-sm text-gray-500">{myResult.correct} benar · {myResult.wrong} salah</p>
          )}
          <p className="text-sm font-semibold text-indigo-600">+{gameResult.xp_earned} XP</p>
          <div className="flex gap-3">
            <button onClick={() => router.refresh()} className="flex-1 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white">Main Lagi</button>
            <button onClick={() => router.push('/games')} className="flex-1 rounded-xl border-2 border-gray-200 px-6 py-3 font-semibold text-gray-700">Kembali</button>
          </div>
        </div>
      </GameContainer>
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
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="mb-1 text-xs text-gray-400">Soal {currentQ.question_number}/{currentQ.total}</p>
                  <h3 className="text-center text-xl font-bold text-gray-900 dark:text-white">{currentQ.text}</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {currentQ.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={!!lastResult}
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
