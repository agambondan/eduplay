# EduPlay — Educational Mini Game Platform

EduPlay is a web-based educational mini-game platform combining learning with gamification. It delivers lightweight educational games accessible on mobile (PWA) and desktop browsers with no human/creature images (only geometric/abstract art).

---

## Features

- **User Authentication:** Guest mode, Register/Login, JWT token-based auth.
- **Profile & Progress:** Level, dynamic XP system, daily streaks, achievements.
- **8 Core Games:**
  - _Math Quiz Blitz_: Quick math problems in 60 seconds (AI-assisted).
  - _Times Table Challenge_: Drilling multiplication 1-12.
  - _Wordle Bahasa Indonesia_: 5-letter word guessing game.
  - _Spelling Bee_: Drag-and-drop word scrambles with clues.
  - _Flag Quiz_: Trivia testing country name recognition from SVG flags.
  - _Capital City Quiz_: Geography test matching capital cities.
  - _Sudoku_: Traditional 9x9 sudoku logic game.
  - _2048_: Classic tile merging game.
- **Leaderboard System:** Global and game-specific ranks powered by Redis.
- **Daily Challenge:** Unique quiz resetting at 00:00 WIB with bonus rewards.
- **Monetization Hooks:** Ad slots (banner, interstitial, rewarded).

---

## Folder Structure

```
.
├── apps/
│   └── web/                  # Next.js 16 App Router (React 19, Tailwind, Zustand)
│       ├── app/              # Route layouts and pages
│       ├── components/       # Game engines & UI modules
│       └── lib/              # State stores, hooks, and API clients
├── services/
│   └── api/                  # Go 1.26 REST API (Fiber v2, GORM, Postgres 18, Redis 8)
│       ├── cmd/main.go       # Entry point & dependency wiring
│       ├── internal/         # Domain logic (auth, user, game, leaderboard)
│       └── pkg/              # Shared packages (db, response, logger)
├── docker-compose.yml        # Local DB & Redis setup
└── prd.md                    # Detailed Product Requirements Document
```

---

## How It Works

### Flow Diagram

```
[ Landing Page ]
       │
       ├─► [ Play Guest ] ──► [ Game Hub ] ──► [ Play Game ]
       │                                            │
       └─► [ Register/Login ]                       ▼
                 │                            [ Game Over ]
                 ▼                                  │
           [ Dashboard ]                      [ Submit Score ]
                 │                                  │
    ┌────────────┼────────────┐                     ▼
    ▼            ▼            ▼              [ Update Highscore ]
[Profile]  [Leaderboard]  [Daily Challenge]         │
                                                    ▼
                                             [ recalculate XP/Level ]
                                                    │
                                                    ▼
                                             [ check Achievement ]
```

- **Backend Logic:** Go handles DB migrations automatically with GORM AutoMigrate on startup.
- **Real-time Leaderboard:** Ranks are managed in-memory using Redis Sorted Sets (`ZADD`, `ZREVRANGE`) for speed, backed by PostgreSQL.
- **AI Questions:** Questions are generated dynamically on demand using Anthropic Claude API integration.

---

## Getting Started

### Prerequisites

- Go 1.25+
- Node.js 18+ & npm
- Docker (for Postgres & Redis)

### Step 1: Run Infrastructure

Start database and Redis locally using Docker:

```bash
docker compose up -d
```

### Step 2: Start Backend

1. Copy template and configure variables:
   ```bash
   cd services/api
   cp .env.example .env
   ```
2. Run development server (supports Hot Reload via `air`):
   ```bash
   make dev
   ```

### Step 3: Start Frontend

1. Copy template and configure variables:
   ```bash
   cd apps/web
   cp .env.example .env.local
   ```
2. Run development server (supports Hot Reload via `air`):
   ```bash
   make dev
   ```

### Step 3: Start Frontend

1. Copy template and configure variables:
   ```bash
   cd frontend
   cp .env.example .env.local
   ```
2. Install dependencies (use npm strictly):
   ```bash
   npm install
   ```
3. Run Next.js server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view application.

---

## Important Commands

### Backend (`services/api/`)

- `make dev`: Start dev server with hot-reload (requires `air`).
- `make build`: Build Go binary.
- `make run`: Run built binary.
- `make test`: Run Go tests.

### Frontend (`apps/web/`)

- `npm run dev`: Start dev server.
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint.

---

## Environment Variables

### Backend (`services/api/.env`)

Must set before running:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Postgres config.
- `REDIS_URL`: Redis connection string.
- `JWT_SECRET`: Secret key for signing tokens.
- `ANTHROPIC_API_KEY`: API key for AI question generation.

### Frontend (`apps/web/.env.local`)

- `NEXT_PUBLIC_API_URL`: Backend endpoint (e.g., `http://localhost:8080/api/v1`).
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`: Google AdSense ID.

---

## Screenshots

_(Placeholder for future screenshots: Hub, Gameplay, Leaderboard, etc.)_
