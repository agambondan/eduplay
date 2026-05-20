import { useGameStore } from '../gameStore';
import { beforeEach, describe, expect, it } from 'vitest';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('starts with default values', () => {
    const state = useGameStore.getState();
    expect(state.score).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.timeLeft).toBe(60);
    expect(state.difficulty).toBe('easy');
    expect(state.noTimer).toBe(false);
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

  it('setPaused toggles pause state', () => {
    useGameStore.getState().setPaused(true);
    expect(useGameStore.getState().isPaused).toBe(true);
    useGameStore.getState().setPaused(false);
    expect(useGameStore.getState().isPaused).toBe(false);
  });

  it('togglePause flips pause state', () => {
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().isPaused).toBe(true);
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().isPaused).toBe(false);
  });

  it('setNoTimer toggles no-timer mode', () => {
    useGameStore.getState().setNoTimer(true);
    expect(useGameStore.getState().noTimer).toBe(true);
  });

  it('resetGame resets all values', () => {
    useGameStore.getState().setScore(999);
    useGameStore.getState().setPlaying(true);
    useGameStore.getState().setPaused(true);
    useGameStore.getState().setNoTimer(true);
    useGameStore.getState().setTimeLeft(10);
    useGameStore.getState().resetGame();
    const state = useGameStore.getState();
    expect(state.score).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.noTimer).toBe(false);
    expect(state.timeLeft).toBe(60);
  });
});
