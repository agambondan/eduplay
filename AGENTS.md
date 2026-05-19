# OpenCode Agent Instructions (EduPlay)

## Architecture & Boundary Overview

- **Backend:** Go 1.25 (Fiber v2, GORM, Postgres 16, Redis 7). Root: `backend/`.
- **Frontend:** Next.js 14.1 App Router. Root: `frontend/`.
- **Project Goal:** PWA educational mini-games. No human/creature images (geometric/abstract only).

## Command Guide

### Backend (`cd backend/`)

- **Dev:** `make dev` (requires `air`)
- **Build/Run:** `make build` / `make run`
- **Test:** `make test`

### Frontend (`cd frontend/`)

- **Package Manager:** `npm` (no lockfiles present natively, strictly use npm).
- **Dev:** `npm run dev`
- **Lint:** `npm run lint`

## Backend Conventions & Quirks

- **Entry point:** `backend/cmd/main.go` - Handlers, services, and repos are manually wired here.
- **Auto-migrations:** GORM `DB.AutoMigrate` runs automatically on startup in `main.go`. DO NOT look for standard migration CLI runners like golang-migrate in `make migrate`.
- **Domain Structure:** Code is grouped by feature under `internal/` (e.g. `auth/`, `user/`, `game/`). Each domain has `handler.go`, `service.go`, `repository.go`, `model.go`.
- **Responses:** Standardized API responses via `backend/pkg/response/response.go`.
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

- Check `backend/.env.example` to ensure necessary environment variables are set locally.
- Do not commit changes unless the user explicitly requests it.
