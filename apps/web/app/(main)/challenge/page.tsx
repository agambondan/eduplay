'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api/client'
import { GameContainer } from '@/components/ui/GameContainer'
import { ArrowLeft, Trophy, Share2, Loader2, Target, Check, X } from 'lucide-react'

interface ChallengeData {
  id: string
  challenger_name: string
  opponent_name?: string
  game_name: string
  game_slug: string
  difficulty: string
  challenger_score: number
  opponent_score?: number | null
  status: string
  expires_at: string
  share_link: string
}

export default function ChallengePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const link = searchParams.get('link')
  const gameSlug = searchParams.get('game')
  const score = searchParams.get('score')
  const difficulty = searchParams.get('difficulty')

  const [result, setResult] = useState<{ result: string; xp_earned: number; user_score: number; target_score: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: challenge, refetch } = useQuery({
    queryKey: ['score-challenge', link],
    queryFn: async () => {
      const res = await api.get(`/score-challenges/${link}`)
      return res.data.data as ChallengeData
    },
    enabled: !!link,
  })

  const acceptMutation = useMutation({
    mutationFn: () => api.post(`/score-challenges/${link}/accept`),
    onSuccess: () => refetch(),
  })

  useEffect(() => {
    if (gameSlug && score && difficulty && link) {
      acceptMutation.mutate()
    }
  }, [gameSlug, score, difficulty, link])

  const handleSubmitScore = async (userScore: number) => {
    setSubmitting(true)
    try {
      const res = await api.post(`/score-challenges/${link}/submit`, { score: userScore })
      setResult(res.data.data)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal')
    }
    setSubmitting(false)
  }

  if (!link) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4 text-center">
          <Target className="mx-auto h-16 w-16 text-indigo-500" />
          <h1 className="text-2xl font-bold">Score Challenge</h1>
          <p className="text-gray-500">Tantang teman untuk kalahkan skor game-mu!</p>
        </div>
      </GameContainer>
    )
  }

  if (result) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 pt-4 text-center">
          <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
            result.result === 'win' ? 'bg-green-100' : result.result === 'lose' ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {result.result === 'win' ? <Trophy className="h-12 w-12 text-green-600" /> :
             result.result === 'lose' ? <X className="h-12 w-12 text-red-600" /> :
             <Check className="h-12 w-12 text-yellow-600" />}
          </div>
          <h1 className="text-3xl font-extrabold">
            {result.result === 'win' ? 'Kamu Menang!' : result.result === 'lose' ? 'Kamu Kalah' : 'Seri!'}
          </h1>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.user_score}</p>
              <p className="text-xs text-gray-500">Skormu</p>
            </div>
            <div className="text-2xl font-bold text-gray-300">:</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{result.target_score}</p>
              <p className="text-xs text-gray-500">Target</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-indigo-600">+{result.xp_earned} XP</p>
          <button onClick={() => router.push('/games')} className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white">Kembali</button>
        </div>
      </GameContainer>
    )
  }

  if (!challenge) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      </GameContainer>
    )
  }

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 pt-4 text-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500"><ArrowLeft className="h-4 w-4" /> Kembali</button>
        <Trophy className="mx-auto h-16 w-16 text-amber-400" />
        <h1 className="text-2xl font-bold">Score Challenge!</h1>
        <p className="text-gray-600">
          <span className="font-bold">{challenge.challenger_name}</span> menantangmu di{' '}
          <span className="font-bold">{challenge.game_name}</span>!
        </p>
        <div className="rounded-2xl border bg-white p-6 dark:bg-slate-800">
          <p className="text-sm text-gray-500">Skor yang harus dikalahkan</p>
          <p className="text-5xl font-extrabold text-indigo-600">{challenge.challenger_score}</p>
          <p className="mt-1 text-xs text-gray-400">Difficulty: {challenge.difficulty}</p>
        </div>
        <p className="text-xs text-gray-400">Kadaluarsa: {new Date(challenge.expires_at).toLocaleDateString('id-ID')}</p>
      </div>
    </GameContainer>
  )
}
