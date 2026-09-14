# Changelog — EduPlay

> **Instructions for AI Agents:**  
> Each time you complete a session, add your changes under a new `## [YYYY-MM-DD]` header.  
> Group entries under the appropriate category: `### Added`, `### Fixed`, `### Changed`, `### Removed`.  
> Use the `{Author}` placeholder — replace with your session identifier.

---

## [2026-09-14] — Vector Slash: Gesture Skill Engine & Telegraphed Boss Battles

### Added

- **Vector Slash Game Engine** (`apps/web/components/games/VectorSlash.tsx`, `apps/web/components/games/dynamic/VectorSlashDynamic.tsx`, `apps/web/app/(main)/games/vector-slash/page.tsx`, `layout.tsx`): 2.5D fast-paced combat arena with stroke gesture recognition:
  - **Whirlwind Slash (Circle Stroke)**: Detects closed loop strokes to trigger 360° radial shockwave knocking back surrounding enemies.
  - **Dash Thrust (Line Stroke)**: Detects straight flick strokes to pierce enemies along a vector trajectory with hitstop combo counters.
  - **Telegraphed Hazard Zones**: Golem boss warns of impending ground slams with shrinking red circle indicators requiring dodge rolls.
  - **Dodge Roll with Invulnerability**: Shift/Space/Touch dodge roll with ghost afterimages.
- **Web Audio Sound Synthesizer**: Custom procedural audio frequencies for whirlwind whooshes, vector thrusts, dodge rolls, and ground slams.
- **SEO & Localization**: Registered `vector-slash` in `lib/games-seo.ts` and bilingual locale dictionaries (`id.ts`, `en.ts`).
- **PRD Synchronization**: Updated `PRD_EduPlay_v2.md` Section 8 game matrix and Section 31 backlog.

---

## [2026-09-14] — Game Hub Instant Search & Zero-Creature Compliance

### Added

- **Instant Search on Game Hub (`apps/web/app/(main)/games/page.tsx`)**: Real-time interactive search across all 37+ games with instant name/category/description query matching and clear action.

### Changed

- **Onet Icon Theme Compliance (`apps/web/lib/game-engines/onetEngine.ts`)**: Replaced creature/animal icon set with geometric nature/botanical symbols (`nature`) ensuring strict compliance with zero-creature visual guidelines.

---

## [2026-09-14] — Grid Relay TD: Multi-Turret Architecture & Circuit Mechanics

### Added

- **Multi-Turret Arsenal** (`apps/web/components/games/GridRelayTD.tsx`): Added 3 distinct turret classes:
  - `Pulse Turret` (30W): Rapid single-target laser against fast geometric crawlers.
  - `Tesla AoE Coil` (50W): Multi-target electric arc chaining up to 5 enemies simultaneously.
  - `Relay Capacitor Node` (20W): Power distribution booster extending grid reach and accelerating passive power regeneration.
- **Circuit Drag & Touch Interaction**: Interactive pointer drag-to-cable linking adjacent cells with automatic BFS graph power connectivity.
- **Power Severing & Emergency Alarm**: Disruptor enemy explosive radius severs active power lines, accompanied by visual strobe warning banners and synthesized Web Audio alert frequencies.
- **Boss Waves**: Heavy Octagon geometric boss appearing every 5 waves with high HP and base impact damage.
- **Web Audio Procedural Synthesizer**: Procedural oscillator-driven sound effects for lasers, electric arcs, alarms, and explosions.

---

## [2026-09-14] — Offline Score Queue & Automatic PWA Sync

### Added

- **Offline Score Queue (`apps/web/lib/utils/offlineQueue.ts`)**: Resilient offline storage queue using `safeStorage` to buffer score submissions when network is disconnected or server requests fail.
- **Auto-Sync Lifecycle (`apps/web/components/layout/Providers.tsx`)**: Automatic queue synchronization triggered on `window.addEventListener('online')` and startup reconnection with toast feedback.
- **Unit Tests (`apps/web/lib/utils/__tests__/offlineQueue.test.ts`)**: Test coverage for enqueue, removal, and online sync handling.

### Changed

- **`useGame` Hook (`apps/web/lib/hooks/useGame.ts`)**: Integrated offline detection and score queue fallback with optimistic XP calculations and user notification.

---

## [2026-09-14] — New Games Suite: Make 24, Color Shift, and Stack Tower

### Added

- **Make 24** (`apps/web/components/games/Make24.tsx`, `apps/web/app/(main)/games/make-24/page.tsx`): Classic math 24 puzzle with safe Shunting Yard evaluator, solvable 4-number generation algorithm, interactive operator controls, hint solver, and streak scoring.
- **Color Shift (Stroop Effect)** (`apps/web/components/games/ColorShift.tsx`, `apps/web/app/(main)/games/color-shift/page.tsx`): Cognitive brain training game confronting color ink vs text meaning with combo multiplier and 3-life hard mode.
- **Stack Tower** (`apps/web/components/games/StackTower.tsx`, `apps/web/app/(main)/games/stack-tower/page.tsx`): 2D Canvas block stacking game with overhang slicing mechanics, dynamic rainbow hue progression, perfect combo chimes, and speed ramping.
- **Routing, Dynamic SSR Wrappers & SEO** (`apps/web/lib/games-seo.ts`): Registered metadata and dynamic imports for `/games/make-24`, `/games/color-shift`, and `/games/stack-tower`.
- **Backend Seed Update** (`services/api/cmd/main.go`): Registered `make-24`, `color-shift`, and `stack-tower` into default game seeds.
- **Localization** (`apps/web/lib/i18n/locales/id.ts`, `apps/web/lib/i18n/locales/en.ts`): Added English and Indonesian labels for all three new games.
- **PRD Synchronization** (`PRD_EduPlay_v2.md`): Updated Section 8 Roadmap Games table.

---

## [2026-09-14] — Grid Relay TD Prototype & STEM Integration

### Added

- **Grid Relay TD Game Engine** (`components/games/GridRelayTD.tsx`, `components/games/dynamic/GridRelayTDDynamic.tsx`, `app/(main)/games/grid-relay-td/page.tsx`): 2D Canvas real-time power management tower defense game with circuit connections, turret placement, geometric disrupter enemies, overcharge mechanic, and educational electrical physics power surge quizzes.
- **Game Metadata & SEO** (`lib/games-seo.ts`): Registered `grid-relay-td` route metadata and JSON-LD schema.
- **Backend Game Seed** (`services/api/cmd/main.go`): Added `grid-relay-td` to database seeding under the `science` category.
- **Localization** (`lib/i18n/locales/id.ts`, `lib/i18n/locales/en.ts`): Added English and Indonesian translations, how-to-play steps, and gameplay controls.
- **PRD Synchronization** (`PRD_EduPlay_v2.md`): Registered Grid Relay TD into Section 8 game matrix and Section 31 backlog.

---

## [2026-09-14] — Phase 5: Notification System, Motion A11y & Production Verification

### Added

- **Global Toast Notification System** (`components/ui/ToastContainer.tsx`, `lib/stores/toastStore.ts`): Standalone animated toast notifications with support for `info`, `success`, `warning`, and `error` types mounted into the application shell.
- **`usePrefersReducedMotion` Hook** (`lib/hooks/usePrefersReducedMotion.ts`): Media query listener for users with reduced motion accessibility preferences, wired into `ConfettiCanvas` to bypass particle physics loops.

### Fixed

- **`GridRelayTD.tsx` Result Typing**: Mapped `res.xp_earned` to `xp` for strict typecheck compliance.
- **ESLint Warnings Cleaned**: Resolved missing dependencies in `Sudoku`, `Wordle`, `TypingSpeed`, `MemoryMatch`, `SimonSays`, `SnakeGame`, and `MainLayout`.

### Verified

- Frontend: `npm test` passed (24/24 unit tests).
- Frontend: `npx tsc --noEmit` passed cleanly.
- Frontend: `npm run build` compiled all 72 static and dynamic routes.
- Backend: `go build ./...` and `go test ./...` passed.

---

## [2026-09-14] — Phase 4: Frontend Game Polish (P2 Breakdown, Daily Seeds & Mobile UX)

### Added

- **Score Breakdown in `ResultScreen`**: Interactive visual breakdown cards displaying accuracy, max streak, trial count, and speed metrics across quiz and puzzle games.
- **Top 3 Leaderboard Preview in `ResultScreen`**: Embedded instant leaderboard snapshot query so players see live top ranks upon game completion.
- **Seeded Deterministic Daily RNG (`lib/utils/seededRandom.ts`)**: Date-based pseudo-random generator `createSeededRNG` ensuring identical daily challenges across all players for Wordle, Sudoku, and Math Quiz.
- **Mobile Touch Optimization for Typing Speed**: Configured `inputMode="text"`, disabled mobile autocorrect interference, and added audio/haptic feedback on word submission.

### Changed

- Updated `Wordle`, `Sudoku`, and `MathQuiz` to leverage deterministic daily puzzles when `isDaily` is active.
- Enhanced `useQuizGame` to collect and provide accurate game breakdown metrics (accuracy %, max streak, correct/total).

---

## [2026-09-14] — Phase 3: Frontend Modernization & ESLint Flat Config Alignment

### Changed

- **React 19 Upgrade**: Upgraded `react` and `react-dom` to `^19.0.0` (resolving version mismatch with Next.js 16).
- **TypeScript Types**: Upgraded `@types/react` and `@types/react-dom` to `^19`.
- **ESLint 9 Flat Config**: Migrated to ESLint 9 flat config (`eslint.config.mjs`) using native `eslint-config-next` 16.3.5 presets. Updated `npm run lint` script to `eslint .`.
- **React 19 Hook Purity Fixes**: Wrapped event handlers with `useCallback` in `flag-team-battle/page.tsx`, `math-battle/page.tsx`, and `quiz-showdown/page.tsx` to fix React 19 `react-hooks/purity` rules regarding `Date.now()`.

### Verified

- Frontend: `npm run lint` passes with 0 errors across entire workspace.
- Frontend: `npm run build` succeeds (all 71 routes compiled).
- Frontend: `npm test` passes (24/24 unit tests green).
- Backend: `go build ./...` and `go test ./...` pass clean.

---

## [2026-09-14] — Frontend UX, A11y & Architecture Hardening (P0 + P1)

### Added

- **`useQuizGame` Hook** (`lib/hooks/useQuizGame.ts`): Unified quiz game state engine with generic question typing, streak multiplier, AI question generation, and score submissions.
- **Haptic & Sound Engine**: Synthesized Web Audio sounds (`win`, `lose`, `click`, `pop`, `correct`, `wrong`) in `soundStore.ts` and navigator haptics (`lib/utils/haptics.ts`) integrated into 10+ games.
- **Progress Persistence**: `safeStorage` utility and `useGameStorage` hook; state auto-resumes in Wordle and Sudoku upon reload.
- **Per-Game Error Boundary**: `GameContainer` wrapped in `ErrorBoundary` with fallback and retry buttons.
- **`CanvasEngine` & `useCanvasGame` Hook** (`lib/game-engines/CanvasEngine.ts`): Standardized 60fps canvas game loop with input management (pointer + keyboard `isKeyPressed`), entity layers, and lifecycle controls for arcade games.
- **Unified Difficulty Selector** (`components/ui/DifficultySelector.tsx`): Reusable level picker component across games.
- **Keyboard Navigation**: Added hotkeys (1-4 / A-D) across quiz games and (1-4 / Arrow Keys / QWAS) in Simon Says.
- **High-Contrast & Color-Blind Styles**: Added `@media (prefers-contrast: more)` tokens to `globals.css`.

### Fixed

- **Axios 401 Race Condition**: Implemented refresh token mutex and failed request queue in `lib/api/client.ts` to prevent parallel invalidations.
- **AI Question Loading**: `useQuizGame` immediately consumes freshly fetched questions without stale React closures.
- **Timer Submissions**: Synchronized quiz and puzzle timers with score submit handlers.

---

## [2026-09-14] — Phase 1: Security Hardening (Backend + Frontend)

### Fixed

- JWT `alg:none` vulnerability: added `jwt.WithValidMethods([]string{"HS256"})` to both `AuthMiddleware` and `OptionalAuthMiddleware` in `services/api/internal/middleware/auth.go`.
- Unsafe type assertions on `jti` claim replaced with comma-ok idiom in both middlewares.
- `JWT_SECRET` validation: fail fast on startup if empty in production (`services/api/config/config.go`).
- PostgreSQL `sslmode` now configurable via `DB_SSLMODE` env (default `disable` dev, `require` prod) in `config.go` and `postgres.go`.
- Midtrans webhook scope fix: update only the specific `order_id` instead of all pending subscriptions (`subscription_service.go`).
- Ad upload validation: max 2MB, whitelist extensions (jpg, jpeg, png, webp) in `ad_controller.go`.
- Safe type assertions & auth guards added across controllers:
  - `auth_controller.go` (Logout): comma-ok checks for token, claims, jti, exp.
  - `achievement_controller.go` (GetUserAchievements): guard on `user_id`.
  - `battleship_controller.go` (7 handlers): guard on `user_id`.
  - `chess_controller.go` (5 handlers): guard on `user_id`.
  - `tournament_controller.go` (4 handlers): guard on `user_id`.
  - `multiplayer_leaderboard.go` (CreateRematch): guard on `user_id`.
- Next.js middleware renamed from `proxy.ts` to `middleware.ts` with proper export for App Router security headers (CSP, HSTS, X-Frame-Options, etc.).

### Verified

- Backend: `go build ./...` and `go test ./...` pass.
- Frontend: `npm test` (vitest) 24 tests pass.

---

## [2026-09-14] — Phase 2: Data Integrity & Race Condition Fixes (Backend)

### Fixed

- **Atomic XP updates** across 5 services using `gorm.Expr("xp + ?")` + transaction:
  - `referral_service.go`: `ApplyReferral` wrapped in `DB.Transaction` — race-free XP award + referral creation.
  - `game_service.go`: `SubmitScore` uses atomic XP increment + re-read for level calculation.
  - `achievement_service.go`: `CheckAndUnlock` uses atomic `UpdateColumn("xp", gorm.Expr(...))`.
  - `daily_service.go`: `SubmitChallenge` atomic XP + streak increment + re-read level.
  - `tournament_service.go`: `distributeRewards` atomic XP per participant inside transaction.
- **Wordle wordlist data race** in `ws/games.go`: replaced lazy `initWordleWords` with `sync.Once` + safe initialization.
- **Redis `KEYS` blocking call** in `ws/matchmaking.go:165` replaced with `SCAN` iterator in `CancelQueue`.
- **Frontend timer leak** in `lib/hooks/useQuizGame.ts`: split `timerRef` into `gameTimerRef` + `transitionTimerRef` with cleanup on unmount.

### Added

- New test `TestReferralService_ApplyReferral` verifying atomic XP award + duplicate/self/invalid code guards.

### Verified

- Backend: `go build ./...` and `go test ./...` pass (30 tests incl. new referral test).
- Frontend: `npm test` (vitest) 24 tests pass; `npm run build` TypeScript clean.

---

## [2026-09-14] — Canvas 2D Engine Foundation & Game Migrations

### Added

- `CanvasEngine` 2D framework (`apps/web/lib/game-engines/CanvasEngine.ts`) with fixed-timestep `GameLoop`, `InputManager` (keyboard, pointer, touch), `EntityManager` with z-indexing, `AssetManager` with audio/image caching, and DPR-aware `CanvasRenderer`.
- `useCanvasGame` React hook for declarative canvas lifecycle integration.
- Asset caching configuration in `next.config.js` for `/games-assets/*` edge cache (1 year, immutable).
- Migrated 3 games to `CanvasEngine`:
  - `SnakeGame` (`SnakeEntity`, `GridBackground`, touch gesture support).
  - `BrickBreaker` (`BallEntity`, `PaddleEntity`, `BrickEntity`, `BackgroundGrid`, `GameControllerEntity` with math question bonus pause/resume).
  - `BubbleShooter` (`BubbleEntity`, `ProjectileEntity`, `ParticleEntity`, `CannonEntity`, `GameControllerEntity` with target sum matching and particle bursts).
- ESLint 9 flat config (`apps/web/eslint.config.mjs`) supporting TypeScript and Next.js rules.

### Fixed

- Fixed `CanvasEngine` initial state from `loading` to `ready` for games without external asset manifests.
- Fixed `npm run lint` script in `apps/web/package.json` to use `eslint .` (compatibility with Next.js 16).
- Fixed unescaped HTML `<a>` navigation in `verify-email/page.tsx` with Next.js `<Link>`.
- Verified games in live browser automation using Playwright (zero runtime errors).

### Changed

- Replaced raw `requestAnimationFrame` loops in `SnakeGame`, `BrickBreaker`, and `BubbleShooter` with decoupled `update(dt)` and `render(ctx)` entity pattern.
- Removed duplicate `useIsTouchDevice` hook from games in favor of shared hook.

---

## [2026-09-14] — Frontend Games P0 UX Polish

### Added

- Shared quiz gameplay hook for reusable question flow, scoring, AI questions, feedback, and timer finish handling.
- Sound and haptic feedback utilities for correct, wrong, win, lose, click, and tap interactions.
- Local progress persistence utilities, with Wordle and Sudoku resume state support.
- GameContainer-level error boundary so game crashes show retry UI instead of breaking the app shell.

### Fixed

- Quiz AI first-question flow now uses freshly fetched AI questions instead of stale state.
- Timeline History and Element Quiz timers now submit results on timeout through the shared quiz hook.
- Wordle and Sudoku now clear persisted progress after win/loss.

### Changed

- Capital Quiz, Element Quiz, Flag Quiz, and Timeline History now use the shared quiz hook.
- Times Table, Spelling Bee, Wordle, Game2048, Memory Match, Snake, Simon Says, Sudoku, and Nonogram now emit audio/haptic gameplay feedback.

## [2026-05-22] — Responsive Game Boards (No More Overflow)

### Fixed

- **Chess** — board cells changed from fixed `h-12 w-12` (48px) to `aspect-square` with responsive `clamp()` sizing; container uses `max-w-[min(480px,calc(100vw-32px))]` instead of `w-fit`
- **Nonogram** — completely restructured board layout: removed `overflow-auto` band-aid, cells now use `flex-1 aspect-square` instead of fixed `w-8 h-8`; clue bars use `flex-1` to match column widths; container constrained to `max-w-lg`
- **WordSearch** — cells changed from `h-8 w-8` to `aspect-square w-full` with grid container `max-w-md`; font size responsive via `text-xs sm:text-sm`
- **Onet** — grid `maxWidth` changed from hardcoded `cols*52px` to `min(cols*52px, 100%)`; cells changed from `h-12 w-12` to `aspect-square w-full`
- **BrickBreaker & BubbleShooter** — canvas container changed from `max-w-[min(96vw,600px)]` to `w-full max-w-[600px]` to eliminate 4% horizontal gap on mobile
- **MemoryMatch** — cells changed from `h-16 w-16` to `aspect-square w-full`; grid container now `w-full` so cards fill available space
- **Battleship-math** — board increased from `max-w-[360px]` to `w-full max-w-md` (448px) for better tablet/desktop experience
- **SnakeGame** — canvas changed from `w-[min(96vw,...)]` to `w-full max-w-[min(520px,70dvh)]` to fill edge-to-edge on mobile
- **Game2048** — cells changed from `h-16 w-16` to `aspect-square w-full`; grid container now `w-full max-w-sm` so board scales with screen
- **Crossword** — cells changed from `h-12 w-12` to `aspect-square w-full`; grid container now `w-full max-w-xs` for consistent sizing

## [2026-05-21] — Game Touch/Click UX + Gesture Handling

### Added

- **Shared `useIsTouchDevice` hook** (`lib/hooks/useIsTouchDevice.ts`) — deduplicated from BubbleShooter & BrickBreaker, now importable by any game
- **Pointercancel handlers** in WordSearch and Nonogram — resets drag state when touch is interrupted (incoming call, system gesture, etc.)
- **Touchcancel handler** in Game2048 — safe handling of interrupted swipe gestures

### Fixed

- **Game2048** — swipe on mobile no longer triggers page scroll/zoom; touch listeners moved from `window` to board element with `touch-action: none` and `passive: true`
- **Chess** — board now has `touch-action: none` + `select-none` to prevent double-tap zoom
- **Sudoku** — grid has `touch-action: none` + `select-none`; number pad buttons now `min-h-[44px]` for proper touch targets
- **MemoryMatch** — card grid has `touch-action: none` + `select-none` to prevent pull-to-refresh
- **SimonSays** — color button grid has `touch-action: none` + `select-none` to prevent zoom
- **BubbleShooter & BrickBreaker** — duplicated `useIsTouchDevice` replaced with shared import from `@/lib/hooks/useIsTouchDevice`

## [2026-05-21] — Responsive UI Polish + PWA/TWA Readiness

### Changed

- **Navbar** — nav items now scroll horizontally on tablet to prevent overflow; uses `overflow-x-auto scrollbar-none` with `flex-nowrap`
- **MobileNav** — trimmed to max 6 items (Home, Games, Daily, Friends, Leaderboard, Profile); admin users see Shield icon on Profile tab
- **MobileNav** — larger touch targets (`touch-manipulation`, `text-[11px]`, `leading-tight`)
- **Home page** — replaced emoji icons (`🎮⭐🏅🔥`) with consistent lucide-react icons (Gamepad2, Star, Medal, Flame); removed emoji from greeting
- **Daily/Blog/Support pages** — removed hardcoded `container px-4 py-8/10` overrides, now properly inherit main layout padding
- **Admin layout** — sidebar now uses `backdrop-blur-sm` overlay, `shadow-xl` transition, `touch-manipulation` with `py-3` touch targets; mobile header z-index lowered to `z-10`
- **Root layout** — added `viewportFit: 'cover'` for notched devices, `overscroll-behavior-y: contain` on body, `-webkit-tap-highlight-color: transparent` for PWA/TWA

### Fixed

- Horizontal overflow on tablet/mid-size Navbar with many items
- Inconsistent container padding between pages
- Missing PWA-safe overscroll behavior

## [2026-05-22] — Final Polish: MP Leaderboard + Subscription UI + Docs Sync

### Added

- Multiplayer Leaderboard frontend page (`/leaderboard/multiplayer`) with stats cards (wins/losses/win rate)
- Link from main leaderboard to multiplayer leaderboard via tab navigasi
- Premium subscription section in Settings with status check + Midtrans subscribe button
- `mpLeaderboardApi` and `subscribeApi` API clients in multiplayer.ts
- Crossword Co-op game seed + matchmaking + WS handler (shared grid, MVP tracking)
- Math Relay: game seed + WS room handler + relay question distribution + frontend
- Sitemap entries: crossword-duel, crossword-coop, math-relay, chess

### Fixed

- Chess WS: turn validation non-deterministic (map iteration order) → tracked via player_white/player_black
- Chess WS: FEN reset bug → removed empty FEN, use current_turn for validation
- Chess WS: runChessBotMove panic → removed (chess WS is human-only)
- Crossword: no game_over on completion → track global filled_cells + trigger game_over
- Crossword: stale onResult closure → useRef for stable callback
- Crossword Duel/Co-op: unified room handler to support both modes
- Missing type imports (CreateChallengeRequest, SubmitChallengeRequest, QuickMatchResult, etc.)
- Settings page: useEffect import for SubscribeSection

### Changed

- docs/HANDOFF.md: all tasks marked complete, final summary
- PRD_Addendum_Multiplayer_Bot.md: all phases marked ✅ Done
- README game count: updated from 28 to 34 games

### Added

- Ghost replay bot playback: `GhostBotPlayer` struct with event-driven goroutine that replays recorded ghost data with proper timing
- `tryAddGhostOrBot()` in hub.go: tries ghost service first, falls back to rule-based bot
- Ghost bot integrated into Math Battle, Wordle Duel, and Sudoku Race room handlers
- GhostBotProvider function type wiring in main.go via `service.NewGhostBotService()`

### Added

- Sudoku Race: bot auto-fill, result payload with player scores, achievement checker, proper ResultScreen with score comparison + XP
- Chess: chess.js frontend with minimax AI (alpha-beta pruning, depth 1-3), 3 bot difficulties, click-to-move, legal move indicators, move history
- Chess backend: model (FEN/moves/players/bot), service (CRUD + resign), REST API, DB migration, game seed
- Chess result recording via MultiplayerMatch/MatchParticipant

### Fixed

- Sudoku Race room handler: added bot auto-fill (same pattern as Wordle Duel) so QuickMatchBot creates a playing game
- Sudoku Race `handleSudokuCell`: sends proper `GameOverPayload` with Results array + calls achievement checker
- Sudoku Race timeout: proper FinishedAt + results
- Frontend type imports: added missing ChessMatch, CreateChessMatchRequest, QuickMatchResult, etc. to multiplayer.ts

---

## [2026-05-21] — Phase 5 Complete + Onet + Quiz Showdown Categories + Polish

### Added

- Onet Advance game with full game engine, gravity system (none/down/up/left/right), 6 icon themes, combo scoring, hint/shuffle, admin config page for grid/tiles/timer/theme/gravity
- Blog section: listing page with pagination, article pages, admin CRUD (list/create/edit/delete), sitemap, 3 seed articles
- Weekly email summary: Monday scheduler, HTML email template with stats, opt-in toggle in settings
- Quiz Showdown category support: geography (195 Country records), language (KBBI WordleWord), mix mode
- PWA manifest: `maskable` icon purpose for adaptive icons

### Fixed

- Quiz Showdown answer scoring: `CorrectAnswer` was math value instead of option index — answers never matched
- Next.js 16 middleware deprecation: `middleware.ts` → `proxy.ts`
- Cookie consent: GA4 + AdSense scripts now only load after user accepts
- Leaderboard rank double-counting: `GetUserRank` returns 1-based, service was adding +1
- `useSearchParams` Suspense boundaries: 2 remaining pages wrapped
- Game Hub/Daily/Leaderboard: blank screen on API failure → error + retry buttons
- Daily challenge: duplicate "Selesai!" text on h1 and p
- Mobile nav: missing Support, Blog, Admin links
- Dashboard: hardcoded Indonesian greetings → i18n
- Settings: language switcher placeholder → functional toggle
- Profile/Admin: brittle `count++` loading → `Promise.allSettled`
- AuthStore test: localStorage mock for Zustand persist
- ScoreBoard test: i18n key match instead of hardcoded text
- Vitest: exclude e2e/ directory from unit tests
- Leaderboard service tests: data isolation with SQLite
- `flag_team_battle.go` / `battleship_service.go`: various undefined symbols (fixed in current state)
- Wordle Duel result screen: placeholder spinner → full win/lose/XP/animation

### Changed

- `.env.example`: added `NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT`
- Docker Compose: production-ready with Nginx, healthchecks, resource limits
- Admin games page: added Onet config sub-page with gravity/icon/rows/cols/timer
- Navbar + MobileNav: added Blog link

---

## [2026-05-20] — Full Multiplayer + Blog API + Ads System

### Added

- WebSocket infrastructure: Hub, Room Manager, Matchmaking Queue, Bot system
- Math Battle (real-time 1v1): full WS game with scoring, timer, bot support
- Wordle Duel (real-time 1v1): WS-based with ghost replay bot
- Quiz Showdown (room 2-4p): room creation, settings, WS game flow
- Battleship Math (turn-based): REST API + rule-based bot
- Flag Team Battle (team mode): WS-based team competition
- Math Tournament (bracket): single-elimination, bot fill, daily/weekly
- Word Chain (async vs bot): Claude AI + KBBI dictionary fallback
- Async Challenges (trivia): challenge invite/link/expiry/notif
- Rule-based bot: 4 difficulties (easy/medium/hard/expert) with configurable delay + accuracy
- Ghost replay: recording solo sessions to DB, cleanup scheduler
- Score/Leaderboard Challenge: share link, score comparison, XP rewards
- Blog backend: `BlogPost` model, repository, service, controller, admin CRUD
- Blog seed: 3 articles (matematika, puzzle, wordle)
- Direct ads system: admin-managed ad slots with image/text/click URL + AdSense fallback
- Ads admin page: CRUD for direct ad campaigns
- Tournament admin page: list/cancel tournaments

### Changed

- `cmd/main.go`: wired blog service, ad service, tournament service, score challenge routes
- Multiplayer API client: `multiplayerApi`, `roomsApi`, `challengesApi`, `tournamentsApi`, `battleshipApi`, `wordChainApi`
- Game seed: added `wordle-duel`, `quiz-showdown`, `battleship-math`, `math-tournament`, `flag-team-battle`, `word-chain` as multiplayer category

### Fixed

- Stale migration SQL files removed (seeding done by Go `seedData()`)
- Avatar upload stores path in `avatar_url`, not `avatar_color`
- Mobile touch support for Bubble Shooter
- Cross-component Timer render conflict

---

## [2026-05-19] — P2 Features + Multiplayer Foundation

### Added

- Number Match game: cross-pairs summing to 10
- Fraction Visualizer: identify/compare/simplify fractions with visual bar
- Referral system: referral code generation, `POST /referral/apply`, profile card
- Guest mode: `POST /auth/guest` endpoint + frontend guest button
- Score sharing: Web Share API + WhatsApp fallback + clipboard
- Dark mode: theme store (light/dark/system), toggle, 100+ `dark:` utilities
- Onboarding flow: 4-step wizard (welcome, interests, daily prompt, push notif)
- Framer Motion animations: page transitions, question reveals, card animations
- E2E tests: Playwright — 4 spec files (auth, home, games hub, leaderboard)
- CI/CD: `ci.yml` (build+test), `deploy-prod.yml` (tag-triggered), `deploy-staging.yml`
- Nginx prod config: HTTPS, HSTS, CSP, security headers, proxy, rate limiting
- Deploy scripts: production docker-compose + staging docker-compose
- k6 load test: `load-test/script.js` with stages (50→100 users)
- Sentry monitoring + GA4 analytics integration

### Fixed

- Sudoku: keyboard navigation (arrow keys, number input)
- Leaderboard: live refresh every 30 seconds
- Profile: top games display, stats loading
- Nav visibility: hidden during active gameplay, restored on route change
- Guest redirect: logged-in users redirected from login/register to profile

---

## [2026-05-18] — Core Games + Gamification + API

### Added

- 8 launch games: Math Quiz, 2048, Wordle ID, Sudoku, Times Table, Spelling Bee, Flag Quiz, Capital City Quiz
- 12 roadmap games: Nonogram, Crossword ID, Mental Math, Element Quiz, Timeline History, Bubble Shooter, Brick Breaker, Word Search, Memory Match, Typing Speed, Simon Says, Snake
- XP system: formula, level thresholds (50 levels), difficulty multiplier
- Streak system: daily check, streak freeze item
- Achievement system: 13 achievements, evaluator, unlock triggers
- Daily Challenge: AI-generated questions, 2x XP bonus, countdown timer
- Leaderboard: per-game + global, weekly/monthly periods, Redis sorted sets
- User profile: stats, history chart, achievements grid
- Auth: JWT (access 15m + refresh 7d), forgot/reset password, email verification
- Admin dashboard: DAU chart, game popularity, user/game management
- Anti-cheat: checksum validation, rate limiting, anomaly detection
- API: standardized response format, error codes, pagination

### Fixed

- PWA: build flags for development mode
- Dev environment: `dev.sh` single-command startup with port cleanup
- Docke Compose: correct CORS, port mapping, health checks

---

## [2026-05-17] — Foundation + Auth + Database

### Added

- Next.js 16 project setup: App Router, Tailwind, shadcn/ui, TypeScript
- Go backend: Fiber v2, GORM, PostgreSQL, Redis
- Authentication: register, login, Google OAuth, logout, refresh token
- User module: profile, stats, avatar upload
- Game module: list, detail, score submit with server-side validation
- Database: all tables (users, games, sessions, highscores, achievements, etc.)
- Seed data: 8 initial games, 13 achievements, demo user
- Design system: color tokens, typography (Inter), spacing scale
- Layout: responsive navbar, mobile bottom nav, footer
- Game Hub: category grid, game cards, filter by category
- i18n: Bahasa Indonesia + English, locale switcher
- API client: Axios instance with JWT interceptor, TanStack Query
- Auth state: Zustand persist in localStorage
- Docker compose: Postgres + Redis for local dev
- Makefile: dev/test/build/lint targets
- Accessibility: WCAG 2.1 AA, skip links, ARIA labels, keyboard navigation
- Support/bug reporting: in-app form with email notification

### Fixed

- CORS configuration for local development
- Config loader path resolution
- Stale swagger/docs imports removed
- `.air.toml` with correct cmd path
