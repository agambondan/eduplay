import api from "./client";
import { ApiResponse } from "@/types/api";
import { Game, ScoreSubmitRequest, ScoreSubmitResponse } from "@/types/game";

export const gamesApi = {
  list: async () => {
    const res = await api.get<ApiResponse<Game[]>>("/games");
    return res.data.data;
  },
  get: async (slug: string) => {
    const res = await api.get<ApiResponse<Game>>(`/games/${slug}`);
    return res.data.data;
  },
  submitScore: async (slug: string, data: ScoreSubmitRequest) => {
    const res = await api.post<ApiResponse<ScoreSubmitResponse>>(`/games/${slug}/score`, data);
    return res.data.data;
  },
};
