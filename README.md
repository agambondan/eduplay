# EduPlay — Educational Mini Game Platform

EduPlay is a PWA educational mini-game platform combining learning with gamification. Built with Next.js 16 and Go 1.26, it features dynamic XP/leveling, daily challenges, AI-generated questions, and real-time leaderboards.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 16 App Router, React 19, Tailwind CSS, Zustand, TanStack Query |
| **Backend** | Go 1.26, Fiber v2, GORM, Postgres 18, Redis 8 |
| **AI** | Anthropic Claude API (dynamic question generation) |
| **Auth** | JWT (access + refresh token rotation) |

---

## Features

- **Authentication:** Register, Login, JWT with refresh token rotation.
- **Profile & Progress:** Dynamic XP/level, daily streaks, achievements, 7-day XP history graph.
- **8 Core Games:**
  - _Math Quiz Blitz_ — AI-generated math problems (60s).
  - _Times Table Challenge_ — Multiplication 1–12.
  - _Wordle Bahasa Indonesia_ — 5-letter word guessing.
  - _Spelling Bee_ — Drag-and-drop word scramble.
  - _Flag Quiz_ — Country flag trivia.
  - _Capital City Quiz_ — Geography capital city match.
  - _Sudoku_ — 9x9 logic puzzle.
  - _2048_ — Classic tile-merging game.
- **Leaderboard:** Global & per-game ranks via Redis Sorted Sets.
- **Daily Challenge:** Unique quiz per day, resets at 00:00 WIB, 2x XP bonus.
- **Monetization Hooks:** Banner, interstitial, and rewarded ad slots.
- **PWA:** Offline-capable via `next-pwa` (enabled in production).

---

## Architecture

```
apps/web/           # Next.js 16 frontend
  ├── app/          # Route groups: (auth), (main)
  ├── components/   # Game engines, UI modules
  └── lib/          # Stores, hooks, API client (Axios)

services/api/       # Go REST API
  ├── cmd/main.go   # Entry point & wiring
  ├── internal/
  │   ├── controller/  # HTTP handlers
  │   ├── service/     # Business logic
  │   ├── repository/  # Data access (GORM + Redis)
  │   └── model/       # Domain models
  └── pkg/          # Shared: db, response, logger, validator
```

**Data flow:** Landing → Play/Login → Game → Submit Score → Update Highscore (Redis + Postgres) → Recalculate XP/Level → Check Achievements → Return response.

---

## Development

### Prerequisites

- Go 1.25+
- Node.js 18+ & npm
- Docker & Docker Compose

### Quick Start

```bash
# 1. Start infrastructure (Postgres 18 + Redis 8)
docker compose up -d

# 2. Backend
cd services/api
cp .env.example .env    # edit as needed
make dev                # hot-reload via air

# 3. Frontend (separate terminal)
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Commands

### Root (`./`)

| Command | Description |
|---------|-------------|
| `make up` | Start all services (detached) |
| `make down` | Stop all services |
| `make build` | Build Docker images (cached) |
| `make rebuild` | Clean rebuild: down → build `--no-cache` → up |
| `make rebuild-api` | Rebuild only backend image + restart |
| `make rebuild-web` | Rebuild only frontend image + restart |
| `make logs` | Tail all container logs |
| `make ps` | List running containers |
| `make clean` | Nuke everything including volumes |

### Backend (`services/api/`)

| Command | Description |
|---------|-------------|
| `make dev` | Dev server with hot-reload |
| `make build` | Build Go binary |
| `make run` | Run binary |
| `make test` | Run all Go tests |

### Frontend (`apps/web/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run test` | Run Vitest unit tests (21 tests) |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | Run ESLint |

---

## Docker Production

```bash
make rebuild   # builds api (72MB) + web (336MB), runs all services
```

Images use distroless/base:nonroot (Go) and Next.js standalone output for minimal size.

---

## Environment Variables

### Backend (`services/api/.env`)

| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Postgres config |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing key |
| `JWT_ACCESS_EXPIRY` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL (e.g. `168h`) |
| `ANTHROPIC_API_KEY` | Claude API key for AI questions |

### Frontend (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (e.g. `http://localhost:8080/api/v1`) |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Google AdSense ID |

---

## Screenshots

_(Coming soon)_
