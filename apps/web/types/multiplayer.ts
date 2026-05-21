export interface AsyncChallenge {
  id: string;
  challenger_name: string;
  opponent_name: string;
  game_name: string;
  difficulty: string;
  challenger_score: number | null;
  opponent_score: number | null;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface AsyncChallengeDetail extends AsyncChallenge {
  questions?: Record<string, unknown>[];
  result?: ChallengeResult;
}

export interface ChallengeResult {
  winner_id: string;
  result: 'win' | 'lose' | 'draw' | 'pending';
  xp_earned: number;
}

export interface CreateChallengeRequest {
  opponent_username: string;
  game_slug: string;
  difficulty: string;
}

export interface SubmitChallengeRequest {
  answers: { question_id: string; answer: string; time_taken: number }[];
  score: number;
}

export interface WordChainGame {
  id: string;
  opponent_name: string;
  is_vs_bot: boolean;
  bot_difficulty: string;
  current_word: string;
  my_turn: boolean;
  player1_score: number;
  player2_score: number;
  status: string;
  turn_expires_at: string;
  created_at: string;
}

export interface WordChainDetail extends WordChainGame {
  words_used: string[];
}

export interface WordSubmitResult {
  valid: boolean;
  score_delta: number;
  next_letter: string;
  bot_response?: string;
  game_over: boolean;
  winner_id?: string;
  message?: string;
}

export interface CreateWordChainRequest {
  opponent_username?: string;
  vs_bot?: boolean;
  bot_difficulty?: string;
}

export interface SubmitWordRequest {
  word: string;
}

export interface QuickMatchResult {
  match_id: string;
  room_id: string;
  opponent_id?: string;
  opponent_name?: string;
  status?: string;
  bot_options?: string[];
}

export interface QuickMatchBotResult {
  match_id: string;
  room_id: string;
  recommended: 'easy' | 'medium' | 'hard';
  bot_difficulty: 'easy' | 'medium' | 'hard';
  bot: { name: string; difficulty: string };
}

export interface RealtimeQuestion {
  id: string;
  text: string;
  options: string[];
  question_number: number;
  total: number;
}

export interface AnswerResult {
  player_id: string;
  is_correct: boolean;
  score_delta: number;
  new_score: number;
}

export interface OpponentProgress {
  player_id: string;
  questions_answered: number;
  current_score: number;
}

export interface GameOverResult {
  results: {
    player_id: string;
    username: string;
    score: number;
    correct: number;
    wrong: number;
    is_winner: boolean;
  }[];
  winner_id: string;
  xp_earned: number;
}

export interface RoomSettings {
  questions: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timer: number;
  max_players: number;
  allow_bots: boolean;
}

export interface RoomMember {
  id: string;
  username: string;
  level: number;
  is_host: boolean;
}

export interface RoomResponse {
  room_code: string;
  game_slug: string;
  host_id: string;
  members: RoomMember[];
  settings: RoomSettings;
  status: string;
  expires_at: string;
  game_name?: string;
}

export interface TournamentPlayer {
  id: string;
  user_id?: string;
  display_name: string;
  is_bot: boolean;
  seed: number;
  status: string;
  final_rank: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner_player_id?: string;
  player1_score: number;
  player2_score: number;
  status: string;
  room_id: string;
  ends_at?: string;
}

export interface Tournament {
  id: string;
  name: string;
  game_slug: string;
  difficulty: string;
  mode: 'quick' | 'open_daily' | 'open_weekly';
  invite_code: string;
  max_players: number;
  status: string;
  host_id: string;
  champion_id?: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  created_at: string;
  scheduled_start_at?: string;
  registration_ends_at?: string;
  current_round_ends_at?: string;
  started_at?: string;
  finished_at?: string;
}

export interface CreateTournamentRequest {
  name: string;
  difficulty: string;
  mode: 'quick' | 'open_daily' | 'open_weekly';
  max_players: number;
}

export interface ReportTournamentMatchRequest {
  winner_player_id: string;
  player1_score: number;
  player2_score: number;
}

export interface BattleshipCell {
  ship: boolean;
  hit: boolean;
  miss: boolean;
  revealed?: boolean;
}

export interface BattleshipQuestion {
  id: string;
  text: string;
  target: { row: number; col: number };
}

export interface BattleshipMatch {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'active' | 'finished';
  is_vs_bot: boolean;
  opponent_name: string;
  my_side: 'player1' | 'player2';
  current_turn: 'player1' | 'player2' | '';
  my_turn: boolean;
  my_score: number;
  opponent_score: number;
  winner_id?: string;
  winner_side?: 'player1' | 'player2';
  my_board: BattleshipCell[][];
  target_board: BattleshipCell[][];
  pending_question?: BattleshipQuestion;
  turn_expires_at?: string;
  pending_expires_at?: string;
  reveal_used: boolean;
  log: string[];
  created_at: string;
  updated_at: string;
  finished_at?: string;
}

export interface CreateBattleshipMatchRequest {
  opponent_username?: string;
  vs_bot: boolean;
  bot_difficulty?: 'easy' | 'medium' | 'hard';
  difficulty: 'easy' | 'medium' | 'hard';
}
