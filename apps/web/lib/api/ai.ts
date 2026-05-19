import api from './client';
import { ApiResponse } from '@/types/api';

export interface AIQuestion {
  question: string;
  answer: string | number;
  options: (string | number)[];
  explanation?: string;
}

export const aiApi = {
  getQuestions: async (gameType: string, difficulty: string, count: number) => {
    const res = await api.post<ApiResponse<AIQuestion[]>>('/ai/questions', {
      game_type: gameType,
      difficulty,
      count,
    });
    return res.data.data;
  },
};
