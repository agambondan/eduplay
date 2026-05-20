'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { challengesApi } from '@/lib/api/multiplayer'
import { GameContainer } from '@/components/ui/GameContainer'
import {
  Send, Users, Trophy, Clock, ArrowLeft, Loader2, Check, X, Zap,
  Target, Medal, BarChart3, Share2,
} from 'lucide-react'

type Screen = 'menu' | 'create' | 'list' | 'play' | 'result'

const QUESTION_TIME = 10
const SCORE_PER_CORRECT = 10
const BONUS_TIME_THRESHOLD = 3
const BONUS_SCORE = 5

interface AnswerRecord {
  questionId: string
  answer: string
  timeTaken: number
  correct: boolean
  points: number
}

export default function TriviaChallengePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const challengeIdFromUrl = searchParams.get('id')

  const [screen, setScreen] = useState<Screen>(challengeIdFromUrl ? 'play' : 'menu')
  const [challengeId, setChallengeId] = useState<string | null>(challengeIdFromUrl)

  const { data: challenges, refetch: refetchChallenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => challengesApi.list(),
    refetchInterval: screen === 'list' ? 10000 : false,
  })

  const { data: challengeDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: () => challengesApi.get(challengeId!),
    enabled: !!challengeId,
    refetchInterval: screen === 'result' ? false : 3000,
  })

  if (screen === 'menu') {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6">
          <button onClick={() => router.push('/games')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trivia Challenge</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Tantang teman dengan 10 soal seru! Jawab secepat mungkin untuk skor maksimal.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setScreen('create')}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="h-5 w-5" /> Tantang Teman
            </button>
            <button
              onClick={() => setScreen('list')}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 px-6 py-4 font-semibold text-gray-700 transition-all hover:border-amber-400 hover:bg-amber-50 dark:border-slate-600 dark:text-slate-300"
            >
              <BarChart3 className="h-5 w-5" /> Riwayat Tantangan ({challenges?.length || 0})
            </button>
          </div>
        </div>
      </GameContainer>
    )
  }

  if (screen === 'create') {
    return (
      <CreateChallengeScreen
        onBack={() => setScreen('menu')}
        onCreated={(id) => { setChallengeId(id); refetchChallenges(); setScreen('list') }}
      />
    )
  }

  if (screen === 'list') {
    return (
      <ChallengeListScreen
        onBack={() => setScreen('menu')}
        onSelect={(id) => { setChallengeId(id); setScreen('play') }}
        challenges={challenges || []}
      />
    )
  }

  if (screen === 'play' && challengeDetail) {
    if (challengeDetail.result) {
      return (
        <ResultScreen
          detail={challengeDetail}
          onBack={() => { setChallengeId(null); setScreen('menu') }}
        />
      )
    }
    return (
      <PlayScreen
        detail={challengeDetail}
        onComplete={() => refetchDetail()}
        onResult={() => setScreen('result')}
      />
    )
  }

  if (screen === 'result' && challengeDetail?.result) {
    return (
      <ResultScreen
        detail={challengeDetail}
        onBack={() => { setChallengeId(null); setScreen('menu') }}
      />
    )
  }

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
    </GameContainer>
  )
}

function CreateChallengeScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => challengesApi.create({ opponent_username: username, game_slug: 'trivia-challenge', difficulty: 'medium' }),
    onSuccess: (result) => onCreated(result.id),
    onError: (err: Error) => setError(err.message),
  })

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Buat Tantangan Baru</h2>
        <p className="text-sm text-gray-500">Masukkan username teman yang ingin kamu tantang</p>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Username Lawan</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !mutation.isPending && username && mutation.mutate()}
              placeholder="Cth: budi_99"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-800 dark:focus:bg-slate-700"
            />
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={!username || mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Kirim Tantangan
          </button>
        </div>
      </div>
    </GameContainer>
  )
}

function ChallengeListScreen({
  onBack, onSelect, challenges,
}: {
  onBack: () => void
  onSelect: (id: string) => void
  challenges: { id: string; challenger_name: string; opponent_name: string; challenger_score: number | null; opponent_score: number | null; status: string }[]
}) {
  const incoming = challenges.filter((c) => c.opponent_score === null && c.challenger_score !== null)
  const outgoing = challenges.filter((c) => c.challenger_score === null)
  const completed = challenges.filter((c) => c.status === 'completed' || c.status === 'expired')

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Riwayat Tantangan</h2>

        {incoming.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-600">
              <Zap className="h-4 w-4" /> Perlu Dijawab ({incoming.length})
            </h3>
            <div className="space-y-2">
              {incoming.map((c) => <ChallengeCard key={c.id} challenge={c} onClick={() => onSelect(c.id)} />)}
            </div>
          </section>
        )}

        {outgoing.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-600">
              <Send className="h-4 w-4" /> Menunggu Lawan ({outgoing.length})
            </h3>
            <div className="space-y-2">
              {outgoing.map((c) => <ChallengeCard key={c.id} challenge={c} onClick={() => onSelect(c.id)} />)}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <BarChart3 className="h-4 w-4" /> Selesai ({completed.length})
            </h3>
            <div className="space-y-2">
              {completed.map((c) => <ChallengeCard key={c.id} challenge={c} onClick={() => onSelect(c.id)} />)}
            </div>
          </section>
        )}

        {challenges.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <BarChart3 className="mx-auto mb-3 h-10 w-10" />
            <p>Belum ada tantangan</p>
          </div>
        )}
      </div>
    </GameContainer>
  )
}

function ChallengeCard({ challenge, onClick }: { challenge: { id: string; challenger_name: string; opponent_name: string; challenger_score: number | null; opponent_score: number | null; status: string }; onClick: () => void }) {
  const isPending = challenge.status === 'pending'
  const isCompleted = challenge.status === 'completed'

  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="flex-1">
        <p className="font-semibold text-gray-900 dark:text-white">{challenge.challenger_name} vs {challenge.opponent_name}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {challenge.challenger_score !== null ? challenge.challenger_score : '-'} : {challenge.opponent_score !== null ? challenge.opponent_score : '-'}
        </p>
      </div>
      <span className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
        isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
        isPending ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
        'bg-gray-100 text-gray-500'
      }`}>
        {isCompleted ? 'Selesai' : isPending ? 'Pending' : 'Expired'}
      </span>
    </button>
  )
}

function PlayScreen({ detail, onComplete, onResult }: { detail: any; onComplete: () => void; onResult: () => void }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const questions = detail.questions || []
  const totalQ = questions.length
  const isLast = currentQ >= totalQ

  useEffect(() => {
    if (isLast) return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentQ])

  const handleTimeout = () => {
    const q = questions[currentQ] as any
    recordAnswer(q, '', QUESTION_TIME, false, 0)
    goNext()
  }

  const recordAnswer = useCallback((q: any, answer: string, timeTaken: number, correct: boolean, points: number) => {
    setAnswers((prev) => [...prev, {
      questionId: String(q?.id || currentQ),
      answer,
      timeTaken,
      correct,
      points,
    }])
  }, [currentQ])

  const goNext = () => {
    setSelected(null)
    if (currentQ < totalQ - 1) {
      setCurrentQ(currentQ + 1)
      setTimeLeft(QUESTION_TIME)
    } else {
      setCurrentQ(currentQ + 1)
    }
  }

  const handleAnswer = (opt: string) => {
    if (selected || isLast) return
    setSelected(opt)
    if (timerRef.current) clearInterval(timerRef.current!)

    const q = questions[currentQ] as any
    const timeTaken = QUESTION_TIME - timeLeft
    const isCorrect = opt === q.answer || opt === q.correctAnswer
    const speedPoints = timeTaken <= BONUS_TIME_THRESHOLD ? BONUS_SCORE : 0
    const points = isCorrect ? SCORE_PER_CORRECT + speedPoints : 0

    recordAnswer(q, opt, timeTaken, isCorrect, points)

    setTimeout(() => goNext(), 800)
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const totalScore = answers.reduce((sum, a) => sum + a.points, 0)
      return challengesApi.submit(detail.id, {
        answers: answers.map((a) => ({ question_id: a.questionId, answer: a.answer, time_taken: a.timeTaken })),
        score: totalScore,
      })
    },
    onSuccess: () => {
      onComplete()
      onResult()
    },
  })

  if (isLast) {
    const totalPoints = answers.reduce((sum, a) => sum + a.points, 0)
    const correctCount = answers.filter((a) => a.correct).length
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
            <Target className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Selesai!</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-4xl font-extrabold text-amber-500">{totalPoints}</p>
            <p className="mt-1 text-sm text-gray-500">total poin</p>
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div><span className="font-bold text-green-600">{correctCount}</span> benar</div>
              <div><span className="font-bold text-red-600">{answers.length - correctCount}</span> salah</div>
              <div><span className="font-bold text-amber-600">{answers.filter((a) => a.timeTaken <= BONUS_TIME_THRESHOLD && a.correct).length}</span> bonus kecepatan</div>
            </div>
          </div>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {submitMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Kirim Hasil & Bandingkan
          </button>
        </div>
      </GameContainer>
    )
  }

  const q = questions[currentQ] as any
  if (!q) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
  }

  const options = q.options || q.pilihan || []
  const progressPercent = ((currentQ) / totalQ) * 100

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-slate-300">Soal {currentQ + 1}/{totalQ}</span>
          <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-300">
            <Zap className="h-4 w-4 text-amber-500" /> {answers.reduce((s, a) => s + a.points, 0)} pts
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex items-center justify-center gap-2 text-3xl font-bold">
          <Clock className={`h-6 w-6 ${timeLeft <= 3 ? 'text-red-500' : 'text-gray-400'}`} />
          <span className={timeLeft <= 3 ? 'text-red-500' : 'text-gray-900 dark:text-white'}>{timeLeft}</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-center text-lg font-semibold leading-relaxed text-gray-900 dark:text-white">
            {q.question || q.text || q.soal || ''}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((opt: string, i: number) => {
            const isSelected = selected === opt
            const guessed = answers[currentQ]
            const showCorrect = guessed && (opt === q.answer || opt === q.correctAnswer)
            const showWrong = guessed && isSelected && !(opt === q.answer || opt === q.correctAnswer)

            let btnClass = 'border-gray-200 bg-white hover:border-amber-400 hover:bg-amber-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-amber-950'
            if (isSelected && !guessed) btnClass = 'border-amber-500 bg-amber-50 dark:bg-amber-950 dark:border-amber-400'
            if (showCorrect) btnClass = 'border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400'
            if (showWrong) btnClass = 'border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400'

            return (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={selected !== null}
                className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left font-medium transition-all ${
                  selected ? 'cursor-default' : 'active:scale-[0.98]'
                } ${btnClass}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  showCorrect ? 'bg-green-500 text-white' :
                  showWrong ? 'bg-red-500 text-white' :
                  'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-gray-900 dark:text-white">{opt}</span>
                {showCorrect && <Check className="ml-auto h-5 w-5 shrink-0 text-green-500" />}
                {showWrong && <X className="ml-auto h-5 w-5 shrink-0 text-red-500" />}
              </button>
            )
          })}
        </div>
      </div>
    </GameContainer>
  )
}

function ResultScreen({ detail, onBack }: { detail: any; onBack: () => void }) {
  const result = detail.result
  if (!result) {
    return (
      <GameContainer maxWidth="max-w-lg">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
      </GameContainer>
    )
  }

  const isWin = result.result === 'win'
  const isDraw = result.result === 'draw'
  const userScore = detail.challenger_score ?? 0
  const oppScore = detail.opponent_score ?? 0

  return (
    <GameContainer maxWidth="max-w-lg">
      <div className="space-y-6 text-center">
        <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-lg ${
          isWin ? 'from-amber-400 to-yellow-500 shadow-yellow-200' :
          isDraw ? 'from-blue-400 to-indigo-500 shadow-blue-200' :
          'from-gray-400 to-gray-500 shadow-gray-200'
        }`}>
          {isWin ? <Medal className="h-12 w-12 text-white" /> :
           isDraw ? <Users className="h-12 w-12 text-white" /> :
           <Target className="h-12 w-12 text-white" />}
        </div>

        <h1 className={`text-3xl font-extrabold ${
          isWin ? 'text-amber-500' : isDraw ? 'text-blue-500' : 'text-gray-500'
        }`}>
          {isWin ? 'Kamu Menang!' : isDraw ? 'Hasil Seri!' : 'Kamu Kalah'}
        </h1>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{userScore}</p>
              <p className="mt-1 text-sm text-gray-500">Skormu</p>
            </div>
            <div className="text-2xl font-bold text-gray-300">:</div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{oppScore}</p>
              <p className="mt-1 text-sm text-gray-500">{detail.opponent_name || 'Lawan'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950 dark:to-orange-950">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <Zap className="h-4 w-4" /> +{result.xp_earned} XP
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 rounded-xl border-2 border-gray-200 px-6 py-3.5 font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300"
          >
            Kembali
          </button>
        </div>
      </div>
    </GameContainer>
  )
}
