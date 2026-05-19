import api from './client';
import { ApiResponse } from '@/types/api';
import { DailyChallenge } from '@/types/game';

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
};
