import { gamesApi } from '@/lib/api/games';
import { toast } from '@/lib/stores/toastStore';
import { safeStorage } from '@/lib/utils/safeStorage';
import { ScoreSubmitRequest } from '@/types/game';

const OFFLINE_QUEUE_KEY = 'eduplay_offline_scores_queue';

export interface QueuedScore {
  id: string;
  gameSlug: string;
  payload: ScoreSubmitRequest;
  timestamp: number;
}

export function getOfflineQueue(): QueuedScore[] {
  return safeStorage.getItem<QueuedScore[]>(OFFLINE_QUEUE_KEY, []);
}

export function enqueueOfflineScore(
  gameSlug: string,
  payload: ScoreSubmitRequest
): QueuedScore {
  const queue = getOfflineQueue();
  const item: QueuedScore = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    gameSlug,
    payload,
    timestamp: Date.now(),
  };
  queue.push(item);
  safeStorage.setItem(OFFLINE_QUEUE_KEY, queue);
  return item;
}

export function removeOfflineScore(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  safeStorage.setItem(OFFLINE_QUEUE_KEY, queue);
}

export function clearOfflineQueue(): void {
  safeStorage.removeItem(OFFLINE_QUEUE_KEY);
}

let isSyncing = false;

export async function syncOfflineScores(): Promise<{
  successCount: number;
  failedCount: number;
}> {
  if (isSyncing || typeof navigator === 'undefined' || !navigator.onLine) {
    return { successCount: 0, failedCount: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { successCount: 0, failedCount: 0 };
  }

  isSyncing = true;
  let successCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      const res = await gamesApi.submitScore(item.gameSlug, item.payload);
      if (res) {
        removeOfflineScore(item.id);
        successCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  isSyncing = false;

  if (successCount > 0) {
    toast.success(`${successCount} skor offline berhasil disinkronkan!`);
  }

  return { successCount, failedCount };
}

export function initOfflineSync(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => {
    syncOfflineScores().catch(() => {});
  };

  window.addEventListener('online', handleOnline);

  if (navigator.onLine) {
    setTimeout(() => {
      syncOfflineScores().catch(() => {});
    }, 2000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
