import { describe, expect, it } from 'vitest';
import { calculateDailyXP, calculateXP, scoreToGrade } from '../score';

describe('score utils', () => {
  describe('calculateXP', () => {
    it('applies 1.0x multiplier for easy difficulty', () => {
      expect(calculateXP(100, 'easy')).toBe(10);
      expect(calculateXP(55, 'easy')).toBe(5);
    });

    it('applies 1.5x multiplier for medium difficulty', () => {
      expect(calculateXP(100, 'medium')).toBe(15);
      expect(calculateXP(50, 'medium')).toBe(7);
    });

    it('applies 2.0x multiplier for hard difficulty', () => {
      expect(calculateXP(100, 'hard')).toBe(20);
      expect(calculateXP(45, 'hard')).toBe(9);
    });
  });

  describe('calculateDailyXP', () => {
    it('doubles the normal XP earned', () => {
      expect(calculateDailyXP(100, 'easy')).toBe(20);
      expect(calculateDailyXP(100, 'medium')).toBe(30);
      expect(calculateDailyXP(100, 'hard')).toBe(40);
    });
  });

  describe('scoreToGrade', () => {
    it('returns correct letter grade based on percentage', () => {
      expect(scoreToGrade(95, 100)).toBe('A');
      expect(scoreToGrade(90, 100)).toBe('A');
      expect(scoreToGrade(85, 100)).toBe('B');
      expect(scoreToGrade(80, 100)).toBe('B');
      expect(scoreToGrade(75, 100)).toBe('C');
      expect(scoreToGrade(70, 100)).toBe('C');
      expect(scoreToGrade(65, 100)).toBe('D');
      expect(scoreToGrade(60, 100)).toBe('D');
      expect(scoreToGrade(55, 100)).toBe('E');
      expect(scoreToGrade(0, 100)).toBe('E');
    });
  });
});
