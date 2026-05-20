import { ApiResponse } from '@/types/api';
import { DailyChallenge } from '@/types/game';
import api from './client';

export interface DailyHistoryItem {
  date: string;
  game_name: string;
  score: number;
  completed: boolean;
}

export interface DailyHistory {
  history: DailyHistoryItem[];
  streak: number;
  total: number;
}

export const dailyApi = {
  get: async () => {
    const res = await api.get<ApiResponse<DailyChallenge>>('/daily');
    return res.data.data;
  },
  submit: async (challengeId: string, score: number) => {
    const res = await api.post<ApiResponse<{ xp_earned: number }>>('/daily/submit', {
      challenge_id: challengeId,
      score,
    });
    return res.data.data;
  },
  history: async () => {
    const res = await api.get<ApiResponse<DailyHistory>>('/daily/history');
    return res.data.data;
  },
};
