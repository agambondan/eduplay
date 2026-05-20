import { ApiResponse } from '@/types/api'
import {
  AsyncChallenge,
  AsyncChallengeDetail,
  CreateChallengeRequest,
  SubmitChallengeRequest,
  ChallengeResult,
  WordChainGame,
  WordChainDetail,
  WordSubmitResult,
  CreateWordChainRequest,
  SubmitWordRequest,
  QuickMatchResult,
  QuickMatchBotResult,
} from '@/types/multiplayer'
import api from './client'

export const challengesApi = {
  create: async (data: CreateChallengeRequest) => {
    const res = await api.post<ApiResponse<AsyncChallenge>>('/challenges', data)
    return res.data.data
  },
  list: async (type?: string) => {
    const res = await api.get<ApiResponse<AsyncChallenge[]>>('/challenges', {
      params: { type },
    })
    return res.data.data
  },
  get: async (id: string) => {
    const res = await api.get<ApiResponse<AsyncChallengeDetail>>(`/challenges/${id}`)
    return res.data.data
  },
  submit: async (id: string, data: SubmitChallengeRequest) => {
    const res = await api.post<ApiResponse<ChallengeResult>>(`/challenges/${id}/submit`, data)
    return res.data.data
  },
}

export const multiplayerApi = {
  quickMatch: async (gameSlug: string, difficulty: string) => {
    const res = await api.post<ApiResponse<QuickMatchResult>>('/multiplayer/quickmatch', { game_slug: gameSlug, difficulty })
    return res.data.data
  },
  quickMatchBot: async (gameSlug: string, botDifficulty: string) => {
    const res = await api.post<ApiResponse<QuickMatchBotResult>>('/multiplayer/quickmatch/bot', { game_slug: gameSlug, bot_difficulty: botDifficulty })
    return res.data.data
  },
  cancelQuickMatch: async (gameSlug: string) => {
    await api.delete('/multiplayer/quickmatch', { data: { game_slug: gameSlug } })
  },
}

export const wordChainApi = {
  list: async () => {
    const res = await api.get<ApiResponse<WordChainGame[]>>('/wordchain')
    return res.data.data
  },
  create: async (data: CreateWordChainRequest) => {
    const res = await api.post<ApiResponse<WordChainGame>>('/wordchain', data)
    return res.data.data
  },
  get: async (id: string) => {
    const res = await api.get<ApiResponse<WordChainDetail>>(`/wordchain/${id}`)
    return res.data.data
  },
  submitWord: async (id: string, data: SubmitWordRequest) => {
    const res = await api.post<ApiResponse<WordSubmitResult>>(`/wordchain/${id}/word`, data)
    return res.data.data
  },
}
