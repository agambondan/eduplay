import { Page, Route, expect, test } from '@playwright/test';

type BoardCell = {
  ship: boolean;
  hit: boolean;
  miss: boolean;
  revealed?: boolean;
};

type MockMatch = ReturnType<typeof createMatch> & {
  pending_question?: {
    id: string;
    text: string;
    target: { row: number; col: number };
  };
  pending_expires_at?: string;
};

const API_PREFIX = '/api/v1/battleship';
const MATCH_ID = '00000000-0000-4000-8000-000000000010';
const NOW = '2026-05-21T03:00:00.000Z';
const TURN_EXPIRES_AT = '2026-05-22T03:00:00.000Z';
const PENDING_EXPIRES_AT = '2026-05-21T03:00:30.000Z';

test.describe('Battleship Math — backend-backed flow', () => {
  test('creates a bot match, targets a cell, submits an answer, and claims rewarded reveal', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    const requests: string[] = [];
    let match: MockMatch = createMatch();

    await mockAuth(page);
    await page.route('**/api/v1/ads**', (route) => route.fulfill(jsonResponse(null)));
    await page.route('**/api/v1/battleship**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();
      requests.push(`${method} ${path}`);

      if (method === 'GET' && path === API_PREFIX) {
        return route.fulfill(jsonResponse([]));
      }

      if (method === 'POST' && path === API_PREFIX) {
        expect(await request.postDataJSON()).toMatchObject({
          difficulty: 'medium',
          vs_bot: true,
          bot_difficulty: 'medium',
        });
        match = createMatch();
        return route.fulfill(jsonResponse(match));
      }

      if (method === 'GET' && path === `${API_PREFIX}/${MATCH_ID}`) {
        return route.fulfill(jsonResponse(match));
      }

      if (method === 'POST' && path === `${API_PREFIX}/${MATCH_ID}/target`) {
        expect(await request.postDataJSON()).toEqual({ row: 0, col: 0 });
        match = {
          ...match,
          pending_question: {
            id: 'question-1',
            text: '6 x 7',
            target: { row: 0, col: 0 },
          },
          pending_expires_at: PENDING_EXPIRES_AT,
        };
        return route.fulfill(jsonResponse(match));
      }

      if (method === 'POST' && path === `${API_PREFIX}/${MATCH_ID}/shot`) {
        expect(await request.postDataJSON()).toEqual({ answer: 42 });
        const targetBoard = makeBoard();
        targetBoard[0][0] = { ship: true, hit: true, miss: false };
        match = {
          ...match,
          pending_question: undefined,
          pending_expires_at: undefined,
          my_score: 25,
          opponent_score: 5,
          target_board: targetBoard,
          log: ['Player 1 mengenai kapal di A1.', ...match.log],
        };
        return route.fulfill(jsonResponse(match));
      }

      if (method === 'POST' && path === `${API_PREFIX}/${MATCH_ID}/reveal`) {
        const targetBoard = match.target_board.map((row) => row.map((cell) => ({ ...cell })));
        targetBoard[1][1] = { ship: false, hit: false, miss: false, revealed: true };
        targetBoard[1][2] = { ship: true, hit: false, miss: false, revealed: true };
        match = {
          ...match,
          target_board: targetBoard,
          reveal_used: true,
          log: ['Player 1 membuka area sekitar B2.', ...match.log],
        };
        return route.fulfill(jsonResponse(match));
      }

      return route.fulfill({ status: 404, body: 'Unhandled Battleship request' });
    });

    await page.goto('/games/battleship-math');

    await expect(page.getByRole('heading', { name: /battleship math/i })).toBeVisible();
    await page.getByRole('button', { name: /mulai match/i }).click();

    await expect(page.getByText(/panel tembakan/i)).toBeVisible();
    await page.getByRole('button', { name: 'Radar Lawan A1' }).click();
    await expect(page.getByText(/target a1/i)).toBeVisible();
    await expect(page.getByText('6 x 7')).toBeVisible();

    await page.getByRole('textbox').fill('42');
    await page.getByRole('button', { name: /^tembak$/i }).click();

    await expect(page.getByText(/giliran diproses/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Radar Lawan A1' })).toHaveText('X');

    await page.getByRole('button', { name: /reward reveal/i }).click();
    await expect(page.getByText(/reveal area 3x3 radar lawan/i)).toBeVisible();
    await page.getByRole('button', { name: /tonton iklan|watch ad/i }).click();

    await expect(page.getByRole('heading', { name: /reward diterima/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: /lanjutkan|resume/i }).click();
    await expect(page.getByRole('button', { name: /reveal dipakai/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Radar Lawan B3' })).toHaveText('S');

    expect(requests).toEqual(
      expect.arrayContaining([
        `GET ${API_PREFIX}`,
        `POST ${API_PREFIX}`,
        `POST ${API_PREFIX}/${MATCH_ID}/target`,
        `POST ${API_PREFIX}/${MATCH_ID}/shot`,
        `POST ${API_PREFIX}/${MATCH_ID}/reveal`,
      ])
    );
  });
});

async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    window.localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          accessToken: 'e2e-access-token',
          refreshToken: 'e2e-refresh-token',
          isGuest: false,
          user: {
            id: '00000000-0000-4000-8000-000000000001',
            username: 'e2e_player',
            email: 'e2e@example.com',
            xp: 0,
            level: 1,
            streak: 0,
            streak_freeze: 0,
            last_active: now,
            email_verified_at: now,
            avatar_color: '#10b981',
            avatar_url: '',
            role: 'user',
            is_active: true,
            referral_code: 'E2E001',
            created_at: now,
            updated_at: now,
          },
        },
        version: 0,
      })
    );
  });
}

function createMatch() {
  return {
    id: MATCH_ID,
    difficulty: 'medium',
    status: 'active',
    is_vs_bot: true,
    opponent_name: 'Bot Taktis',
    my_side: 'player1',
    current_turn: 'player1',
    my_turn: true,
    my_score: 0,
    opponent_score: 0,
    my_board: makeBoard(true),
    target_board: makeBoard(),
    turn_expires_at: TURN_EXPIRES_AT,
    reveal_used: false,
    log: ['Match Battleship Math dimulai.'],
    created_at: NOW,
    updated_at: NOW,
  };
}

function makeBoard(withFleet = false): BoardCell[][] {
  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => ({
      ship: withFleet && row === 0 && col < 4,
      hit: false,
      miss: false,
    }))
  );
}

function jsonResponse(data: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  };
}
