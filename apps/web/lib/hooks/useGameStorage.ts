'use client';

import { useEffect, useState } from 'react';
import { safeStorage } from '@/lib/utils/safeStorage';

interface GamePersistState {
  score?: number;
  questionCount?: number;
  question?: any;
  feedback?: 'correct' | 'wrong' | null;
  gameOver?: boolean;
  streak?: number;
  useAI?: boolean;
  aiQuestions?: any[];
  [key: string]: any;
}

export function useGameStorage<T extends GamePersistState>(
  gameSlug: string,
  initialState: T,
  options?: {
    serialize?: (state: T) => any;
    deserialize?: (data: any) => T;
    excludeKeys?: string[];
  }
): readonly [T, React.Dispatch<React.SetStateAction<T>>, boolean, () => void] {
  const { serialize = (s: T) => s, deserialize = (d: any) => d } = options || {};
  const storageKey = `eduplay-game-${gameSlug}`;
  const [isRestored, setIsRestored] = useState(false);

  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const stored = safeStorage.getItem<any>(storageKey, null);
      if (!stored) return initialState;
      const parsed = deserialize(stored);
      return { ...initialState, ...parsed };
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    if (!isRestored) {
      setIsRestored(true);
    }
  }, [isRestored]);

  const setStateWithPersist = (newState: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof newState === 'function' ? (newState as (prev: T) => T)(prev) : newState;
      try {
        const toStore = serialize(next);
        safeStorage.setItem(storageKey, toStore);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (isRestored) {
      try {
        const toStore = serialize(state);
        safeStorage.setItem(storageKey, toStore);
      } catch {}
    }
  }, [state, isRestored, serialize, storageKey]);

  const clearStorage = () => {
    safeStorage.removeItem(storageKey);
    setState(initialState);
  };

  return [state, setStateWithPersist, isRestored, clearStorage] as const;
}
