declare function gtag(command: string, action: string, params?: Record<string, unknown>): void;

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !GA_ID) return;
  try {
    gtag('event', eventName, params);
  } catch {
    console.warn('GA event failed');
  }
}

export const analytics = {
  // Auth
  userRegistered: (method: 'email' | 'google') => track('user_registered', { method }),
  userLoggedIn: (method: 'email' | 'google') => track('user_logged_in', { method }),

  // Game
  gameStarted: (gameId: string, gameName: string, category: string, difficulty?: string) =>
    track('game_started', { game_id: gameId, game_name: gameName, category, difficulty }),
  gameCompleted: (
    gameId: string,
    score: number,
    duration: number,
    difficulty: string,
    xpEarned: number
  ) =>
    track('game_completed', {
      game_id: gameId,
      score,
      duration_seconds: duration,
      difficulty,
      xp_earned: xpEarned,
    }),
  newHighscore: (gameId: string, score: number) =>
    track('new_highscore', { game_id: gameId, score }),

  // Gamification
  xpEarned: (amount: number, source: 'game' | 'daily' | 'achievement') =>
    track('xp_earned', { amount, source }),
  levelUp: (oldLevel: number, newLevel: number) =>
    track('level_up', { old_level: oldLevel, new_level: newLevel }),
  streakUpdated: (count: number) => track('streak_updated', { streak_count: count }),
  achievementUnlocked: (achievementId: string, name: string) =>
    track('achievement_unlocked', { achievement_id: achievementId, achievement_name: name }),

  // Daily
  dailyStarted: () => track('daily_challenge_started'),
  dailyCompleted: (score: number, xpEarned: number) =>
    track('daily_challenge_completed', { score, xp_earned: xpEarned }),

  // Ads
  adImpression: (page: string) => track('ad_banner_impression', { page }),
  interstitialShown: (gameId: string, trigger: string) =>
    track('ad_interstitial_shown', { game_id: gameId, trigger }),
  rewardedCompleted: (gameId: string, rewardType: string) =>
    track('ad_rewarded_completed', { game_id: gameId, reward_type: rewardType }),

  // Navigation
  pageViewed: (pageName: string) => track('page_viewed', { page_name: pageName }),
  leaderboardViewed: (gameId?: string, period?: string) =>
    track('leaderboard_viewed', { game_id: gameId, period }),

  // Error
  apiError: (endpoint: string, statusCode: number) =>
    track('api_error', { endpoint, status_code: statusCode }),
};
