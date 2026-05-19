import { Difficulty } from '@/types/game';

export function calculateXP(score: number, difficulty: Difficulty): number {
  const multiplier = difficulty === 'easy' ? 1.0 : difficulty === 'medium' ? 1.5 : 2.0;
  return Math.floor((score / 10) * multiplier);
}

export function calculateDailyXP(score: number, difficulty: Difficulty): number {
  return calculateXP(score, difficulty) * 2;
}

export function scoreToGrade(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'E';
}
