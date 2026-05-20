import { Difficulty } from '@/types/game';
import { create } from 'zustand';

interface LevelUpData {
  newLevel: number;
}

interface GameState {
  score: number;
  isPlaying: boolean;
  isPaused: boolean;
  timeLeft: number;
  difficulty: Difficulty;
  noTimer: boolean;
  levelUp: LevelUpData | null;
  setScore: (score: number) => void;
  addScore: (points: number) => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setTimeLeft: (time: number) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setNoTimer: (noTimer: boolean) => void;
  setLevelUp: (data: LevelUpData | null) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  isPlaying: false,
  isPaused: false,
  timeLeft: 60,
  difficulty: 'easy',
  noTimer: false,
  levelUp: null,
  setScore: (score) => set({ score }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPaused: (isPaused) => set({ isPaused }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setNoTimer: (noTimer) => set({ noTimer }),
  setLevelUp: (levelUp) => set({ levelUp }),
  resetGame: () =>
    set({
      score: 0,
      isPlaying: false,
      isPaused: false,
      timeLeft: 60,
      noTimer: false,
      levelUp: null,
    }),
}));
