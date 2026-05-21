'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { roomsApi } from '@/lib/api/multiplayer'
import { useAuthStore } from '@/lib/stores/authStore'
import { GameContainer } from '@/components/ui/GameContainer'
import { ArrowLeft, Check, Copy, Loader2, LogOut, Play, Save, Trophy, UserPlus, Users } from 'lucide-react'
import { ShareButton } from '@/components/ui/ShareButton'
import { AnswerResult, GameOverResult, RealtimeQuestion, RoomMember, RoomResponse, RoomSettings } from '@/types/multiplayer'

type Screen = 'menu' | 'join' | 'lobby' | 'playing' | 'result'
type RealtimePlayer = { id: string; username: string; level: number; score?: number }

const defaultSettings: RoomSettings = {
  questions: 20,
  category: 'mix',
  difficulty: 'medium',
  timer: 10,
  max_players: 4,
  allow_bots: true,
}

export default function QuizShowdownPage() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [roomCode, setRoomCode] = useState('')
  const [roomInfo, setRoomInfo] = useState<RoomResponse | null>(null)
  const [settings, setSettings] = useState<RoomSettings>(defaultSettings)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [currentQ, setCurrentQ] = useState<RealtimeQuestion | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null)
  const [gameResult, setGameResult] = useState<GameOverResult | null>(null)
  const router = useRouter()
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const wsRef = useRef<WebSocket | null>(null)
  const questionStartedAt = useRef(0)

  const syncRealtimePlayers = useCallback((players?: RealtimePlayer[]) => {
    if (!players?.length) return

    setRoomInfo((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        members: players.map((player) => ({
          id: player.id,
          username: player.username,
          level: player.level,
          is_host: player.id === prev.host_id,
        })),
      }
    })
    setScores((prev) => {
      const next = { ...prev }
      players.forEach((player) => {
        next[player.id] = player.score ?? next[player.id] ?? 0
      })
      return next
    })
  }, [])

  const upsertRealtimeMember = useCallback((member: RoomMember, score = 0) => {
    setRoomInfo((prev) => {
      if (!prev) return prev
      const exists = prev.members.some((item) => item.id === member.id)
      return {
        ...prev,
        members: exists
          ? prev.members.map((item) => item.id === member.id ? { ...item, ...member } : item)
          : [...prev.members, member],
      }
    })
    setScores((prev) => ({ ...prev, [member.id]: prev[member.id] ?? score }))
  }, [])

  const connectGame = useCallback((code: string) => {
    if (!token || wsRef.current) return
    const roomID = `quiz_showdown:${code}`
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '').replace('http', 'ws')
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/game/${roomID}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ type: 'join_room', payload: { room_id: roomID, token } }))
    }
    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'room_joined') {
          syncRealtimePlayers(msg.payload?.players)
        }
        if (msg.type === 'room_state') {
          syncRealtimePlayers(msg.payload?.players)
          if (msg.payload?.state === 'playing' && msg.payload?.current_question) {
            setScreen('playing')
            setCurrentQ(msg.payload.current_question)
            setLastResult(null)
            questionStartedAt.current = Date.now()
          }
        }
        if (msg.type === 'player_joined') {
          upsertRealtimeMember({
            id: msg.payload.id,
            username: msg.payload.username,
            level: msg.payload.level ?? 1,
            is_host: false,
          })
        }
        if (msg.type === 'bot_joined') {
          upsertRealtimeMember({
            id: msg.payload.id,
            username: msg.payload.username,
            level: 1,
            is_host: false,
          })
        }
        if (msg.type === 'game_starting') {
          setScreen('playing')
        }
        if (msg.type === 'question') {
          setScreen('playing')
          setCurrentQ(msg.payload)
          setLastResult(null)
          questionStartedAt.current = Date.now()
        }
        if (msg.type === 'answer_result') {
          const payload = msg.payload as AnswerResult
          setScores((prev) => ({ ...prev, [payload.player_id]: payload.new_score }))
          if (payload.player_id === user?.id) {
            setLastResult(payload)
          }
        }
        if (msg.type === 'opponent_progress') {
          setScores((prev) => ({ ...prev, [msg.payload.player_id]: msg.payload.current_score }))
        }
        if (msg.type === 'game_over') {
          setGameResult(msg.payload)
          setScreen('result')
        }
      } catch {}
    }
    setScreen('playing')
  }, [syncRealtimePlayers, token, upsertRealtimeMember, user?.id])

  const createMutation = useMutation({
    mutationFn: () => roomsApi.create('quiz-showdown', settings),
    onSuccess: (room) => {
      setRoomInfo(room)
      setRoomCode(room.room_code)
      setSettings(room.settings)
      setError('')
      setScreen('lobby')
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal buat room'),
  })

  const joinMutation = useMutation({
    mutationFn: () => roomsApi.join(roomCode),
    onSuccess: (room) => {
      setRoomInfo(room)
      setSettings(room.settings)
      setError('')
      setScreen('lobby')
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal join room'),
  })

  const updateMutation = useMutation({
    mutationFn: () => roomsApi.updateSettings(roomCode, settings),
    onSuccess: (room) => {
      setRoomInfo(room)
      setSettings(room.settings)
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal menyimpan pengaturan'),
  })

  const leaveMutation = useMutation({
    mutationFn: () => roomsApi.leave(roomCode),
    onSuccess: () => {
      setRoomCode('')
      setRoomInfo(null)
      setError('')
      setScreen('menu')
    },
  })

  const startMutation = useMutation({
    mutationFn: () => roomsApi.start(roomCode),
    onSuccess: async () => {
      const room = await roomsApi.get(roomCode)
      setRoomInfo(room)
      connectGame(room.room_code)
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal mulai game'),
  })

  const refreshLobby = useCallback(async () => {
    if (!roomCode) return
    try {
      const room = await roomsApi.get(roomCode)
      setRoomInfo(room)
      setSettings(room.settings)
      if (room.status === 'playing') {
        connectGame(room.room_code)
      }
    } catch {}
  }, [connectGame, roomCode])

  useEffect(() => {
    if (screen !== 'lobby') return
    const timer = setInterval(refreshLobby, 2000)
    return () => clearInterval(timer)
  }, [refreshLobby, screen])

  useEffect(() => {
    return () => wsRef.current?.close()
  }, [])

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAnswer = (answer: string) => {
    if (!currentQ || lastResult) return
    const elapsedMs = Math.max(200, questionStartedAt.current ? Date.now() - questionStartedAt.current : 200)
    wsRef.current?.send(JSON.stringify({
      type: 'submit_answer',
      payload: {
        room_id: `quiz_showdown:${roomCode}`,
        question_id: currentQ.id,
        answer,
        time_taken_ms: elapsedMs,
      },
    }))
  }

  if (screen === 'menu') {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4">
          <button onClick={() => router.push('/games')} className="flex items-center gap-2 text-sm text-gray-500"><ArrowLeft className="h-4 w-4" /> Kembali</button>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
              <Users className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Quiz Showdown</h1>
            <p className="mt-2 text-sm text-gray-500">Real-time quiz battle 2-4 player dengan room yang bisa disesuaikan.</p>
          </div>
          {error && <ErrorBox message={error} />}
          <SettingsPanel settings={settings} onChange={setSettings} />
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 font-semibold text-white shadow-lg hover:scale-[1.02] disabled:opacity-50">
            {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Buat Room
          </button>
          <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 dark:bg-gray-950">atau</span></div></div>
          <button onClick={() => setScreen('join')} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 px-6 py-4 font-semibold text-gray-700 hover:border-pink-300">
            <Users className="h-5 w-5" /> Masuk Room dengan Kode
          </button>
        </div>
      </GameContainer>
    )
  }

  if (screen === 'join') {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4">
          <button onClick={() => setScreen('menu')} className="flex items-center gap-2 text-sm text-gray-500"><ArrowLeft className="h-4 w-4" /> Kembali</button>
          <h2 className="text-xl font-bold">Masuk Room</h2>
          {error && <ErrorBox message={error} />}
          <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="ABC123" className="w-full rounded-xl border p-4 text-center text-2xl font-bold uppercase tracking-[0.35em] focus:border-pink-500 focus:outline-none dark:bg-slate-800" maxLength={6} />
          <button onClick={() => joinMutation.mutate()} disabled={roomCode.length !== 6 || joinMutation.isPending} className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 font-semibold text-white shadow-lg disabled:opacity-50">
            {joinMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
            Masuk Room
          </button>
        </div>
      </GameContainer>
    )
  }

  if (screen === 'lobby' && roomInfo) {
    const isHost = roomInfo.host_id === user?.id
    const canStart = Boolean(isHost && (roomInfo.settings.allow_bots || roomInfo.members.length >= 2))
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <button onClick={() => leaveMutation.mutate()} className="flex items-center gap-2 text-sm text-gray-500"><LogOut className="h-4 w-4" /> Keluar</button>
            <button onClick={refreshLobby} className="text-xs text-gray-400">Refresh</button>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Kode Room</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="text-4xl font-extrabold tracking-[0.25em] text-pink-600">{roomInfo.room_code}</span>
              <button onClick={copyCode} className="rounded-lg bg-gray-100 p-2 dark:bg-slate-700">
                {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {isHost ? (
            <>
              <SettingsPanel settings={settings} onChange={setSettings} compact />
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-pink-200 px-4 py-3 text-sm font-semibold text-pink-700 disabled:opacity-50">
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Pengaturan
              </button>
            </>
          ) : (
            <RoomSettingsSummary settings={roomInfo.settings} />
          )}

          <PlayerList members={roomInfo.members} maxPlayers={roomInfo.settings.max_players} />
          {error && <ErrorBox message={error} />}

          {isHost && (
            <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending || !canStart} className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 font-semibold text-white shadow-lg disabled:opacity-50">
              {startMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              Mulai Game
            </button>
          )}
          {!isHost && <p className="text-center text-sm text-gray-400">Menunggu host memulai game...</p>}
        </div>
      </GameContainer>
    )
  }

  if (screen === 'playing') {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{connected ? 'Terhubung' : 'Menyambungkan...'}</span>
            <span>{roomCode}</span>
          </div>
          <ScoreStrip members={roomInfo?.members || []} scores={scores} userID={user?.id} />
          {!currentQ && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-pink-500" /></div>}
          {currentQ && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-1 text-xs text-gray-400">Soal {currentQ.question_number}/{currentQ.total}</p>
                <h3 className="text-center text-xl font-bold text-gray-900 dark:text-white">{currentQ.text}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {currentQ.options.map((opt) => (
                  <button key={opt} onClick={() => handleAnswer(opt)} disabled={!!lastResult}
                    className="rounded-xl border-2 border-gray-200 bg-white p-4 text-center text-lg font-bold transition-all hover:border-pink-500 active:scale-95 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800">
                    {opt}
                  </button>
                ))}
              </div>
              {lastResult && <div className={`rounded-xl p-4 text-center text-sm font-semibold ${lastResult.is_correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {lastResult.is_correct ? `Benar! +${lastResult.score_delta} pts` : `Salah ${lastResult.score_delta} pts`}
              </div>}
            </div>
          )}
        </div>
      </GameContainer>
    )
  }

  if (screen === 'result') {
    const myResult = gameResult?.results?.find((r) => r.player_id === user?.id)
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{myResult?.is_winner ? 'Kamu Menang!' : 'Game Selesai!'}</h1>
          {myResult && <p className="text-gray-500">Skor akhir: {myResult.score} poin</p>}
          <ShareButton title="Quiz Showdown - EduPlay" text={`Aku baru saja main Quiz Showdown di EduPlay dengan skor ${myResult?.score ?? 0}. Main yuk!`} />
          <div className="flex gap-3">
            <button onClick={() => router.refresh()} className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-3 font-semibold text-white shadow-lg">Main Lagi</button>
            <button onClick={() => router.push('/games')} className="flex-1 rounded-xl border-2 px-6 py-3 font-semibold text-gray-700">Kembali</button>
          </div>
        </div>
      </GameContainer>
    )
  }

  return null
}

function SettingsPanel({ settings, onChange, compact = false }: { settings: RoomSettings; onChange: (settings: RoomSettings) => void; compact?: boolean }) {
  return (
    <div className={`space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 ${compact ? 'text-sm' : ''}`}>
      <h3 className="text-sm font-semibold">Pengaturan Room</h3>
      <Segment label="Jumlah Soal" options={[10, 20, 30].map((n) => ({ key: String(n), label: String(n), value: n }))} value={settings.questions} onChange={(questions) => onChange({ ...settings, questions })} />
      <Segment label="Kategori" options={[
        { key: 'mix', label: 'Campuran', value: 'mix' },
        { key: 'math', label: 'Math', value: 'math' },
        { key: 'language', label: 'Bahasa', value: 'language' },
        { key: 'geography', label: 'Geo', value: 'geography' },
      ]} value={settings.category} onChange={(category) => onChange({ ...settings, category })} />
      <Segment label="Difficulty" options={[
        { key: 'easy', label: 'Mudah', value: 'easy' },
        { key: 'medium', label: 'Sedang', value: 'medium' },
        { key: 'hard', label: 'Sulit', value: 'hard' },
      ]} value={settings.difficulty} onChange={(difficulty) => onChange({ ...settings, difficulty })} />
      <Segment label="Timer Per Soal" options={[5, 10, 15, 30].map((n) => ({ key: String(n), label: `${n} dtk`, value: n }))} value={settings.timer} onChange={(timer) => onChange({ ...settings, timer })} />
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-600">Max Player</label>
        <div className="flex gap-2">
          {[2, 3, 4].map((n) => (
            <button key={n} onClick={() => onChange({ ...settings, max_players: n })}
              className={`h-10 w-10 rounded-lg border-2 text-sm font-bold ${settings.max_players === n ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{n}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Isi bot jika kurang player</span>
        <input type="checkbox" checked={settings.allow_bots} onChange={(e) => onChange({ ...settings, allow_bots: e.target.checked })}
          className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
      </label>
    </div>
  )
}

function Segment<T extends string | number>({ label, options, value, onChange }: { label: string; options: { key: string; label: string; value: T }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <div className="mt-1 flex gap-2">
        {options.map((option) => (
          <button key={option.key} onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold ${value === option.value ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600'}`}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function RoomSettingsSummary({ settings }: { settings: RoomSettings }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border p-4 text-sm">
      <span>Soal: {settings.questions}</span>
      <span>Timer: {settings.timer} dtk</span>
      <span>Mode: {difficultyLabel(settings.difficulty)}</span>
      <span>Bot: {settings.allow_bots ? 'Aktif' : 'Nonaktif'}</span>
    </div>
  )
}

function PlayerList({ members, maxPlayers }: { members: RoomMember[]; maxPlayers: number }) {
  return (
    <div className="rounded-2xl border p-4">
      <h3 className="mb-3 text-sm font-semibold">Player ({members.length}/{maxPlayers})</h3>
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-xs font-bold text-white">
                {member.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold">{member.username}{member.is_host ? ' (Host)' : ''}</p>
                <p className="text-xs text-gray-400">Level {member.level}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreStrip({ members, scores, userID }: { members: RoomMember[]; scores: Record<string, number>; userID?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {members.map((member) => (
        <div key={member.id} className={`rounded-xl p-3 text-center ${member.id === userID ? 'bg-pink-50 text-pink-700' : 'bg-gray-50 text-gray-600'}`}>
          <p className="truncate text-xs font-semibold">{member.id === userID ? 'Kamu' : member.username}</p>
          <p className="text-xl font-extrabold">{scores[member.id] ?? 0}</p>
        </div>
      ))}
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</div>
}

function difficultyLabel(value: RoomSettings['difficulty']) {
  if (value === 'easy') return 'Mudah'
  if (value === 'hard') return 'Sulit'
  return 'Sedang'
}
