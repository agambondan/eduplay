'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { multiplayerApi } from '@/lib/api/multiplayer'
import { useAuthStore } from '@/lib/stores/authStore'
import { GameContainer } from '@/components/ui/GameContainer'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { QuickMatchBotResult } from '@/types/multiplayer'

type Screen = 'menu' | 'playing' | 'result'

const ROWS = 6
const COLS = 5

export default function WordleDuelPage() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [matchInfo, setMatchInfo] = useState<QuickMatchBotResult | null>(null)
  const router = useRouter()
  const token = useAuthStore((s) => s.accessToken)

  return (
    <>
      <button onClick={() => router.push('/games')} className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>
      {screen === 'menu' && <MenuScreen onStart={(result) => { setMatchInfo(result); setScreen('playing') }} />}
      {screen === 'playing' && matchInfo && <DuelScreen token={token!} roomID={matchInfo.room_id} onResult={() => setScreen('result')} />}
      {screen === 'result' && (
        <GameContainer maxWidth="max-w-lg">
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
        </GameContainer>
      )}
    </>
  )
}

function MenuScreen({ onStart }: { onStart: (result: QuickMatchBotResult) => void }) {
  const botMutation = useMutation({
    mutationFn: () => multiplayerApi.quickMatchBot('wordle', 'medium'),
    onSuccess: (result) => onStart(result),
  })

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-12 text-center">
        <h1 className="text-3xl font-bold">Wordle Duel</h1>
        <p className="text-gray-500">Tebak kata 5 huruf yang sama. Siapa lebih cepat & sedikit percobaan = menang!</p>
        <button onClick={() => botMutation.mutate()} disabled={botMutation.isPending}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 font-semibold text-white shadow-lg disabled:opacity-50">
          {botMutation.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Cari Lawan / Vs Bot'}
        </button>
      </div>
    </GameContainer>
  )
}

function DuelScreen({ token, roomID, onResult }: { token: string; roomID: string; onResult: () => void }) {
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill('')))
  const [colors, setColors] = useState<string[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill('')))
  const [currentRow, setCurrentRow] = useState(0)
  const [currentCol, setCurrentCol] = useState(0)
  const [opponentAttempts, setOpponentAttempts] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [message, setMessage] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '').replace('http', 'ws')
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/game/${roomID}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join_room', payload: { room_id: roomID, token } }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'wordle_result') {
          const newGrid = [...grid]
          const newColors = [...colors]
          for (let i = 0; i < COLS; i++) {
            newGrid[currentRow][i] = msg.payload.word[i] || ''
            newColors[currentRow][i] = msg.payload.result[i] === 'G' ? 'bg-green-500' :
              msg.payload.result[i] === 'Y' ? 'bg-yellow-500' : 'bg-gray-500'
          }
          setGrid(newGrid)
          setColors(newColors)
          if (msg.payload.correct) {
            setGameOver(true)
            setMessage('Kamu menebak dengan benar!')
            onResult()
          } else {
            setCurrentRow(currentRow + 1)
            setCurrentCol(0)
          }
        }
        if (msg.type === 'opponent_progress') {
          setOpponentAttempts(msg.payload.attempts)
        }
        if (msg.type === 'game_over') {
          setGameOver(true)
          onResult()
        }
      } catch {}
    }
    return () => ws.close()
  }, [token, roomID])

  const handleKey = (key: string) => {
    if (gameOver || currentRow >= ROWS) return
    if (key === 'ENTER') {
      if (currentCol !== COLS) return
      wsRef.current?.send(JSON.stringify({
        type: 'submit_wordle_guess',
        payload: { room_id: roomID, word: grid[currentRow].join('') },
      }))
    } else if (key === 'BACK') {
      if (currentCol <= 0) return
      const newGrid = [...grid]
      newGrid[currentRow][currentCol - 1] = ''
      setGrid(newGrid)
      setCurrentCol(currentCol - 1)
    } else if (/^[a-zA-Z]$/.test(key) && currentCol < COLS) {
      const newGrid = [...grid]
      newGrid[currentRow][currentCol] = key.toLowerCase()
      setGrid(newGrid)
      setCurrentCol(currentCol + 1)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleKey('ENTER')
      else if (e.key === 'Backspace') handleKey('BACK')
      else handleKey(e.key.toUpperCase())
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentRow, currentCol, grid, gameOver])

  const allKeys = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('')

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="w-full space-y-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-center"><p className="font-bold text-lg text-indigo-600">Kamu</p></div>
          <div className="text-center text-gray-400">VS</div>
          <div className="text-center"><p className="text-lg text-emerald-600 font-bold">Lawan</p><p className="text-xs">Percobaan: {opponentAttempts}/6</p></div>
        </div>

        {message && <div className="rounded-xl bg-green-50 p-3 text-center text-sm font-semibold text-green-700">{message}</div>}

        <div className="mx-auto grid w-fit gap-1.5">
          {grid.map((row, ri) => (
            <div key={ri} className="flex gap-1.5">
              {row.map((cell, ci) => (
                <div key={ci} className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl font-extrabold uppercase
                  ${colors[ri][ci] || (ri === currentRow ? 'border-2 border-gray-400' : 'border border-gray-300 bg-gray-50')}
                  ${colors[ri][ci] ? 'text-white' : 'text-gray-900'}
                  dark:border-slate-600 dark:bg-slate-800`}>
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mx-auto flex max-w-md flex-wrap justify-center gap-1">
          {allKeys.map((k) => (
            <button key={k} onClick={() => handleKey(k)}
              className="flex h-10 w-9 items-center justify-center rounded-md bg-gray-200 text-sm font-bold hover:bg-gray-300 dark:bg-slate-700">
              {k}
            </button>
          ))}
          <button onClick={() => handleKey('BACK')} className="flex h-10 items-center justify-center rounded-md bg-gray-200 px-3 text-xs font-bold hover:bg-gray-300 dark:bg-slate-700">DEL</button>
          <button onClick={() => handleKey('ENTER')} className="flex h-10 items-center justify-center rounded-md bg-emerald-500 px-4 text-xs font-bold text-white hover:bg-emerald-600">ENTER</button>
        </div>
      </div>
    </GameContainer>
  )
}
