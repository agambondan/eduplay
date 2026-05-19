import { useGameStore } from '@/lib/stores/gameStore';
import { gamesApi } from '@/lib/api/games';
import { Difficulty, ScoreSubmitResponse } from '@/types/game';
import { useCallback } from 'react';

export function useGame(gameSlug: string) {
  const store = useGameStore();

  const submitScore = useCallback(async (): Promise<ScoreSubmitResponse | null> => {
    try {
      const result = await gamesApi.submitScore(gameSlug, {
        score: store.score,
        duration: 60 - store.timeLeft,
        difficulty: store.difficulty,
      });
      return result;
    } catch {
      return null;
    }
  }, [gameSlug, store.score, store.timeLeft, store.difficulty]);

  const startGame = useCallback(
    (difficulty: Difficulty = 'easy') => {
      store.resetGame();
      store.setDifficulty(difficulty);
      store.setPlaying(true);
    },
    [store]
  );

  const endGame = useCallback(() => {
    store.setPlaying(false);
  }, [store]);

  return {
    ...store,
    submitScore,
    startGame,
    endGame,
  };
}
