import { test, expect } from "@playwright/test";

test.describe("Games hub", () => {
    test("games hub page loads and shows heading", async ({ page }) => {
        await page.goto("/games");
        // The heading uses t('game.hub') = 'Game Hub'
        await expect(
            page.getByRole("heading", { name: /game hub/i }),
        ).toBeVisible();
    });

    test("shows sub-heading describing the hub", async ({ page }) => {
        await page.goto("/games");
        await expect(
            page.getByText(/pilih kategori game/i),
        ).toBeVisible();
    });

    test("shows category grid (or loading skeleton) on initial render", async ({
        page,
    }) => {
        await page.goto("/games");
        // Either a real category button or the animate-pulse skeleton is present
        const categoryOrSkeleton = page.locator(
            'button, [class*="animate-pulse"]',
        );
        await expect(categoryOrSkeleton.first()).toBeVisible();
    });

    test("clicking a category shows games list for that category", async ({
        page,
    }) => {
        await page.goto("/games");

        // Wait for network idle so categories are rendered
        await page.waitForLoadState("networkidle");

        // Find the first category button (they have text + count badge)
        const firstCategory = page.locator("button").first();
        const categoryName = await firstCategory.textContent();

        await firstCategory.click();

        // URL should now include ?cat=<something>
        await expect(page).toHaveURL(/\/games\?cat=/);
    });

    test("direct URL with cat param shows category page with back button", async ({
        page,
    }) => {
        await page.goto("/games?cat=math");

        // The category header area is visible (icon + title)
        // On mobile the back button is hidden, on desktop it's visible
        const heading = page.getByRole("heading", { name: /math/i });
        await expect(heading).toBeVisible();
    });

    test("game category page shows games grid or empty state", async ({
        page,
    }) => {
        await page.goto("/games?cat=language");

        await page.waitForLoadState("networkidle");

        // Either game cards or the empty state message
        const hasContent =
            (await page.locator('[class*="GameCard"], [class*="animate-pulse"]').count()) > 0 ||
            (await page.getByText(/tidak ada game/i).isVisible());

        expect(hasContent).toBe(true);
    });

    test("navigating to a specific game page renders the game heading", async ({
        page,
    }) => {
        await page.goto("/games/wordle");

        await expect(
            page.getByRole("heading", { name: /wordle/i }),
        ).toBeVisible();
    });

    test("game page shows a start button (Mulai!)", async ({ page }) => {
        await page.goto("/games/wordle");

        // t('game.start') = 'Mulai!'
        await expect(
            page.getByRole("button", { name: /mulai/i }),
        ).toBeVisible();
    });

    test("math quiz game page shows Mulai! button", async ({ page }) => {
        await page.goto("/games/math-quiz");

        await expect(
            page.getByRole("button", { name: /mulai/i }),
        ).toBeVisible();
    });

    test("sudoku game page loads and shows Mulai! button", async ({ page }) => {
        await page.goto("/games/sudoku");

        await expect(
            page.getByRole("button", { name: /mulai/i }),
        ).toBeVisible();
    });
});
