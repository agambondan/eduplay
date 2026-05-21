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

export default function SudokuRacePage() {
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
      {screen === 'playing' && matchInfo && <RaceScreen token={token!} roomID={matchInfo.room_id} onResult={() => setScreen('result')} />}
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
    mutationFn: () => multiplayerApi.quickMatchBot('sudoku', 'medium'),
    onSuccess: (result) => onStart(result),
  })

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-12 text-center">
        <h1 className="text-3xl font-bold">Sudoku Race</h1>
        <p className="text-gray-500">Selesaikan puzzle Sudoku yang sama. Siapa lebih cepat = menang!</p>
        <button onClick={() => botMutation.mutate()} disabled={botMutation.isPending}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-4 font-semibold text-white shadow-lg disabled:opacity-50">
          {botMutation.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Cari Lawan / Vs Bot'}
        </button>
      </div>
    </GameContainer>
  )
}

function RaceScreen({ token, roomID, onResult }: { token: string; roomID: string; onResult: () => void }) {
  const [puzzle, setPuzzle] = useState<number[][] | null>(null)
  const [userGrid, setUserGrid] = useState<number[][]>([])
  const [opponentProgress, setOpponentProgress] = useState(0)
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [message, setMessage] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '').replace('http', 'ws')
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/game/${roomID}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => ws.send(JSON.stringify({ type: 'join_room', payload: { room_id: roomID, token } }))

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'sudoku_start') {
          const p = msg.payload.puzzle as number[][]
          setPuzzle(p)
          setUserGrid(p.map((row) => [...row]))
        }
        if (msg.type === 'sudoku_cell_ok') {
          const newGrid = userGrid.map((row) => [...row])
          newGrid[msg.payload.row][msg.payload.col] = msg.payload.value
          setUserGrid(newGrid)
        }
        if (msg.type === 'sudoku_error') {
          setMessage(msg.payload.message)
        }
        if (msg.type === 'opponent_progress') {
          setOpponentProgress(msg.payload.progress)
        }
        if (msg.type === 'game_over') {
          setGameOver(true)
          onResult()
        }
      } catch {}
    }
    return () => ws.close()
  }, [token, roomID])

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || !puzzle || puzzle[r][c] !== 0) return
    setSelected([r, c])
  }

  const handleNumber = (n: number) => {
    if (!selected || gameOver) return
    const [r, c] = selected
    wsRef.current?.send(JSON.stringify({
      type: 'submit_sudoku_cell',
      payload: { room_id: roomID, row: r, col: c, value: n },
    }))
    setSelected(null)
  }

  if (!puzzle) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </GameContainer>
    )
  }

  return (
    <GameContainer maxWidth="max-w-xl">
      <div className="w-full space-y-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-center"><p className="font-bold">Progressmu</p></div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${userGrid.flat().filter((v) => v > 0).length / 81 * 100}%` }} /></div>
          </div>
          <div className="text-center">
            <p className="font-bold">Lawan</p>
            <div className="h-2 w-24 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${opponentProgress}%` }} /></div>
            <p className="text-xs">{opponentProgress}%</p>
          </div>
        </div>

        {message && <div className="rounded-xl bg-red-50 p-2 text-center text-sm text-red-700">{message}</div>}

        <div className="mx-auto grid w-fit grid-cols-9 gap-0 border-2 border-gray-800">
          {userGrid.map((row, r) =>
            row.map((cell, c) => {
              const isGiven = puzzle[r][c] !== 0
              const isSel = selected && selected[0] === r && selected[1] === c
              return (
                <button key={`${r}-${c}`} onClick={() => handleCellClick(r, c)}
                  className={`flex h-10 w-10 items-center justify-center text-sm font-bold
                    ${isGiven ? 'text-gray-900 dark:text-white' : 'text-indigo-600'}
                    ${isSel ? 'bg-indigo-200 dark:bg-indigo-800' : ''}
                    ${!isGiven && !isSel ? 'hover:bg-gray-100 dark:hover:bg-slate-700' : ''}
                    ${c % 3 === 2 && c < 8 ? 'border-r-2 border-r-gray-800' : 'border-r border-r-gray-300'}
                    ${r % 3 === 2 && r < 8 ? 'border-b-2 border-b-gray-800' : 'border-b border-b-gray-300'}
                    dark:border-slate-600`}>
                  {cell > 0 ? cell : ''}
                </button>
              )
            })
          )}
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => handleNumber(n)} disabled={gameOver}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-lg font-bold hover:bg-indigo-200 disabled:opacity-50 dark:bg-indigo-900">
              {n}
            </button>
          ))}
        </div>
      </div>
    </GameContainer>
  )
}
