export interface User {
  id: string;
  username: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  streak_freeze: number;
  last_active: string | null;
  email_verified_at: string | null;
  avatar_color: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HistoryPoint {
  date: string;
  xp: number;
}

export interface TopGame {
  slug: string;
  name: string;
  best_score: number;
  play_count: number;
  category: string;
}

export interface Stats {
  total_games: number;
  total_xp: number;
  total_play_time: number;
  achievements_unlocked: number;
  level: number;
  streak: number;
  history: HistoryPoint[];
  top_games: TopGame[];
}

export interface UserStats {
  total_games: number;
  total_xp: number;
  total_play_time: number;
  achievements_unlocked: number;
  level: number;
  streak: number;
  highscores: GameHighscore[];
  recent_sessions: GameSession[];
  history: HistoryPoint[];
}

export interface GameHighscore {
  game_id: string;
  game_slug: string;
  game_name: string;
  highscore: number;
}

export interface GameSession {
  id: string;
  game_id: string;
  game_slug: string;
  score: number;
  duration: number;
  difficulty: string;
  xp_earned: number;
  created_at: string;
}
