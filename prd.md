# Product Requirements Document (PRD)

## EduPlay — Educational Mini Game Platform

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2026-05-20  
**Author:** Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [Features & Requirements](#5-features--requirements)
6. [Game Catalog](#6-game-catalog)
7. [Monetization Strategy](#7-monetization-strategy)
8. [UX & Design System](#8-ux--design-system)
9. [Technical Architecture](#9-technical-architecture)
10. [Database Schema](#10-database-schema)
11. [API Specification](#11-api-specification)
12. [Security Requirements](#12-security-requirements)
13. [Performance Requirements](#13-performance-requirements)
14. [Infrastructure & Deployment](#14-infrastructure--deployment)
15. [Development Roadmap](#15-development-roadmap)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Open Questions](#17-open-questions)

---

## 1. Executive Summary

**EduPlay** adalah platform web-based educational mini game yang menggabungkan pembelajaran dengan gamifikasi. Platform ini menyediakan berbagai game edukatif ringan yang dapat diakses melalui browser (web) dan mobile (PWA) tanpa perlu instalasi dari app store.

Platform dirancang untuk:

- Menyediakan konten belajar yang menyenangkan untuk pelajar SD hingga SMA
- Dapat dimonetisasi melalui iklan (Google AdSense/AdMob) dan sistem freemium
- Scalable untuk ribuan pengguna concurrent
- Tidak mengandung gambar manusia atau makhluk hidup (aman untuk semua kalangan)

---

## 2. Product Overview

### 2.1 Problem Statement

- Aplikasi belajar yang ada seringkali membosankan dan tidak engaging
- Game hiburan tidak memiliki nilai edukasi
- Tidak ada platform yang menggabungkan keduanya secara ringan dan accessible di browser

### 2.2 Solution

Platform mini game edukatif berbasis web dengan:

- Multi-kategori game (Math, Language, Geography, Logic)
- Sistem gamifikasi (XP, Level, Streak, Achievement)
- Daily challenge untuk meningkatkan retention
- AI-powered question generator (Claude API) agar soal tidak habis
- Monetisasi ads yang natural dan tidak mengganggu
- PWA support sehingga bisa di-install dari browser

### 2.3 Product Scope

**In Scope:**

- Web platform (desktop & mobile browser)
- PWA (installable dari browser)
- User authentication (register/login)
- 8 game edukatif pada launch
- Leaderboard global dan per-game
- Daily challenge
- Ad integration (banner, interstitial, rewarded)
- Admin dashboard (basic)

**Out of Scope (v1):**

- Native iOS/Android app
- Multiplayer real-time
- Live classroom/teacher dashboard
- Subscription/payment gateway
- Social features (friends, chat)

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

| Goal             | Metric                     | Target (3 bulan) |
| ---------------- | -------------------------- | ---------------- |
| User acquisition | Monthly Active Users (MAU) | 10,000           |
| Retention        | Day-7 retention rate       | ≥ 25%            |
| Engagement       | Avg session duration       | ≥ 8 menit        |
| Monetization     | Monthly ad revenue         | Rp 5,000,000     |
| Growth           | Week-over-week user growth | ≥ 10%            |

### 3.2 Technical Goals

| Goal                | Metric               | Target      |
| ------------------- | -------------------- | ----------- |
| Performance         | Page load time (LCP) | < 2.5 detik |
| Reliability         | Uptime               | ≥ 99.5%     |
| API Response        | P95 response time    | < 200ms     |
| Game responsiveness | Input lag            | < 50ms      |

---

## 4. Target Users

### 4.1 Primary User Segments

**Segment 1: Pelajar SD-SMP (7-14 tahun)**

- Motivasi: Belajar dengan cara yang menyenangkan
- Pain point: Buku dan video belajar membosankan
- Perangkat: Smartphone (Android), tablet
- Waktu main: Sepulang sekolah, weekend

**Segment 2: Pelajar SMA (15-18 tahun)**

- Motivasi: Persiapan ujian, tantangan soal
- Pain point: Tidak ada cara menarik untuk drilling soal
- Perangkat: Smartphone + laptop
- Waktu main: Malam hari, sela waktu

**Segment 3: Orang Tua & Guru**

- Motivasi: Mencari media belajar yang aman untuk anak
- Pain point: Konten tidak sesuai usia
- Perangkat: Laptop/desktop
- Kebutuhan: Konten bebas konten dewasa, no human/creature images

### 4.2 User Persona

**Persona 1: Budi, 12 tahun**

> "Bosen baca buku, pengen belajar tapi sambil main game"

- Suka kompetisi, senang lihat skor tinggi
- Kebutuhan: Game math dan bahasa yang seru
- Motivasi: Leaderboard, achievement badge

**Persona 2: Sari, 17 tahun**

> "Perlu latihan soal yang banyak sebelum ujian"

- Hasil belajar oriented, suka progress tracking
- Kebutuhan: Quiz dengan banyak soal variatif
- Motivasi: Level up, daily streak

---

## 5. Features & Requirements

### 5.1 Authentication

| ID      | Feature       | Priority | Deskripsi                                 |
| ------- | ------------- | -------- | ----------------------------------------- |
| AUTH-01 | Register      | P0       | Register dengan email + password          |
| AUTH-02 | Login         | P0       | Login dengan email + password             |
| AUTH-03 | Guest Mode    | P1       | Main tanpa akun, progress tidak tersimpan |
| AUTH-04 | JWT Auth      | P0       | Token-based authentication                |
| AUTH-05 | Refresh Token | P1       | Auto-renew session                        |
| AUTH-06 | Logout        | P0       | Clear session                             |
| AUTH-07 | Google OAuth  | P2       | Login dengan Google (v1.1)                |

### 5.2 User Profile & Progress

| ID      | Feature          | Priority | Deskripsi                                  |
| ------- | ---------------- | -------- | ------------------------------------------ |
| PROF-01 | Profile Page     | P0       | Username, level, XP, streak                |
| PROF-02 | XP System        | P0       | Dapat XP dari setiap game yang dimainkan   |
| PROF-03 | Level System     | P0       | Level naik berdasarkan total XP            |
| PROF-04 | Daily Streak     | P0       | Streak bertambah jika main tiap hari       |
| PROF-05 | Achievement      | P1       | Badge/achievement yang bisa di-unlock      |
| PROF-06 | Per-game stats   | P1       | Highscore, total games, avg score per game |
| PROF-07 | Progress History | P2       | Grafik progress mingguan/bulanan           |

### 5.3 Game System

| ID      | Feature          | Priority | Deskripsi                                  |
| ------- | ---------------- | -------- | ------------------------------------------ |
| GAME-01 | Game Hub         | P0       | Halaman utama dengan daftar semua game     |
| GAME-02 | Game Categories  | P0       | Filter per kategori (Math, Language, etc.) |
| GAME-03 | Score Submit     | P0       | Submit skor ke server setelah game selesai |
| GAME-04 | Highscore        | P0       | Simpan dan tampilkan highscore user        |
| GAME-05 | Game Timer       | P0       | Timer pada game yang berbasis waktu        |
| GAME-06 | AI Questions     | P1       | Generate soal dinamis via Claude API       |
| GAME-07 | Difficulty Level | P1       | Easy / Medium / Hard                       |
| GAME-08 | Sound FX         | P2       | Efek suara (mute-able)                     |

### 5.4 Leaderboard

| ID      | Feature              | Priority | Deskripsi                               |
| ------- | -------------------- | -------- | --------------------------------------- |
| LEAD-01 | Per-game leaderboard | P0       | Top 100 skor per game                   |
| LEAD-02 | Global leaderboard   | P1       | Ranking berdasarkan total XP            |
| LEAD-03 | Weekly reset         | P1       | Leaderboard mingguan (reset tiap Senin) |
| LEAD-04 | User rank display    | P1       | Tampilkan posisi user saat ini          |

### 5.5 Daily Challenge

| ID    | Feature         | Priority | Deskripsi                                     |
| ----- | --------------- | -------- | --------------------------------------------- |
| DC-01 | Daily quiz      | P0       | 1 set soal spesial per hari (reset 00:00 WIB) |
| DC-02 | Bonus XP        | P0       | XP 2x jika complete daily challenge           |
| DC-03 | Streak reward   | P1       | Reward khusus jika streak 7/30 hari           |
| DC-04 | Countdown timer | P0       | Tampilkan sisa waktu hingga reset             |

### 5.6 Monetisasi

| ID     | Feature          | Priority | Deskripsi                                    |
| ------ | ---------------- | -------- | -------------------------------------------- |
| ADS-01 | Banner Ads       | P0       | Banner di bawah layar, semua halaman         |
| ADS-02 | Interstitial Ads | P0       | Full-screen ads saat game over / antar level |
| ADS-03 | Rewarded Ads     | P1       | Nonton iklan → dapat hint / extra attempt    |
| ADS-04 | Ad frequency cap | P0       | Max 1 interstitial per 3 menit per user      |
| ADS-05 | Ad-free mode     | P2       | Remove ads via one-time IAP (v1.1)           |

---

## 6. Game Catalog

### Launch Games (v1.0) — 8 Games

Semua game **tidak mengandung gambar manusia atau makhluk hidup**. Menggunakan elemen geometri, angka, huruf, kartu, dan ikon abstrak.

---

#### 6.1 Math Quiz Blitz

- **Kategori:** Math
- **Deskripsi:** Jawab soal matematika (penjumlahan, pengurangan, perkalian, pembagian) secepat mungkin dalam 60 detik
- **Mechanic:** Pilihan ganda 4 opsi, timer per soal 10 detik
- **Scoring:** +10 poin per jawaban benar, -3 poin salah, time bonus
- **Difficulty:** Easy (angka 1-20), Medium (1-100), Hard (1-1000 + campuran)
- **Ad slot:** Banner (bawah), interstitial (setelah game over)
- **AI Integration:** Claude API generate soal bervariasi (cerita soal, word problem)

#### 6.2 Times Table Challenge

- **Kategori:** Math
- **Deskripsi:** Drilling perkalian 1-12 secara gamified
- **Mechanic:** Fill-in-the-blank, ada progress bar per tabel
- **Scoring:** XP berdasarkan akurasi dan kecepatan
- **Difficulty:** Pilih tabel (1-12) atau random
- **Ad slot:** Rewarded (hint), banner

#### 6.3 Wordle Bahasa Indonesia

- **Kategori:** Language
- **Deskripsi:** Tebak kata bahasa Indonesia 5 huruf dalam 6 percobaan
- **Mechanic:** Keyboard virtual, color feedback (hijau/kuning/abu)
- **Scoring:** Skor berdasarkan jumlah percobaan (1=100, 2=80, …, 6=10)
- **Reset:** Daily word reset setiap hari
- **Ad slot:** Banner, interstitial setelah game selesai
- **Data:** Database kata bahasa Indonesia KBBI (min 500 kata)

#### 6.4 Spelling Bee

- **Kategori:** Language
- **Deskripsi:** Susun huruf-huruf acak menjadi kata yang benar
- **Mechanic:** Drag & drop huruf, ada clue berupa definisi
- **Scoring:** +15 poin per kata benar, bonus kecepatan
- **Ad slot:** Rewarded (reveal 1 huruf), interstitial antar level
- **AI Integration:** Claude API generate definisi dan hint

#### 6.5 Flag Quiz

- **Kategori:** Geography
- **Deskripsi:** Tebak nama negara dari gambar benderanya
- **Mechanic:** Pilihan ganda 4 opsi, 30 soal per ronde
- **Scoring:** +5 poin benar, timer bonus
- **Note:** Bendera adalah geometri dan simbol, bukan gambar makhluk hidup
- **Ad slot:** Interstitial tiap 10 soal, banner
- **Data:** 195 negara dengan bendera SVG

#### 6.6 Capital City Quiz

- **Kategori:** Geography
- **Deskripsi:** Tebak ibukota dari nama negara (atau sebaliknya)
- **Mechanic:** Pilihan ganda + mode ketik
- **Scoring:** +10 poin benar, streak multiplier
- **Ad slot:** Banner, interstitial setelah game over
- **AI Integration:** Generate konteks/fakta menarik tentang kota

#### 6.7 Sudoku

- **Kategori:** Logic
- **Deskripsi:** Classic Sudoku 9x9
- **Mechanic:** Isi grid, highlight conflict otomatis, pencil mode
- **Scoring:** Waktu + kesalahan (lebih cepat & sedikit salah = skor tinggi)
- **Difficulty:** Easy, Medium, Hard, Expert
- **Ad slot:** Banner, rewarded (reveal 1 kotak), interstitial setelah selesai
- **Generator:** Algoritam backtracking untuk generate puzzle valid

#### 6.8 2048

- **Kategori:** Logic
- **Deskripsi:** Classic 2048 — geser tile, gabungkan angka yang sama
- **Mechanic:** Swipe/arrow keys, tile merge animation
- **Scoring:** Total nilai semua tile saat game over
- **Ad slot:** Banner, interstitial game over, rewarded (undo 1 langkah)

---

### Roadmap Games (v1.1 — v1.3)

| Game                  | Kategori | Version |
| --------------------- | -------- | ------- |
| Nonogram              | Logic    | v1.1    |
| Crossword Indonesia   | Language | v1.1    |
| Mental Math Speed     | Math     | v1.1    |
| Element Quiz (Kimia)  | Science  | v1.2    |
| Timeline History      | History  | v1.2    |
| Bubble Shooter (Math) | Math     | v1.2    |
| Word Search           | Language | v1.3    |
| Brick Breaker (Soal)  | Math     | v1.3    |

---

## 7. Monetization Strategy

### 7.1 Ad Network

| Platform       | Channel                      | Format                         |
| -------------- | ---------------------------- | ------------------------------ |
| Google AdSense | Web (desktop/mobile browser) | Banner, Interstitial           |
| Google AdMob   | PWA / Mobile                 | Banner, Interstitial, Rewarded |

### 7.2 Ad Placement Rules

```
Banner Ads:
- Posisi: Fixed bottom, height 50px mobile / 90px desktop
- Halaman: Home, game lobby, leaderboard, profile
- Tidak ditampilkan: Saat game aktif berlangsung

Interstitial Ads:
- Trigger: Game over, level selesai, kembali ke home dari game
- Frequency cap: Maks 1x per 3 menit per user
- Skip: Setelah 5 detik

Rewarded Ads:
- Trigger: User tap tombol "Hint", "Undo", "Extra Life"
- Reward: Hint reveal, undo move, tambah nyawa/attempt
- Tidak bisa di-force, harus voluntary
```

### 7.3 Revenue Projections

| Metric                 | Estimasi                                 |
| ---------------------- | ---------------------------------------- |
| CPM Banner (Indonesia) | Rp 2,000 - 5,000                         |
| CPM Interstitial       | Rp 8,000 - 15,000                        |
| CPM Rewarded           | Rp 15,000 - 30,000                       |
| Avg session = 8 menit  | ~3 interstitial + 1 rewarded per session |

---

## 8. UX & Design System

### 8.1 Design Principles

- **Clean & Minimal:** Fokus pada konten game, tidak distracting
- **Consistent:** Komponen yang sama di semua game
- **Accessible:** Kontras tinggi, font besar, touch-friendly
- **Fast:** Animasi singkat (<300ms), tidak ada loading panjang
- **No Living Creatures:** Semua visual menggunakan geometri, angka, huruf, ikon abstrak

### 8.2 Color Palette

```
Primary:       #4F46E5  (Indigo 600)
Primary Dark:  #3730A3  (Indigo 800)
Secondary:     #10B981  (Emerald 500)
Accent:        #F59E0B  (Amber 500)
Danger:        #EF4444  (Red 500)
Background:    #F9FAFB  (Gray 50)
Surface:       #FFFFFF
Text Primary:  #111827  (Gray 900)
Text Muted:    #6B7280  (Gray 500)
Border:        #E5E7EB  (Gray 200)

Dark Mode:
Background:    #0F172A  (Slate 900)
Surface:       #1E293B  (Slate 800)
Text:          #F1F5F9  (Slate 100)
```

### 8.3 Typography

```
Font Family: Inter (Google Fonts)
Headings:    Inter Bold
Body:        Inter Regular
Numbers:     Inter Tabular / Mono (untuk game angka)

Scale:
- Display: 36px / 700 weight
- H1: 28px / 700
- H2: 22px / 600
- H3: 18px / 600
- Body: 16px / 400
- Small: 14px / 400
- Caption: 12px / 400
```

### 8.4 Spacing & Layout

```
Base unit: 4px
Grid: 12-column
Breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

Container max-width: 1200px
Game canvas: max 600px width (centered)
Touch target minimum: 44x44px
```

### 8.5 Component Library

Menggunakan **shadcn/ui** sebagai base component library dengan customisasi tema.

Komponen utama yang dibutuhkan:

- `GameCard` — card untuk setiap game di hub
- `ScoreBoard` — tampilan skor real-time dalam game
- `Timer` — countdown timer dengan animasi
- `ProgressBar` — XP progress, level progress
- `AchievementToast` — notifikasi achievement
- `LeaderboardRow` — baris di leaderboard
- `AdBanner` — wrapper untuk ad unit
- `DailyChallengeCard` — card daily challenge dengan countdown
- `XPBadge` — tampilan level + XP user
- `StreakCounter` — tampilan streak hari

### 8.6 Screen Flow

```
Landing Page (Guest)
  ├── Register → Dashboard
  ├── Login → Dashboard
  └── Play as Guest → Game Hub

Dashboard (Logged In)
  ├── Game Hub
  │   └── Game Detail → Play Game → Game Over → Score Submit
  ├── Daily Challenge → Play → Submit
  ├── Leaderboard (Global / Per Game)
  └── Profile
      ├── Stats
      ├── Achievements
      └── Settings
```

### 8.7 Mobile-First Design Notes

- Game canvas harus responsif, menyesuaikan ukuran layar
- Semua interaksi harus touch-friendly (swipe, tap)
- Bottom navigation bar untuk mobile (Home, Games, Leaderboard, Profile)
- Top navigation bar untuk desktop
- Keyboard virtual untuk game yang memerlukan input huruf/angka
- Banner ad ditempatkan di paling bawah agar tidak overlap dengan konten

---

## 9. Technical Architecture

### 9.1 High-Level Architecture

```
┌──────────────────────────────────────────────────┐
│                  CDN (Cloudflare)                │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│              Frontend (Next.js 14+)              │
│  - App Router                                    │
│  - React Server Components                       │
│  - PWA (next-pwa)                                │
│  - Deployed on Vercel                            │
└────────────────┬─────────────────────────────────┘
                 │ HTTPS REST API
┌────────────────▼─────────────────────────────────┐
│              Backend (Go / Fiber)                │
│  - RESTful API                                   │
│  - JWT Authentication                            │
│  - Business Logic                                │
│  - Claude API Integration                        │
│  - Deployed on Railway / Fly.io                  │
└──────┬─────────────────────┬─────────────────────┘
       │                     │
┌──────▼──────┐       ┌──────▼──────┐
│ PostgreSQL  │       │    Redis    │
│ (Neon /     │       │  (Upstash)  │
│  Supabase)  │       │             │
└─────────────┘       └─────────────┘
```

### 9.2 Frontend Stack (Next.js)

| Teknologi       | Versi  | Fungsi                      |
| --------------- | ------ | --------------------------- |
| Next.js         | 14+    | Framework utama, App Router |
| React           | 18+    | UI library                  |
| TypeScript      | 5+     | Type safety                 |
| Tailwind CSS    | 3+     | Styling                     |
| shadcn/ui       | latest | Component library           |
| Zustand         | 4+     | Client state (game state)   |
| TanStack Query  | 5+     | Server state, API caching   |
| Framer Motion   | 10+    | Animasi game & UI           |
| next-pwa        | latest | PWA support, service worker |
| Zod             | 3+     | Form & API validation       |
| React Hook Form | 7+     | Form management             |

### 9.3 Backend Stack (Go)

| Teknologi  | Versi  | Fungsi                              |
| ---------- | ------ | ----------------------------------- |
| Go         | 1.22+  | Bahasa utama                        |
| Fiber      | v2     | HTTP framework (Express-like, fast) |
| GORM       | v2     | ORM untuk PostgreSQL                |
| go-redis   | v9     | Redis client                        |
| golang-jwt | v5     | JWT token management                |
| Viper      | latest | Configuration management            |
| Zap        | latest | Structured logging                  |
| Validator  | v10    | Request validation                  |
| godotenv   | latest | .env file loading                   |
| Air        | latest | Hot reload (dev only)               |

### 9.4 Database

**PostgreSQL** — Data persisten (users, scores, achievements)

- Provider: Neon (free tier) atau Supabase

**Redis** — Cache & real-time data

- Leaderboard (Sorted Sets)
- Session/JWT blacklist
- Daily challenge cache
- Rate limiting
- Provider: Upstash (free tier)

### 9.5 External Services

| Service               | Fungsi                | Provider             |
| --------------------- | --------------------- | -------------------- |
| AI Question Generator | Generate soal dinamis | Anthropic Claude API |
| Ads Web               | Monetisasi web        | Google AdSense       |
| Ads Mobile/PWA        | Monetisasi mobile     | Google AdMob         |
| Email                 | Verifikasi email      | Resend (free tier)   |
| CDN                   | Asset delivery        | Cloudflare           |
| Monitoring            | Error tracking        | Sentry (free tier)   |
| Analytics             | User analytics        | Google Analytics 4   |

### 9.6 Frontend Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (main)/
│   │   ├── layout.tsx          # Main layout dengan navbar
│   │   ├── page.tsx            # Dashboard / Home
│   │   ├── games/
│   │   │   ├── page.tsx        # Game hub
│   │   │   ├── math-quiz/
│   │   │   │   └── page.tsx
│   │   │   ├── wordle/
│   │   │   │   └── page.tsx
│   │   │   ├── sudoku/
│   │   │   │   └── page.tsx
│   │   │   ├── flag-quiz/
│   │   │   │   └── page.tsx
│   │   │   ├── 2048/
│   │   │   │   └── page.tsx
│   │   │   ├── spelling-bee/
│   │   │   │   └── page.tsx
│   │   │   ├── times-table/
│   │   │   │   └── page.tsx
│   │   │   └── capital-quiz/
│   │   │       └── page.tsx
│   │   ├── leaderboard/
│   │   │   └── page.tsx
│   │   ├── daily/
│   │   │   └── page.tsx
│   │   └── profile/
│   │       └── page.tsx
│   ├── layout.tsx              # Root layout
│   └── globals.css
├── components/
│   ├── games/
│   │   ├── MathQuiz.tsx
│   │   ├── Wordle.tsx
│   │   ├── Sudoku.tsx
│   │   ├── FlagQuiz.tsx
│   │   ├── Game2048.tsx
│   │   ├── SpellingBee.tsx
│   │   ├── TimesTable.tsx
│   │   └── CapitalQuiz.tsx
│   ├── ui/                     # shadcn components + custom
│   │   ├── GameCard.tsx
│   │   ├── ScoreBoard.tsx
│   │   ├── Timer.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── XPBadge.tsx
│   │   ├── StreakCounter.tsx
│   │   ├── LeaderboardTable.tsx
│   │   └── AchievementToast.tsx
│   ├── ads/
│   │   ├── BannerAd.tsx
│   │   ├── InterstitialAd.tsx
│   │   └── RewardedAd.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── MobileNav.tsx
│       └── Footer.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts           # Axios/fetch instance
│   │   ├── auth.ts
│   │   ├── games.ts
│   │   ├── leaderboard.ts
│   │   └── user.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGame.ts
│   │   ├── useLeaderboard.ts
│   │   └── useAds.ts
│   ├── stores/
│   │   ├── authStore.ts        # Zustand auth state
│   │   └── gameStore.ts        # Zustand game state
│   └── utils/
│       ├── xp.ts               # XP calculation
│       ├── score.ts            # Score calculation
│       └── format.ts           # Number/date formatting
├── types/
│   ├── game.ts
│   ├── user.ts
│   └── api.ts
├── public/
│   ├── flags/                  # SVG bendera negara
│   ├── icons/
│   └── manifest.json           # PWA manifest
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

### 9.7 Backend Project Structure

```
backend/
├── cmd/
│   └── main.go                 # Entry point
├── internal/
│   ├── auth/
│   │   ├── handler.go          # HTTP handlers
│   │   ├── service.go          # Business logic
│   │   ├── middleware.go       # JWT middleware
│   │   └── dto.go              # Request/response structs
│   ├── user/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go       # DB queries
│   │   └── model.go            # GORM models
│   ├── game/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── model.go
│   ├── leaderboard/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository.go       # Redis sorted set operations
│   ├── daily/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── scheduler.go        # Cron job untuk daily reset
│   ├── achievement/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository.go
│   └── ai/
│       ├── handler.go
│       ├── service.go          # Claude API integration
│       └── prompts.go          # Prompt templates
├── pkg/
│   ├── database/
│   │   ├── postgres.go         # PostgreSQL connection
│   │   └── redis.go            # Redis connection
│   ├── response/
│   │   └── response.go         # Standard API response format
│   ├── logger/
│   │   └── logger.go           # Zap logger setup
│   └── validator/
│       └── validator.go        # Custom validators
├── config/
│   └── config.go               # Viper config
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_games.sql
│   ├── 003_create_scores.sql
│   └── ...
├── .env.example
├── Dockerfile
├── docker-compose.yml          # Local dev (postgres + redis)
└── Makefile
```

---

## 10. Database Schema

### 10.1 PostgreSQL Tables

```sql
-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(30) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,   -- bcrypt hash
    xp          INTEGER DEFAULT 0,
    level       INTEGER DEFAULT 1,
    streak      INTEGER DEFAULT 0,
    last_active DATE,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Games (master data)
CREATE TABLE games (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(50) UNIQUE NOT NULL,   -- 'math-quiz', 'wordle', etc.
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    category    VARCHAR(50) NOT NULL,   -- 'math', 'language', 'geography', 'logic'
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Game Sessions (setiap kali user main)
CREATE TABLE game_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id     UUID REFERENCES games(id),
    score       INTEGER NOT NULL DEFAULT 0,
    duration    INTEGER,   -- dalam detik
    difficulty  VARCHAR(10),  -- 'easy', 'medium', 'hard'
    xp_earned   INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- User Highscores (per game per user)
CREATE TABLE user_highscores (
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id     UUID REFERENCES games(id),
    highscore   INTEGER DEFAULT 0,
    updated_at  TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

-- Daily Challenges
CREATE TABLE daily_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id         UUID REFERENCES games(id),
    questions_json  JSONB NOT NULL,
    challenge_date  DATE UNIQUE NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Daily Challenge Submissions
CREATE TABLE daily_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id    UUID REFERENCES daily_challenges(id),
    score           INTEGER NOT NULL,
    completed_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, challenge_id)
);

-- Achievements (master data)
CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    xp_reward   INTEGER DEFAULT 0,
    icon        VARCHAR(50)  -- icon name (no image files)
);

-- User Achievements
CREATE TABLE user_achievements (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id  UUID REFERENCES achievements(id),
    unlocked_at     TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at);
CREATE INDEX idx_daily_submissions_user_id ON daily_submissions(user_id);
```

### 10.2 Redis Keys

```
# Leaderboard (Sorted Set, score = game score)
leaderboard:game:{game_id}:all         # All-time per game
leaderboard:game:{game_id}:weekly      # Weekly per game (expire Senin 00:00)
leaderboard:global:xp                  # Global XP ranking

# Daily Challenge Cache
daily:challenge:{date}                  # JSON challenge data (expire 24h)
daily:submission:{user_id}:{date}       # Apakah user sudah submit hari ini

# Rate Limiting
ratelimit:ad:{user_id}                  # Timestamp last interstitial (expire 3 menit)
ratelimit:api:{user_id}                 # General API rate limit

# Session / JWT Blacklist
jwt:blacklist:{jti}                     # Revoked tokens

# AI Question Cache
ai:questions:{game_id}:{difficulty}     # Cached AI-generated questions (expire 1 jam)
```

---

## 11. API Specification

### Standard Response Format

```json
{
  "success": true,
  "data": {},
  "message": "OK",
  "error": null
}
```

### 11.1 Auth Endpoints

```
POST /api/v1/auth/register
Body: { username, email, password }
Response: { user, access_token, refresh_token }

POST /api/v1/auth/login
Body: { email, password }
Response: { user, access_token, refresh_token }

POST /api/v1/auth/refresh
Body: { refresh_token }
Response: { access_token }

POST /api/v1/auth/logout
Headers: Authorization: Bearer <token>
Response: { message }
```

### 11.2 User Endpoints

```
GET /api/v1/user/me
Headers: Authorization: Bearer <token>
Response: { id, username, email, xp, level, streak, last_active }

GET /api/v1/user/stats
Headers: Authorization: Bearer <token>
Response: { total_games, total_xp, highscores[], recent_sessions[] }

GET /api/v1/user/achievements
Headers: Authorization: Bearer <token>
Response: { achievements[], unlocked_ids[] }

PATCH /api/v1/user/profile
Headers: Authorization: Bearer <token>
Body: { username? }
Response: { user }
```

### 11.3 Game Endpoints

```
GET /api/v1/games
Response: { games[] }   -- list semua game yang active

GET /api/v1/games/:slug
Response: { game, user_highscore?, user_rank? }

POST /api/v1/games/:slug/score
Headers: Authorization: Bearer <token>
Body: { score, duration, difficulty }
Response: { session_id, xp_earned, new_highscore, achievements_unlocked[] }
```

### 11.4 Leaderboard Endpoints

```
GET /api/v1/leaderboard/game/:slug?period=all|weekly
Response: { entries[{ rank, user_id, username, score }], user_rank? }

GET /api/v1/leaderboard/global?period=all|weekly
Response: { entries[{ rank, user_id, username, xp, level }], user_rank? }
```

### 11.5 Daily Challenge Endpoints

```
GET /api/v1/daily
Headers: Authorization: Bearer <token> (optional)
Response: { challenge_id, game, questions, expires_at, user_submitted? }

POST /api/v1/daily/submit
Headers: Authorization: Bearer <token>
Body: { challenge_id, score }
Response: { xp_earned, streak_updated, achievements_unlocked[] }
```

### 11.6 AI Endpoints

```
POST /api/v1/ai/questions
Headers: Authorization: Bearer <token>
Body: { game_type, difficulty, count }
Response: { questions[] }
-- Rate limited: 10 req/menit per user
```

---

## 12. Security Requirements

### 12.1 Authentication & Authorization

- Password di-hash menggunakan **bcrypt** (cost factor 12)
- JWT access token expire: **15 menit**
- JWT refresh token expire: **7 hari**
- Refresh token di-rotate setiap penggunaan
- Logout blacklist token di Redis

### 12.2 API Security

- **CORS:** Hanya izinkan domain frontend yang sudah terdaftar
- **Rate Limiting:** 100 req/menit per IP untuk public endpoints
- **Rate Limiting:** 200 req/menit per user untuk authenticated endpoints
- **Input Validation:** Semua input divalidasi di backend (Go validator)
- **SQL Injection:** Menggunakan GORM dengan parameterized queries
- **XSS:** Next.js escapes output by default, sanitasi input tambahan
- **HTTPS:** Wajib di production (Cloudflare SSL)

### 12.3 Score Anti-Cheat (Basic)

- Score divalidasi di server side (range check, tidak bisa negatif yang tidak valid)
- Rate limit submit score: 1 submit per 30 detik per user per game
- Session duration dicek (score tidak mungkin tinggi jika durasi sangat pendek)
- Flag anomali untuk review manual (score > 3x rata-rata)

### 12.4 Data Privacy

- Password tidak pernah dikembalikan di response API
- Email tidak ditampilkan ke user lain (hanya username)
- Log tidak menyimpan password atau token

---

## 13. Performance Requirements

### 13.1 Frontend

| Metric                         | Target          |
| ------------------------------ | --------------- |
| LCP (Largest Contentful Paint) | < 2.5 detik     |
| FID (First Input Delay)        | < 100ms         |
| CLS (Cumulative Layout Shift)  | < 0.1           |
| Bundle size (initial JS)       | < 200KB gzipped |
| Game frame rate                | 60fps           |
| Game input lag                 | < 50ms          |

### 13.2 Backend

| Metric                | Target     |
| --------------------- | ---------- |
| API response time P50 | < 50ms     |
| API response time P95 | < 200ms    |
| API response time P99 | < 500ms    |
| Concurrent users      | 1,000 (v1) |
| Uptime SLA            | 99.5%      |

### 13.3 Optimization Strategies

**Frontend:**

- Code splitting per route dengan Next.js App Router
- Game assets (SVG flags) di-lazy load
- Images dioptimasi dengan `next/image`
- Service Worker untuk cache assets (PWA)
- Prefetch leaderboard data

**Backend:**

- Leaderboard di Redis (O(log N) sorted set operations)
- AI questions di-cache Redis 1 jam
- Database connection pooling (GORM)
- Daily challenge di-pregenerate setiap tengah malam

---

## 14. Infrastructure & Deployment

### 14.1 Environment

| Environment | Frontend       | Backend          | Database        |
| ----------- | -------------- | ---------------- | --------------- |
| Development | localhost:3000 | localhost:8080   | Docker (local)  |
| Staging     | Vercel Preview | Railway          | Neon (staging)  |
| Production  | Vercel         | Railway / Fly.io | Neon / Supabase |

### 14.2 Deployment Stack

```
Frontend   → Vercel (free tier cukup untuk awal)
Backend    → Railway (Go service, $5/bulan)
PostgreSQL → Neon (free tier: 0.5GB, cukup untuk awal)
Redis      → Upstash (free tier: 10,000 cmd/hari)
CDN        → Cloudflare (free tier)
Monitoring → Sentry (free tier)
Analytics  → Google Analytics 4 (gratis)
```

### 14.3 Docker Compose (Local Development)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: edugame
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  backend:
    build: ./backend
    ports:
      - '8080:8080'
    env_file: ./backend/.env
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

### 14.4 Environment Variables

**Backend (.env)**

```env
APP_ENV=development
APP_PORT=8080
APP_SECRET=your-secret-key

DB_HOST=localhost
DB_PORT=5432
DB_NAME=edugame
DB_USER=admin
DB_PASSWORD=secret

REDIS_URL=redis://localhost:6379

JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h

ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514

FRONTEND_URL=http://localhost:3000
```

**Frontend (.env.local)**

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxx
NEXT_PUBLIC_GA_ID=G-xxxxxx
```

---

## 15. Development Roadmap

### Phase 1 — Foundation (Week 1-3)

**Backend:**

- [ ] Project setup (Fiber, GORM, Redis)
- [ ] Database migrations
- [ ] Auth module (register, login, JWT)
- [ ] User module (profile, stats)
- [ ] Game module (list, score submit)
- [ ] Unit tests untuk auth & game service

**Frontend:**

- [ ] Next.js project setup + Tailwind + shadcn
- [ ] Auth pages (login, register)
- [ ] Main layout (navbar, bottom nav mobile)
- [ ] Game hub halaman

### Phase 2 — Core Games (Week 4-6)

**Games (Frontend):**

- [ ] Math Quiz Blitz
- [ ] Wordle Bahasa Indonesia
- [ ] 2048
- [ ] Sudoku

**Backend:**

- [ ] Leaderboard module (Redis sorted set)
- [ ] XP & level calculation logic
- [ ] Score validation

### Phase 3 — Engagement (Week 7-9)

**Games (Frontend):**

- [ ] Times Table Challenge
- [ ] Spelling Bee
- [ ] Flag Quiz
- [ ] Capital City Quiz

**Features:**

- [ ] Daily Challenge system
- [ ] Achievement system
- [ ] Streak system
- [ ] Leaderboard halaman

### Phase 4 — Monetisasi & Polish (Week 10-12)

- [ ] Google AdSense integration
- [ ] Rewarded ads system
- [ ] Interstitial ads dengan frequency cap
- [ ] PWA manifest + service worker
- [ ] Claude AI question generator
- [ ] Performance optimization
- [ ] Sentry error monitoring
- [ ] Google Analytics setup

### Phase 5 — Launch & Iterate (Week 13+)

- [ ] Staging testing (full E2E)
- [ ] Production deployment
- [ ] Beta testing dengan 50-100 user
- [ ] Bug fix & performance tuning
- [ ] v1.1 planning berdasarkan feedback

---

## 16. Risks & Mitigations

| Risk                       | Probability | Impact | Mitigation                                                        |
| -------------------------- | ----------- | ------ | ----------------------------------------------------------------- |
| AdSense approval ditolak   | Medium      | High   | Pastikan konten original, no copyright issues, privacy policy ada |
| Claude API cost tinggi     | Medium      | Medium | Cache hasil AI di Redis, rate limit endpoint, set budget cap      |
| Low user retention         | Medium      | High   | Daily streak, push notification (PWA), weekly leaderboard         |
| Mobile performance lambat  | Low         | High   | Test di low-end device, optimasi bundle, lazy load                |
| Cheat / score manipulation | Medium      | Medium | Server-side validation, anomaly detection                         |
| Database cost membengkak   | Low         | Medium | Monitor query, pagination, archive old sessions                   |

---

## 17. Open Questions

1. **Bahasa:** Platform dalam Bahasa Indonesia saja, atau bilingual (ID + EN)?
2. **Age Gate:** Perlu verifikasi umur untuk comply dengan COPPA/regulasi anak?
3. **Offline Mode:** Apakah beberapa game perlu bisa dimainkan offline (service worker cache)?
4. **Push Notification:** PWA push notification untuk daily challenge reminder — perlu di v1 atau v1.1?
5. **Admin Dashboard:** Seberapa lengkap admin panel yang dibutuhkan untuk v1?
6. **Content Moderation:** Username — perlu filter kata kasar?
7. **Social Sharing:** Share skor ke WhatsApp/Instagram — prioritas v1 atau v1.1?
8. **Wordle Word List:** Sumber kata Bahasa Indonesia — KBBI atau custom curated?

---

## Appendix A: XP & Level Formula

```
XP earned per game:
  base_xp = score / 10  (rounded down)
  difficulty_multiplier: easy=1.0, medium=1.5, hard=2.0
  xp_earned = base_xp * difficulty_multiplier

Daily challenge bonus:
  xp_earned *= 2.0

Level thresholds:
  Level 1:    0 XP
  Level 2:    100 XP
  Level 3:    300 XP
  Level 4:    600 XP
  Level 5:    1,000 XP
  Level N:    Level(N-1) + (N-1) * 200 XP
```

## Appendix B: Achievement List (v1)

| Slug          | Nama          | Trigger                        | XP Reward     |
| ------------- | ------------- | ------------------------------ | ------------- |
| first-game    | Pemula        | Main game pertama kali         | 50            |
| streak-3      | Konsisten     | Streak 3 hari                  | 100           |
| streak-7      | Rajin         | Streak 7 hari                  | 300           |
| streak-30     | Dedikasi      | Streak 30 hari                 | 1000          |
| math-master   | Math Master   | Skor 500+ di Math Quiz         | 200           |
| wordle-genius | Wordle Genius | Tebak Wordle dalam 2 percobaan | 300           |
| daily-5       | Daily Warrior | Complete 5 daily challenge     | 200           |
| top-10        | Elite         | Masuk top 10 leaderboard       | 500           |
| level-5       | Naik Kelas    | Capai Level 5                  | 0 (milestone) |
| all-games     | Explorer      | Coba semua game                | 300           |

---

_Dokumen ini bersifat living document dan akan diupdate seiring perkembangan produk._
