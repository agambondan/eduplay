import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('starts with default values', () => {
    const state = useGameStore.getState();
    expect(state.score).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.timeLeft).toBe(60);
    expect(state.difficulty).toBe('easy');
  });

  it('setScore updates score', () => {
    useGameStore.getState().setScore(100);
    expect(useGameStore.getState().score).toBe(100);
  });

  it('addScore increments score', () => {
    useGameStore.getState().addScore(25);
    useGameStore.getState().addScore(15);
    expect(useGameStore.getState().score).toBe(40);
  });

  it('setPlaying toggles game state', () => {
    useGameStore.getState().setPlaying(true);
    expect(useGameStore.getState().isPlaying).toBe(true);
  });

  it('setTimeLeft updates timer', () => {
    useGameStore.getState().setTimeLeft(30);
    expect(useGameStore.getState().timeLeft).toBe(30);
  });

  it('setDifficulty changes difficulty', () => {
    useGameStore.getState().setDifficulty('hard');
    expect(useGameStore.getState().difficulty).toBe('hard');
  });

  it('resetGame resets all values', () => {
    useGameStore.getState().setScore(999);
    useGameStore.getState().setPlaying(true);
    useGameStore.getState().setTimeLeft(10);
    useGameStore.getState().resetGame();
    const state = useGameStore.getState();
    expect(state.score).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.timeLeft).toBe(60);
  });
});
