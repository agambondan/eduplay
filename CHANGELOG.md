# Changelog — EduPlay

> **Instructions for AI Agents:**  
> Each time you complete a session, add your changes under a new `## [YYYY-MM-DD]` header.  
> Group entries under the appropriate category: `### Added`, `### Fixed`, `### Changed`, `### Removed`.  
> Use the `{Author}` placeholder — replace with your session identifier.

---

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
