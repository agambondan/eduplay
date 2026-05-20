export interface Game {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: GameCategory;
  is_active: boolean;
  created_at: string;
}

export type GameCategory = string;

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ScoreSubmitRequest {
  score: number;
  duration: number;
  difficulty: Difficulty;
}

export interface ScoreSubmitResponse {
  session_id: string;
  xp_earned: number;
  new_highscore: boolean;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  xp_reward: number;
  icon: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  score: number;
  xp?: number;
  level?: number;
}

export interface DailyChallenge {
  challenge_id: string;
  game: Game;
  questions: unknown[];
  expires_at: string;
  user_submitted: boolean;
}
