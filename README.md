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

- **Authentication:** Register, Login, JWT with refresh token rotation, Google OAuth.
- **Profile & Progress:** Dynamic XP/level, daily streaks, achievements, 7-day XP history graph, top-5 games.
- **20 Games across 5 categories:**
  - _Math:_ Math Quiz Blitz, Times Table Challenge, Bubble Shooter Math, Brick Breaker
  - _Language:_ Wordle Bahasa Indonesia, Spelling Bee, Crossword Indonesia, Word Search
  - _Geography:_ Flag Quiz, Capital City Quiz
  - _Logic:_ Sudoku, 2048, Nonogram, Memory Match, Simon Says
  - _Arcade/Other:_ Snake Classic, Typing Speed, Timeline History, Element Quiz, Mental Arithmetic
- **Leaderboard:** Global & per-game ranks via Redis Sorted Sets, live refresh every 30s.
- **Daily Challenge:** Unique quiz per day, resets at 00:00 WIB, 2x XP bonus.
- **Friends:** View friend list, per-user stats.
- **Support:** In-app bug reporting with email notification.
- **Monetization Hooks:** Banner, interstitial, and rewarded ad slots (ready for AdSense).
- **PWA:** Offline-capable via `next-pwa` (enabled in production).
- **Accessibility:** WCAG 2.1 AA — keyboard navigation, skip links, ARIA labels, reduced-motion support.
- **i18n:** Bahasa Indonesia (primary) + English.

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

## PRD Sync Policy

The product specification lives in the `PRD_EduPlay_v2.md` file (and its addenda).

**Rule: Jika development mengubah ketentuan yang ada di PRD, update PRD-nya sekalian.**

Contoh perubahan yang wajib di-sync ke PRD:
- Menambah / menghapus / merename game atau fitur
- Mengubah priority (P0/P1/P2)
- Mengubah versi tech stack atau library
- Memindahkan sesuatu antara "In Scope" dan "Out of Scope"
- Mengubah struktur navigasi (tabs, routes)
- Mengubah formula skor, XP, atau mekanik game
- Menambah endpoint yang belum ada di API spec

File PRD:
- [`PRD_EduPlay_v2.md`](./PRD_EduPlay_v2.md) — master spec (selalu update ini dulu)
- [`PRD_Addendum_Multiplayer_Bot.md`](./PRD_Addendum_Multiplayer_Bot.md) — multiplayer + bot
- [`PRD_Addendum_Multiplayer_Games.md`](./PRD_Addendum_Multiplayer_Games.md) — game multiplayer tambahan
- [`PRD.md`](./PRD.md) — deprecated v1 (jangan diedit, referensi historis)

---

## Screenshots

_(Coming soon)_
