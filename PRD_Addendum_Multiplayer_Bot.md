# PRD Addendum — Multiplayer & Bot System
## EduPlay Platform

**Addendum Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-05-20
**Parent Document:** PRD_EduPlay_v2.md
**Author:** Product Team

---

## Table of Contents

1. Overview & Motivation
2. Multiplayer Game Catalog
3. Bot System Architecture
4. Matchmaking System
5. WebSocket Architecture
6. Features & Requirements
7. UX & Game Flow
8. Anti-Cheat for Multiplayer
9. Database Schema (Addendum)
10. API Specification (Addendum)
11. Tech Stack (Addendum)
12. Performance & Scaling
13. Development Roadmap
14. Risks & Mitigations

---

## 1. Overview & Motivation

### 1.1 Latar Belakang

Multiplayer adalah salah satu driver terkuat untuk **virality dan retention**. Ketika user bisa mengajak teman bermain, platform mendapatkan organic growth melalui word-of-mouth. Namun, multiplayer memiliki satu tantangan utama: **"Empty Lobby Problem"** — saat user base masih kecil, sulit menemukan lawan nyata.

Dokumen ini mendeskripsikan:
1. Game multiplayer yang akan ditambahkan ke EduPlay
2. Sistem bot sebagai fallback saat tidak ada lawan nyata
3. Matchmaking system yang seamless

### 1.2 Tujuan

- Meningkatkan **virality** — user ajak teman untuk main bareng
- Meningkatkan **session duration** — head-to-head lebih engaging dari solo
- Mengatasi **empty lobby** dengan bot fallback yang natural
- Tetap mempertahankan **nilai edukatif** di setiap game

### 1.3 Scope Addendum

**In Scope:**
- 4 game multiplayer (2 real-time, 2 async)
- Rule-based bot untuk semua game multiplayer
- Ghost replay bot (dari rekaman user nyata)
- AI bot via Claude API untuk Word Chain
- Matchmaking queue dengan bot fallback
- WebSocket infrastructure
- Private room (main dengan teman via kode room)

**Out of Scope:**
- Team/guild system
- Tournament bracket
- Spectator mode
- Voice/chat in-game
- Ranked/competitive mode (v2)

---

## 2. Multiplayer Game Catalog

### Constraint Desain (sama dengan game solo)
- ❌ Tidak ada gambar manusia atau makhluk hidup
- ✅ Visual: geometri, angka, huruf, kartu, ikon abstrak
- ✅ Session length: 2-5 menit per match
- ✅ Bisa dimainkan 1 tangan di mobile

---

### 2.1 Math Battle (Real-time, 1v1)

| Aspek             | Detail                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode**          | Real-time head-to-head                                                                                                                                         |
| **Player**        | 2 player (atau 1 player vs bot)                                                                                                                                |
| **Deskripsi**     | Kedua player dapat soal math yang sama, siapa lebih cepat dan benar menang                                                                                     |
| **Mechanic**      | Soal muncul bersamaan via WebSocket. Jawab benar → poin + soal berikutnya. Progress lawan terlihat real-time (berapa soal sudah dijawab, tanpa detail jawaban) |
| **Scoring**       | +10 poin per benar, -3 per salah. Bonus kecepatan: jawab < 3 detik = +5                                                                                        |
| **Win Condition** | Siapa lebih dulu jawab 15 soal benar, atau skor tertinggi dalam 60 detik                                                                                       |
| **Difficulty**    | Dipilih saat matchmaking — keduanya dapat difficulty yang sama                                                                                                 |
| **Bot Support**   | Rule-based bot + Ghost replay                                                                                                                                  |
| **Ad Slots**      | Banner di lobby, interstitial setelah match selesai                                                                                                            |

**UI Layout:**
```
┌─────────────────────────────────┐
│  KAMU         vs        LAWAN   │
│  Skor: 50          Skor: 40     │
│  ████████░░        ██████░░░░   │
│         [Soal: 7 x 8 = ?]       │
│   [A] 54   [B] 56   [C] 63  [D] 47  │
│                                 │
│         ⏱ 00:32                 │
└─────────────────────────────────┘
```

---

### 2.2 Quiz Showdown (Real-time, 2-4 Player)

| Aspek           | Detail                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Mode**        | Real-time, 2-4 player, room-based                                                                                                   |
| **Player**      | 2-4 player (sisa slot bisa diisi bot)                                                                                               |
| **Deskripsi**   | Mirip Kahoot — soal muncul bersamaan untuk semua player, siapa paling cepat jawab benar dapat poin tertinggi                        |
| **Mechanic**    | 20 soal per game. Setiap soal ada timer 10 detik. Poin berdasarkan kecepatan: jawab di detik ke-1 = 100 poin, detik ke-10 = 10 poin |
| **Kategori**    | Math, Geography, General Knowledge — dipilih saat buat room                                                                         |
| **Room System** | Host buat room → dapat kode 6 digit → share ke teman → mulai saat host ready                                                        |
| **Bot Support** | Rule-based bot mengisi slot kosong                                                                                                  |
| **Ad Slots**    | Banner di lobby, interstitial setelah game                                                                                          |

**Room Flow:**
```
Host buat room → Kode: "ABC123"
                      │
              Share ke teman
                      │
         ┌────────────┴────────────┐
         │  Teman join via kode    │
         └────────────┬────────────┘
                      │
              Lobby (lihat siapa join)
                      │
              Host klik "Mulai"
                      │
                  Game start!
```

---

### 2.3 Word Chain / Sambung Kata (Async Turn-based)

| Aspek            | Detail                                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode**         | Async turn-based, 1v1                                                                                                                                                |
| **Player**       | 2 player — tidak harus online bersamaan                                                                                                                              |
| **Deskripsi**    | Sambung kata Bahasa Indonesia — huruf terakhir kata sebelumnya = huruf pertama kata berikutnya                                                                       |
| **Mechanic**     | Giliran bergantian. Tiap giliran punya batas waktu 24 jam. Kalah jika: kehabisan waktu, kata tidak valid, kata sudah pernah dipakai, tidak ada kata yang bisa dibuat |
| **Validasi**     | Kata divalidasi dari dictionary KBBI (min 3 huruf)                                                                                                                   |
| **Scoring**      | +1 poin per kata valid. Kata panjang (7+ huruf) = +2 poin                                                                                                            |
| **Bot Support**  | Claude API bot — generate kata valid bahasa Indonesia                                                                                                                |
| **Invite**       | Challenge teman via username atau share link                                                                                                                         |
| **Notification** | Push notif saat giliran kamu                                                                                                                                         |
| **Ad Slots**     | Banner di game screen, interstitial saat game selesai                                                                                                                |

---

### 2.4 Trivia Challenge (Async, Challenge-based)

| Aspek           | Detail                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Mode**        | Async — tidak perlu online bersamaan                                                                                          |
| **Player**      | 2 player                                                                                                                      |
| **Deskripsi**   | Tantang teman dengan set soal yang sama. Masing-masing menjawab di waktu berbeda, skor dibandingkan setelah keduanya selesai  |
| **Mechanic**    | Player 1 jawab 10 soal → hasil dikunci → tantang Player 2 via link/username → Player 2 jawab soal yang sama → bandingkan skor |
| **Kategori**    | Math, Language, Geography, Logic — dipilih penantang                                                                          |
| **Scoring**     | Kombinasi akurasi + kecepatan rata-rata                                                                                       |
| **Expiry**      | Tantangan expire dalam 48 jam jika lawan belum jawab                                                                          |
| **Bot Support** | Tidak butuh bot (async, bisa main kapanpun)                                                                                   |
| **Ad Slots**    | Banner, interstitial setelah selesai                                                                                          |

---

## 3. Bot System Architecture

### 3.1 Tiga Tipe Bot

```
┌─────────────────────────────────────────────────────┐
│                   BOT SYSTEM                        │
├─────────────────┬───────────────┬───────────────────┤
│  Rule-Based Bot │ Ghost Replay  │    AI Bot         │
│                 │     Bot       │  (Claude API)     │
├─────────────────┼───────────────┼───────────────────┤
│ Hardcoded logic │ Rekaman user  │ Generate respons  │
│ Delay random    │ nyata         │ dinamis           │
│ Akurasi per     │ Sangat natural│ Tidak terprediksi │
│ difficulty      │               │                   │
├─────────────────┼───────────────┼───────────────────┤
│ Math Battle ✅  │ Math Battle ✅│ Word Chain ✅     │
│ Quiz Showdown✅ │ Wordle Duel ✅│                   │
│ Trivia ✅       │ Sudoku Race ✅│                   │
└─────────────────┴───────────────┴───────────────────┘
```

### 3.2 Rule-Based Bot

**Behavior per Difficulty:**

| Difficulty | Thinking Delay     | Akurasi | Behavior                          |
| ---------- | ------------------ | ------- | --------------------------------- |
| Easy       | 4-8 detik random   | 55%     | Kadang jawab salah, sering lambat |
| Medium     | 2-4 detik random   | 75%     | Cukup cepat, sesekali salah       |
| Hard       | 0.5-2 detik random | 92%     | Sangat cepat, jarang salah        |
| Expert     | 0.3-1 detik random | 99%     | Hampir tidak pernah salah         |

**Implementasi Go:**

```go
type RuleBasedBot struct {
    Difficulty  string
    GameID      string
    UserID      string  // bot's fake user ID
    DisplayName string  // "Alex 🤖", "Rudi Bot", dll
}

type BotConfig struct {
    MinDelay    time.Duration
    MaxDelay    time.Duration
    Accuracy    float64  // 0.0 - 1.0
}

var botConfigs = map[string]BotConfig{
    "easy":   {MinDelay: 4 * time.Second, MaxDelay: 8 * time.Second, Accuracy: 0.55},
    "medium": {MinDelay: 2 * time.Second, MaxDelay: 4 * time.Second, Accuracy: 0.75},
    "hard":   {MinDelay: 500 * time.Millisecond, MaxDelay: 2 * time.Second, Accuracy: 0.92},
    "expert": {MinDelay: 300 * time.Millisecond, MaxDelay: 1 * time.Second, Accuracy: 0.99},
}

func (b *RuleBasedBot) AnswerQuestion(question Question) BotAnswer {
    config := botConfigs[b.Difficulty]

    // Random thinking delay
    delay := config.MinDelay + time.Duration(rand.Int63n(int64(config.MaxDelay-config.MinDelay)))
    time.Sleep(delay)

    // Apakah bot menjawab benar?
    isCorrect := rand.Float64() < config.Accuracy

    if isCorrect {
        return BotAnswer{Answer: question.CorrectAnswer, IsCorrect: true}
    }

    // Pilih jawaban salah secara random
    wrongAnswers := filterWrong(question.Options, question.CorrectAnswer)
    wrong := wrongAnswers[rand.Intn(len(wrongAnswers))]
    return BotAnswer{Answer: wrong, IsCorrect: false}
}
```

### 3.3 Ghost Replay Bot

**Konsep:** Rekam setiap sesi game user nyata, simpan sebagai "ghost data". Saat butuh bot, putar ulang rekaman tersebut.

**Data yang Direkam:**
```go
type GhostData struct {
    ID         UUID
    UserID     UUID         // siapa yang direkam
    GameID     UUID
    Difficulty string
    Score      int
    Events     []GhostEvent // timeline semua aksi
    CreatedAt  time.Time
}

type GhostEvent struct {
    Timestamp  time.Duration // relative dari start game
    EventType  string        // "answer", "skip", "pause"
    QuestionID string
    IsCorrect  bool
    TimeTaken  time.Duration // berapa lama untuk jawab
}
```

**Cara Kerja:**
```
Saat user main solo:
  → Rekam semua event + timing ke GhostData
  → Simpan ke database (table: ghost_replays)
  → Tag dengan difficulty + game + score_range

Saat butuh bot:
  → Query ghost_replays yang sesuai difficulty
  → Ambil random 1 ghost
  → Replay event-nya secara real-time ke opponent stream
  → Label sebagai "[Username] (rekaman)" atau sembunyikan sebagai "Bot"
```

**Query untuk ambil ghost:**
```sql
SELECT * FROM ghost_replays
WHERE game_id = $1
  AND difficulty = $2
  AND score BETWEEN $3 AND $4  -- match dengan skill user
ORDER BY RANDOM()
LIMIT 1;
```

### 3.4 AI Bot (Claude API) — Word Chain

**Sistem Prompt:**
```
Kamu adalah pemain game Sambung Kata Bahasa Indonesia.
Aturan:
- Balas dengan 1 kata bahasa Indonesia yang valid
- Kata harus dimulai dengan huruf: "{HURUF_AWAL}"
- Kata minimal 3 huruf
- Tidak boleh menggunakan kata yang sudah dipakai: {KATA_TERPAKAI}
- Hanya balas dengan kata saja, tanpa penjelasan

Kata sebelumnya: "{KATA_SEBELUMNYA}"
Huruf awal yang harus kamu pakai: "{HURUF_AWAL}"
```

**Fallback jika Claude API gagal:**
- Pre-built dictionary KBBI per huruf awal
- Pick random dari dictionary yang belum dipakai

**Rate Limiting:**
- Max 1 request per giliran bot
- Cache respons tidak perlu (setiap kata unik)
- Timeout: 3 detik — jika lewat, pakai dictionary fallback

---

## 4. Matchmaking System

### 4.1 Flow Lengkap

```
User klik "Cari Lawan"
         │
         ▼
Masuk matchmaking queue (Redis List)
Tampilkan: "Mencari lawan... ⏳"
         │
    Tunggu 10 detik
         │
    ┌────┴────┐
    │ Ketemu  │──→ Start game vs real player
    │ lawan   │    (WebSocket room dibuat)
    └─────────┘
         │ Tidak ketemu dalam 10 detik
         ▼
Tampilkan pilihan bot:
  ┌──────────────────────────┐
  │  Tidak ada lawan online  │
  │  Mau main vs bot?        │
  │                          │
  │  [🤖 Bot Mudah  ]        │
  │  [🤖 Bot Sedang ]        │
  │  [🤖 Bot Sulit  ]        │
  │  [🔄 Cari Lagi  ]        │
  └──────────────────────────┘
         │
User pilih bot
         │
         ▼
Start game vs bot
(WebSocket room dengan 1 bot goroutine)
```

### 4.2 Skill-Based Matchmaking (SBMM)

Untuk mencegah mismatch yang terlalu jauh:

```go
type MatchmakingEntry struct {
    UserID      string
    GameID      string
    Difficulty  string
    UserScore   int        // rata-rata skor user di game ini
    JoinedAt    time.Time
    SkillRange  int        // berapa lebar range yang diterima
}

// Range expand setiap 3 detik jika belum ketemu lawan
// Detik 0-3:   exact difficulty match
// Detik 3-6:   ±1 difficulty level
// Detik 6-10:  any difficulty → offer bot
```

### 4.3 Private Room (Main dengan Teman)

```
Host buat room
    │
    ▼
Generate kode room 6 digit (REDIS: room:{kode})
TTL: 10 menit (kadaluarsa jika tidak dipakai)
    │
    ▼
Host share kode ke teman via:
  - Copy kode
  - Share link: eduplay.id/room/ABC123
    │
    ▼
Teman masuk via kode/link
    │
    ▼
Lobby screen (host lihat siapa join)
    │
    ▼
Host klik "Mulai" → Game start
```

**Room Settings (Quiz Showdown):**
- Jumlah soal: 10 / 20 / 30
- Kategori: Math / Language / Geography / Mix
- Timer per soal: 5 / 10 / 15 detik
- Izinkan bot mengisi slot kosong: Ya / Tidak

---

## 5. WebSocket Architecture

### 5.1 Tech Stack WebSocket

**Backend (Go):**
- Library: `gorilla/websocket`
- Room management: In-memory + Redis pub/sub
- Satu goroutine per koneksi WebSocket

### 5.2 WebSocket Message Protocol

Semua pesan dalam format JSON:

```go
// Base message structure
type WSMessage struct {
    Type    string          `json:"type"`
    Payload json.RawMessage `json:"payload"`
}

// Message Types:
// CLIENT → SERVER
"join_room"          { room_id, user_id, token }
"player_ready"       { room_id }
"submit_answer"      { room_id, question_id, answer, time_taken_ms }
"request_hint"       { room_id }
"leave_room"         { room_id }
"ping"               {}

// SERVER → CLIENT
"room_joined"        { room_id, players[], settings }
"player_joined"      { player: { id, username, level } }
"player_left"        { player_id }
"game_starting"      { countdown: 3 }
"question"           { id, text, options[], question_number, total }
"answer_result"      { player_id, is_correct, score_delta, new_score }
"opponent_progress"  { player_id, questions_answered, current_score }
"game_over"          { results[], winner_id, xp_earned }
"bot_joined"         { bot: { id, username, difficulty } }
"error"              { code, message }
"pong"               {}
```

### 5.3 Room State Management

```go
type GameRoom struct {
    ID          string
    GameType    string
    Players     map[string]*Player  // user_id → Player
    Bots        map[string]*Bot     // bot_id → Bot
    State       string              // "waiting", "countdown", "playing", "finished"
    Questions   []Question
    CurrentQ    int
    Settings    RoomSettings
    CreatedAt   time.Time
    StartedAt   *time.Time
    FinishedAt  *time.Time
    mu          sync.RWMutex
}

// Room disimpan di memory (sync.Map) untuk akses cepat
// Metadata room juga disimpan di Redis untuk recovery
var rooms sync.Map  // room_id → *GameRoom
```

### 5.4 Skalabilitas WebSocket

Untuk v1 (single server):
- Semua room di-manage in-memory (sync.Map)
- Redis untuk signaling antar goroutine

Untuk v2+ (multi-server):
- Redis pub/sub sebagai message broker antar server
- Sticky sessions (user selalu ke server yang sama)
- Atau migrate ke dedicated WebSocket service

---

## 6. Features & Requirements

### 6.1 Multiplayer Core

| ID    | Feature                | Priority | Deskripsi                                        |
| ----- | ---------------------- | -------- | ------------------------------------------------ |
| MP-01 | Quick Match            | P0       | Cari lawan random via matchmaking queue          |
| MP-02 | Private Room           | P0       | Buat room, share kode ke teman                   |
| MP-03 | Bot Fallback           | P0       | Tawarkan bot jika tidak ada lawan dalam 10 detik |
| MP-04 | Bot Difficulty Select  | P0       | Pilih Easy / Medium / Hard bot                   |
| MP-05 | Ghost Replay Bot       | P1       | Bot berbasis rekaman user nyata                  |
| MP-06 | AI Bot (Word Chain)    | P1       | Claude API untuk Word Chain                      |
| MP-07 | Real-time Score Update | P0       | Progress lawan terlihat real-time                |
| MP-08 | Reconnect              | P1       | Jika disconnect, bisa reconnect dalam 30 detik   |
| MP-09 | Surrender              | P1       | Bisa menyerah sebelum game selesai               |

### 6.2 Room System

| ID      | Feature            | Priority | Deskripsi                              |
| ------- | ------------------ | -------- | -------------------------------------- |
| ROOM-01 | Create Room        | P0       | Generate kode 6 digit, TTL 10 menit    |
| ROOM-02 | Join Room via Kode | P0       | Input kode manual                      |
| ROOM-03 | Join Room via Link | P1       | Share URL langsung                     |
| ROOM-04 | Room Lobby         | P0       | Lihat siapa sudah join, host bisa kick |
| ROOM-05 | Room Settings      | P1       | Pilih kategori, jumlah soal, timer     |
| ROOM-06 | Bot Fill Slot      | P1       | Bot isi slot kosong di Quiz Showdown   |
| ROOM-07 | Rematch            | P1       | Main lagi dengan lawan/room yang sama  |

### 6.3 Ghost Replay System

| ID       | Feature        | Priority | Deskripsi                                   |
| -------- | -------------- | -------- | ------------------------------------------- |
| GHOST-01 | Record Session | P1       | Rekam event solo game untuk dijadikan ghost |
| GHOST-02 | Ghost Storage  | P1       | Simpan ghost data di database               |
| GHOST-03 | Ghost Matching | P1       | Match ghost dengan skill level user         |
| GHOST-04 | Ghost Playback | P1       | Replay ghost sebagai lawan bot              |
| GHOST-05 | Ghost Labeling | P2       | Tampilkan "vs [Username] (rekaman)"         |

### 6.4 Async Multiplayer

| ID       | Feature           | Priority | Deskripsi                      |
| -------- | ----------------- | -------- | ------------------------------ |
| ASYNC-01 | Challenge Invite  | P0       | Tantang user lain via username |
| ASYNC-02 | Challenge Link    | P1       | Share link tantangan           |
| ASYNC-03 | Challenge Expiry  | P0       | Tantangan expire 48 jam        |
| ASYNC-04 | Challenge Notif   | P1       | Push notif saat ditantang      |
| ASYNC-05 | Challenge History | P1       | Riwayat tantangan masuk/keluar |

---

## 7. UX & Game Flow

### 7.1 Multiplayer Entry Points

```
Game Hub
    │
    ▼
Game Detail Page
    │
    ├── [Solo Play]
    │
    └── [Multiplayer] ← BARU
            │
            ├── [Quick Match]      → Matchmaking → Game
            ├── [Buat Room]        → Room Lobby → Game
            ├── [Masuk Room]       → Input Kode → Lobby → Game
            └── [Tantang Teman]    → Pilih Username → Async Game
```

### 7.2 Pre-Game Lobby Screen

```
┌─────────────────────────────────────────┐
│         Math Battle — Lobby             │
│                                         │
│  👤 Budi_123        vs      🤖 Bot Sedang│
│  Level 12                   Level ?     │
│                                         │
│  Kategori: Campuran                     │
│  Soal: 15   Timer: 60 detik             │
│                                         │
│         [✅ SIAP]                        │
│                                         │
│  Menunggu lawan siap...                 │
└─────────────────────────────────────────┘
```

### 7.3 In-Game Screen (Math Battle)

```
┌─────────────────────────────────────────┐
│  Budi_123 🔵 50pt    vs    Bot 🔴 43pt  │
│  ████████████░░░░   ██████████░░░░░░   │
│                                         │
│           Soal 8 dari 15                │
│                                         │
│         24 × 7 = ?                      │
│                                         │
│   [A] 158    [B] 168    [C] 172  [D] 186│
│                                         │
│              ⏱ 00:28                    │
└─────────────────────────────────────────┘
```

### 7.4 Post-Game Result Screen

```
┌─────────────────────────────────────────┐
│            HASIL PERTANDINGAN           │
│                                         │
│   🏆 KAMU MENANG!                       │
│                                         │
│  Budi_123          vs        Bot Sedang │
│  Skor: 120              Skor: 95        │
│  13/15 benar            10/15 benar     │
│  Waktu: 42 detik        Waktu: 60 detik │
│                                         │
│  +85 XP                                 │
│  ████████████░░░░ Level 12              │
│                                         │
│  [🔄 Main Lagi] [🏠 Hub] [📤 Share]    │
└─────────────────────────────────────────┘
```

### 7.5 Bot UX Guidelines

- **Jangan pernah bilang "tidak ada lawan"** — langsung tawarkan bot secara positif
- Label bot dengan nama yang bersahabat: "Alex 🤖", "Rudi Bot", "Maya Bot"
- Tampilkan difficulty dengan jelas dan visual (warna/ikon)
- Bot **tidak masuk leaderboard** — tampilkan note kecil: "Skor vs bot tidak masuk leaderboard"
- Skor vs bot **tetap masuk personal stats** dan berikan XP (lebih sedikit dari vs human)

**Contoh copy yang baik:**
```
❌ "Tidak ada pemain online saat ini"
✅ "Belum ada lawan online. Mau uji kemampuan vs bot dulu?"

❌ "Kamu bermain vs AI"
✅ "Kamu vs Maya Bot 🤖 (Tingkat Sedang)"
```

### 7.6 Disconnect Handling

```
Player disconnect saat game berlangsung
            │
            ▼
Tunggu 30 detik (tampilkan "Menunggu koneksi lawan...")
            │
    ┌───────┴───────┐
    │  Reconnect    │──→ Lanjutkan game
    └───────────────┘
            │ Tidak reconnect dalam 30 detik
            ▼
Lawan dinyatakan menang (WO)
Disconnect player dapat 0 XP
```

---

## 8. Anti-Cheat untuk Multiplayer

### 8.1 Validasi Server-Side

Untuk real-time multiplayer, semua validasi dilakukan di **server**, bukan client:

```go
// Server mengelola state game
// Client hanya mengirim: "saya jawab A untuk soal ID-123 dalam 2.3 detik"
// Server yang memutuskan benar/salah dan update skor

func (g *GameRoom) ProcessAnswer(userID, questionID, answer string, timeTaken float64) {
    // 1. Cek apakah pertanyaan valid dan belum dijawab user ini
    // 2. Cek apakah timeTaken masuk akal (tidak < 0.2 detik = impossible)
    // 3. Evaluasi jawaban
    // 4. Update skor di state server
    // 5. Broadcast hasil ke semua player
}
```

### 8.2 Timing Validation

```go
const (
    MIN_ANSWER_TIME = 200 * time.Millisecond  // < 200ms = suspicious
    MAX_ANSWER_TIME = 15 * time.Second         // > 15 detik = timeout
)

func validateTiming(timeTaken time.Duration) bool {
    return timeTaken >= MIN_ANSWER_TIME && timeTaken <= MAX_ANSWER_TIME
}
```

### 8.3 Rate Limiting

- Maks 1 jawaban per soal per user
- Maks 30 soal per menit (mencegah soal-skip exploit)
- WebSocket message rate limit: 10 pesan/detik per koneksi

### 8.4 Leaderboard Policy untuk Multiplayer

| Tipe Match                    | Masuk Leaderboard? | XP   |
| ----------------------------- | ------------------ | ---- |
| vs Real Player (Ranked)       | ✅ Ya               | 100% |
| vs Real Player (Private Room) | ❌ Tidak            | 75%  |
| vs Rule-Based Bot             | ❌ Tidak            | 50%  |
| vs Ghost Bot                  | ❌ Tidak            | 60%  |
| vs AI Bot                     | ❌ Tidak            | 50%  |

---

## 9. Database Schema (Addendum)

```sql
-- =====================
-- MULTIPLAYER MATCHES
-- =====================
CREATE TABLE multiplayer_matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code       VARCHAR(10),
    game_id         UUID REFERENCES games(id),
    match_type      VARCHAR(20) NOT NULL,  -- 'quickmatch', 'private', 'async_challenge'
    difficulty      VARCHAR(10),
    status          VARCHAR(15) DEFAULT 'waiting',  -- 'waiting','playing','finished','cancelled'
    winner_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- MATCH PARTICIPANTS
-- =====================
CREATE TABLE match_participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id        UUID REFERENCES multiplayer_matches(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL jika bot
    bot_type        VARCHAR(20),        -- NULL | 'rule_based' | 'ghost' | 'ai'
    bot_difficulty  VARCHAR(10),
    bot_name        VARCHAR(50),
    ghost_id        UUID,               -- FK ke ghost_replays jika bot tipe ghost
    score           INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers   INTEGER DEFAULT 0,
    xp_earned       INTEGER DEFAULT 0,
    rank            INTEGER,            -- posisi final dalam match
    is_winner       BOOLEAN DEFAULT FALSE,
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);
CREATE INDEX idx_participants_match ON match_participants(match_id);
CREATE INDEX idx_participants_user  ON match_participants(user_id);

-- =====================
-- GHOST REPLAYS
-- =====================
CREATE TABLE ghost_replays (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id         UUID REFERENCES games(id),
    difficulty      VARCHAR(10),
    score           INTEGER,
    total_questions INTEGER,
    correct_answers INTEGER,
    duration        INTEGER,    -- detik
    events_json     JSONB NOT NULL,  -- array GhostEvent
    is_active       BOOLEAN DEFAULT TRUE,  -- false jika terlalu lama/score outlier
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ghost_game_diff ON ghost_replays(game_id, difficulty);
CREATE INDEX idx_ghost_score ON ghost_replays(score);

-- =====================
-- ASYNC CHALLENGES
-- =====================
CREATE TABLE async_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id   UUID REFERENCES users(id) ON DELETE CASCADE,
    opponent_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id         UUID REFERENCES games(id),
    questions_json  JSONB NOT NULL,
    answers_json    JSONB NOT NULL,  -- hashed
    challenger_score    INTEGER,
    opponent_score      INTEGER,
    challenger_done_at  TIMESTAMPTZ,
    opponent_done_at    TIMESTAMPTZ,
    winner_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    status          VARCHAR(15) DEFAULT 'pending',  -- 'pending','completed','expired'
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_challenges_opponent ON async_challenges(opponent_id, status);
CREATE INDEX idx_challenges_challenger ON async_challenges(challenger_id);

-- =====================
-- WORD CHAIN GAMES
-- =====================
CREATE TABLE word_chain_games (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    player2_id      UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL jika vs bot
    is_vs_bot       BOOLEAN DEFAULT FALSE,
    bot_difficulty  VARCHAR(10),
    current_word    VARCHAR(50),
    current_turn    UUID,   -- user_id siapa yang giliran
    words_used      TEXT[], -- array kata yang sudah dipakai
    player1_score   INTEGER DEFAULT 0,
    player2_score   INTEGER DEFAULT 0,
    status          VARCHAR(15) DEFAULT 'active',
    turn_expires_at TIMESTAMPTZ,  -- 24 jam per giliran
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_wordchain_player1 ON word_chain_games(player1_id, status);
CREATE INDEX idx_wordchain_player2 ON word_chain_games(player2_id, status);

-- =====================
-- REDIS KEYS (Addendum)
-- =====================
-- Matchmaking queues
matchmaking:{game_slug}:{difficulty}     List of user_ids waiting

-- Active rooms
room:{room_code}                         JSON room metadata   [EX 600]

-- Room members
room:{room_code}:members                 Set of user_ids

-- WebSocket session
ws:session:{user_id}                     server_id + connection info  [EX 3600]

-- Reconnect window
reconnect:{match_id}:{user_id}           "1"  [EX 30]
```

---

## 10. API Specification (Addendum)

### 10.1 Matchmaking

```
POST /api/v1/multiplayer/quickmatch
  Auth: Bearer token
  Body: { game_slug: string, difficulty: string }
  Response:
    Jika ketemu lawan: { match_id, room_id, opponent: { username, level } }
    Jika timeout:      { status: "no_match", bot_options: ["easy","medium","hard"] }

POST /api/v1/multiplayer/quickmatch/bot
  Auth: Bearer token
  Body: { game_slug: string, bot_difficulty: string }
  Response: { match_id, room_id, bot: { name, difficulty } }

DELETE /api/v1/multiplayer/quickmatch
  Auth: Bearer token
  Body: { game_slug: string }
  Response: { message }   -- cancel dari matchmaking queue
```

### 10.2 Room Management

```
POST /api/v1/rooms
  Auth: Bearer token
  Body: { game_slug: string, settings: { questions: int, category: string, timer: int } }
  Response: { room_code, room_id, expires_at }

GET /api/v1/rooms/:code
  Auth: Bearer token
  Response: { room_id, game, settings, host, members[], status }

POST /api/v1/rooms/:code/join
  Auth: Bearer token
  Response: { room_id, members[] }

DELETE /api/v1/rooms/:code/leave
  Auth: Bearer token
  Response: { message }

POST /api/v1/rooms/:code/start
  Auth: Bearer token (harus host)
  Response: { match_id }

DELETE /api/v1/rooms/:code/kick/:user_id
  Auth: Bearer token (harus host)
  Response: { message }
```

### 10.3 Async Challenges

```
POST /api/v1/challenges
  Auth: Bearer token
  Body: { opponent_username: string, game_slug: string, difficulty: string }
  Response: { challenge_id, share_link, expires_at }

GET /api/v1/challenges
  Auth: Bearer token
  Query: ?type=incoming|outgoing|completed
  Response: { challenges[] }

GET /api/v1/challenges/:id
  Auth: Bearer token
  Response: { challenge, questions (jika giliran user), results (jika selesai) }

POST /api/v1/challenges/:id/submit
  Auth: Bearer token
  Body: { answers: [...], score: int }
  Response: { xp_earned, result: "pending"|"win"|"lose"|"draw" }
```

### 10.4 Word Chain

```
GET /api/v1/wordchain
  Auth: Bearer token
  Response: { active_games[] }

POST /api/v1/wordchain
  Auth: Bearer token
  Body: { opponent_username?: string, vs_bot?: bool, bot_difficulty?: string }
  Response: { game_id, first_word, your_turn: bool }

POST /api/v1/wordchain/:id/word
  Auth: Bearer token
  Body: { word: string }
  Response: { valid: bool, score_delta: int, next_letter: string, bot_response?: string }

GET /api/v1/wordchain/:id
  Auth: Bearer token
  Response: { game, words_history, scores, current_turn, turn_expires_at }
```

### 10.5 WebSocket Endpoint

```
WS /ws/game/:room_id
  Auth: ?token=<jwt>    -- token di query param untuk WS

  Setelah connect, kirim join_room message
  Server akan kirim room state saat ini
```

---

## 11. Tech Stack (Addendum)

### 11.1 Backend Additions

| Package             | Versi | Fungsi                                         |
| ------------------- | ----- | ---------------------------------------------- |
| `gorilla/websocket` | v1.5  | WebSocket server                               |
| `robfig/cron`       | v3    | Sudah ada — tambahkan job cleanup room expired |

### 11.2 Frontend Additions

| Package                    | Versi            | Fungsi                        |
| -------------------------- | ---------------- | ----------------------------- |
| Native WebSocket API       | browser built-in | WebSocket client              |
| Custom `useWebSocket` hook | -                | Wrapper dengan auto-reconnect |

**useWebSocket Hook:**
```typescript
function useWebSocket(roomId: string) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [messages, setMessages] = useState<WSMessage[]>([]);
    const [status, setStatus] = useState<'connecting'|'connected'|'disconnected'>();

    useEffect(() => {
        const ws = new WebSocket(
            `${process.env.NEXT_PUBLIC_WS_URL}/ws/game/${roomId}?token=${getToken()}`
        );

        ws.onopen = () => setStatus('connected');
        ws.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
        ws.onclose = () => {
            setStatus('disconnected');
            // Auto-reconnect setelah 2 detik
            setTimeout(() => reconnect(), 2000);
        };

        setSocket(ws);
        return () => ws.close();
    }, [roomId]);

    const send = useCallback((type: string, payload: any) => {
        socket?.send(JSON.stringify({ type, payload }));
    }, [socket]);

    return { send, messages, status };
}
```

---

## 12. Performance & Scaling

### 12.1 WebSocket Capacity

| Metric                           | v1 Target | v2 Target |
| -------------------------------- | --------- | --------- |
| Concurrent WebSocket connections | 500       | 5,000     |
| Active game rooms                | 250       | 2,500     |
| Messages per detik               | 1,000     | 10,000    |
| Room creation per menit          | 50        | 500       |

### 12.2 Optimasi

**In-Memory Room State:**
- Rooms disimpan di `sync.Map` (in-memory) untuk akses O(1)
- Tidak query database saat game berlangsung
- Hanya write ke database saat game selesai (batch write)

**Goroutine per Room:**
```go
// Setiap room punya goroutine sendiri untuk handle pesan
func (r *GameRoom) Run() {
    for {
        select {
        case msg := <-r.broadcast:
            r.broadcastToAll(msg)
        case <-r.done:
            return
        }
    }
}
```

**Bot Goroutine:**
```go
// Bot berjalan sebagai goroutine yang simulate player behavior
func (b *RuleBasedBot) Play(room *GameRoom) {
    for question := range room.questionChan {
        answer := b.AnswerQuestion(question)  // include delay
        room.ProcessAnswer(b.ID, question.ID, answer.Answer, answer.TimeTaken)
    }
}
```

### 12.3 Redis untuk Multi-Server (v2)

```
Server 1 ──┐
Server 2 ──┼──→ Redis Pub/Sub ──→ Forward message ke server yang tepat
Server 3 ──┘

Channel: room:{room_id}
```

---

## 13. Development Roadmap

### Phase MP-1 — Async Foundation (v1.1, Bulan 3-4)

- [ ] Async Challenge system (Trivia Challenge)
- [ ] Word Chain vs Bot (AI Claude API)
- [ ] Database schema multiplayer
- [ ] Push notification untuk challenge
- [ ] Ghost replay recording (background, tidak visible dulu)

### Phase MP-2 — Real-time Infrastructure (v1.2, Bulan 5-6)

- [ ] WebSocket infrastructure (Go gorilla/websocket)
- [ ] Room management system
- [ ] Matchmaking queue (Redis)
- [ ] Rule-based bot system
- [ ] Math Battle 1v1 (real-time)
- [ ] Reconnect handling

### Phase MP-3 — Full Multiplayer (v1.3, Bulan 7-8)

- [ ] Quiz Showdown (2-4 player room)
- [ ] Private room dengan kode
- [ ] Ghost replay bot (gunakan data yang sudah terkumpul)
- [ ] Rematch functionality
- [ ] Multiplayer leaderboard (win rate, total wins)
- [ ] Word Chain vs real player (async)

### Phase MP-4 — Polish (v1.4, Bulan 9)

- [ ] Share hasil multiplayer ke WhatsApp/Medsos
- [ ] Bot difficulty recommendation (berdasarkan skill user)
- [ ] Room customization lebih lengkap
- [ ] Multiplayer achievement (10 kemenangan, first win, dll)
- [ ] Skill-based matchmaking lebih akurat

---

## 14. Risks & Mitigations

| Risk                                        | Probability | Impact | Mitigasi                                                      |
| ------------------------------------------- | ----------- | ------ | ------------------------------------------------------------- |
| Empty lobby di awal launch                  | High        | High   | Bot fallback selalu tersedia sejak hari pertama               |
| WebSocket connection drop (mobile)          | High        | Medium | Auto-reconnect dengan 30 detik grace period                   |
| Bot terasa "tidak natural"                  | Medium      | Medium | Ghost replay bot + delay random yang realistis                |
| Claude API latency untuk Word Chain         | Medium      | Medium | Timeout 3 detik + dictionary fallback                         |
| Memory leak dari room yang tidak di-cleanup | Low         | High   | TTL setiap room, cleanup goroutine setiap 5 menit             |
| Score manipulation via WebSocket            | Low         | High   | Semua score validation di server, client hanya submit jawaban |
| Redis down — matchmaking gagal              | Low         | Medium | Fallback ke bot langsung tanpa queue                          |
| Concurrent room state race condition        | Medium      | High   | sync.RWMutex di setiap room, test dengan race detector        |

---

## Appendix: Bot Name Pool

Bot diberi nama random dari pool ini agar terasa lebih natural:

```go
var botNames = map[string][]string{
    "easy": {
        "Rudi Bot 🤖", "Siti Bot 🤖", "Bimo Bot 🤖",
        "Ayu Bot 🤖", "Dani Bot 🤖",
    },
    "medium": {
        "Alex Bot ⚡", "Maya Bot ⚡", "Rio Bot ⚡",
        "Nisa Bot ⚡", "Bagas Bot ⚡",
    },
    "hard": {
        "Cipher 🔥", "Nexus 🔥", "Titan 🔥",
        "Vega 🔥", "Zeta 🔥",
    },
    "expert": {
        "MAESTRO 💀", "OMEGA 💀", "APEX 💀",
    },
}
```

---

*Addendum ini merupakan dokumen pelengkap dari PRD_EduPlay_v2.md*
*Setiap perubahan harus dikomunikasikan ke tim terkait.*

*Last Updated: 2026-05-20 | Addendum Version: 1.0.0*