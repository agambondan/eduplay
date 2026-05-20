import { ApiResponse } from '@/types/api';
import api from './client';

export interface Country {
  id: number;
  name: string;
  capital: string;
  flag_emoji: string;
  flag_code: string;
  region: string;
}

export interface ChemicalElement {
  id: number;
  symbol: string;
  name: string;
  number: number;
}

export interface HistoryEvent {
  id: number;
  description: string;
  year: number;
  region: string;
}

export interface WordleWord {
  id: number;
  word: string;
  language: string;
}

export const contentApi = {
  getFlags: async (): Promise<Country[]> => {
    const res = await api.get<ApiResponse<Country[]>>('/content/flags');
    return res.data.data;
  },
  getCapitals: async (): Promise<Country[]> => {
    const res = await api.get<ApiResponse<Country[]>>('/content/capitals');
    return res.data.data;
  },
  getElements: async (): Promise<ChemicalElement[]> => {
    const res = await api.get<ApiResponse<ChemicalElement[]>>('/content/elements');
    return res.data.data;
  },
  getHistory: async (region?: string): Promise<HistoryEvent[]> => {
    const params = region ? { region } : {};
    const res = await api.get<ApiResponse<HistoryEvent[]>>('/content/history', { params });
    return res.data.data;
  },
  getWordleWords: async (lang?: string): Promise<WordleWord[]> => {
    const params = lang ? { lang } : {};
    const res = await api.get<ApiResponse<WordleWord[]>>('/content/words/wordle', { params });
    return res.data.data;
  },
};
