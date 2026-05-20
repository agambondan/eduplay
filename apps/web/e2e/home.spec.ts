import { expect, test } from '@playwright/test';

test.describe('Home page — smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads without crashing', async ({ page }) => {
    await expect(page).not.toHaveTitle(/error|404|500/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows EduPlay branding in navbar', async ({ page }) => {
    // Navbar brand link is visible on desktop
    await expect(page.getByRole('link', { name: 'EduPlay' })).toBeVisible();
  });

  test('has a link to the game hub', async ({ page }) => {
    // The home page contains a "Lihat Semua →" / View All link to /games
    // and the navbar also has the games link
    const gamesLinks = page.getByRole('link', { name: /game/i });
    await expect(gamesLinks.first()).toBeVisible();
  });

  test('navbar links navigate correctly', async ({ page }) => {
    // Click the Games nav item
    await page.getByRole('link', { name: /game/i }).first().click();
    await expect(page).toHaveURL(/\/games/);
  });

  test('navbar contains Login and Register links when logged out', async ({ page }) => {
    await expect(page.getByRole('link', { name: /masuk|login/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /daftar|register/i }).first()).toBeVisible();
  });

  test('leaderboard CTA button is present', async ({ page }) => {
    await expect(page.getByRole('link', { name: /lihat ranking/i })).toBeVisible();
  });
});
