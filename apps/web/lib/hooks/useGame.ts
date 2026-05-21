import { Difficulty, ScoreSubmitResponse } from '@/types/game';
import { useCallback } from 'react';
import { gamesApi } from '@/lib/api/games';
import { useAuthStore } from '@/lib/stores/authStore';
import { useGameStore } from '@/lib/stores/gameStore';
import { analytics } from '@/lib/utils/analytics';

export function useGame(gameSlug: string, gameName?: string, category?: string) {
  const store = useGameStore();
  const { accessToken } = useAuthStore();

  const submitScore = useCallback(async (scoreOverride?: number): Promise<ScoreSubmitResponse | null> => {
    if (!accessToken) {
      return null;
    }
    const scoreToSubmit = scoreOverride ?? store.score;
    try {
      const result = await gamesApi.submitScore(gameSlug, {
        score: scoreToSubmit,
        duration: 60 - store.timeLeft,
        difficulty: store.difficulty,
      });
      if (result) {
        analytics.gameCompleted(
          gameSlug,
          scoreToSubmit,
          60 - store.timeLeft,
          store.difficulty,
          result.xp_earned
        );
        if (result.new_highscore) {
          analytics.newHighscore(gameSlug, scoreToSubmit);
        }
        if (result.level_up && result.new_level) {
          store.setLevelUp({ newLevel: result.new_level });
        }
      }
      return result;
    } catch {
      return null;
    }
  }, [gameSlug, store.score, store.timeLeft, store.difficulty, accessToken]);

  const startGame = useCallback(
    (difficulty: Difficulty = 'easy') => {
      store.resetGame();
      store.setDifficulty(difficulty);
      store.setPlaying(true);
      analytics.gameStarted(gameSlug, gameName || '', category || '', difficulty);
    },
    [store, gameSlug, gameName, category]
  );

  const endGame = useCallback(() => {
    store.setPlaying(false);
    store.setPaused(false);
  }, [store]);

  const pauseGame = useCallback(() => {
    store.setPaused(true);
  }, [store]);

  const resumeGame = useCallback(() => {
    store.setPaused(false);
  }, [store]);

  return {
    ...store,
    submitScore,
    startGame,
    endGame,
    pauseGame,
    resumeGame,
  };
}
