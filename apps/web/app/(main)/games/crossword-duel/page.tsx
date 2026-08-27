'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { multiplayerApi } from '@/lib/api/multiplayer'
import { useAuthStore } from '@/lib/stores/authStore'
import { GameContainer } from '@/components/ui/GameContainer'
import { ArrowLeft, Loader2, Medal, Trophy, RotateCcw, Home, Zap } from 'lucide-react'
import type { QuickMatchBotResult } from '@/types/multiplayer'

type Screen = 'menu' | 'playing' | 'result'

interface CellData {
  letter: string
  isBlack: boolean
  number?: number
}

interface ClueData {
  n: number
  d: 'across' | 'down'
  c: string
  a: string
  r: number
  col: number
}

interface PuzzleData {
  id: string
  title: string
  grid: string[][]
  gridSize: number
  clues: ClueData[]
}

interface GameOverInfo {
  winner_id: string
  xp_earned: number
}

export default function CrosswordDuelPage() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [matchInfo, setMatchInfo] = useState<QuickMatchBotResult | null>(null)
  const [gameResult, setGameResult] = useState<GameOverInfo | null>(null)
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.accessToken)
  const onGameResult = useCallback((info: GameOverInfo) => { setGameResult(info); setScreen('result') }, [])

  return (
    <>
      <button onClick={() => router.push('/games')} className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>
      {screen === 'menu' && (
        <MenuScreen onStart={(result) => { setMatchInfo(result); setScreen('playing') }} />
      )}
      {screen === 'playing' && matchInfo && (
        <DuelScreen
          token={token!}
          roomID={matchInfo.room_id}
          userID={user?.id || ''}
          onResult={onGameResult}
        />
      )}
      {screen === 'result' && gameResult && (
        <ResultScreen result={gameResult} userID={user?.id || ''} onReplay={() => setScreen('menu')} />
      )}
    </>
  )
}

function MenuScreen({ onStart }: { onStart: (result: QuickMatchBotResult) => void }) {
  const botMutation = useMutation({
    mutationFn: () => multiplayerApi.quickMatchBot('crossword', 'medium'),
    onSuccess: (result) => onStart(result),
  })

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
          <span className="text-4xl font-black text-white">T</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Crossword Duel</h1>
        <p className="text-gray-500 dark:text-slate-400">Isi TTS bersama lawan secara real-time! Siapa lebih cepat = menang!</p>
        <button onClick={() => botMutation.mutate()} disabled={botMutation.isPending}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50">
          {botMutation.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Cari Lawan / Vs Bot'}
        </button>
      </div>
    </GameContainer>
  )
}

function DuelScreen({ token, roomID, userID, onResult }: { token: string; roomID: string; userID: string; onResult: (info: GameOverInfo) => void }) {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [cells, setCells] = useState<{ letter: string; userInput: string }[][]>([])
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [direction, setDirection] = useState<'across' | 'down'>('across')
  const [gameOver, setGameOver] = useState(false)
  const resultRef = useRef<GameOverInfo | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '').replace('http', 'ws')
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/game/${roomID}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => ws.send(JSON.stringify({ type: 'join_room', payload: { room_id: roomID, token } }))

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'crossword_start') {
          const p = msg.payload as PuzzleData
          setPuzzle(p)
          setCells(p.grid.map((row) => row.map((ch) => ({ letter: ch, userInput: '' }))))
        }
        if (msg.type === 'crossword_cell') {
          setCells((prev) => {
            const next = prev.map((r) => r.map((c) => ({ ...c })))
            next[msg.payload.row][msg.payload.col].userInput = msg.payload.letter
            return next
          })
        }
        if (msg.type === 'game_over') {
          setGameOver(true)
          resultRef.current = msg.payload as GameOverInfo
          setTimeout(() => {
            if (resultRef.current) onResult(resultRef.current)
          }, 1500)
        }
      } catch {}
    }
    return () => ws.close()
  }, [token, roomID, onResult])

  const handleCellClick = useCallback((r: number, c: number) => {
    if (gameOver || !puzzle || puzzle.grid[r][c] === '#') return
    if (selected && selected[0] === r && selected[1] === c) {
      setDirection((d) => d === 'across' ? 'down' : 'across')
      return
    }
    setSelected([r, c])
    setDirection('across')
  }, [selected, puzzle, gameOver])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selected || !puzzle || gameOver) return
    const [r, c] = selected

    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      const isAcross = direction === 'across'
      let nr = r, nc = c
      if (isAcross) { nc = c + 1; if (nc >= puzzle.gridSize) { nr = r + 1; nc = 0 } }
      else { nr = r + 1; if (nr >= puzzle.gridSize) { nr = 0; nc = 0 } }
      if (nr < puzzle.gridSize && nc < puzzle.gridSize && puzzle.grid[nr][nc] !== '#') {
        setSelected([nr, nc])
      }
      return
    }

    if (e.key === 'Backspace') {
      const cell = puzzle.grid[r][c]
      if (cell === '#') return
      wsRef.current?.send(JSON.stringify({ type: 'crossword_cell', payload: { room_id: roomID, row: r, col: c, letter: '' } }))
      setCells((prev) => {
        const next = prev.map((row) => row.map((x) => ({ ...x })))
        next[r][c].userInput = ''
        return next
      })
      const isAcross = direction === 'across'
      let pr = r, pc = c
      if (isAcross) { pc = c - 1; if (pc < 0) { pr = r - 1; if (pr >= 0) pc = puzzle.gridSize - 1 } }
      else { pr = r - 1; if (pr < 0) pr = 0 }
      if (pr >= 0 && pc >= 0 && pr < puzzle.gridSize && pc < puzzle.gridSize && puzzle.grid[pr][pc] !== '#') {
        setSelected([pr, pc])
      }
      return
    }

    const letter = e.key.toUpperCase()
    if (!/^[A-Z]$/.test(letter)) return
    if (puzzle.grid[r][c] === '#') return

    wsRef.current?.send(JSON.stringify({ type: 'crossword_cell', payload: { room_id: roomID, row: r, col: c, letter } }))
    setCells((prev) => {
      const next = prev.map((row) => row.map((x) => ({ ...x })))
      next[r][c].userInput = letter
      return next
    })

    const isAcross = direction === 'across'
    let nr = r, nc = c
    if (isAcross) { nc = c + 1; if (nc >= puzzle.gridSize) { nr = r + 1; nc = 0 } }
    else { nr = r + 1; if (nr >= puzzle.gridSize) { nr = 0; nc = 0 } }
    if (nr < puzzle.gridSize && nc < puzzle.gridSize && puzzle.grid[nr][nc] !== '#') {
      setSelected([nr, nc])
    }
  }, [selected, puzzle, gameOver, direction, roomID])

  if (!puzzle) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </GameContainer>
    )
  }

  const fillCount = cells.flat().filter((c) => c.userInput !== '').length
  const totalCells = cells.flat().filter((c) => c.letter !== '#').length
  const progressPct = Math.round(fillCount / totalCells * 100)

  return (
    <GameContainer maxWidth="max-w-xl">
      <div className="w-full space-y-4 py-4" onKeyDown={handleKeyDown} tabIndex={-1}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-indigo-600">{puzzle.title}</p>
          <p className="text-xs text-gray-500">{progressPct}% selesai</p>
        </div>

        <div
          className="mx-auto grid gap-0 border-2 border-gray-800 rounded overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${puzzle.gridSize}, minmax(0, 1fr))`, maxWidth: `${puzzle.gridSize * 44}px` }}
        >
          {puzzle.grid.map((row, r) =>
            row.map((cell, c) => {
              if (cell === '#') {
                return <div key={`${r}-${c}`} className="bg-gray-900 aspect-square" />
              }
              const isSel = selected && selected[0] === r && selected[1] === c
              const num = puzzle.clues.find((cl) => cl.r === r && cl.col === c)?.n
              const input = cells[r]?.[c]?.userInput || ''
              const isCorrect = input === cell

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  aria-label={`Baris ${r + 1} kolom ${c + 1}${num ? `, petunjuk ${num}` : ''}${input ? `, terisi ${input}` : ', kosong'}`}
                  className={`relative aspect-square flex items-center justify-center text-lg font-bold outline-none transition-colors
                    ${isSel ? 'bg-yellow-300 dark:bg-yellow-600' : 'bg-white dark:bg-slate-700'}
                    ${input && !isCorrect ? 'text-red-500' : input ? 'text-blue-600 dark:text-blue-300' : 'text-transparent'}
                    border border-gray-300 dark:border-slate-600`}
                >
                  {num && <span className="absolute top-0.5 left-1 text-[9px] font-normal text-gray-500">{num}</span>}
                  {input || ''}
                </button>
              )
            })
          )}
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex-1 space-y-1">
            <p className="font-bold text-indigo-600">Mendatar</p>
            {puzzle.clues.filter((cl) => cl.d === 'across').map((cl) => (
              <p key={`a${cl.n}`} className="text-xs text-gray-600 dark:text-slate-400">
                <span className="font-bold">{cl.n}.</span> {cl.c}
              </p>
            ))}
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-bold text-emerald-600">Menurun</p>
            {puzzle.clues.filter((cl) => cl.d === 'down').map((cl) => (
              <p key={`d${cl.n}`} className="text-xs text-gray-600 dark:text-slate-400">
                <span className="font-bold">{cl.n}.</span> {cl.c}
              </p>
            ))}
          </div>
        </div>
      </div>
    </GameContainer>
  )
}

function ResultScreen({ result, userID, onReplay }: { result: GameOverInfo; userID: string; onReplay: () => void }) {
  const router = useRouter()
  const isWin = result.winner_id === userID

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 py-8 text-center">
        <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-lg ${
          isWin ? 'from-emerald-400 to-teal-500 shadow-emerald-200' : 'from-gray-300 to-gray-400 shadow-gray-200 dark:from-slate-600 dark:to-slate-700'
        }`}>
          {isWin ? <Medal className="h-12 w-12 text-white" /> : <Trophy className="h-12 w-12 text-white opacity-50" />}
        </div>
        <h1 className={`text-3xl font-extrabold ${isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
          {isWin ? 'Kamu Menang!' : 'Kamu Kalah'}
        </h1>
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 dark:from-blue-950 dark:to-cyan-950">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <Zap className="h-4 w-4" /> +{result.xp_earned || 50} XP
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onReplay}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-bold text-white shadow-lg transition-all hover:bg-blue-600">
            <RotateCcw className="h-5 w-5" /> Main Lagi
          </button>
          <button onClick={() => router.push('/games')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 font-bold text-gray-600 transition-all hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300">
            <Home className="h-5 w-5" /> Hub
          </button>
        </div>
      </div>
    </GameContainer>
  )
}
