import { ApiResponse } from '@/types/api';
import { LeaderboardEntry } from '@/types/game';
import api from './client';

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  user_rank?: LeaderboardEntry;
  nearby_entries?: LeaderboardEntry[];
}

export const leaderboardApi = {
  getGameLeaderboard: async (slug: string, period: 'all' | 'weekly' = 'all') => {
    const res = await api.get<ApiResponse<LeaderboardResponse>>(
      `/leaderboard/game/${slug}?period=${period}`
    );
    return res.data.data;
  },
  getGlobalLeaderboard: async (period: 'all' | 'weekly' = 'all') => {
    const res = await api.get<ApiResponse<LeaderboardResponse>>(
      `/leaderboard/global?period=${period}`
    );
    return res.data.data;
  },
};
