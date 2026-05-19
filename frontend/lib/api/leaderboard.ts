import api from "./client";
import { ApiResponse } from "@/types/api";
import { LeaderboardEntry } from "@/types/game";

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  user_rank?: number;
}

export const leaderboardApi = {
  getGameLeaderboard: async (slug: string, period: "all" | "weekly" = "all") => {
    const res = await api.get<ApiResponse<LeaderboardResponse>>(`/leaderboard/game/${slug}?period=${period}`);
    return res.data.data;
  },
  getGlobalLeaderboard: async (period: "all" | "weekly" = "all") => {
    const res = await api.get<ApiResponse<LeaderboardResponse>>(`/leaderboard/global?period=${period}`);
    return res.data.data;
  },
};
