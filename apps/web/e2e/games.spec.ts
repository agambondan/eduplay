import { expect, test } from '@playwright/test';

const MOCK_GAMES = [
  {
    id: 'game-1',
    slug: 'math-quiz',
    name: 'Math Quiz Blitz',
    description: 'Jawab soal matematika secepat kilat!',
    category: 'math',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'game-2',
    slug: 'wordle',
    name: 'Wordle Indonesia',
    description: 'Tebak kata 5 huruf!',
    category: 'language',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'game-3',
    slug: 'sudoku',
    name: 'Sudoku',
    description: 'Isi angka 1-9 tanpa duplikat!',
    category: 'logic',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'game-4',
    slug: 'make-24',
    name: 'Make 24',
    description: 'Susun 4 kartu angka menghasilkan nilai 24!',
    category: 'math',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'game-5',
    slug: 'color-shift',
    name: 'Color Shift',
    description: 'Uji fokus otak dengan konflik Stroop effect!',
    category: 'arcade',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'game-6',
    slug: 'stack-tower',
    name: 'Stack Tower',
    description: 'Tumpuk balok setinggi mungkin dengan presisi!',
    category: 'arcade',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

test.describe('Games hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('eduplay-cookie-consent', 'accepted');
      localStorage.setItem('eduplay-onboarding-done', 'true');
    });

    await page.route('**/api/v1/games', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_GAMES }),
      });
    });
  });

  test('games hub page loads and shows heading', async ({ page }) => {
    await page.goto('/games');
    // The heading uses t('game.hub') = 'Game Hub'
    await expect(page.getByRole('heading', { name: /game hub/i })).toBeVisible();
  });

  test('shows sub-heading describing the hub', async ({ page }) => {
    await page.goto('/games');
    await expect(page.getByText(/pilih kategori/i)).toBeVisible();
  });

  test('shows category grid (or loading skeleton) on initial render', async ({ page }) => {
    await page.goto('/games');
    const categoryOrSkeleton = page.locator(
      'button:has-text("Matematika"), button:has-text("Math"), button:has-text("Arcade"), [class*="animate-pulse"]'
    );
    await expect(categoryOrSkeleton.first()).toBeVisible();
  });

  test('clicking a category shows games list for that category', async ({ page }) => {
    await page.goto('/games');
    await page.waitForLoadState('networkidle');

    const mathCategory = page
      .locator('button:has-text("Matematika"), button:has-text("Math")')
      .first();
    await mathCategory.click();

    await expect(page).toHaveURL(/\/games\?cat=math/);
  });

  test('direct URL with cat param shows category page with back button', async ({ page }) => {
    await page.goto('/games?cat=math');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /matematika|math/i, level: 1 });
    await expect(heading).toBeVisible();
  });

  test('game category page shows games grid or empty state', async ({ page }) => {
    await page.goto('/games?cat=language');
    await page.waitForLoadState('networkidle');

    const hasContent =
      (await page.locator('a[href*="/games/"], [class*="animate-pulse"]').count()) > 0 ||
      (await page.getByText(/tidak ada game|belum ada game/i).isVisible());

    expect(hasContent).toBe(true);
  });

  test('navigating to a specific game page renders the game heading', async ({ page }) => {
    await page.goto('/games/wordle');
    await expect(page.getByRole('heading', { name: /wordle/i })).toBeVisible();
  });

  test('game page shows a start button (Mulai!)', async ({ page }) => {
    await page.goto('/games/wordle');
    await expect(page.getByRole('button', { name: /mulai/i })).toBeVisible();
  });

  test('math quiz game page shows Mulai! button', async ({ page }) => {
    await page.goto('/games/math-quiz');
    await expect(page.getByRole('button', { name: /mulai/i })).toBeVisible();
  });

  test('sudoku game page loads and shows Mulai! button', async ({ page }) => {
    await page.goto('/games/sudoku');
    await expect(page.getByRole('button', { name: /mulai/i })).toBeVisible();
  });

  test('make-24 game page loads and shows start button', async ({ page }) => {
    await page.goto('/games/make-24');
    await expect(page.getByRole('heading', { name: /make 24/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mulai/i })).toBeVisible();
  });

  test('color-shift game page loads and shows start button', async ({ page }) => {
    await page.goto('/games/color-shift');
    await expect(page.getByRole('heading', { name: /color shift/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mulai/i })).toBeVisible();
  });

  test('stack-tower game page loads and shows start button', async ({ page }) => {
    await page.goto('/games/stack-tower');
    await expect(page.getByRole('heading', { name: /stack tower/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mulai/i })).toBeVisible();
  });
});
