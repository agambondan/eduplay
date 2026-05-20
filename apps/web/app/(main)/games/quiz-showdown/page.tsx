'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { GameContainer } from '@/components/ui/GameContainer'
import { ArrowLeft, Copy, Check, Users, Play, LogOut, UserPlus, Loader2, Trophy } from 'lucide-react'
import { ShareButton } from '@/components/ui/ShareButton'

type Screen = 'menu' | 'create' | 'join' | 'lobby' | 'playing' | 'result'

export default function QuizShowdownPage() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [roomCode, setRoomCode] = useState('')
  const [roomInfo, setRoomInfo] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState({ questions: 20, category: 'mix', timer: 10, max_players: 4, allow_bots: true })
  const router = useRouter()
  const token = useAuthStore((s) => s.accessToken)

  const createMutation = useMutation({
    mutationFn: () => api.post('/rooms', { game_slug: 'quiz-showdown', settings }),
    onSuccess: (res) => {
      setRoomInfo(res.data.data)
      setRoomCode(res.data.data.room_code)
      setScreen('lobby')
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal buat room'),
  })

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/rooms/${roomCode}/join`),
    onSuccess: (res) => {
      setRoomInfo(res.data.data)
      setScreen('lobby')
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal join room'),
  })

  const refreshLobby = async () => {
    if (!roomCode) return
    try {
      const res = await api.get(`/rooms/${roomCode}`)
      setRoomInfo(res.data.data)
    } catch {}
  }

  const leaveMutation = useMutation({
    mutationFn: () => api.delete(`/rooms/${roomCode}/leave`),
    onSuccess: () => { setRoomCode(''); setRoomInfo(null); setScreen('menu') },
  })

  const startMutation = useMutation({
    mutationFn: () => api.post(`/rooms/${roomCode}/start`),
    onSuccess: () => {
      const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '').replace('http', 'ws')
      const ws = new WebSocket(`${wsUrl}/api/v1/ws/game/quiz_showdown:${roomCode}?token=${token}`)
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join_room', payload: { room_id: `quiz_showdown:${roomCode}`, token } }))
      }
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'game_starting') setScreen('playing')
          if (msg.type === 'game_over') setScreen('result')
        } catch {}
      }
      setScreen('playing')
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Gagal mulai game'),
  })

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            <p className="mt-2 text-sm text-gray-500">Real-time quiz battle 2-4 player. Buat room, ajak teman, buktikan kamu yang terpintar!</p>
          </div>
          {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="font-semibold text-sm">Pengaturan Room</h3>

            <div>
              <label className="text-xs text-gray-500">Jumlah Soal</label>
              <div className="mt-1 flex gap-2">
                {[10, 20, 30].map((n) => (
                  <button key={n} onClick={() => setSettings({ ...settings, questions: n })}
                    className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold ${settings.questions === n ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{n}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Kategori</label>
              <div className="mt-1 flex gap-2">
                {[
                  { key: 'mix', label: 'Campuran' },
                  { key: 'math', label: 'Math' },
                  { key: 'language', label: 'Bahasa' },
                  { key: 'geography', label: 'Geo' },
                ].map((c) => (
                  <button key={c.key} onClick={() => setSettings({ ...settings, category: c.key })}
                    className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold ${settings.category === c.key ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{c.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Timer Per Soal</label>
              <div className="mt-1 flex gap-2">
                {[5, 10, 15].map((t) => (
                  <button key={t} onClick={() => setSettings({ ...settings, timer: t })}
                    className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold ${settings.timer === t ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{t} dtk</button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">Max Player</label>
              <div className="flex gap-2">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => setSettings({ ...settings, max_players: n })}
                    className={`w-10 h-10 rounded-lg border-2 text-sm font-bold ${settings.max_players === n ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600'}`}>{n}</button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Isi bot jika kurang player</span>
              <input type="checkbox" checked={settings.allow_bots} onChange={(e) => setSettings({ ...settings, allow_bots: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
            </label>
          </div>

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
          {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="Kode 6 digit (cth: ABC123)" className="w-full rounded-xl border p-4 text-center text-2xl font-bold tracking-[0.5em] uppercase focus:border-pink-500 focus:outline-none dark:bg-slate-800" maxLength={6} />
          <button onClick={() => joinMutation.mutate()} disabled={roomCode.length !== 6 || joinMutation.isPending} className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 font-semibold text-white shadow-lg disabled:opacity-50">
            {joinMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
            Masuk Room
          </button>
        </div>
      </GameContainer>
    )
  }

  if (screen === 'lobby' && roomInfo) {
    const isHost = roomInfo.host_id === 'me'
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <button onClick={() => leaveMutation.mutate()} className="flex items-center gap-2 text-sm text-gray-500"><LogOut className="h-4 w-4" /> Keluar</button>
            <button onClick={() => refreshLobby()} className="text-xs text-gray-400">Refresh</button>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Kode Room</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="text-4xl font-extrabold tracking-[0.3em] text-pink-600">{roomInfo.room_code}</span>
              <button onClick={copyCode} className="rounded-lg bg-gray-100 p-2 dark:bg-slate-700">
                {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">Bagikan kode ini ke temanmu!</p>
          </div>
          <div className="rounded-2xl border p-4">
            <h3 className="mb-3 text-sm font-semibold">Player ({roomInfo.members?.length || 0}/4)</h3>
            <div className="space-y-2">
              {roomInfo.members?.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-xs font-bold text-white">
                      {m.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{m.username}{m.is_host ? ' (Host)' : ''}</p>
                      <p className="text-xs text-gray-400">Level {m.level}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isHost && (
            <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending || (roomInfo.members?.length || 0) < 2} className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 font-semibold text-white shadow-lg disabled:opacity-50">
              {startMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              Mulai Game
            </button>
          )}
          {!isHost && <p className="text-center text-sm text-gray-400">Menunggu host memulai game...</p>}
        </div>
      </GameContainer>
    )
  }

  if (screen === 'result') {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Game Selesai!</h1>
          <p className="text-gray-500">Cek hasil di halaman leaderboard multiplayer</p>
          <ShareButton
            title="Quiz Showdown - EduPlay"
            text="Aku baru saja selesai main Quiz Showdown di EduPlay! Seru banget 🤩 Main yuk!"
          />
          <div className="flex gap-3">
            <button onClick={() => router.refresh()} className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-3 font-semibold text-white shadow-lg">Main Lagi</button>
            <button onClick={() => router.push('/games')} className="flex-1 rounded-xl border-2 px-6 py-3 font-semibold text-gray-700">Kembali</button>
          </div>
        </div>
      </GameContainer>
    )
  }

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-pink-500" /></div>
    </GameContainer>
  )
}
