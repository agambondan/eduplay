# OpenCode Agent Instructions (EduPlay)

## Architecture & Boundary Overview

- **Backend:** Go 1.26 (Fiber v2, GORM, Postgres 18, Redis 8). Root: `services/api/`.
- **Frontend:** Next.js 16 App Router, React 19. Root: `apps/web/`.
- **Project Goal:** PWA educational mini-games. No human/creature images (geometric/abstract only).

## Command Guide

### Backend (`cd services/api/`)

- **Dev:** `make dev` (requires `air`)
- **Build/Run:** `make build` / `make run`
- **Test:** `make test`

### Frontend (`cd apps/web/`)

- **Package Manager:** `npm` (no lockfiles present natively, strictly use npm).
- **Dev:** `npm run dev`
- **Lint:** `npm run lint`

## Backend Conventions & Quirks

- **Entry point:** `services/api/cmd/main.go` - Handlers, services, and repos are manually wired here.
- **Auto-migrations:** GORM `DB.AutoMigrate` runs automatically on startup in `main.go`. DO NOT look for standard migration CLI runners like golang-migrate in `make migrate`.
- **Domain Structure:** Code is grouped by feature under `internal/` (e.g. `auth/`, `user/`, `game/`). Each domain has `handler.go`, `service.go`, `repository.go`, `model.go`.
- **Responses:** Standardized API responses via `services/api/pkg/response/response.go`.
- **Leaderboard Logic:** High scores are persisted in Postgres (`user_highscores`), but ranking operations must use Redis Sorted Sets (`internal/leaderboard/repository.go`).

## Frontend Conventions & Quirks

- **App Router:** Strictly App Router (`app/`). Uses `(auth)` and `(main)` layout groups.
- **Components Status:** Game engines (e.g., Wordle, Math Quiz) live in `components/games/` and are rendered by dynamic/static routes in `app/(main)/games/`.
- **State Management:**
  - `Zustand` (`lib/stores/`) for global client states (like `authStore.ts`).
  - `React Query` (`@tanstack/react-query`) with hooks (`lib/hooks/`) for data fetching.
- **API Client:** Use `lib/api/client.ts` (configured Axios instance) for all backend calls.
- **PWA:** `next-pwa` is configured in `next.config.js` but disabled during `NODE_ENV === 'development'`.
- **UI System:** shadcn/ui and Tailwind CSS. Tailwind classes should be merged using `lib/utils/cn.ts`.
- **Monetization Hooks:** Ad integration hooks exist (`lib/hooks/useAds.ts`) but UI components (`components/ads/`) may be incomplete/stubs.

## Security & External Services

- **Auth:** JWT. Tokens are handled via Axios interceptors in `lib/api/client.ts`.
- **AI Integration:** Anthropic Claude API used for dynamic question generation (`internal/ai/service.go`).

## General Workflow

- Check `services/api/.env.example` to ensure necessary environment variables are set locally.
- Do not commit changes unless the user explicitly requests it.

## PRD Sync Policy

**Whenever a development decision diverges from what is specified in PRD_EduPlay_v2.md
(or its addenda), update the relevant PRD section immediately as part of the same task.**

Examples of changes that require PRD sync:
- Adding, removing, or renaming a feature or game
- Changing a priority level (P0/P1/P2)
- Changing a tech stack version or library
- Moving something between "In Scope" and "Out of Scope"
- Changing navigation structure (tabs, routes)
- Changing scoring formulas, XP rules, or game mechanics
- Adding endpoints not listed in the API specification

The PRD files are:
- `PRD_EduPlay_v2.md` — master specification (always update this first)
- `PRD_Addendum_Multiplayer_Bot.md` — multiplayer + bot system
- `PRD_Addendum_Multiplayer_Games.md` — additional multiplayer games
- `PRD.md` — deprecated v1 (do not edit, historical reference only)
