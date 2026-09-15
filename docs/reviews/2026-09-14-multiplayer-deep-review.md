# Deep Review: Multiplayer Games (EduPlay)

**Tanggal:** 14 September 2026
**Status:** Audit — Root Cause Analysis
**Scope:** Semua game multiplayer real-time (WebSocket) dan turn-based/async (REST) — Math
Battle, Quiz Showdown, Wordle Duel, Sudoku Race, Flag Team Battle, Math Relay, Crossword
Coop, Crossword Duel, Battleship Math, Chess, Word Chain, Math Tournament, Room System.
**Metodologi:** `go build`/`go vet`/`go test` (semua pass, tidak menangkap bug di bawah —
gap ada di integration/protocol-level, bukan unit-level) + 4 deep-dive read-only paralel:
infra WebSocket inti, game realtime grup A (Math Battle/Quiz Showdown/Wordle
Duel/Sudoku Race), game realtime grup B (Flag Team Battle/Math Relay/Crossword
Coop/Duel), dan game turn-based (Battleship/Chess/Word Chain/Tournament/Room).

---

## 0. Progress Perbaikan

Update 15 September 2026 — 3 temuan CRITICAL di §2 sudah diperbaiki dan diverifikasi
(`go build`/`go vet`/`go test -race` pass di package `internal/ws`, plus 2 test regresi baru:
`TestBroadcastConcurrentWithPlayerMutation`, `TestScheduleBotFillStartTopsOffRoomAndStartsOnce`):

- [x] **§2.1** `CorrectAnswer` index/text mismatch — frontend (`math-battle`, `quiz-showdown`,
      `math-relay`) sekarang mengirim index opsi, bukan teks. Bug turunan di `bot.go`/`ghost_bot.go`
      (filter jawaban salah yang salah bandingkan index vs teks) ikut diperbaiki.
- [x] **§2.2** Unsynchronized map iteration di `Broadcast`/`BroadcastExcept` — sekarang mengambil
      snapshot recipient di bawah `RLock` sebelum mengirim. Ditemukan &amp; diperbaiki juga 2 call site
      lain yang broadcast sambil masih memegang `r.mu.Lock()` (`SubmitAnswer`, `handleChessMove`) —
      keduanya akan deadlock begitu `Broadcast` mengambil lock sendiri, jadi wajib dibetulkan bersamaan.
- [x] **§2.3** Math Relay &amp; Crossword Co-op tidak bisa start sendirian — ditambahkan
      `scheduleBotFillStart` (generic, dipakai keduanya) yang menunggu grace period singkat lalu
      mengisi sisa slot dengan bot dan start game, meniru pola yang sudah dipakai Flag Team Battle.

**Update kedua, 15 September 2026** — sebagian besar §4 sudah dikerjakan juga (`go build`/
`go vet`/`go test -race` pass untuk `internal/ws`, plus regresi test baru di
`wordle_duel_test.go`, `crossword_test.go`; frontend `tsc --noEmit` clean):

- [x] **`leave_room` tidak pernah forfeit** — akar masalah tersembunyi yang bikin Resign di
      Sudoku Race, Wordle Duel, dll percuma: `handleLeaveRoom` (baru) dan forfeit-timeout di
      `StartReconnectTimer` sekarang sama-sama menghitung `calculateResults()`/`getWinnerID()` dan
      broadcast `game_over` — sebelumnya cuma broadcast `player_forfeited` yang tidak ada satupun
      frontend yang dengarkan, jadi pemain yang ditinggal macet selamanya.
- [x] **Wordle Duel hang forever + skor palsu 0:0** — `handleWordleGuess` sekarang mendeteksi
      "selesai" per pemain (menang ATAU habis 6 percobaan), bukan cuma dari tebakan terakhir yang
      kebetulan benar. Fungsi baru `buildWordleGameOver` mengisi `Results` dengan jumlah percobaan
      asli (bukan array kosong) dan menang ditentukan oleh percobaan tersedikit, tie-break oleh
      siapa yang selesai duluan. Ditambahkan tombol Menyerah + reconnect logic (sebelumnya tidak ada
      `ws.onclose` sama sekali).
- [x] **Sudoku Race resign soft-lock** — otomatis ikut kefix oleh perbaikan `leave_room` di atas
      (tombol Resign sudah ada di frontend, cuma backend-nya yang tidak pernah menyelesaikan game).
      Ditambahkan reconnect logic dan field `row`/`col` yang hilang di pesan `sudoku_error` (highlight
      sel merah sekarang benar-benar jalan).
- [x] **Quiz Showdown tidak reconnect saat main** — ditambahkan retry pattern yang sama dengan
      Flag Team Battle (`shouldReconnect` ref + guard biar tidak reconnect setelah game selesai/keluar
      room secara sengaja).
- [x] **Crossword: konten tidak pernah divalidasi server-side** — `handleCrosswordCell` sekarang
      mencocokkan huruf yang dikirim terhadap huruf asli di `puzzle.grid[row][col]` sebelum menyimpan
      ke `filled_cells`; huruf salah (termasuk string kosong dari Backspace) ditolak dengan pesan
      `crossword_error`, bukan diam-diam dihitung sebagai "terisi". Efek samping: bug "sel salah tidak
      bisa dikoreksi" di Crossword Co-op ikut hilang, karena `filledCells` di frontend sekarang cuma
      terisi untuk jawaban yang sudah dikonfirmasi benar.
- [x] **Crossword Duel/Co-op tidak pernah punya puzzle sungguhan** — ditemukan bahwa tabel
      `crossword_puzzles` tidak pernah diisi sama sekali di manapun di codebase, jadi
      `getRandomCrosswordPuzzle` selalu jatuh ke fallback grid/clue kosong. Ditambahkan
      `seedCrosswordPuzzles()` (3 puzzle Bahasa Indonesia yang sudah diverifikasi konsisten
      grid-vs-jawaban, satu per difficulty) yang jalan otomatis lewat `SeedGameContent()`.
- [x] Bug kecil ikut dibetulkan: `gridSize` hilang di fallback puzzle kosong; Crossword Duel
      quickmatch memakai game slug salah (`'crossword'` alih-alih `'crossword-duel'`).

**Catatan:** selama sesi ini, sesi Claude Code lain yang berjalan bersamaan di repo yang sama
juga menutup 2 temuan security dari §4 secara independen — **IDOR Word Chain** (`GetGame`
sekarang cek kepemilikan match) dan **exploit self-declare-win Math Tournament**
(`ReportMatch` sekarang butuh laporan dari kedua peserta yang cocok sebelum match final,
kecuali dilaporkan host). Keduanya sudah diverifikasi masih build/test dengan bersih bersama
perubahan di dokumen ini.

Sisa dari §4 yang **belum dikerjakan**: Chess (belum ada entry point UI untuk challenge
by-username, dan `Move()` REST belum update FEN/validasi legalitas — saat ini tertutupi karena
client replay pakai chess.js lokal). Battleship Math e2e test assertion yang dihapus juga belum
dikembalikan.

---

## 1. Executive Summary

Klaim user ("banyak yang gagal dimainkan") **terverifikasi dan lebih parah dari
perkiraan** — dari 12 game multiplayer yang direview, hanya **Flag Team Battle** yang
diimplementasikan solid end-to-end. Sisanya punya minimal satu bug yang membuat game
tidak bisa dimenangkan, tidak bisa dimulai, tidak bisa diselesaikan, atau rentan
di-exploit. Ada 3 akar masalah yang menjelaskan sebagian besar laporan kegagalan:

1. **Regresi kritis satu baris meracuni 4 game sekaligus.** Commit `4e1e094` mengubah
   `CorrectAnswer` dari _nilai jawaban_ menjadi _index array_, tapi tidak ada satupun
   frontend yang ikut diubah — semua masih mengirim teks jawaban yang diklik user.
   Akibatnya **Math Battle, Math Relay, Quiz Showdown, dan Math Tournament** menilai
   hampir semua jawaban benar sebagai salah. Bot tidak terkena dampak karena logic bot
   ditulis belakangan sudah mengikuti kontrak index. → Pemain manusia nyaris selalu
   kalah dari bot, persis seperti keluhan "gagal dimainkan". Lihat [§2.1](#21-critical).

2. **Race condition tanpa mutex bisa mematikan seluruh server.** `GameRoom.Broadcast`/
   `BroadcastExcept` melakukan iterasi map tanpa lock, sementara goroutine lain menulis
   ke map yang sama secara paralel. Ini adalah kondisi `fatal error: concurrent map
iteration and map write` di Go — **bukan crash per-koneksi, tapi mematikan seluruh
   proses**, menjatuhkan semua game yang sedang berlangsung di server itu secara
   bersamaan. Lihat [§2.2](#22-critical).

3. **Dua game (Math Relay, Crossword Co-op) secara struktural tidak bisa dimulai
   sendirian** karena `MaxPlayers: 4` tapi auto-bot-fill sengaja/tidak sengaja tidak
   pernah dipanggil untuk keduanya. Solo player akan terjebak di layar "Menunggu
   pemain lain..." selamanya. Lihat [§2.3](#23-critical).

Di luar tiga akar masalah besar itu, hampir setiap game punya bug kelas "hang
forever"/"stuck screen" masing-masing (Wordle Duel, Sudoku Race resign, dsb), plus dua
temuan keamanan (IDOR di Word Chain, self-declare win exploit di Math Tournament).

---

## 2. Temuan Kritis (Lintas Game / Infrastruktur)

### 2.1 `CorrectAnswer` index vs text mismatch — CRITICAL

- **File:** `services/api/internal/ws/room.go:611-719` (set `CorrectAnswer` ke index
  array, mis. `itoa(i)`/`correctIdx`) vs. frontend `handleAnswer(opt)` yang mengirim
  **teks** opsi — `apps/web/app/(main)/games/math-battle/page.tsx:593`,
  `quiz-showdown/page.tsx:474`, `math-relay/page.tsx:283`.
- **Perbandingan salah terjadi di:** `room.go:503` (`SubmitAnswer`).
- **Riwayat:** dikonfirmasi via `git log -p` sebagai regresi dari commit `4e1e094`
  (sebelumnya `CorrectAnswer: itoa(correct)`, nilai jawaban asli).
- **Dampak nyata:** untuk semua soal math/geography/language (dipakai bersama oleh
  Math Battle, Math Relay, Quiz Showdown, Math Tournament round), jawaban benar user
  hampir selalu dinilai salah. Bot tidak kena karena `bot.go` sudah ditulis mengikuti
  kontrak baru (index) — sehingga terasa seperti "bot selalu menang, saya selalu
  kalah padahal jawaban saya benar".
- **Bug turunan:** `services/api/internal/ws/bot.go:76-86` — filter "jawaban salah"
  bot membandingkan **teks** opsi dengan `CorrectAnswer` (index), jadi bot tidak
  benar-benar mengecualikan opsi yang benar dari pool salahnya. Saat ini tertutupi
  oleh bug utama, tapi akan muncul begitu bug utama diperbaiki.
- **Fix:** pilih satu kontrak (disarankan: index, karena lebih murah dibanding
  lawan yang bisa membaca teks jawaban lawan) dan samakan di **semua** pemanggil:
  `room.go` question builder, semua game page yang memanggil `handleAnswer`, dan
  `bot.go`.

### 2.2 Unsynchronized map iteration → server-wide crash — CRITICAL

- **File:** `services/api/internal/ws/room.go:277-301` (`Broadcast`/`BroadcastExcept`
  meng-iterasi `r.Players`/`r.Spectators` **tanpa** `r.mu` lock), sementara
  `JoinRoom`/`AddBot`/`LeaveRoom`/`RemoveOneBot` menulis map yang sama **dengan**
  lock. Setiap koneksi WS berjalan di goroutine sendiri dan memanggil
  `handleMessage`/`handleJoinRoom` secara konkuren (tidak diserialisasi lewat
  `Hub.Run()`), jadi join/bot-add yang bertabrakan dengan broadcast (yang terjadi
  hampir di setiap tick game) bisa memicu `fatal error: concurrent map iteration and
map write`.
- **Dampak nyata:** ini adalah _panic_ level proses Go, bukan level koneksi — **satu
  room yang race akan mematikan seluruh server**, menjatuhkan semua game yang
  sedang berlangsung secara bersamaan. Sangat mungkin ini akar dari laporan
  kegagalan yang "acak"/tidak konsisten reproduce-nya.
- **Fix:** pegang `r.mu.RLock()` (atau salin slice pointer dulu di bawah lock)
  sebelum iterasi di `Broadcast`/`BroadcastExcept`.

### 2.3 Math Relay & Crossword Co-op tidak bisa start sendirian — CRITICAL

- **Math Relay:** `services/api/internal/ws/hub.go` branch `math_relay:` (~baris
  648-694) membuat room dengan `MaxPlayers: 4` dan hanya start via
  `room.IsFull()` — **tidak pernah** memanggil `tryAddGhostOrBot` (berbeda dari
  branch game lain). Frontend `math-relay/page.tsx:78` cuma expose
  `quickMatchBot('math-relay', 'medium')`, tapi `ws_controller.go` `QuickMatchBot`
  (baris 60-98) tidak pernah menyentuh hub / menambahkan bot — hanya generate UUID
  room baru.
- **Crossword Co-op:** `hub.go:608` — kondisi `&& !isCoop` **sengaja** melewati
  bot-fill untuk room co-op, sedangkan room duel (`isCoop == false`) dapat bot.
  `crossword-coop/page.tsx:84` juga cuma punya `quickMatchBot('crossword-coop',
'medium')` yang sama-sama tidak menambahkan bot.
- **Dampak nyata:** solo player mengklik "Mulai" dan terjebak permanen di layar
  "Menunggu pemain lain..." / "Menunggu game dimulai...". Kedua game ini **tidak
  bisa dimainkan sama sekali** dalam kondisi produk saat ini kecuali kebetulan ada
  3 orang lain online bersamaan di room yang sama.
- **Fix:** panggil `tryAddGhostOrBot` (atau bot-fill setelah timeout) untuk kedua
  branch ini juga, atau turunkan `MaxPlayers` bila memang didesain 2-player dulu.

---

## 3. Status Per Game

| Game                 | Status                          | Masalah Utama                                                                                                                                                             |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flag Team Battle** | ✅ Bekerja dengan baik          | Server-authoritative, bot-fill jalan, protokol match antara FE/BE. Satu-satunya game yang lolos review tanpa bug playability.                                             |
| **Battleship Math**  | ⚠️ Umumnya bekerja              | Timer 24h/30s & bot-timeout jalan; hanya e2e test yang dilemahkan (§4.5), belum ada bug live yang terkonfirmasi.                                                          |
| **Math Battle**      | ❌ Rusak                        | Kena bug §2.1 (jawaban selalu salah) + §2.2 (crash risk) + zombie reconnect (§4.1).                                                                                       |
| **Quiz Showdown**    | ❌ Rusak                        | Kena bug §2.1 + §2.2; tidak ada reconnect saat main (§4.2); indikator koneksi menyesatkan.                                                                                |
| **Wordle Duel**      | ❌ Rusak                        | Bisa hang selamanya jika kedua pemain gagal 6x tebakan (tidak ada `game_over`, tidak ada tombol resign); skor hasil selalu 0:0; tidak ada reconnect. (§4.3)               |
| **Sudoku Race**      | ❌ Rusak                        | Tombol Resign soft-lock UI (tidak pernah pindah ke result screen); tidak ada reconnect; highlight error tidak pernah muncul. (§4.4)                                       |
| **Math Relay**       | ❌ Tidak bisa dimainkan         | Terjebak §2.3; ditambah turn ownership tidak divalidasi server (§4.6), jawaban cepat <200ms didrop diam-diam.                                                             |
| **Crossword Co-op**  | ❌ Tidak bisa dimainkan         | Terjebak §2.3; ditambah konten tidak pernah divalidasi server (§4.7), sel salah tidak bisa dikoreksi.                                                                     |
| **Crossword Duel**   | ⚠️ Bisa start, mekanik rusak    | Bot-fill jalan, tapi "selesai" dihitung dari sel yang _pernah_ diisi, bukan yang _benar_ — puzzle bisa "selesai" dengan jawaban salah/kosong (§4.7).                      |
| **Chess**            | ❌ Rusak / tidak lengkap        | PvP async **tidak bisa diakses dari UI** sama sekali (hanya bot & quickmatch WS); match REST tidak pernah update FEN & tanpa validasi legalitas/deteksi checkmate (§4.8). |
| **Word Chain**       | ⚠️ Bekerja tapi ada celah       | IDOR — user lain bisa baca game orang lain (§4.9); match yang ditinggal lawan tidak pernah bisa diselesaikan paksa (§4.10).                                               |
| **Math Tournament**  | ⚠️ Bekerja tapi bisa di-exploit | Peserta bisa klik tombol "Menang" sendiri tanpa benar-benar bertanding, memenangkan bracket secara curang (§4.11).                                                        |

---

## 4. Temuan Detail per Game

### 4.1 Math Battle — zombie reconnect setelah cancel

`apps/web/app/(main)/games/math-battle/page.tsx:387-393`: cleanup memanggil
`wsRef.current.close()` secara sinkron, tapi event `onclose` (baris 355) baru
terpanggil browser secara async **setelah** cleanup selesai membersihkan
`reconnectTimer.current`. Karena `gameStateRef.current` masih `'waiting'`/`'playing'`
saat itu, `onclose` menjadwalkan `setTimeout(() => connect(), 2000)` (baris 358) yang
tidak akan pernah dibatalkan. Skenario: user klik "Cari Lawan" lalu "Batal" — ±2
detik kemudian WebSocket zombie reconnect dan mengirim ulang `join_room` untuk room
yang sudah ditinggalkan.

### 4.2 Quiz Showdown — tidak reconnect saat bermain

`apps/web/app/(main)/games/quiz-showdown/page.tsx:113-116`: `ws.onclose` hanya
`setConnected(false)`, tidak ada retry sama sekali. Teks header
`{connected ? 'Terhubung' : 'Menyambungkan...'}` akan menampilkan "Menyambungkan..."
selamanya setelah drop koneksi, padahal tidak ada proses reconnect yang jalan.
Backend juga broadcast `player_disconnected`/`player_reconnected` (`hub.go:144,168,398`)
tapi frontend tidak punya case untuk keduanya di message switch-nya.

### 4.3 Wordle Duel — bisa hang permanen, skor palsu, tanpa exit

- **Hang forever:** `services/api/internal/ws/hub.go:955-1032` (`handleWordleGuess`)
  — satu-satunya jalan broadcast `game_over` adalah tebakan benar (baris 1024). Jika
  pemain mencapai `len(playerGuesses) >= 6` (baris 973), server hanya balas `error`
  dan tidak melakukan apa-apa lagi — tidak ada goroutine timeout seperti di
  sudoku/chess. `wordle-duel/page.tsx` juga tidak punya tombol Resign/keluar
  di manapun dalam `DuelScreen`. Skenario realistis: kedua pemain gagal menebak
  kata 5-huruf dalam 6x percobaan (sangat mungkin lawan bot dengan kata acak) →
  match macet permanen di layar grid.
- **Skor selalu 0:0:** `hub.go:1024-1029` — `Results` di-hardcode `[]PlayerResult{}`,
  tidak pernah diisi. `wordle-duel/page.tsx:316-319` mencari `results?.find(...)`
  yang selalu `undefined` → `myScore`/`oppScore` selalu render `0` walau
  `winner_id` benar.
- **Tidak ada reconnect:** grep tidak menemukan `ws.onclose` sama sekali di file
  ini — kombinasi dengan forfeit timer server 30 detik membuat drop koneksi
  sekejap (WiFi handoff, tab background) langsung mengakhiri match tanpa feedback.

### 4.4 Sudoku Race — tombol Resign soft-lock UI

`apps/web/app/(main)/games/sudoku-race/page.tsx:198-201` `handleResign` mengirim
`leave_room` dan set `gameOver=true` lokal, tapi `screen` parent tidak pernah
berubah ke `'result'` karena transisi itu hanya terjadi lewat callback `onResult`
yang di-wire ke handler pesan `game_over`. Backend `leave_room` (`hub.go:305-313`)
hanya menghapus player dari map room — tidak pernah broadcast `game_over`. Hasil:
klik Resign mematikan numpad & tombol Resign tapi user tetap terjebak di papan
beku selamanya, tanpa result screen, tanpa XP. Tambahan minor: `hub.go:1098`
mengirim `sudoku_error` hanya dengan `{"message": ...}` tanpa `row`/`col`, jadi
highlight sel merah di frontend (`sudoku-race/page.tsx:160-166`) tidak pernah
ter-trigger.

### 4.5 Battleship Math — test regression coverage dilemahkan

Commit `3b75424` (`apps/web/e2e/battleship-math.spec.ts`) menghapus tiga assertion
`expect(await request.postDataJSON())...toMatchObject/toEqual(...)` yang memverifikasi
body JSON persis ke `POST /battleship`, `/battleship/:id/target`, dan
`/battleship/:id/shot`. Payload frontend saat ini (`battleship-math/page.tsx:79-120`)
masih cocok dengan ekspektasi backend, jadi belum ada bug live — tapi coverage untuk
menangkap drift payload FE/BE di masa depan sudah hilang. **Tidak dianggap bug
playability saat ini**, tapi flag untuk dikembalikan.

### 4.6 Math Relay — turn ownership & jawaban cepat didrop

- `room.go` `SubmitAnswer` (baris 469, dipakai generik oleh math-relay via
  `submit_answer`) hanya cek soal exist, `timeTaken >= 200`, dan question ID cocok
  `CurrentQ` — **tidak pernah cek** apakah `userID` sama dengan `current_player`
  hasil hitung `startMathRelay` (`hub.go:1435`, `playerIdx := i / 5`). Gating giliran
  murni di client (`disabled={!isMyTurn || gameOver}`, `math-relay/page.tsx:284`).
- `room.go:482`: `if timeTaken < 200 { return }` — jawaban tercepat setelah soal
  muncul (sebelum `setInterval` 200ms pertama update `timeLeft`) bisa terhitung
  `time_taken_ms: 0` dan di-drop diam-diam tanpa `answer_result`/`error` apapun ke
  klien.

### 4.7 Crossword Co-op & Duel — konten tidak pernah divalidasi

`services/api/internal/ws/hub.go` `handleCrosswordCell` (~baris 1340): huruf apapun
yang dikirim klien langsung disimpan (`filledCells[key] = letter`) dan di-broadcast
**tanpa dibandingkan** ke solusi puzzle. Pengecekan selesai (`currentFilled >=
totalCells`) menghitung jumlah key map yang **pernah** ditulis, bukan yang benar.
Ditambah Backspace di crossword-duel (`crossword-duel/page.tsx:219-256`) mengirim
`letter: ''` yang tetap tercatat sebagai "terisi" — sel yang diketik lalu dihapus
tetap dihitung selamanya. Akibatnya puzzle bisa memicu `game_over`/perayaan MVP
hanya dengan menyentuh semua sel minimal sekali, tanpa benar-benar menyelesaikan
TTS-nya. Di Co-op spesifik, `crossword-coop/page.tsx:188`
(`if (filledCells.has(key)) return;`) memblokir re-edit sel manapun setelah
terisi — satu typo rekan tim mengunci sel salah selamanya tanpa cara koreksi.

### 4.8 Chess — PvP async tidak bisa diakses, state REST tidak maju

- **Tidak ada UI:** `apps/web/app/(main)/games/chess/page.tsx` (menu, baris
  509-590) hanya punya "Cari Lawan Online" (WS quickmatch sekali pakai) dan "Vs
  Bot". Tidak ada input/tombol yang memanggil `chessApi.create({
opponent_username, vs_bot: false })`, padahal backend
  (`chess_service.go:111-137`) sudah mengimplementasikannya penuh. **User tidak
  bisa menantang teman spesifik lewat Chess async sama sekali.**
- **FEN tidak pernah update:** `chess_service.go` `Move()` (baris 158-212) hanya
  append ke `moves_json` dan flip `current_turn` — `match.FEN` cuma diset sekali
  di `Create()` dan permanen `startFEN` setelahnya. Tidak ada validasi legalitas
  langkah maupun deteksi checkmate/stalemate/draw — game hanya bisa berakhir lewat
  `Resign()`. Saat ini tertutupi karena client replay `match.moves` pakai chess.js
  lokal, tapi rapuh untuk konsumen manapun yang percaya field `fen` tersimpan.

### 4.9 Word Chain — IDOR (keamanan)

`services/api/internal/service/wordchain_service.go` `GetGame()` (baris 652-675)
memuat game by ID dan membangun response **tanpa pernah mengecek** apakah
`userID` yang request adalah `Player1ID`/`Player2ID` — berbeda dengan Chess
`Get()` yang melakukan pengecekan ini, dan Battleship `getAuthorizedMatch()`.
Siapapun user login yang tahu/menebak UUID game bisa melihat state live game
orang lain (kata saat ini, skor, giliran, nama lawan).

### 4.10 Word Chain — match yang ditinggal tidak bisa diselesaikan paksa

Expiry giliran 24 jam hanya dicek di dalam `SubmitWord()` (baris 701-705), dan
hanya untuk pemain yang sedang gilirannya. Tidak seperti Battleship yang
mengevaluasi timer secara lazy di **setiap** read/action
(`processBattleshipTimers`), Word Chain `GetGame`/`GetActiveGames` tidak pernah
memanggil pengecekan expiry apapun, dan tidak ada cron untuk word-chain. Jika
pemain yang gilirannya berhenti merespons, lawan tidak punya cara memaksa
forfeit/resolusi — match tersangkut "active" selamanya.

### 4.11 Math Tournament — exploit menang tanpa bertanding

`tournament_service.go` `canReportMatch()` (baris 734-743) mengizinkan host
tournament **atau salah satu peserta match** memanggil `POST
/tournaments/:id/matches/:match_id/report` dengan `winner_player_id` bebas
(asal salah satu dari 2 peserta) — tanpa bukti apapun bahwa ronde Math Battle
benar-benar selesai dimainkan. `apps/web/components/games/MathTournament.tsx`
(baris 626-637) mengekspos ini langsung sebagai tombol "`{player} Menang`" di
samping link resmi "Mainkan Math Battle". Alur otomatis yang benar
(`math-battle/page.tsx:395-410`, auto-report dari hasil WS asli) sepenuhnya bisa
dilewati — pemain bisa klik tombol menang sendiri begitu match aktif, curang
memajukan diri & mengeliminasi lawan.

---

## 5. Rekomendasi Prioritas Perbaikan

1. **Fix `CorrectAnswer` index/text contract** (§2.1) — satu baris regresi,
   dampak terbesar, blast radius 4 game sekaligus. Prioritas #1.
2. **Tambahkan lock di `Broadcast`/`BroadcastExcept`** (§2.2) — risiko crash
   seluruh server, mudah diperbaiki (tambah `RLock`), harus masuk sebelum rilis
   apapun berikutnya.
3. **Aktifkan bot-fill untuk Math Relay & Crossword Co-op** (§2.3) — tanpa ini
   kedua game 100% tidak bisa dimainkan solo, yang kemungkinan besar mayoritas
   kasus pemakaian saat ini (base user masih kecil).
4. **Tambahkan validasi konten server-side untuk Crossword** (§4.7) — mekanik
   inti game saat ini tidak benar-benar menguji jawaban.
5. **Tambahkan reconnect logic yang konsisten** di semua game realtime yang
   belum punya (Wordle Duel, Sudoku Race, Quiz Showdown, Math Relay, Crossword
   Coop/Duel) — idealnya diekstrak jadi satu `useWebSocket` hook bersama di
   `apps/web/lib/hooks/`, alih-alih setiap halaman reimplement sendiri dengan
   kualitas berbeda-beda (akar penyebab tidak langsungnya).
6. **Tutup celah keamanan:** IDOR Word Chain (§4.9) dan self-declare win
   Tournament (§4.11) — keduanya bisa dieksploitasi user biasa tanpa alat khusus.
7. **Wordle Duel & Sudoku Race:** implementasikan jalur `game_over`/forfeit untuk
   kasus "keduanya gagal" dan "resign", plus isi `Results` Wordle Duel dengan
   data asli.
8. **Chess:** tambahkan entry point UI untuk challenge-by-username, dan
   perbaiki `Move()` agar update FEN + validasi legalitas (bisa reuse chess.js
   di server via child process, atau library Go setara).
9. Kembalikan assertion yang dihapus di `battleship-math.spec.ts` (§4.5) supaya
   drift payload FE/BE ke depan tertangkap otomatis.

---

_Review ini murni investigasi (read-only), belum ada perbaikan kode yang
diterapkan. File yang dibaca penuh: seluruh `services/api/internal/ws/*.go`,
`services/api/internal/{controller,service}/{battleship,chess,room,tournament,
wordchain}_\*.go`, `apps/web/app/(main)/games/{math-battle,quiz-showdown,
wordle-duel,sudoku-race,flag-team-battle,math-relay,crossword-coop,
crossword-duel,battleship-math,chess,word-chain,math-tournament}/`,
`apps/web/types/multiplayer.ts`, `apps/web/lib/api/multiplayer.ts`,
`apps/web/e2e/battleship-math.spec.ts`, `services/api/cmd/main.go`.\_
