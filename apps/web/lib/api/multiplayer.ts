import { ApiResponse } from '@/types/api';
import {
  AsyncChallenge,
  AsyncChallengeDetail,
  BattleshipMatch,
  ChallengeResult,
  CreateBattleshipMatchRequest,
  CreateChallengeRequest,
  CreateTournamentRequest,
  CreateWordChainRequest,
  QuickMatchBotResult,
  QuickMatchResult,
  ReportTournamentMatchRequest,
  RoomResponse,
  RoomSettings,
  SubmitChallengeRequest,
  SubmitWordRequest,
  Tournament,
  WordChainDetail,
  WordChainGame,
  WordSubmitResult,
} from '@/types/multiplayer';
import api from './client';

export const challengesApi = {
  create: async (data: CreateChallengeRequest) => {
    const res = await api.post<ApiResponse<AsyncChallenge>>('/challenges', data);
    return res.data.data;
  },
  list: async (type?: string) => {
    const res = await api.get<ApiResponse<AsyncChallenge[]>>('/challenges', {
      params: { type },
    });
    return res.data.data;
  },
  get: async (id: string) => {
    const res = await api.get<ApiResponse<AsyncChallengeDetail>>(`/challenges/${id}`);
    return res.data.data;
  },
  submit: async (id: string, data: SubmitChallengeRequest) => {
    const res = await api.post<ApiResponse<ChallengeResult>>(`/challenges/${id}/submit`, data);
    return res.data.data;
  },
};

export const multiplayerApi = {
  quickMatch: async (gameSlug: string, difficulty: string, theme?: string) => {
    const res = await api.post<ApiResponse<QuickMatchResult>>('/multiplayer/quickmatch', {
      game_slug: gameSlug,
      difficulty,
      theme,
    });
    return res.data.data;
  },
  quickMatchBot: async (
    gameSlug: string,
    botDifficulty: string,
    recommended = false,
    theme?: string
  ) => {
    const res = await api.post<ApiResponse<QuickMatchBotResult>>('/multiplayer/quickmatch/bot', {
      game_slug: gameSlug,
      bot_difficulty: botDifficulty,
      recommended,
      theme,
    });
    return res.data.data;
  },
  cancelQuickMatch: async (gameSlug: string) => {
    await api.delete('/multiplayer/quickmatch', { data: { game_slug: gameSlug } });
  },
};

export const roomsApi = {
  create: async (gameSlug: string, settings: RoomSettings) => {
    const res = await api.post<ApiResponse<RoomResponse>>('/rooms', {
      game_slug: gameSlug,
      settings,
    });
    return res.data.data;
  },
  get: async (roomCode: string) => {
    const res = await api.get<ApiResponse<RoomResponse>>(`/rooms/${roomCode}`);
    return res.data.data;
  },
  join: async (roomCode: string) => {
    const res = await api.post<ApiResponse<RoomResponse>>(`/rooms/${roomCode}/join`);
    return res.data.data;
  },
  leave: async (roomCode: string) => {
    await api.delete(`/rooms/${roomCode}/leave`);
  },
  start: async (roomCode: string) => {
    await api.post(`/rooms/${roomCode}/start`);
  },
  updateSettings: async (roomCode: string, settings: RoomSettings) => {
    const res = await api.put<ApiResponse<RoomResponse>>(`/rooms/${roomCode}/settings`, {
      settings,
    });
    return res.data.data;
  },
};

export const tournamentsApi = {
  list: async () => {
    const res = await api.get<ApiResponse<Tournament[]>>('/tournaments');
    return res.data.data;
  },
  create: async (data: CreateTournamentRequest) => {
    const res = await api.post<ApiResponse<Tournament>>('/tournaments', data);
    return res.data.data;
  },
  get: async (id: string) => {
    const res = await api.get<ApiResponse<Tournament>>(`/tournaments/${id}`);
    return res.data.data;
  },
  join: async (id: string) => {
    const res = await api.post<ApiResponse<Tournament>>(`/tournaments/${id}/join`);
    return res.data.data;
  },
  start: async (id: string) => {
    const res = await api.post<ApiResponse<Tournament>>(`/tournaments/${id}/start`);
    return res.data.data;
  },
  reportMatch: async (
    tournamentId: string,
    matchId: string,
    data: ReportTournamentMatchRequest
  ) => {
    const res = await api.post<ApiResponse<Tournament>>(
      `/tournaments/${tournamentId}/matches/${matchId}/report`,
      data
    );
    return res.data.data;
  },
};

export const battleshipApi = {
  list: async () => {
    const res = await api.get<ApiResponse<BattleshipMatch[]>>('/battleship');
    return res.data.data;
  },
  create: async (data: CreateBattleshipMatchRequest) => {
    const res = await api.post<ApiResponse<BattleshipMatch>>('/battleship', data);
    return res.data.data;
  },
  get: async (id: string) => {
    const res = await api.get<ApiResponse<BattleshipMatch>>(`/battleship/${id}`);
    return res.data.data;
  },
  target: async (id: string, row: number, col: number) => {
    const res = await api.post<ApiResponse<BattleshipMatch>>(`/battleship/${id}/target`, {
      row,
      col,
    });
    return res.data.data;
  },
  shot: async (id: string, answer: number) => {
    const res = await api.post<ApiResponse<BattleshipMatch>>(`/battleship/${id}/shot`, { answer });
    return res.data.data;
  },
  reveal: async (id: string) => {
    const res = await api.post<ApiResponse<BattleshipMatch>>(`/battleship/${id}/reveal`);
    return res.data.data;
  },
  resign: async (id: string) => {
    const res = await api.post<ApiResponse<BattleshipMatch>>(`/battleship/${id}/resign`);
    return res.data.data;
  },
};

export const wordChainApi = {
  list: async () => {
    const res = await api.get<ApiResponse<WordChainGame[]>>('/wordchain');
    return res.data.data;
  },
  create: async (data: CreateWordChainRequest) => {
    const res = await api.post<ApiResponse<WordChainGame>>('/wordchain', data);
    return res.data.data;
  },
  get: async (id: string) => {
    const res = await api.get<ApiResponse<WordChainDetail>>(`/wordchain/${id}`);
    return res.data.data;
  },
  submitWord: async (id: string, data: SubmitWordRequest) => {
    const res = await api.post<ApiResponse<WordSubmitResult>>(`/wordchain/${id}/word`, data);
    return res.data.data;
  },
};
