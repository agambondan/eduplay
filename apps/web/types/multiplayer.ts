export interface AsyncChallenge {
  id: string
  challenger_name: string
  opponent_name: string
  game_name: string
  difficulty: string
  challenger_score: number | null
  opponent_score: number | null
  status: string
  expires_at: string
  created_at: string
}

export interface AsyncChallengeDetail extends AsyncChallenge {
  questions?: Record<string, unknown>[]
  result?: ChallengeResult
}

export interface ChallengeResult {
  winner_id: string
  result: 'win' | 'lose' | 'draw' | 'pending'
  xp_earned: number
}

export interface CreateChallengeRequest {
  opponent_username: string
  game_slug: string
  difficulty: string
}

export interface SubmitChallengeRequest {
  answers: { question_id: string; answer: string; time_taken: number }[]
  score: number
}

export interface WordChainGame {
  id: string
  opponent_name: string
  is_vs_bot: boolean
  bot_difficulty: string
  current_word: string
  my_turn: boolean
  player1_score: number
  player2_score: number
  status: string
  turn_expires_at: string
  created_at: string
}

export interface WordChainDetail extends WordChainGame {
  words_used: string[]
}

export interface WordSubmitResult {
  valid: boolean
  score_delta: number
  next_letter: string
  bot_response?: string
  game_over: boolean
  winner_id?: string
  message?: string
}

export interface CreateWordChainRequest {
  opponent_username?: string
  vs_bot?: boolean
  bot_difficulty?: string
}

export interface SubmitWordRequest {
  word: string
}

export interface QuickMatchResult {
  match_id: string
  room_id: string
  opponent_id?: string
  opponent_name?: string
  status?: string
  bot_options?: string[]
}

export interface QuickMatchBotResult {
  match_id: string
  room_id: string
  bot: { name: string; difficulty: string }
}

export interface RealtimeQuestion {
  id: string
  text: string
  options: string[]
  question_number: number
  total: number
}

export interface AnswerResult {
  player_id: string
  is_correct: boolean
  score_delta: number
  new_score: number
}

export interface OpponentProgress {
  player_id: string
  questions_answered: number
  current_score: number
}

export interface GameOverResult {
  results: { player_id: string; username: string; score: number; correct: number; wrong: number; is_winner: boolean }[]
  winner_id: string
  xp_earned: number
}
