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
  const { score, timeLeft, difficulty, setLevelUp, resetGame, setDifficulty, setPlaying, setPaused } = store;
  const { accessToken } = useAuthStore();

  const submitScore = useCallback(
    async (scoreOverride?: number): Promise<ScoreSubmitResponse | null> => {
      if (!accessToken) {
        return null;
      }
      const scoreToSubmit = scoreOverride ?? score;
      const payload = {
        score: scoreToSubmit,
        duration: 60 - timeLeft,
        difficulty,
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
            60 - timeLeft,
            difficulty,
            result.xp_earned
          );
          if (result.new_highscore) {
            analytics.newHighscore(gameSlug, scoreToSubmit);
          }
          if (result.level_up && result.new_level) {
            setLevelUp({ newLevel: result.new_level });
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
    [gameSlug, score, timeLeft, difficulty, setLevelUp, accessToken]
  );

  const startGame = useCallback(
    (targetDifficulty: Difficulty = 'easy') => {
      resetGame();
      setDifficulty(targetDifficulty);
      setPlaying(true);
      analytics.gameStarted(gameSlug, gameName || '', category || '', targetDifficulty);
    },
    [resetGame, setDifficulty, setPlaying, gameSlug, gameName, category]
  );

  const endGame = useCallback(() => {
    setPlaying(false);
    setPaused(false);
  }, [setPlaying, setPaused]);

  const pauseGame = useCallback(() => {
    setPaused(true);
  }, [setPaused]);

  const resumeGame = useCallback(() => {
    setPaused(false);
  }, [setPaused]);

  return {
    ...store,
    submitScore,
    startGame,
    endGame,
    pauseGame,
    resumeGame,
  };
}
