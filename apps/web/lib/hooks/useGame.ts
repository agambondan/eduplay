import { Difficulty, ScoreSubmitResponse } from '@/types/game';
import { useCallback } from 'react';
import { gamesApi } from '@/lib/api/games';
import { useAuthStore } from '@/lib/stores/authStore';
import { useGameStore } from '@/lib/stores/gameStore';
import { toast } from '@/lib/stores/toastStore';
import { analytics } from '@/lib/utils/analytics';
import { enqueueOfflineScore } from '@/lib/utils/offlineQueue';

export function useGame(gameSlug: string, gameName?: string, category?: string) {
  const store = useGameStore();
  const { accessToken } = useAuthStore();

  const submitScore = useCallback(
    async (scoreOverride?: number): Promise<ScoreSubmitResponse | null> => {
      if (!accessToken) {
        return null;
      }
      const scoreToSubmit = scoreOverride ?? store.score;
      const payload = {
        score: scoreToSubmit,
        duration: 60 - store.timeLeft,
        difficulty: store.difficulty,
      };

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isOffline) {
        enqueueOfflineScore(gameSlug, payload);
        toast.info('Offline: Skor tersimpan & akan disinkronkan saat online');
        return {
          session_id: `offline-${Date.now()}`,
          xp_earned: Math.max(10, Math.floor(scoreToSubmit / 10)),
          new_highscore: false,
        };
      }

      try {
        const result = await gamesApi.submitScore(gameSlug, payload);
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
        enqueueOfflineScore(gameSlug, payload);
        toast.info('Koneksi terganggu: Skor tersimpan di antrean offline');
        return {
          session_id: `offline-${Date.now()}`,
          xp_earned: Math.max(10, Math.floor(scoreToSubmit / 10)),
          new_highscore: false,
        };
      }
    },
    [gameSlug, store.score, store.timeLeft, store.difficulty, store.setLevelUp, accessToken]
  );

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
