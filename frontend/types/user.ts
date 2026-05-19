export interface User {
  id: string;
  username: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  last_active: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_games: number;
  total_xp: number;
  highscores: GameHighscore[];
  recent_sessions: GameSession[];
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
