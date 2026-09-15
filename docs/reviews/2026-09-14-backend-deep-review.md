# Deep Review: Backend API (`services/api`)

**Tanggal:** 14 September 2026 (fix pass: 15 September 2026)
**Status:** Sebagian besar temuan Critical/High/Medium/Low sudah diperbaiki — lihat "Status Perbaikan" di bawah.
**Scope:** `services/api` (Go/Fiber) — auth & security, HTTP controllers, services & repository, realtime WebSocket, bootstrap/config/infra
**Metode:** 5 review paralel per-subsistem (baca kode langsung, verifikasi manual per temuan), lalu dikonsolidasi di sini.

---

## Status Perbaikan (15 September 2026)

**Catatan penting:** ada 3 sesi Claude Code lain yang aktif bekerja di repo yang sama secara paralel saat fix pass ini berjalan, salah satunya mengedit `internal/ws/` (hub.go, room.go, bot.go, ghost_bot.go) untuk pekerjaan lain (fitur game baru + beberapa fix yang tumpang tindih). Temuan WS inti (`Broadcast`/`BroadcastExcept` locking, `SubmitAnswer`/`handleWordleGuess` tidak lagi memegang lock saat broadcast, sudoku bounds check) sudah diperbaiki oleh sesi tersebut sebelum ronde kedua fix pass ini. Ronde kedua (15 Sept, setelah sesi lain idle) menambahkan beberapa fix WS lain yang belum tersentuh — lihat "Fixed — Critical #4-6" dan "Fixed — High" di bawah.

### Fixed — Critical
1. **Admin backdoor** — `seedUsers()` di `cmd/main.go` sekarang di-gate di belakang `SEED_DEMO_USER=true` dan tidak lagi me-reset role user yang sudah ada di setiap restart.
2. **Webhook Midtrans bypass** — ditambahkan kolom `Subscription.OrderID`, verifikasi `signature_key` (SHA512, constant-time compare) dan validasi `gross_amount`, match by `order_id` bukan primary key.
3. **Skor challenge/daily/leaderboard-challenge tidak lagi dipercaya mentah dari client**:
   - `challenge_service.go`: skor dihitung ulang dari `answers` vs kunci jawaban tersimpan; kunci jawaban tidak lagi dikirim ke client di response soal.
   - `daily_service.go`: kontrak diubah dari `score int` jadi `answers []UserAnswer`, dinilai server-side jadi skor 0-100.
   - `leaderboard_challenge_service.go`: skor yang diklaim divalidasi tidak boleh melebihi highscore asli user di `user_highscores`.
4. **`Broadcast`/`BroadcastExcept` unlocked map access** — fixed oleh sesi lain via `snapshotRecipients()` (RLock snapshot sebelum kirim socket).
5. **`Hub.Run` bisa hang seluruh server** — `client.SendMessage` sekarang punya write deadline 5 detik (`internal/ws/client.go`), jadi satu koneksi macet tidak lagi memblokir goroutine Register/Unregister selamanya.
6. **Sudoku index panic** — bounds check `row/col` sudah ditambahkan oleh sesi lain di `handleSudokuCell`.

### Fixed — High
- JWT secret sekarang wajib di-set (`ALLOW_INSECURE_JWT_SECRET=true` untuk dev tanpa secret), tidak lagi hanya dicek saat `APP_ENV=="production"` persis.
- Logout sekarang blacklist refresh token cookie juga, bukan cuma access token.
- Reset password sekarang mencabut semua access/refresh token yang terbit sebelumnya (`user:tokens_valid_after:<id>` di Redis + klaim `iat` di token).
- `pkg/middleware/logger.go`: redaksi field sensitif sekarang rekursif ke semua level nesting (menutup celah `{"data": {...}}`), query param ikut diredaksi, body non-JSON tidak lagi di-log mentah.
- Endpoint `/support` sekarang selalu mengirim notifikasi ke inbox support internal (`SUPPORT_NOTIFY_EMAIL`), bukan ke email yang diklaim submitter; input di-HTML-escape; ditambah rate limit 5/menit per IP.
- Upload avatar sekarang divalidasi dari isi file (`http.DetectContentType`), bukan cuma nama file dari client.
- Error 500 di seluruh controller (33 lokasi) tidak lagi meneruskan `err.Error()` mentah ke client — pakai `response.InternalError` yang log detail asli di server dan balas pesan generik. `main.go`'s Fiber `ErrorHandler` juga disamakan.
- Tournament `ReportMatch` sekarang butuh konfirmasi dari kedua peserta (host tetap bisa unilateral sebagai adjudicator) sebelum match difinalisasi — satu peserta tidak bisa lagi mengklaim menang sendiri.
- Tidak ada graceful shutdown & HTTP timeout — ditambahkan `ReadTimeout`/`WriteTimeout`/`IdleTimeout` dan `SIGTERM`/`SIGINT` handling dengan `ShutdownWithTimeout`.
- **Matchmaking double-match/phantom-match** (`internal/ws/matchmaking.go`) — lock sekarang mengunci PASANGAN peserta (kedua ID, urutan disortir) lewat `tryLockPair`, bukan cuma ID pemanggil sendiri. Menutup dua race sekaligus: dua caller berbeda merebut opponent yang sama, dan dua goroutine milik sepasang user yang sama-sama saling klaim dari arah berlawanan.
- **Reconnect race menendang player yang sebenarnya masih aktif** (`internal/ws/hub.go`, `Hub.Run`) — koneksi lama yang sudah digantikan reconnect (`current != client` saat `Unregister` diterima) sekarang di-skip sepenuhnya dari efek samping room (broadcast disconnect + reconnect-timer), bukan diproses seolah masih koneksi aktif. `oldClient.Conn = nil` juga sekarang di bawah `oldClient.mu.Lock()` untuk menghindari race baca/tulis field `Conn` yang sama dengan yang dipakai `SendMessage`.
- **math_relay tidak memvalidasi giliran** — `SubmitAnswer` sekarang menolak jawaban dari pemain yang bukan giliurnya untuk match bertipe `math_relay` (`currentRelayPlayerLocked`, mencocokkan rotasi `players[currentQ/questionsPer]` yang sama dengan yang dipakai `startMathRelay`).

### Fixed — Medium
- `leaderboard_controller.go`: `period` sekarang divalidasi (`all`/`weekly` saja, sesuai yang benar-benar diimplementasikan) alih-alih diam-diam fallback ke `all`.
- `referral_controller.go`: dipindah ke `response.Success`/`response.Error` — sebelumnya frontend (`res.data.data`) tidak pernah bisa membaca response mentah ini, jadi ini juga **memperbaiki bug fitur referral yang sudah rusak di production**.
- `experiment_controller.go`: `validator.Validate.Struct` sekarang benar-benar dipanggil di `Create`.
- `friend_service.go`: re-request setelah decline sekarang `Update` di tempat, bukan `Create` baru yang selalu gagal kena unique constraint.
- `push_service.go`: payload notifikasi dibangun via `json.Marshal`, bukan string concatenation (menutup celah injection ke field `data.url`).
- `multiplayer_leaderboard.go` (`CreateRematch`): sekarang memverifikasi caller adalah member room lama (menutup IDOR) dan host baru adalah caller sendiri.
- `wordchain_service.go` (`GetGame`): sekarang memverifikasi caller adalah salah satu pemain (menutup IDOR).
- `room_service.go`: semua operasi tulis (Join/Leave/Start/UpdateSettings) sekarang pakai Redis `WATCH`/optimistic-lock lewat helper `mutateRoom`, bukan read-modify-write biasa.
- `game_service.go` & `daily_service.go`: cache `user_profile` diinvalidasi setelah XP/level berubah; error dari `UpsertHighscore`/`AddGameScore` sekarang di-log, tidak ditelan diam-diam.
- `game_repository.go` (`UpsertHighscore`): diganti jadi satu `INSERT ... ON CONFLICT DO UPDATE` atomik (CASE/WHEN, portable ke Postgres & SQLite), bukan read-then-write.
- `leaderboard_service.go` (`AddGameScore`): error dari kedua `repo.AddScore` sekarang benar-benar diteruskan, bukan selalu `return nil`.
- `pkg/profanity/profanity.go`: matching diganti regex dengan word-boundary (`\bkata\b`, case-insensitive) — menutup false-positive substring ("asuransi", "santai") dan inkonsistensi `Sanitize`/`IsClean` pada mixed-case.

### Fixed — Low
- `user_controller.go`: error upload avatar tidak lagi bocor detail filesystem mentah ke client.
- `wordchain_controller.go`: `BotDifficulty` sekarang divalidasi `oneof=easy medium hard`.
- `ad_controller.go`: error parsing `priority` sekarang direspon 400, tidak diam-diam jadi 0.
- `auth_service.go` & `weekly_summary_service.go`: username di-HTML-escape sebelum masuk ke email verifikasi/reset/ringkasan mingguan.

### Belum dikerjakan (butuh keputusan/scope terpisah)
- **Chess move validation** (`chess_service.go`) — tidak ada validasi legalitas gerakan sama sekali dan `FEN` tidak pernah diupdate. Perbaikan penuh butuh chess rules engine (mis. `notnil/chess`), scope terlalu besar untuk fix pass ini.
- **`content_controller.go` unbounded lists** — sengaja tidak dibatasi karena game (wordle, flags, dst.) kemungkinan butuh dataset penuh di client; capping butuh verifikasi per-game dulu.
- **`pkg/database/postgres.go` `SeedData`** — migrations di-re-exec tanpa tracking tiap boot; saat ini dormant karena folder `migrations/` belum ada, tapi tetap berisiko begitu ada migrasi non-idempotent.
- **WS chess move relay tanpa validasi legalitas** (`internal/ws/hub.go`, `handleChessMove`) dan `isPlayersTurn` dipaksa `true` kalau ada bot/ghost — sama seperti chess_service.go di atas, butuh rules engine, di luar scope fix pass ini.
- **WS dead code**: `client.go` `Send` channel & `SendJSON` masih tidak dipakai di mana pun — dibiarkan karena menghapusnya berisiko konflik dengan pekerjaan sesi lain yang masih berjalan di paket yang sama.

---

## Ringkasan Eksekutif

Backend secara umum punya fondasi yang solid (bcrypt+cost 12, JWT alg dipin ke HS256, parameterized query di semua repository, CORS allow-list yang benar, rate limiting di `/auth`, transaksi + unique index yang benar di `referral_service`, desain server-authoritative yang baik di `battleship_service`). Tapi ada beberapa **cacat kritis yang bisa dieksploitasi langsung**:

1. Ada akun admin backdoor hardcoded yang di-seed ulang (dan di-*re-promote*) setiap kali server restart, di environment manapun.
2. Webhook pembayaran Midtrans tidak diverifikasi tanda tangannya dan salah cocokkan field — user bisa mengaktifkan langganan premium miliknya sendiri tanpa membayar.
3. Beberapa endpoint submit skor (challenge, daily, leaderboard-challenge) menerima skor dari client mentah-mentah tanpa validasi server — mudah dipakai curang.
4. Layer WebSocket punya beberapa race condition yang bisa memicu `fatal error: concurrent map iteration and map write` — ini **crash seluruh proses**, bukan cuma satu koneksi, dan tidak ada `recover()` di manapun dalam paket `internal/ws`.

Detail lengkap di bawah, diurutkan per severity dan disertai lokasi file:line yang sudah diverifikasi langsung dari kode (bukan tebakan dari nama fungsi).

---

## Critical

### 1. Hardcoded admin backdoor, di-seed ulang di setiap boot — `cmd/main.go`
`seedData()` dipanggil tanpa syarat di setiap start (`main.go:107`), memanggil `seedUsers()` (`main.go:733-763`) yang membuat/menjamin akun `demo@demo.com` / `demo123` dengan `role: "admin"`. Jika akun ini sudah ada, kode menjalankan `UPDATE users SET role='admin' WHERE email = ?` — **setiap restart**, bahkan kalau operator sudah menurunkan role-nya secara manual. Tidak ada pengecekan `APP_ENV` sama sekali.
**Dampak:** deploy binary ini ke production mana pun otomatis membuat/mempertahankan akun admin dengan kredensial publik yang dikenal. `POST /api/v1/auth/login` dengan `demo@demo.com`/`demo123` → akses admin penuh.

### 2. Webhook Midtrans bisa di-bypass tanpa bayar — `subscription_service.go:181-194`, `subscription_controller.go:58-69`, `model/subscription.go`
Route `POST /api/v1/subscribe/webhook` publik (tanpa auth middleware, `main.go:314`). Handler tidak pernah memverifikasi `signature_key` Midtrans (SHA512 dari `order_id+status_code+gross_amount+server_key`), dan langsung:
```go
database.DB.Model(&model.Subscription{}).Where("id = ? AND status = ?", orderID, "pending").Update("status", "active")
```
`orderID` yang dikirim Midtrans (`"PREMIUM-" + uuid[:8]`) **tidak pernah disimpan** di kolom manapun pada model `Subscription` — model tidak punya field `OrderID`. Jadi `Where("id = ?", orderID)` sebenarnya membandingkan terhadap primary key UUID asli. Efeknya dua arah:
- Pembayaran Midtrans yang sah **tidak pernah** bisa mengaktifkan subscription (match tidak pernah cocok) — jalur revenue rusak.
- User bisa `POST /subscribe/` untuk membuat subscription `pending` miliknya, ambil `id` UUID asli dari response, lalu panggil webhook publik dengan `{"order_id": "<uuid itu>", "transaction_status": "settlement"}` → subscription-nya sendiri berubah jadi `active` tanpa bayar sepeser pun. Reproducible end-to-end.

### 3. Skor game diterima mentah dari client tanpa validasi server, di 3 tempat
- `challenge_service.go:261-318` (`SubmitChallenge`) — parameter `answers []UserAnswer` diterima tapi **tidak pernah dibaca**; `score int` dari body langsung dipakai untuk win/lose/XP.
- `daily_service.go:112-194` (`SubmitChallenge`) — pola sama, `score` full client-controlled, menentukan XP + streak.
- `leaderboard_challenge_service.go:157-212` (`SubmitScore`) — pola sama untuk head-to-head challenge.
Controller (`challenge_controller.go:72-75`, `daily_controller.go:34-37`) cuma memvalidasi `score >= 0`, tanpa batas atas atau cross-check terhadap jawaban asli. Bandingkan dengan `game_service.go:133-139` yang setidaknya membatasi `Score<=1000` — ketiga endpoint ini bahkan tidak punya guard itu. Siapapun yang login bisa submit skor sembarang untuk menang/dapat XP.

### 4. WebSocket: `Broadcast`/`BroadcastExcept` tanpa lock → bisa crash seluruh proses — `internal/ws/room.go:277-301`
Kedua fungsi ini membaca `r.Players`/`r.Spectators` **tanpa** `r.mu`, padahal field yang sama ditulis di bawah `r.mu.Lock()` di tempat lain (`JoinRoom` room.go:78-108, `LeaveRoom` room.go:117-127, `AddBot`/`RemoveOneBot` room.go:304-359, dst). Contoh interleaving nyata: `StartGame` memanggil `r.Broadcast("question", q)` (room.go:398) tanpa lock, bersamaan dengan goroutine lain yang memproses `join_room` dan menulis `room.Players[userID] = player` di bawah `r.mu.Lock()`. Iterasi map bersamaan dengan penulisan map di Go bukan panic yang bisa di-`recover()` — ini **fatal runtime error** yang mematikan seluruh proses, mempengaruhi semua room/user yang sedang online, bukan cuma satu koneksi.

### 5. WebSocket: `Hub.Run` bisa hang seluruh server karena satu client lambat — `internal/ws/hub.go:131-176`, `client.go:39-49`
`Hub.Run` adalah satu-satunya goroutine yang memproses **semua** event Register/Unregister untuk seluruh server, tapi ia melakukan write socket sinkron & tak terbatas langsung di dalamnya (`room.BroadcastExcept` di hub.go:144/168, `client.SendMessage` di hub.go:148). `SendMessage` memanggil `conn.WriteMessage` langsung tanpa **write deadline sama sekali** di seluruh codebase (dikonfirmasi via grep — nol `SetWriteDeadline`/`SetReadDeadline`/ping-pong handler di `internal/ws/`). Satu client yang berhenti membaca socket-nya (koneksi macet/stall) membuat write itu blok selamanya **di dalam goroutine yang menguasai semua Register/Unregister** — server-wide hang dari satu peer.

### 6. WebSocket: index sudoku tanpa bounds check → panic proses — `internal/ws/hub.go:1077-1163` (`handleSudokuCell`), dipicu dari hub.go:264-274
`row`/`col` diambil langsung dari payload `submit_sudoku_cell` milik client tanpa validasi batas, lalu dipakai sebagai index mentah ke array `[9][9]int` (hub.go:1090, 1096, 1102, 1109). Client mana pun yang sudah login bisa mengirim `row: 999` untuk memicu index-out-of-range panic. Karena tidak ada `recover()` di paket ini, satu pesan malformed ini mematikan seluruh proses untuk semua user yang terhubung, bukan cuma pengirimnya.

---

## High

### Auth & Session
- **JWT secret kosong kalau `APP_ENV` bukan persis `"production"`** — `config/config.go:79-82`. Kalau env var tidak diset, kosong, atau typo (`"prod"`, `"Production"`, `"staging"`), server tetap boot dengan `JWT.Secret == ""`. Semua token HS256 jadi forgeable trivial (secret `""` di jwt.io) → impersonation user/admin sembarangan.
- **Logout tidak blacklist refresh token** — `auth_controller.go:176-201` + `auth_service.go:339-347`. Hanya JTI access token yang di-blacklist; refresh token di cookie tetap valid setelah "logout".
- **Reset password tidak mencabut sesi lama** — `auth_service.go:448-467`. Ganti password tidak invalidate access/refresh token yang sudah terbit — sesi yang sudah dibajak sebelum reset tetap hidup setelah reset.
- **Access token bocor ke log dalam bentuk plaintext** — `internal/middleware/logger.go:44-56,101-116`. `redactJSON` cuma redact key top-level, sementara semua response body dibungkus satu level lebih dalam via `pkg/response.Success` (`{"data": {...}}`). `access_token` selalu ada di dalam `data`, jadi tidak pernah kena redaksi — token JWT dari login/register/refresh/Google-login tercatat plaintext di `res_body` setiap request.
- **Query parameter tidak pernah diredaksi sama sekali** — `logger.go:89-93`. `GET /api/v1/auth/verify-email?token=...` mencatat token verifikasi email plaintext di log terstruktur; redaksi `sensitiveFields` cuma jalan untuk body JSON & header, tidak untuk query args.
- **Redaksi body gagal-terbuka (fail-open) untuk body non-JSON** — `logger.go:44-48,101-105`. Kalau request dikirim sebagai form-urlencoded/multipart (Fiber `BodyParser` menerima keduanya), `json.Unmarshal` gagal dan `redactJSON` mengembalikan body **tanpa redaksi** — password plaintext ikut ter-log kalau client cuma ganti `Content-Type`.

### Payment / Endpoint publik disalahgunakan
- **Endpoint support ticket = open email relay + HTML injection** — `support_service.go:44-53`, tidak ada auth middleware maupun rate limiter di `main.go:312` (kontras dengan `/auth` yang dibatasi 10/menit). `Email` cuma divalidasi `required,email` — bukan email pemilik akun. `name`/`message` diselipkan mentah (tanpa escape) ke body HTML lewat `fmt.Sprintf`, lalu dikirim ke `emailAddr` yang dikontrol attacker. Ini membuat mail sender terverifikasi platform bisa dipakai kirim HTML/phishing ke alamat mana pun, tanpa rate limit.

### Game fairness
- **Chess tidak divalidasi sama sekali di server** — `chess_service.go:158-212` (`Move`). Move string dari client cuma di-append ke list, giliran dibalik, tapi tidak pernah diparse/divalidasi legalitasnya, tidak ada deteksi check/checkmate, dan `match.FEN` **tidak pernah diupdate** (`toChessResponse` selalu mengembalikan posisi awal). Client bisa mengirim apa pun sebagai "move" dan akan diterima — tidak ada state game yang benar-benar server-authoritative.
- **Tournament: hasil match dilaporkan sendiri oleh peserta** — `tournament_service.go:432-524` (`ReportMatch`) + `canReportMatch:734-743`. Peserta mana pun (bukan wasit independen) bisa memanggil ini dan mendeklarasikan dirinya sebagai `WinnerPlayerID` dengan skor sembarang — tidak ada pengecekan skor pemenang lebih tinggi, tidak ada requirement kedua pihak setuju. Bisa self-report menang untuk maju bracket + dapat XP hingga 500.

### Upload
- **Avatar upload tanpa whitelist tipe file → stored XSS** — `user_service.go:73-107` (`UploadAvatar`). Ekstensi diambil mentah dari filename client tanpa whitelist, file disimpan di path yang di-serve statis lewat `app.Static("/uploads", "./uploads")` (`main.go:122`). User bisa upload `.svg`/`.html` berisi script sebagai "avatar" dan itu akan di-serve dari origin API sendiri.

### Realtime — reconnect & matchmaking
- **Race reconnect bisa force-forfeit player yang sebenarnya masih aktif bermain** — `hub.go:136-173`, `room.go:129-178`. Saat reconnect, koneksi lama cuma di-set `nil` (bukan ditutup); goroutine baca-nya tetap hidup. Saat socket lama itu akhirnya error (mis. tab lama ditutup belakangan), `Unregister` untuk client lama itu tetap memproses `client.RoomID`-nya, mem-broadcast ulang `player_disconnected` dan memulai lagi `StartReconnectTimer` — 30 detik kemudian player yang **sedang aktif bermain** di koneksi baru di-forfeit paksa.
- **Matchmaking bisa double-match / phantom match** — `matchmaking.go:82-153`. Lock hanya dikunci di sisi user pemanggil (`matchmaking:lock:%s:%s` pakai ID pemanggil sendiri), bukan di sisi lawan. Dua user berbeda (A dan C) bisa sama-sama memilih lawan yang sama (B) dan sama-sama lolos lock masing-masing (key beda) → dua `MatchResult` dikirim ke channel kapasitas-1 milik B; kirim kedua blok selamanya (goroutine leak) dan salah satu penantang dapat room ID yang B tidak akan pernah join — baru dibersihkan 5 menit kemudian oleh `RoomManager.StartCleanup`.

### Konsistensi respons error
- **Error internal mentah dikembalikan ke client secara sistemik** — `pkg/response/response.go:14-21` meneruskan `err.Error()` verbatim ke field `message`/`error` tanpa sanitasi. Terjadi di hampir semua controller: `ad_controller.go:38,85,102,114`, `blog_controller.go:66`, `battleship_controller.go:32`, `chess_controller.go:32`, `challenge_controller.go:51`, `friend_controller.go:25,37,105`, `wordchain_controller.go:47`, `tournament_controller.go:24`, `daily_controller.go:70`, `leaderboard_controller.go:48`, `multiplayer_leaderboard.go:29`, `subscription_controller.go:25,52`, `experiment_controller.go:20`, `leaderboard_challenge_controller.go:105`, `ws_controller.go:47`, `achievement_controller.go:27,39`, `ai_controller.go:36`. Saat ini sebagian besar pesan error sudah aman (ditulis manual), tapi tidak ada guard sistemik — begitu ada error GORM/driver yang lolos tanpa di-wrap manual, detail internal (termasuk potongan SQL) akan bocor ke client.

---

## Medium

- **`leaderboard_controller.go:17-35` — param `period=daily`/`monthly` diam-diam diabaikan.** Hanya `"weekly"` yang di-*special-case* di `leaderboard_service.go:55-58`; nilai lain (termasuk yang didokumentasikan di komentar handler) jatuh ke leaderboard `"all"` tanpa error.
- **`referral_controller.go:17-48` — response envelope tidak konsisten.** Dua handler ini pakai `ctx.JSON(...)` mentah, bukan `response.Success`/`response.Error` seperti controller lain — bentuk response beda (`success`/`data`/`error` hilang), bisa salah ditangani frontend yang mengasumsikan envelope standar.
- **`experiment_controller.go:32-46` — `Create` tidak pernah memanggil `validator.Validate.Struct`,** walau field `Name`/`Variants` punya tag `validate`. `min=2` untuk variants kebetulan direplikasi di service, tapi validasi `Name` jadi dead code — bisa dibuat experiment dengan nama kosong (admin-only, dampak rendah tapi inkonsisten).
- **Read-modify-write tanpa transaksi/lock di state game multiplayer** — `chess_service.go` (`Move`/`Resign`), `battleship_service.go` (`Target`/`Shot`/`Reveal`), `wordchain_service.go` (`SubmitWord`) semua `First → mutate in-memory → Save/Updates` tanpa transaksi maupun optimistic-lock. Request duplikat (double-click/retry client) bisa membaca state sama dan menulis dua kali → double-scoring atau lost update.
- **`game_service.go:118-233` (`SubmitScore`) — 6+ operasi tulis (session, highscore, Redis leaderboard, XP, level, achievement) tidak dibungkus transaksi**, dan beberapa error diabaikan (`_ = database.DB...Error`). Kegagalan di tengah jalan bisa meninggalkan session dengan `XPEarned` yang sebenarnya tidak pernah dikreditkan ke user.
- **Cache `user_profile` tidak diinvalidasi setelah perubahan XP/level** — `game_service.go:SubmitScore` (invalidasi cache lain tapi bukan `user_profile`) dan `daily_service.go:SubmitChallenge` (cuma invalidasi `daily_history`). User bisa lihat XP/level basi hingga TTL 30 detik.
- **`room_service.go:150-282` — race pada membership room di Redis.** `JoinRoom`/`LeaveRoom`/`StartRoom`/`UpdateSettings` baca-modifikasi-tulis `RoomData` tanpa `WATCH`/Lua/version check. Dua join hampir bersamaan bisa saling menimpa, termasuk bypass `MaxPlayers` check yang dievaluasi terhadap data basi.
- **`multiplayer_leaderboard.go:54-68` (controller) + `multiplayer_leaderboard.go:187-213` (`CreateRematch`) — celah otorisasi (IDOR).** Controller tidak meneruskan `userID` ke service; `CreateRematch` membangun room baru dari `oldRoom.HostID` yang tersimpan, tanpa cek pemanggil pernah jadi anggota room lama. Siapa pun yang tahu/menebak kode room 6-karakter bisa memicu rematch untuk room yang bukan miliknya.
- **`wordchain_service.go:652-675` (`GetGame`) — IDOR.** Beda dengan `GetActiveGames` yang memfilter `player1_id/player2_id`, `GetGame` mengambil berdasarkan ID saja dan mengembalikan detail penuh ke user mana pun yang login, tanpa cek dia salah satu pemain (bandingkan `chess_service.go:Get` yang sudah benar melakukan cek ini).
- **`friend_service.go:66-84` (`SendRequest`) — re-request setelah decline selalu gagal.** Kode set `existing.ID = uuid.Nil` lalu `Create` ulang, tapi unique index `(user_id, friend_id)` (`model/friend.go:12-13`) membuat `Create` selalu gagal karena row lama masih ada — seharusnya `Update` di tempat.
- **`push_service.go:85` (`sendPush`) — payload JSON dibangun manual via concatenation string**, bukan `json.Marshal`. Username/pesan yang mengandung `"` bisa merusak/menyisipkan field JSON (termasuk `data.url`, target klik notifikasi) — vektor phishing terhadap penerima notifikasi.
- **Tidak ada graceful shutdown** di `cmd/main.go` — tidak ada `signal.Notify`/`ShutdownWithTimeout` di sekitar `app.Listen`. SIGTERM/SIGINT saat rolling deploy langsung memutus koneksi WebSocket match yang sedang berlangsung (chess/battleship/tournament in-progress).
- **Fiber app dibuat tanpa `ReadTimeout`/`WriteTimeout`/`IdleTimeout`** (`main.go:109-116`) — rentan slowloris, koneksi idle tidak pernah di-reap.
- **`pkg/database/postgres.go:39-54` (`SeedData`) — semua file di `migrations/*.sql` dieksekusi ulang tanpa syarat di setiap boot**, tanpa tabel pelacakan migrasi, dan error dari `DB.Exec` dibuang (`_`). Saat ini `migrations/` belum ada di repo jadi dormant, tapi begitu ada migrasi non-idempotent/destruktif, ini akan berulang setiap restart.
- **`pkg/profanity/profanity.go` — dua isu dikonfirmasi nyata:**
  1. Substring matching tanpa word-boundary check di `IsClean`/`Sanitize` (baris ~20-42) — kata list mengandung fragmen pendek seperti `"asu"`/`"tai"`, sehingga kata sah `"asuransi"`, `"masukan"`, `"santai"`, `"pantai"` ikut terdeteksi/tercemari.
  2. `Sanitize` cuma mengganti bentuk lower/upper/Title-case tiap kata terlarang; kombinasi huruf besar-kecil lain (mis. `"aNjInG"`) lolos tanpa redaksi sama sekali, padahal `IsClean` pada string yang sama tetap menganggapnya kotor — kontrak API dua fungsi ini tidak konsisten.
- **WebSocket — `SubmitAnswer` memegang lock room selama broadcast** (`room.go:469-550`), memblokir semua operasi lain di room itu (join/leave/submit lain/reconnect timer) selama write socket berlangsung; juga memblokir `RoomManager.StartCleanup` untuk room lain via `sync.Map.Range`.
- **WebSocket — race baca/tulis map guesses wordle** (`hub.go:1008-1023`, `handleWordleGuess`) — baca `gData[p.ID]` tanpa lock sementara goroutine lain menulis di bawah `room.mu.Lock()` untuk player lain di room yang sama — bisa memicu fatal concurrent map read/write, sama seperti temuan Critical #4.
- **WebSocket — math_relay tidak memvalidasi giliran** (`room.go:469-550` + `hub.go:1486-1490`) — `SubmitAnswer` cuma cek question ID cocok dan belum dijawab, tidak cek yang submit adalah `current_player` yang ditugaskan — pemain lain bisa menjawab soal orang lain di luar giliran.
- **WebSocket — race pada field `Conn`** (`hub.go:138` set `oldClient.Conn = nil` tanpa `oldClient.mu`, padahal `SendMessage` selalu baca/tulis `c.Conn` di bawah `c.mu`) — window di mana `Broadcast` konkuren masih bisa memanggil `SendMessage` pada client lama.

---

## Low

- **`user_controller.go:133-136` + `user_service.go` (`UploadAvatar`)** — error filesystem/OS mentah dikembalikan verbatim ke client.
- **`wordchain_controller.go:18-38` (`Create`)** — tidak ada validasi sama sekali; `BotDifficulty` tidak dibatasi `oneof=easy medium hard` (kontras dengan `battleship_controller.go`/`chess_controller.go` yang sudah benar).
- **`ad_controller.go:51-52`** — error dari `fmt.Sscanf` untuk field `priority` diabaikan; input non-numerik diam-diam jadi `0`.
- **`content_controller.go`** — endpoint list (`GetFlags`, `GetCapitals`, `GetElements`, `GetHistoryEvents`, `GetWordleWords`) tidak dipaginasi/dibatasi, publik & unauthenticated. Aman untuk sekarang (data referensi kecil), tapi tidak ada langit-langit kalau datanya tumbuh.
- **`auth_service.go:364`, `weekly_summary_service.go`** — username user diselipkan mentah (tanpa escape) ke HTML email verifikasi/reset/ringkasan mingguan. Dampak rendah karena email selalu dikirim ke pemilik akun sendiri, tapi tetap celah HTML-injection di template email.
- **`internal/repository/game_repository.go:45-61` (`UpsertHighscore`)** — race baca-lalu-tulis tanpa row lock/`GREATEST()` atomik; dua submission bersamaan dari user yang sama bisa salah menentukan "bukan highscore baru" atau kehilangan satu write. Self-correcting di play berikutnya, dampak rendah.
- **`leaderboard_service.go:219-225` (`AddGameScore`)** — error dari kedua panggilan `repo.AddScore` ditelan dan selalu `return nil`; caller tidak bisa tahu penulisan leaderboard Redis gagal, state bisa diam-diam drift dari Postgres.
- **WebSocket — dead code**: `client.go` `Send` channel & `SendJSON` tidak pernah dipanggil; `room.go` `questionCh` dibuat tapi tidak pernah dipakai — sisa refactor yang belum selesai, membingungkan pembaca kode.
- **WebSocket — chess move relay tanpa validasi legalitas** dan `isPlayersTurn` dipaksa `true` kalau ada bot/ghost di match (`hub.go:1259-1321`) — memungkinkan satu manusia jalan untuk kedua sisi. Terbatas ke match itu sendiri, tidak memengaruhi user lain.

---

## Yang Sudah Diverifikasi Aman (tidak perlu diubah)

- Password hashing bcrypt(cost 12) + constant-time compare; JWT `alg` dipin ke HS256 dengan cek blacklist.
- `AdminMiddleware` membaca ulang role/`is_active` dari DB per-request (tidak percaya klaim JWT basi).
- Google OAuth: verifikasi issuer/expiry/`email_verified`/audience benar.
- Parameterized query konsisten di semua file `internal/repository/*` — tidak ditemukan SQL string-concatenation.
- Tidak ada mass-assignment di register/update-profile.
- CORS allow-list eksplisit (`main.go:123-143`), wildcard `"*"` ditolak eksplisit — tidak ada kombinasi wildcard+credentials.
- Rate limiting berbasis IP di grup `/auth` dan `/ai`.
- Reset-token single-use & tidak predictable; tidak ada user-enumeration di forgot-password.
- Tidak ada path traversal di penamaan file avatar maupun di static route `/uploads` (Fiber default `Browse:false`).
- Connection pool Postgres masuk akal (`SetMaxIdleConns(10)`, `SetMaxOpenConns(100)`, `SetConnMaxLifetime(1h)`).
- `pkg/email` — outbound HTTP client punya timeout eksplisit 10s, body di-JSON-marshal (bukan raw SMTP header) — tidak ada CRLF/header-injection.
- `battleship_service.go` — desain server-authoritative yang baik: board layout, soal aritmatika, dan pengecekan jawaban semua di server; client cuma submit integer jawaban.
- `referral_service.go` — `ApplyReferral` sudah dibungkus transaksi + unique index DB pada `Referral.ReferreeID` mencegah race double-referral/double-XP.
- `tournament_service.go` — transisi status pakai conditional `Updates` + `RowsAffected` sebagai optimistic-concurrency guard (pola bagus), hanya dirusak oleh temuan self-report di atas.
- `ai_service.go`/`ai_prompts.go` — `difficulty` divalidasi `oneof`, `count` dibatasi `max=50`, `gameType` cuma memilih template (tidak pernah dikonkatenasi ke prompt) — tidak ada prompt-injection atau unbounded-cost.
- Background scheduler (`daily_scheduler.go`, tournament/push/weekly-summary/ghost-cleanup) masing-masing di-start sekali dari `main.go` — tidak ada indikasi double-start/leak saat ini.
- `bot.go`/`ghost_bot.go` — bot/ghost dijalankan sepenuhnya server-side lewat jalur `SubmitAnswer` yang sama dengan player asli; tidak ada cara client memanipulasi bot untuk memengaruhi pemain lain.
- `internal/seeder/*` (countries/elements/history/wordle) — data referensi statis, idempotent via `FirstOrCreate`, tidak ada kredensial.

---

## Rekomendasi Prioritas (urutan pengerjaan)

1. **Hapus/gate seed admin backdoor** di belakang flag eksplisit (mis. `SEED_DEMO_USER=true`) yang hanya boleh aktif di dev, dan jangan pernah re-promote role pada existing user.
2. **Perbaiki webhook Midtrans**: tambahkan kolom `OrderID` di model `Subscription`, verifikasi `signature_key` sebelum memproses status apa pun, dan tolak request yang gagal verifikasi.
3. **Validasi skor di server** untuk `challenge_service`, `daily_service`, `leaderboard_challenge_service` — minimal cross-check terhadap jawaban/soal asli dan batas atas skor wajar, seperti pola di `game_service.go`.
4. **Tambahkan lock yang benar di `internal/ws/room.go`** untuk `Broadcast`/`BroadcastExcept` dan semua akses ke `Players`/`Spectators`/`GameData`, plus **write deadline** di `client.SendMessage` supaya satu client lambat tidak menghang seluruh hub. Tambahkan bounds-check untuk semua index dari payload client (sudoku row/col dst.) dan pasang `recover()` di boundary goroutine per-koneksi.
5. **Perbaiki `JWT_SECRET` validation** agar wajib di-set kecuali flag dev eksplisit — bukan hanya saat `APP_ENV == "production"` persis.
6. Sisanya (High/Medium/Low) bisa dikerjakan bertahap; support-ticket relay dan avatar-upload whitelist sebaiknya masuk batch berikutnya karena eksploitasinya sederhana (tanpa auth).
