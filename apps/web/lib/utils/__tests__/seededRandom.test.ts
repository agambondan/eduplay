import { describe, expect, it } from 'vitest';
import { createSeededRNG, getDailyItem, getDailySeed } from '../seededRandom';

describe('seededRandom', () => {
  it('generates consistent seed for the same date string', () => {
    const seed1 = getDailySeed('2026-09-14');
    const seed2 = getDailySeed('2026-09-14');
    expect(seed1).toBe(seed2);
    expect(seed1).toBeGreaterThan(0);
  });

  it('generates different seeds for different dates', () => {
    const seedA = getDailySeed('2026-09-14');
    const seedB = getDailySeed('2026-09-15');
    expect(seedA).not.toBe(seedB);
  });

  it('produces deterministic pseudo-random sequences', () => {
    const rng1 = createSeededRNG(12345);
    const seq1 = [rng1(), rng1(), rng1(), rng1()];

    const rng2 = createSeededRNG(12345);
    const seq2 = [rng2(), rng2(), rng2(), rng2()];

    expect(seq1).toEqual(seq2);
    seq1.forEach((val) => {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });

  it('picks deterministic daily item from array', () => {
    const items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
    const item1 = getDailyItem(items, '2026-09-14');
    const item2 = getDailyItem(items, '2026-09-14');
    expect(item1).toBe(item2);
    expect(items).toContain(item1);
  });

  it('throws error for empty array in getDailyItem', () => {
    expect(() => getDailyItem([], '2026-09-14')).toThrow('Array must not be empty');
  });
});
