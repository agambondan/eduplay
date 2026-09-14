import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enqueueOfflineScore,
  getOfflineQueue,
  removeOfflineScore,
  clearOfflineQueue,
  syncOfflineScores,
} from '../offlineQueue';
import { gamesApi } from '@/lib/api/games';

vi.mock('@/lib/api/games', () => ({
  gamesApi: {
    submitScore: vi.fn(),
  },
}));

describe('offlineQueue', () => {
  beforeEach(() => {
    clearOfflineQueue();
    vi.clearAllMocks();
  });

  it('enqueues scores and persists in safeStorage', () => {
    const item = enqueueOfflineScore('snake', {
      score: 100,
      duration: 30,
      difficulty: 'medium',
    });

    expect(item.gameSlug).toBe('snake');
    expect(item.payload.score).toBe(100);

    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(item.id);
  });

  it('removes single items by id', () => {
    const item1 = enqueueOfflineScore('snake', { score: 50, duration: 10, difficulty: 'easy' });
    const item2 = enqueueOfflineScore('math-quiz', { score: 80, duration: 20, difficulty: 'hard' });

    removeOfflineScore(item1.id);
    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(item2.id);
  });

  it('syncs offline scores when online', async () => {
    enqueueOfflineScore('snake', { score: 100, duration: 30, difficulty: 'medium' });
    vi.mocked(gamesApi.submitScore).mockResolvedValueOnce({
      session_id: 's1',
      xp_earned: 50,
      new_highscore: true,
    });

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const result = await syncOfflineScores();
    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(getOfflineQueue().length).toBe(0);
  });
});
