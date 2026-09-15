import { expect, test } from '@playwright/test';

const ALL_GAME_SLUGS = [
  '2048',
  'bastion-siege',
  'battleship-math',
  'brick-breaker',
  'bubble-shooter',
  'capital-quiz',
  'chess',
  'color-shift',
  'crossword',
  'crossword-coop',
  'crossword-duel',
  'element-quiz',
  'flag-quiz',
  'flag-team-battle',
  'fraction-visualizer',
  'grid-relay-td',
  'make-24',
  'math-battle',
  'math-quiz',
  'math-relay',
  'math-tournament',
  'memory-match',
  'mental-math',
  'nonogram',
  'number-match',
  'onet',
  'quiz-showdown',
  'simon-says',
  'snake',
  'spelling-bee',
  'stack-tower',
  'sudoku',
  'sudoku-race',
  'timeline-history',
  'times-table',
  'trivia-challenge',
  'typing-speed',
  'vector-slash',
  'word-chain',
  'wordle',
  'wordle-duel',
  'word-search',
];

test.describe('All 42 games render without uncaught errors', () => {
  for (const slug of ALL_GAME_SLUGS) {
    test(`game ${slug} loads without unhandled exceptions`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.addInitScript(() => {
        localStorage.setItem('eduplay-cookie-consent', 'accepted');
        localStorage.setItem('eduplay-onboarding-done', 'true');
      });

      await page.goto(`/games/${slug}`);
      await page.waitForTimeout(500);

      expect(errors).toEqual([]);
    });
  }
});
