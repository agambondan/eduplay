import { create } from "zustand";
import { Difficulty } from "@/types/game";

interface GameState {
  score: number;
  isPlaying: boolean;
  timeLeft: number;
  difficulty: Difficulty;
  setScore: (score: number) => void;
  addScore: (points: number) => void;
  setPlaying: (playing: boolean) => void;
  setTimeLeft: (time: number) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  isPlaying: false,
  timeLeft: 60,
  difficulty: "easy",
  setScore: (score) => set({ score }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setDifficulty: (difficulty) => set({ difficulty }),
  resetGame: () => set({ score: 0, isPlaying: false, timeLeft: 60 }),
}));
