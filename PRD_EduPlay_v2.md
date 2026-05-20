# Product Requirements Document (PRD)
## EduPlay — Educational Mini Game Platform
### Version 2.0 — Full Specification

**Version:** 2.1.0
**Status:** Living Document — actively updated as implementation progresses
**Last Updated:** 2026-05-20
**Author:** Product Team
**Confidentiality:** Internal Use Only

> **PRD Sync Policy:** Dokumen ini harus selalu mencerminkan keputusan implementasi aktual.
> Jika development mengubah ketentuan di PRD ini, update dokumen ini sekalian.
> Lihat bagian terakhir dokumen untuk panduan lengkap.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Market & Competitor Analysis](#2-market--competitor-analysis)
3. [Product Overview](#3-product-overview)
4. [Goals & Success Metrics](#4-goals--success-metrics)
5. [Target Users & Personas](#5-target-users--personas)
6. [User Journey & Onboarding](#6-user-journey--onboarding)
7. [Features & Requirements](#7-features--requirements)
8. [Game Catalog & Design](#8-game-catalog--design)
9. [Monetization Strategy](#9-monetization-strategy)
10. [UX & Design System](#10-ux--design-system)
11. [Accessibility (a11y)](#11-accessibility-a11y)
12. [SEO Strategy](#12-seo-strategy)
13. [Notification System](#13-notification-system)
14. [Analytics & Event Tracking](#14-analytics--event-tracking)
15. [Technical Architecture](#15-technical-architecture)
16. [Database Schema](#16-database-schema)
17. [API Specification](#17-api-specification)
18. [Error Handling & Fallback Strategy](#18-error-handling--fallback-strategy)
19. [Security Requirements](#19-security-requirements)
20. [Performance Requirements](#20-performance-requirements)
21. [Testing Strategy](#21-testing-strategy)
22. [CI/CD Pipeline](#22-cicd-pipeline)
23. [Infrastructure & Deployment](#23-infrastructure--deployment)
24. [Backup & Disaster Recovery](#24-backup--disaster-recovery)
25. [Legal & Compliance](#25-legal--compliance)
26. [Content Guidelines](#26-content-guidelines)
27. [Admin Panel](#27-admin-panel)
28. [Support & Bug Reporting](#28-support--bug-reporting)
29. [Feature Flags & A/B Testing](#29-feature-flags--ab-testing)
30. [Internationalization (i18n)](#30-internationalization-i18n)
31. [Development Roadmap](#31-development-roadmap)
32. [Risks & Mitigations](#32-risks--mitigations)
33. [Open Questions](#33-open-questions)
34. [Appendices](#34-appendices)

---

## 1. Executive Summary

**EduPlay** adalah platform web-based educational mini game yang menggabungkan pembelajaran dengan gamifikasi. Platform ini menyediakan berbagai game edukatif ringan yang dapat diakses melalui browser (web) dan mobile (PWA — Progressive Web App) tanpa perlu instalasi dari app store.

### Value Proposition
- **Untuk Pelajar:** Belajar terasa seperti bermain — menyenangkan, adiktif, dan terukur progressnya
- **Untuk Orang Tua/Guru:** Platform aman, bebas konten dewasa, tidak ada gambar manusia/makhluk hidup
- **Untuk Pengiklan:** Audience yang engaged, spesifik (pendidikan), dengan session duration tinggi
- **Untuk Bisnis:** Monetisasi ads + freemium yang scalable dengan biaya infrastruktur rendah

### Differentiators
1. Semua visual menggunakan geometri, angka, huruf — **zero human/creature imagery**
2. AI-powered question generator sehingga soal **tidak pernah habis**
3. **PWA-first** — install dari browser tanpa app store
4. **Dual language** — Bahasa Indonesia + English
5. Sistem gamifikasi lengkap: XP, Level, Streak, Achievement, Leaderboard

---

## 2. Market & Competitor Analysis

### 2.1 Market Size

| Segmen                       | Data             |
| ---------------------------- | ---------------- |
| Pelajar Indonesia (SD-SMA)   | ~45 juta orang   |
| Penetrasi smartphone pelajar | ~70%             |
| Pertumbuhan edtech Indonesia | 15-20% YoY       |
| Pasar edtech Indonesia 2025  | ~$1.2 Miliar USD |

### 2.2 Competitor Analysis

| Platform          | Kelebihan                    | Kekurangan                         | Peluang EduPlay             |
| ----------------- | ---------------------------- | ---------------------------------- | --------------------------- |
| **Duolingo**      | Gamifikasi kuat, brand besar | Hanya bahasa, berat, perlu install | Lebih ringan, multi-subject |
| **Kahoot**        | Familiar di sekolah          | Perlu host/teacher, tidak solo     | Solo play & async           |
| **Coolmathgames** | Banyak game                  | Konten barat, bukan edukatif murni | Konten lokal Indonesia      |
| **Quizlet**       | Flashcard bagus              | Membosankan, kurang game           | Lebih gamified              |
| **Khan Academy**  | Konten berkualitas           | Tidak ada game, seperti sekolah    | Fun-first approach          |
| **Prodigy Math**  | Game RPG + math              | Ada karakter makhluk (tidak cocok) | Zero creature imagery       |

### 2.3 Positioning

```
                    HIGH GAMIFICATION
                          |
         EduPlay ---------|--------- Duolingo
                          |
LOW EDUCATION ---|--------|---------|--- HIGH EDUCATION
                          |
         Coolmath --------|--------- Khan Academy
                          |
                    LOW GAMIFICATION
```

EduPlay berada di **High Gamification + High Education** — kuadran yang masih jarang pemainnya di Indonesia.

---

## 3. Product Overview

### 3.1 Problem Statement

1. Aplikasi belajar yang ada seringkali membosankan, terasa seperti PR
2. Game hiburan tidak memiliki nilai edukasi
3. Platform edukasi tidak memiliki sistem retention yang kuat (streak, leaderboard)
4. Konten dari platform luar tidak disesuaikan dengan kurikulum/konteks Indonesia
5. Tidak ada platform yang bebas dari gambar makhluk hidup untuk segmen tertentu

### 3.2 Solution Overview

Platform mini game edukatif berbasis web dengan:
- Multi-kategori: Math, Language, Geography, Logic, Science
- Gamifikasi penuh: XP, Level, Streak, Badge, Leaderboard
- Daily Challenge untuk daily active user retention
- AI-powered question generator (tidak terbatas soal)
- Monetisasi non-intrusive: banner + interstitial + rewarded
- PWA: bisa install dari browser, support offline sebagian

### 3.3 Product Principles

1. **Fun First** — Kalau tidak menyenangkan, tidak akan dimainkan
2. **Learning Embedded** — Edukasi terasa natural, bukan dipaksakan
3. **Zero Friction** — Bisa langsung main tanpa register (guest mode)
4. **Safe for All Ages** — Tidak ada konten sensitif, zero creature imagery
5. **Performance First** — Harus cepat di koneksi 3G sekalipun
6. **Mobile First** — Majority pengguna pakai smartphone

### 3.4 Scope v1.0

**In Scope:**
- Web platform (desktop & mobile browser)
- PWA installable
- User authentication
- 8 game edukatif
- Leaderboard global + per-game
- Daily challenge
- XP, Level, Streak, Achievement system
- Ad integration (banner, interstitial, rewarded)
- Admin dashboard basic
- Bahasa Indonesia (primary) + English (secondary)

**In Scope (tambahan dari v1.0):**
- Friends system (basic — friends page, add/view friends) ✅ Implemented
- Support / bug reporting page ✅ Implemented
- 20 games (8 launch + 12 roadmap games sudah diimplementasi) ✅

**Out of Scope (v1):**
- Native iOS / Android app
- Real-time multiplayer (diaddress di PRD Addendum)
- Teacher / classroom dashboard
- Subscription / payment gateway (backend stub tersedia)
- Social features (chat rooms, follow system, group/community)
- Offline-first full experience (partial via PWA cache)
- Custom avatar builder

---

## 4. Goals & Success Metrics

### 4.1 Business Goals

| Goal              | KPI                  | Target Bulan 1 | Target Bulan 3 | Target Bulan 6 |
| ----------------- | -------------------- | -------------- | -------------- | -------------- |
| Akuisisi user     | Registered Users     | 500            | 5,000          | 25,000         |
| Engagement aktif  | Monthly Active Users | 300            | 3,000          | 15,000         |
| Retention         | Day-1 Retention      | ≥ 40%          | ≥ 45%          | ≥ 50%          |
| Retention         | Day-7 Retention      | ≥ 20%          | ≥ 25%          | ≥ 30%          |
| Retention         | Day-30 Retention     | ≥ 8%           | ≥ 12%          | ≥ 15%          |
| Session length    | Avg Session Duration | ≥ 5 menit      | ≥ 8 menit      | ≥ 10 menit     |
| Games per session | Avg Games Played     | ≥ 2            | ≥ 3            | ≥ 4            |
| Monetisasi        | Monthly Ad Revenue   | Rp 500K        | Rp 5 Juta      | Rp 25 Juta     |
| Viral             | Referral Rate        | -              | ≥ 5%           | ≥ 10%          |

### 4.2 Product Health Metrics

| Metric                          | Target                |
| ------------------------------- | --------------------- |
| Crash rate                      | < 0.1% sessions       |
| API error rate                  | < 0.5% requests       |
| Page load time (P75)            | < 3 detik (3G)        |
| Daily Challenge completion rate | ≥ 40% of active users |
| Streak 7+ days users            | ≥ 20% of active users |

### 4.3 North Star Metric

> **"Weekly Active Users yang memainkan ≥ 3 game dalam seminggu"**

Metric ini mencerminkan engagement sejati — bukan sekedar visit, tapi penggunaan aktif multi-game.

---

## 5. Target Users & Personas

### 5.1 Primary Segments

| Segment     | Usia  | Perangkat             | Motivasi                    | Pain Point                  |
| ----------- | ----- | --------------------- | --------------------------- | --------------------------- |
| Pelajar SD  | 7-12  | Smartphone (parents') | Bermain                     | Buku membosankan            |
| Pelajar SMP | 12-15 | Smartphone sendiri    | Kompetisi, skor tinggi      | Tidak ada cara seru belajar |
| Pelajar SMA | 15-18 | Smartphone + laptop   | Persiapan ujian             | Drilling soal monoton       |
| Mahasiswa   | 18-23 | Laptop + smartphone   | Refreshing sambil produktif | Procrastination guilt       |
| Orang Tua   | 25-45 | Smartphone            | Cari media belajar anak     | Konten tidak aman           |

### 5.2 User Personas

---

**Persona 1: Budi — Pelajar SMP**
- Usia: 13 tahun, Kelas 8 SMP, Jakarta
- Perangkat: Samsung Galaxy A-series
- Koneksi: WiFi rumah / data 4G
- Motivasi: Suka game, dipaksa belajar orang tua
- Quote: *"Kalau bisa belajar sambil game sih oke banget"*
- Kebutuhan: Game Math, leaderboard sama teman sekelas
- Frustasi: Ads terlalu banyak, loading lambat

**Persona 2: Sari — Pelajar SMA**
- Usia: 16 tahun, Kelas 11 IPA, Surabaya
- Perangkat: iPhone (hadiah ulang tahun) + MacBook
- Koneksi: WiFi rumah stabil
- Motivasi: Mau masuk PTN, perlu latihan soal banyak
- Quote: *"Soalnya harus banyak dan variatif, bukan itu-itu aja"*
- Kebutuhan: Quiz soal tak terbatas, progress tracking, difficulty level
- Frustasi: Soal yang sama terus muncul

**Persona 3: Bu Dewi — Guru SD**
- Usia: 38 tahun, Guru Matematika SD, Bandung
- Perangkat: Laptop Lenovo + smartphone
- Koneksi: WiFi sekolah (kadang lemot)
- Motivasi: Cari media belajar yang bisa direkomendasikan ke murid
- Quote: *"Harus aman, tidak ada gambar yang tidak pantas"*
- Kebutuhan: Konten aman, tanpa gambar makhluk hidup, bisa diakses di browser
- Frustasi: Platform asing, tidak ada konten Indonesia

**Persona 4: Pak Andi — Orang Tua**
- Usia: 42 tahun, Karyawan swasta, Medan
- Perangkat: Smartphone Xiaomi
- Koneksi: Data 4G
- Motivasi: Anaknya (10 tahun) minta main game, mau yang edukatif
- Quote: *"Asal aman dan ada manfaat belajarnya"*
- Kebutuhan: Konten aman, tidak ada in-app purchase tersembunyi
- Frustasi: Tidak tahu anaknya belajar apa

---

## 6. User Journey & Onboarding

### 6.1 First-Time User Flow

```
Landing Page
├── [Tanpa Akun] → Pilih Game → Main → Game Over
│                               └─ Prompt Register: "Simpan skormu!"
│                                   ├── Register → Dashboard
│                                   └── Skip → Kembali ke Game Hub
│
└── [Dengan Akun] → Login → Dashboard → Pilih Game → Main
```

### 6.2 Onboarding Steps (Setelah Register)

**Step 1 — Welcome Screen**
- Tampilkan nama user
- Brief value proposition (3 poin bullet singkat)
- CTA: "Mulai Jelajahi Game"

**Step 2 — Pilih Minat (Optional)**
- Pilih kategori favorit: Math / Language / Geography / Logic
- Digunakan untuk personalisasi urutan game di hub
- Bisa skip

**Step 3 — Tutorial Interaktif**
- Tampilkan game pertama dengan overlay tooltip
- Highlight: cara main, skor, XP bar
- Durasi < 30 detik

**Step 4 — Daily Challenge Prompt**
- Setelah main pertama kali, muncul card Daily Challenge
- "Main daily challenge setiap hari untuk bonus XP!"
- CTA: "Coba Sekarang" / "Nanti Saja"

**Step 5 — Push Notification Prompt (PWA)**
- Muncul setelah user main ≥ 2 kali dalam satu sesi
- "Aktifkan notifikasi untuk reminder Daily Challenge?"
- Tidak dimunculkan sebelum user engage

### 6.3 Returning User Flow

```
Buka App/Website
├── Sudah Login → Dashboard
│   ├── Daily Challenge card (jika belum complete hari ini)
│   ├── Streak reminder (jika belum main hari ini)
│   └── "Lanjut main [game terakhir]?" shortcut
│
└── Belum Login / Session expired → Login Page
    └── Auto-redirect ke halaman terakhir setelah login
```

### 6.4 Empty States

| State                   | Tampilan                                          |
| ----------------------- | ------------------------------------------------- |
| Belum pernah main       | "Belum ada skor. Mulai main sekarang!" + CTA      |
| Leaderboard kosong      | "Jadilah yang pertama!" + CTA main game           |
| Belum punya achievement | "Mainkan game untuk unlock achievement pertamamu" |
| Koneksi gagal           | Ilustrasi offline + tombol Retry                  |
| Daily sudah selesai     | Countdown ke reset besok + saran game lain        |

---

## 7. Features & Requirements

### 7.1 Authentication & Account

| ID      | Feature            | Priority | Deskripsi                         | Acceptance Criteria                                      |
| ------- | ------------------ | -------- | --------------------------------- | -------------------------------------------------------- |
| AUTH-01 | Register Email     | P0       | Daftar dengan email + password    | Email unik, password min 8 karakter, konfirmasi password |
| AUTH-02 | Login Email        | P0       | Login dengan email + password     | Token JWT dikembalikan, session tersimpan                |
| AUTH-03 | Guest Mode         | P0       | Main tanpa akun                   | Skor tidak tersimpan, prompt register saat game over     |
| AUTH-04 | Logout             | P0       | Hapus session                     | Token diblacklist di Redis                               |
| AUTH-05 | Refresh Token      | P1       | Auto-renew session                | Token baru dikembalikan tanpa re-login                   |
| AUTH-06 | Forgot Password    | P1       | Reset via email                   | Email reset terkirim dalam 2 menit                       |
| AUTH-07 | Google OAuth       | P2       | Login dengan akun Google          | One-click login, tidak perlu isi form                    |
| AUTH-08 | Email Verification | P1       | Verifikasi email setelah register | Email dikirim, klik link untuk verifikasi                |
| AUTH-09 | Username Change    | P2       | Ganti username (1x per 30 hari)   | Validasi unik, rate limited                              |

### 7.2 User Profile & Gamifikasi

| ID      | Feature          | Priority | Deskripsi                                                      |
| ------- | ---------------- | -------- | -------------------------------------------------------------- |
| PROF-01 | Profile Page     | P0       | Username, avatar (initial-based), level, XP, streak, join date |
| PROF-02 | XP System        | P0       | Dapat XP setiap selesai game, formula terdokumentasi           |
| PROF-03 | Level System     | P0       | Level naik berdasarkan total kumulatif XP                      |
| PROF-04 | Daily Streak     | P0       | Bertambah jika main minimal 1 game per hari                    |
| PROF-05 | Streak Freeze    | P2       | Gunakan item untuk proteksi streak (1x per minggu)             |
| PROF-06 | Achievement      | P1       | Badge yang bisa di-unlock berdasarkan trigger                  |
| PROF-07 | Per-game Stats   | P1       | Highscore, total games played, avg score, best streak per game |
| PROF-08 | Progress History | P2       | Grafik XP dan game activity mingguan/bulanan                   |
| PROF-09 | Avatar System    | P2       | Avatar berbasis initial + warna (bukan foto/gambar makhluk)    |

### 7.3 Game System

| ID      | Feature            | Priority | Deskripsi                                                        |
| ------- | ------------------ | -------- | ---------------------------------------------------------------- |
| GAME-01 | Game Hub           | P0       | Halaman utama dengan semua game, filter kategori                 |
| GAME-02 | Game Card          | P0       | Card berisi nama, kategori, highscore user, status (new/popular) |
| GAME-03 | Score Submit       | P0       | Submit skor ke server setelah selesai, validasi server-side      |
| GAME-04 | Highscore          | P0       | Simpan highscore per user per game                               |
| GAME-05 | Game Timer         | P0       | Countdown timer visual dengan animasi                            |
| GAME-06 | Difficulty Select  | P1       | Easy / Medium / Hard sebelum mulai game                          |
| GAME-07 | AI Questions       | P1       | Generate soal via Claude API, di-cache Redis 1 jam               |
| GAME-08 | Pre-generated Pool | P0       | Backup soal statis jika AI tidak tersedia (min 200 soal/game)    |
| GAME-09 | Sound Toggle       | P2       | On/Off suara, tersimpan di localStorage                          |
| GAME-10 | Pause & Resume     | P1       | Pause game, resume tanpa kehilangan progress                     |
| GAME-11 | Game Result Screen | P0       | Tampilkan skor, XP earned, new highscore, share button           |
| GAME-12 | Quick Replay       | P0       | "Main Lagi" dari result screen tanpa kembali ke hub              |

### 7.4 Leaderboard

| ID      | Feature               | Priority | Deskripsi                                       |
| ------- | --------------------- | -------- | ----------------------------------------------- |
| LEAD-01 | Per-game Leaderboard  | P0       | Top 100 highscore per game                      |
| LEAD-02 | Global XP Leaderboard | P1       | Ranking berdasarkan total XP                    |
| LEAD-03 | Weekly Leaderboard    | P1       | Reset tiap Senin 00:00 WIB                      |
| LEAD-04 | User Rank Display     | P1       | Tampilkan posisi user ("Kamu di peringkat #47") |
| LEAD-05 | Near-rank Display     | P2       | Tampilkan 2 user di atas dan bawah posisi user  |
| LEAD-06 | Friends Leaderboard   | P3       | Filter leaderboard hanya teman (v2)             |

### 7.5 Daily Challenge

| ID    | Feature          | Priority | Deskripsi                                                |
| ----- | ---------------- | -------- | -------------------------------------------------------- |
| DC-01 | Daily Quiz Set   | P0       | 10 soal spesial per hari, reset 00:00 WIB                |
| DC-02 | Bonus XP         | P0       | XP 2x jika complete daily challenge                      |
| DC-03 | Streak Reward    | P1       | Bonus XP ekstra di milestone streak (7, 14, 30, 60 hari) |
| DC-04 | Countdown Timer  | P0       | Tampilkan sisa waktu hingga daily reset                  |
| DC-05 | Completion Badge | P1       | Badge harian yang berbeda tiap minggu                    |
| DC-06 | History          | P2       | Riwayat daily challenge yang sudah diselesaikan          |

### 7.6 Notifikasi

| ID       | Feature                   | Priority | Deskripsi                                      |
| -------- | ------------------------- | -------- | ---------------------------------------------- |
| NOTIF-01 | PWA Push — Daily Reminder | P1       | Notifikasi jam 7 pagi jika belum main hari ini |
| NOTIF-02 | PWA Push — Streak Alert   | P1       | Notifikasi jam 8 malam jika streak mau putus   |
| NOTIF-03 | In-App — Achievement      | P0       | Toast notification saat unlock achievement     |
| NOTIF-04 | In-App — Level Up         | P0       | Full-screen celebration saat naik level        |
| NOTIF-05 | In-App — New Highscore    | P0       | Animasi konfetti saat pecahkan highscore       |
| NOTIF-06 | Email — Streak Reminder   | P2       | Email jika tidak main 2 hari berturut-turut    |

### 7.7 Monetisasi

| ID     | Feature              | Priority | Deskripsi                                     |
| ------ | -------------------- | -------- | --------------------------------------------- |
| ADS-01 | Banner Ads           | P0       | Fixed bottom banner semua halaman non-game    |
| ADS-02 | Interstitial Ads     | P0       | Full-screen saat game over / antar level      |
| ADS-03 | Rewarded Ads         | P1       | Voluntary — nonton iklan untuk hint/undo      |
| ADS-04 | Frequency Cap        | P0       | Maks 1 interstitial per 3 menit per user      |
| ADS-05 | Ad-free Subscription | P2       | Bayar bulanan untuk hapus ads (v1.1)          |
| ADS-06 | IAP Remove Ads       | P2       | One-time purchase remove ads permanent (v1.1) |

### 7.8 Admin & Operasional

| ID       | Feature                 | Priority | Deskripsi                             |
| -------- | ----------------------- | -------- | ------------------------------------- |
| ADMIN-01 | User Management         | P0       | List user, ban user, reset password   |
| ADMIN-02 | Game Management         | P1       | Toggle game on/off, update metadata   |
| ADMIN-03 | Daily Challenge Manager | P1       | Buat/edit soal daily challenge manual |
| ADMIN-04 | Analytics Dashboard     | P1       | DAU, MAU, revenue, game popularity    |
| ADMIN-05 | Leaderboard Management  | P1       | Reset leaderboard, hapus score cheat  |
| ADMIN-06 | Content Moderation      | P1       | Review username yang dilaporkan       |
| ADMIN-07 | Feature Flag            | P1       | Toggle fitur on/off tanpa redeploy    |

---

## 8. Game Catalog & Design

### Constraint Desain Semua Game
- ❌ Tidak ada gambar manusia atau makhluk hidup
- ✅ Visual menggunakan: geometri, angka, huruf, kartu, ikon abstrak, warna, simbol
- ✅ Responsive — bisa dimainkan di mobile dan desktop
- ✅ Bisa dimainkan dengan satu tangan (mobile)
- ✅ Session length fleksibel: bisa selesai dalam 1-5 menit

---

### 8.1 Math Quiz Blitz

| Aspek                | Detail                                                          |
| -------------------- | --------------------------------------------------------------- |
| **Kategori**         | Math                                                            |
| **Deskripsi**        | Jawab soal matematika secepat mungkin dalam 60 detik            |
| **Mechanic**         | 4 pilihan ganda, soal muncul satu per satu, timer countdown     |
| **Scoring**          | +10 benar, -3 salah, bonus kecepatan (< 3 detik = +5)           |
| **Difficulty**       | Easy: angka 1-20 \| Medium: 1-100 \| Hard: 1-1000 + campuran op |
| **Operasi**          | Penjumlahan, pengurangan, perkalian, pembagian, pangkat         |
| **AI Soal**          | Word problem (soal cerita) via Claude API                       |
| **Offline Fallback** | 500 soal pre-generated tersimpan di bundle                      |
| **Ad Slots**         | Banner (bawah layar), interstitial (game over)                  |
| **XP Formula**       | base = score/10, difficulty multiplier 1x/1.5x/2x               |

### 8.2 Times Table Challenge

| Aspek              | Detail                                                   |
| ------------------ | -------------------------------------------------------- |
| **Kategori**       | Math                                                     |
| **Deskripsi**      | Drilling tabel perkalian 1-12 secara gamified            |
| **Mechanic**       | Fill-in-the-blank, progress bar per tabel, star rating   |
| **Mode**           | Pilih tabel tertentu atau "Random Mix"                   |
| **Scoring**        | Kombinasi akurasi + kecepatan                            |
| **Mastery System** | Setiap tabel punya 3 bintang, dikumpulkan semua = Master |
| **Ad Slots**       | Banner, rewarded (skip tabel yang susah)                 |

### 8.3 Wordle Bahasa Indonesia

| Aspek             | Detail                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| **Kategori**      | Language                                                                                                |
| **Deskripsi**     | Tebak kata bahasa Indonesia 5 huruf dalam 6 percobaan                                                   |
| **Mechanic**      | Keyboard virtual, color feedback: hijau (benar+posisi), kuning (ada tapi posisi salah), abu (tidak ada) |
| **Word List**     | Min 500 kata dari KBBI, 5 huruf, tanpa kata kasar                                                       |
| **Daily Mode**    | Satu kata per hari (sama untuk semua user)                                                              |
| **Practice Mode** | Main berkali-kali dengan kata random                                                                    |
| **Hard Mode**     | P2 — wajib gunakan clue yang sudah ditemukan                                                            |
| **Share**         | Salin pola emoji untuk share ke WhatsApp/medsos                                                         |
| **Ad Slots**      | Banner, interstitial setelah selesai, rewarded (reveal 1 huruf)                                         |

### 8.4 Spelling Bee

| Aspek              | Detail                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| **Kategori**       | Language                                                               |
| **Deskripsi**      | Susun huruf-huruf acak menjadi kata yang benar                         |
| **Mechanic**       | Huruf ditampilkan acak, tap/drag untuk susun, ada clue (definisi kata) |
| **Level System**   | 10 kata per level, semakin panjang katanya semakin tinggi level        |
| **Clue**           | Definisi KBBI, AI-enhanced dengan contoh kalimat                       |
| **Ad Slots**       | Banner, interstitial antar level, rewarded (reveal 1 huruf)            |
| **AI Integration** | Claude API generate definisi dan contoh kalimat                        |

### 8.5 Flag Quiz

| Aspek             | Detail                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| **Kategori**      | Geography                                                                  |
| **Deskripsi**     | Tebak nama negara dari gambar benderanya                                   |
| **Mechanic**      | Tampilkan bendera SVG, 4 pilihan ganda nama negara                         |
| **Data**          | 195 negara, bendera SVG (tidak ada makhluk hidup, murni geometri & simbol) |
| **Mode**          | Campaign (semua negara berurutan) & Random                                 |
| **Region Filter** | Filter per benua: Asia, Eropa, Afrika, Amerika, Oseania                    |
| **Scoring**       | +5 poin benar, streak multiplier, timer bonus                              |
| **Ad Slots**      | Banner, interstitial tiap 10 soal                                          |

### 8.6 Capital City Quiz

| Aspek              | Detail                                                            |
| ------------------ | ----------------------------------------------------------------- |
| **Kategori**       | Geography                                                         |
| **Deskripsi**      | Tebak ibukota dari nama negara                                    |
| **Mode A**         | "Ibukota dari [Negara] adalah...?" — pilihan ganda                |
| **Mode B**         | "Negara mana yang ibukotanya [Kota]?" — pilihan ganda             |
| **Mode C**         | Ketik langsung nama ibukota (hard mode)                           |
| **Fun Fact**       | Setelah jawab benar/salah, tampilkan 1 fakta menarik tentang kota |
| **AI Integration** | Claude API generate fun facts dinamis                             |
| **Ad Slots**       | Banner, interstitial game over                                    |

### 8.7 Sudoku

| Aspek           | Detail                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| **Kategori**    | Logic                                                                       |
| **Deskripsi**   | Classic Sudoku 9x9 grid                                                     |
| **Mechanic**    | Isi angka di grid, highlight konflik otomatis (merah), pencil mode, notes; navigasi keyboard arrow keys (✅ implemented) |
| **Generator**   | Algoritma backtracking untuk generate puzzle valid                          |
| **Difficulty**  | Easy (35+ sel terisi), Medium (27-34), Hard (20-26), Expert (<20) — Expert belum diimplementasi |
| **Scoring**     | Waktu selesai + jumlah kesalahan (skor terbalik — makin cepat makin tinggi) |
| **Hint System** | Reveal 1 sel via rewarded ad atau pengurangan skor                          |
| **Auto-check**  | Validasi otomatis saat selesai                                              |
| **Ad Slots**    | Banner, rewarded (reveal sel), interstitial selesai                         |

### 8.8 2048

| Aspek             | Detail                                                            |
| ----------------- | ----------------------------------------------------------------- |
| **Kategori**      | Logic                                                             |
| **Deskripsi**     | Geser tile, gabungkan angka yang sama, capai 2048                 |
| **Mechanic**      | Swipe (mobile) / arrow keys (desktop), tile merge animation, undo |
| **Scoring**       | Total nilai semua tile saat game over                             |
| **Best Tile**     | Tampilkan tile tertinggi yang pernah dicapai                      |
| **Undo**          | 1 undo gratis per game, lebih via rewarded ad                     |
| **Grid Variants** | P2: 4x4 (classic), 5x5 (extended), 3x3 (mini)                     |
| **Ad Slots**      | Banner, interstitial game over, rewarded (undo tambahan)          |

---

### 8.9 Memory Match ✅ Implemented

| Aspek          | Detail                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| **Kategori**   | Logic                                                                          |
| **Deskripsi**  | Temukan semua pasangan kartu emoji yang tersembunyi                            |
| **Mechanic**   | Balik 2 kartu; jika cocok tetap terbuka, jika tidak tertutup kembali           |
| **Difficulty** | Easy: 12 kartu (6 pasang) \| Medium: 16 kartu \| Hard: 20 kartu               |
| **Scoring**    | `max(0, 2000 - moves*20 - elapsed_seconds*5)` — makin sedikit langkah = lebih bagus |
| **Ad Slots**   | Banner, interstitial setelah selesai                                           |

### 8.10 Typing Speed ✅ Implemented

| Aspek          | Detail                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| **Kategori**   | Language                                                                       |
| **Deskripsi**  | Ketik kata-kata yang muncul secepat dan seakurat mungkin dalam 60 detik        |
| **Mechanic**   | Kata muncul satu per satu; Space/Enter untuk submit. Feedback hijau (benar) / merah (salah) |
| **Scoring**    | WPM × 10 (Words Per Minute × 10)                                              |
| **Metrics**    | WPM + Accuracy % ditampilkan di result screen                                  |
| **Ad Slots**   | Banner, interstitial setelah selesai                                           |

### 8.11 Simon Says ✅ Implemented

| Aspek          | Detail                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| **Kategori**   | Logic / Memory                                                                 |
| **Deskripsi**  | 4 tombol warna berkedip dalam urutan acak; user harus mengulangi urutannya     |
| **Mechanic**   | Sequence bertambah 1 tombol setiap level. Progress dots menunjukkan sequence vs input user |
| **Scoring**    | `level × 100` — bertambah setiap level berhasil dilewati                      |
| **Colors**     | Merah, Biru, Hijau, Kuning — tidak ada gambar makhluk hidup                    |
| **Ad Slots**   | Banner, interstitial game over                                                 |

### 8.12 Snake Classic ✅ Implemented

| Aspek          | Detail                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| **Kategori**   | Arcade                                                                         |
| **Deskripsi**  | Kendalikan ular; makan makanan untuk tumbuh, hindari menabrak dinding atau badan |
| **Mechanic**   | Canvas 400×400px. WASD / Arrow keys (desktop) + touch swipe + on-screen d-pad (mobile) |
| **Scoring**    | Makanan yang dimakan × 10                                                      |
| **Implementation** | `useRef` untuk mutable game state, `setInterval` untuk game loop — mencegah stale closure |
| **Ad Slots**   | Banner, interstitial game over                                                 |

---

### Roadmap Games

> **Status per Mei 2026:** Semua game roadmap v1.1–v1.3 sudah diimplementasikan lebih awal.

| Game                | Kategori | Status         | Catatan                                |
| ------------------- | -------- | -------------- | -------------------------------------- |
| Nonogram            | Logic    | ✅ Done (v1.1)  | Grid puzzle hitam-putih                |
| Crossword Indonesia | Language | ✅ Done (v1.1)  | TTS Bahasa Indonesia                   |
| Mental Math Speed   | Math     | ✅ Done (v1.1)  | Hitung cepat tanpa pilihan ganda       |
| Element Quiz        | Science  | ✅ Done (v1.2)  | Simbol kimia, nomor atom               |
| Timeline History    | History  | ✅ Done (v1.2)  | Urutkan peristiwa bersejarah           |
| Bubble Shooter Math | Math     | ✅ Done (v1.2)  | Tembak gelembung jawab soal math       |
| Word Search         | Language | ✅ Done (v1.3)  | Cari kata tersembunyi di grid          |
| Brick Breaker Math  | Math     | ✅ Done (v1.3)  | Hancurkan bata dengan jawaban benar    |
| Memory Match        | Logic    | ✅ Done (added) | Kartu pasangan emoji                   |
| Typing Speed        | Language | ✅ Done (added) | WPM test 60 detik                      |
| Simon Says          | Logic    | ✅ Done (added) | Urutan warna dari memori               |
| Snake Classic       | Arcade   | ✅ Done (added) | Classic snake canvas game              |
| Number Match        | Math     | Backlog        | Coret pasangan angka yang berjumlah 10 |
| Fraction Visualizer | Math     | Backlog (v2.0) | Visualisasi pecahan interaktif         |

---

## 9. Monetization Strategy

### 9.1 Revenue Streams

| Stream           | Model             | Target % Revenue |
| ---------------- | ----------------- | ---------------- |
| Banner Ads       | CPM               | 30%              |
| Interstitial Ads | CPM               | 50%              |
| Rewarded Ads     | CPM               | 15%              |
| Remove Ads IAP   | One-time purchase | 5% (v1.1)        |

### 9.2 Ad Network & Mediation

**Primary Network:**
- Google AdSense (web desktop)
- Google AdMob (PWA/mobile)

**Ad Mediation (v1.1):**
- Google Ad Manager sebagai mediasi
- Secondary: Meta Audience Network, InMobi

### 9.3 Ad Placement Rules

```
BANNER ADS:
  Posisi        : Fixed bottom, z-index di atas konten
  Ukuran Mobile : 320x50 (leaderboard) atau 320x100
  Ukuran Desktop: 728x90 (leaderboard)
  Halaman       : Home, hub, leaderboard, profile, result screen
  Exclude       : Saat game aktif berlangsung (mencegah accidental click)
  Refresh rate  : 30 detik

INTERSTITIAL ADS:
  Trigger       : Game over, kembali ke hub dari game, antar level (game level-based)
  Frequency cap : Maks 1x per 3 menit per user (disimpan di Redis)
  Skip delay    : Bisa di-skip setelah 5 detik
  Loading       : Preload saat result screen muncul (tidak tambah latency)

REWARDED ADS:
  Trigger       : User tap tombol "Hint", "Undo", "Reveal", "Extra Attempt"
  Flow          : Konfirmasi → Tonton iklan (15-30 detik) → Terima reward
  Reward        : Spesifik per game (lihat tabel reward)
  Mandatory     : TIDAK — selalu voluntary
  Fallback      : Jika tidak ada iklan tersedia, tampilkan "Tidak ada iklan saat ini"
```

### 9.4 Rewarded Ad Rewards per Game

| Game         | Reward                        |
| ------------ | ----------------------------- |
| Math Quiz    | +30 detik waktu               |
| Wordle       | Reveal 1 huruf yang benar     |
| Sudoku       | Reveal 1 sel kosong           |
| 2048         | 1 undo tambahan               |
| Spelling Bee | Reveal 1 huruf kata           |
| Flag Quiz    | Eliminasi 2 pilihan salah     |
| Capital Quiz | Tampilkan hint (benua/region) |
| Times Table  | Skip ke tabel berikutnya      |

### 9.5 Revenue Projections

| Skenario     | MAU    | Avg Session | RPM Est. | Monthly Revenue |
| ------------ | ------ | ----------- | -------- | --------------- |
| Conservative | 3,000  | 8 menit     | Rp 2,000 | Rp 1,500,000    |
| Base         | 10,000 | 10 menit    | Rp 3,000 | Rp 7,500,000    |
| Optimistic   | 30,000 | 12 menit    | Rp 4,000 | Rp 36,000,000   |

### 9.6 AdSense Approval Checklist

Untuk memastikan akun AdSense disetujui:
- [ ] Privacy Policy halaman tersedia dan linked di footer
- [ ] Terms of Service halaman tersedia
- [ ] About Us halaman tersedia
- [ ] Konten original (bukan copy)
- [ ] Tidak ada broken links
- [ ] Site navigasi jelas
- [ ] Tidak ada konten dewasa
- [ ] Traffic organik (tidak beli traffic)
- [ ] Domain minimal 6 bulan (atau gunakan subdomain existing)
- [ ] Cookie consent banner terpasang

---

## 10. UX & Design System

### 10.1 Design Principles

1. **Clean & Focused** — Satu tujuan per halaman, tidak ada noise visual
2. **Consistent** — Komponen yang sama, perilaku yang sama di semua game
3. **Delightful** — Micro-animation yang memuaskan, feedback visual instan
4. **Accessible** — WCAG 2.1 AA minimum
5. **Mobile-First** — Desain untuk 360px lebar, scale up ke desktop
6. **Safe Visual** — Zero human/creature imagery — geometri, angka, huruf, ikon

### 10.2 Color System

```
--- LIGHT MODE ---
Primary:          #4F46E5  (Indigo 600)
Primary Hover:    #4338CA  (Indigo 700)
Primary Light:    #EEF2FF  (Indigo 50)
Secondary:        #10B981  (Emerald 500)
Secondary Light:  #D1FAE5  (Emerald 100)
Accent:           #F59E0B  (Amber 500)
Accent Light:     #FEF3C7  (Amber 100)
Danger:           #EF4444  (Red 500)
Danger Light:     #FEE2E2  (Red 100)
Success:          #22C55E  (Green 500)
Warning:          #F97316  (Orange 500)

Background:       #F9FAFB  (Gray 50)
Surface:          #FFFFFF
Surface Raised:   #F3F4F6  (Gray 100)
Border:           #E5E7EB  (Gray 200)
Border Strong:    #D1D5DB  (Gray 300)

Text Primary:     #111827  (Gray 900)
Text Secondary:   #374151  (Gray 700)
Text Muted:       #6B7280  (Gray 500)
Text Disabled:    #9CA3AF  (Gray 400)

--- DARK MODE ---
Background:       #0F172A  (Slate 900)
Surface:          #1E293B  (Slate 800)
Surface Raised:   #334155  (Slate 700)
Border:           #475569  (Slate 600)
Text Primary:     #F1F5F9  (Slate 100)
Text Secondary:   #CBD5E1  (Slate 300)
Text Muted:       #94A3B8  (Slate 400)

--- GAME COLORS ---
Correct:          #22C55E  (Green 500) — jawaban benar
Wrong:            #EF4444  (Red 500) — jawaban salah
Neutral:          #6B7280  (Gray 500) — belum dijawab
Timer Warning:    #F59E0B  (Amber 500) — timer < 10 detik
Timer Critical:   #EF4444  (Red 500) — timer < 5 detik
XP Color:         #8B5CF6  (Violet 500)
Streak Color:     #F97316  (Orange 500)
```

### 10.3 Typography

```
Font: Inter (Google Fonts — variable font)

Scale:
  Display:   48px / 800  — Hero titles
  H1:        32px / 700  — Page titles
  H2:        24px / 600  — Section headers
  H3:        20px / 600  — Card titles
  H4:        18px / 500  — Sub-sections
  Body LG:   18px / 400  — Lead text
  Body:      16px / 400  — Default
  Body SM:   14px / 400  — Secondary text
  Caption:   12px / 400  — Labels, metadata

Line Height:
  Headings:  1.2
  Body:      1.6

Letter Spacing:
  Headings:  -0.02em
  Body:      0
  Caption:   0.02em

Special:
  Game Numbers: Inter Tabular Numeric — mencegah layout shift saat angka berubah
  Timer:        Monospace (Inter atau JetBrains Mono) — mencegah "jump" saat countdown
```

### 10.4 Spacing System

```
Base unit: 4px (0.25rem)

Scale:
  xs:   4px   (1)
  sm:   8px   (2)
  md:   16px  (4)
  lg:   24px  (6)
  xl:   32px  (8)
  2xl:  48px  (12)
  3xl:  64px  (16)
  4xl:  96px  (24)

Grid: 12-column
Gutter: 16px (mobile), 24px (tablet), 32px (desktop)

Container max-width: 1280px
Game canvas max-width: 640px (mobile-first, centered on desktop)

Breakpoints:
  sm:  640px
  md:  768px
  lg:  1024px
  xl:  1280px
  2xl: 1536px
```

### 10.5 Component Inventory

```
LAYOUT COMPONENTS:
  - Navbar (desktop horizontal, mobile hidden)
  - BottomNav (mobile only, 6 tabs: Home, Games, Daily, Friends, Leaderboard, Profile) ← Updated dari 4 tab
  - PageContainer
  - GameCanvas (responsive wrapper)
  - AdBannerWrapper (sticky bottom)

GAME COMPONENTS:
  - GameCard (hub listing)
  - ScoreDisplay (real-time skor dalam game)
  - TimerRing (countdown circular timer)
  - ProgressBar (XP, level, soal)
  - ChoiceButton (pilihan jawaban — 4 buah)
  - ResultScreen (skor, XP, share)
  - DifficultySelector
  - VirtualKeyboard (Wordle, Spelling Bee)

FEEDBACK COMPONENTS:
  - AchievementToast (bottom-right, auto dismiss 5 detik)
  - LevelUpModal (full screen celebration)
  - HighscoreAnimation (konfetti)
  - StreakBadge

GAMIFICATION COMPONENTS:
  - XPBar (progress ke level berikutnya)
  - StreakCounter (api icon + jumlah hari)
  - LevelBadge
  - LeaderboardRow
  - DailyChallengeCard (countdown + status)

DATA COMPONENTS:
  - StatCard (angka besar + label)
  - AchievementGrid
  - GameHistoryList

AD COMPONENTS:
  - BannerAd (AdSense wrapper)
  - InterstitialModal (fullscreen overlay)
  - RewardedAdButton (CTA + modal konfirmasi)
```

### 10.6 Animation Guidelines

```
Durasi:
  Micro (feedback):   100-150ms  — button press, toggle
  Short (transition): 200-300ms  — page transition, modal open
  Medium (celebration): 500-800ms — level up, achievement
  Long (onboarding):  800-1200ms — first-time tutorial

Easing:
  Default:    ease-in-out
  Enter:      ease-out (spring feel)
  Exit:       ease-in (quick dismiss)

Game-specific:
  Tile merge (2048):  150ms ease-out
  Wrong answer shake: 300ms (3 kali shake, amplitude 4px)
  Score pop:          200ms scale(1.3) → scale(1)
  Timer pulse:        500ms cycle saat < 5 detik
  Konfetti:           1000ms particle burst (canvas-based)

Performance rules:
  - Hanya animate: transform, opacity (GPU composited)
  - Jangan animate: width, height, top, left, margin (reflow)
  - Gunakan will-change hanya jika perlu
  - Respek prefers-reduced-motion media query
```

### 10.7 Icon System

Menggunakan **Lucide Icons** (open source, konsisten, tidak ada karakter makhluk hidup).

```
Navigation: Home, Grid, Trophy, User, Settings
Game: Play, Pause, RefreshCw, Timer, Target
Gamification: Star, Award, Flame, Zap, TrendingUp
Status: Check, X, AlertCircle, Info, HelpCircle
Action: Share2, Copy, RotateCcw, ChevronRight
```

---

## 11. Accessibility (a11y)

### 11.1 Target Compliance

**WCAG 2.1 Level AA** — minimum requirement

### 11.2 Requirements per Kategori

**Perceivable:**
- [ ] Semua gambar non-dekoratif punya alt text
- [ ] Kontras warna minimum 4.5:1 untuk teks normal
- [ ] Kontras warna minimum 3:1 untuk teks besar (>18px bold)
- [ ] Timer tidak hanya mengandalkan warna (juga ada angka)
- [ ] Tidak ada konten yang bergerak > 3x per detik (seizure prevention)
- [ ] Captions untuk semua audio (jika ada)

**Operable:**
- [ ] Semua interaksi bisa dilakukan dengan keyboard
- [ ] Focus indicator jelas (outline 2px, kontras tinggi)
- [ ] Skip link "Langsung ke konten" di awal halaman
- [ ] Tidak ada keyboard trap
- [ ] Touch target minimum 44x44px
- [ ] Game bisa dimainkan dengan keyboard (arrow keys, tab, enter)

**Understandable:**
- [ ] Bahasa halaman di-set (`<html lang="id">`)
- [ ] Error message jelas dan actionable
- [ ] Label form yang jelas
- [ ] Instruksi game tidak hanya mengandalkan sensori (warna/suara)

**Robust:**
- [ ] Valid HTML5
- [ ] ARIA roles dan labels untuk komponen custom
- [ ] Kompatibel dengan screen reader (NVDA, VoiceOver)

### 11.3 Game-Specific a11y

| Game      | Keterbatasan      | Solusi                                            |
| --------- | ----------------- | ------------------------------------------------- |
| Wordle    | Color feedback    | Juga tampilkan ikon (✓ ≈ ? ✗) selain warna        |
| 2048      | Swipe-only mobile | Dukungan keyboard arrow keys                      |
| Flag Quiz | Visual flag       | Alt text nama negara pada elemen flag             |
| Sudoku    | Grid kompleks     | ARIA grid roles, navigasi keyboard                |
| All games | Timer pressure    | Opsi "no timer mode" untuk pengguna accessibility |

### 11.4 Testing Tools

- **Automated:** axe-core, Lighthouse Accessibility audit
- **Manual:** Keyboard-only navigation, screen reader test (VoiceOver iOS / NVDA Windows)
- **Color:** WebAIM Contrast Checker

---

## 12. SEO Strategy

### 12.1 Target Keywords

| Keyword                        | Volume Est. | Kompetisi | Priority |
| ------------------------------ | ----------- | --------- | -------- |
| game edukasi                   | 8,000/bln   | Medium    | P0       |
| game belajar matematika        | 5,000/bln   | Low       | P0       |
| wordle bahasa indonesia        | 3,000/bln   | Low       | P0       |
| quiz geografi                  | 2,500/bln   | Low       | P1       |
| belajar tabel perkalian        | 4,000/bln   | Low       | P0       |
| game sudoku online             | 6,000/bln   | Medium    | P1       |
| kuis ibukota negara            | 1,500/bln   | Low       | P1       |
| latihan soal matematika online | 3,500/bln   | Medium    | P1       |

### 12.2 On-Page SEO

**Meta Tags (per halaman):**
```html
<!-- Home -->
<title>EduPlay — Game Edukasi Online Seru & Gratis</title>
<meta name="description" content="Belajar sambil bermain! Game edukasi online gratis: matematika, bahasa, geografi, dan logika. Cocok untuk pelajar SD, SMP, dan SMA.">

<!-- Game Pages -->
<title>Wordle Bahasa Indonesia — EduPlay</title>
<meta name="description" content="Main Wordle dalam Bahasa Indonesia! Tebak kata 5 huruf dalam 6 percobaan. Gratis, langsung main di browser tanpa install.">
```

**Structured Data (JSON-LD):**
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "EduPlay",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "IDR"
  }
}
```

### 12.3 Technical SEO

- [ ] Sitemap.xml di-generate otomatis (game pages, static pages)
- [ ] robots.txt — allow all kecuali /admin/
- [ ] Canonical URLs pada semua halaman
- [ ] Open Graph tags untuk sharing
- [ ] Twitter Card meta tags
- [ ] Core Web Vitals score minimum: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Next.js SSR/SSG untuk game landing pages (bukan SPA)

### 12.4 Content SEO

- Blog section (v1.1): artikel tips belajar, soal matematika, dll
- FAQ section per game
- Panduan belajar (contoh: "Cara Hafal Tabel Perkalian")

---

## 13. Notification System

### 13.1 PWA Push Notifications

**Setup:**
- Menggunakan Web Push API + Service Worker
- Subscription token disimpan di database (tabel `push_subscriptions`)
- Kirim via backend Go menggunakan library `web-push`

**Notification Types & Timing:**

| Type            | Trigger                      | Waktu     | Frekuensi          |
| --------------- | ---------------------------- | --------- | ------------------ |
| Daily Challenge | User belum main hari ini     | 07:00 WIB | 1x/hari            |
| Streak Alert    | Streak > 3 hari, belum main  | 20:00 WIB | 1x/hari            |
| Leaderboard     | User dilewati di leaderboard | Real-time | Maks 2x/hari       |
| Achievement     | Unlock achievement baru      | Real-time | Setiap kali unlock |

**User Control:**
- User bisa opt-out notifikasi tertentu di Settings
- Unsubscribe dari semua notifikasi 1 klik

### 13.2 In-App Notifications

| Event              | Type   | Tampilan                  | Durasi       |
| ------------------ | ------ | ------------------------- | ------------ |
| Achievement unlock | Toast  | Bottom-right, icon + nama | 5 detik      |
| Level up           | Modal  | Full screen, animasi      | User dismiss |
| New highscore      | Inline | Overlay di result screen  | 3 detik      |
| Daily streak       | Toast  | Top banner, api icon      | 3 detik      |
| Streak milestone   | Modal  | Full screen               | User dismiss |

### 13.3 Email Notifications

| Type               | Trigger           | Template                         |
| ------------------ | ----------------- | -------------------------------- |
| Welcome            | Setelah register  | Perkenalan + link main           |
| Email verification | Saat register     | Link verifikasi                  |
| Password reset     | Request reset     | Link reset (expire 1 jam)        |
| Streak warning     | 2 hari tidak main | "Streak kamu mau putus!"         |
| Weekly summary     | Tiap Senin        | Rekap minggu: games, XP, ranking |

**Email Provider:** Resend (free tier: 3,000 email/bulan)

---

## 14. Analytics & Event Tracking

### 14.1 Analytics Platform

- **Primary:** Google Analytics 4 (GA4) — gratis, sudah familiar
- **Secondary (v1.1):** Mixpanel — funnel & cohort analysis lebih powerful

### 14.2 Event Tracking Specification

**Authentication Events:**
```
user_registered        { method: 'email'|'google' }
user_logged_in         { method: 'email'|'google' }
user_logged_out        {}
password_reset_requested {}
```

**Game Events:**
```
game_hub_viewed        {}
game_selected          { game_id, game_name, category }
game_started           { game_id, difficulty, mode: 'normal'|'daily'|'practice' }
game_completed         { game_id, score, duration_seconds, difficulty, xp_earned }
game_abandoned         { game_id, score_at_abandon, time_elapsed }
game_replayed          { game_id }
new_highscore          { game_id, old_score, new_score }
difficulty_selected    { game_id, difficulty }
```

**Gamification Events:**
```
xp_earned              { amount, source: 'game'|'daily'|'achievement' }
level_up               { old_level, new_level }
streak_updated         { streak_count }
streak_broken          { streak_count }
achievement_unlocked   { achievement_id, achievement_name }
```

**Daily Challenge Events:**
```
daily_challenge_viewed {}
daily_challenge_started {}
daily_challenge_completed { score, xp_earned }
daily_challenge_abandoned {}
```

**Monetization Events:**
```
ad_banner_impression   { page }
ad_interstitial_shown  { game_id, trigger: 'game_over'|'between_level' }
ad_interstitial_clicked { game_id }
ad_interstitial_skipped { game_id, time_before_skip }
ad_rewarded_offered    { game_id, reward_type }
ad_rewarded_accepted   { game_id, reward_type }
ad_rewarded_completed  { game_id, reward_type }
ad_rewarded_declined   { game_id, reward_type }
```

**Navigation Events:**
```
page_viewed            { page_name, referrer }
leaderboard_viewed     { game_id|'global', period }
profile_viewed         { own: true|false }
settings_opened        {}
```

**Onboarding Events:**
```
onboarding_started     {}
onboarding_step_completed { step: 1|2|3|4|5 }
onboarding_skipped     { at_step }
onboarding_completed   {}
```

**Error Events:**
```
api_error              { endpoint, status_code, error_message }
game_crash             { game_id, error_message }
ad_load_failed         { ad_type, reason }
```

### 14.3 Funnel Analysis

**Acquisition Funnel:**
```
Landing Page Visit → Guest Game Play → Register Prompt Shown → Register Click → Register Complete
```

**Retention Funnel:**
```
Day 0 Install → Day 1 Return → Day 3 Return → Day 7 Return → Day 30 Return
```

**Monetization Funnel:**
```
Ad Shown → Ad Viewed → Ad Clicked → Revenue Generated
Rewarded Offered → Rewarded Accepted → Rewarded Completed → Reward Claimed
```

### 14.4 Key Dashboards

| Dashboard        | Metrics                                         | Audience      |
| ---------------- | ----------------------------------------------- | ------------- |
| Daily Operations | DAU, new users, errors, revenue                 | Dev + Product |
| User Funnel      | Acquisition → Retention funnel                  | Product       |
| Game Performance | Play count, completion rate, avg score per game | Product       |
| Revenue          | RPM, total revenue, ad fill rate                | Business      |
| Technical        | API latency, error rate, uptime                 | Dev           |

---

## 15. Technical Architecture

### 15.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Cloudflare CDN + WAF                │
│         (DDoS protection, SSL, static assets)        │
└──────────────────┬───────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────┐    ┌─────────▼────────┐
│  Next.js 16  │    │   Go / Fiber API │
│  (Vercel)    │    │  (Railway/Fly.io)│
│              │    │                  │
│ - SSR pages  │    │ - REST API       │
│ - PWA/SW     │    │ - JWT Auth       │
│ - Game UI    │    │ - Business Logic │
│ - Ad render  │    │ - Claude API     │
│ - GA4        │    │ - Scheduler      │
└──────────────┘    └────────┬─────────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
        ┌──────▼────┐ ┌──────▼────┐ ┌─────▼──────┐
        │ PostgreSQL│ │   Redis   │ │  Resend    │
        │  (Neon)   │ │ (Upstash) │ │  (Email)   │
        └───────────┘ └───────────┘ └────────────┘
```

### 15.2 Frontend Stack

| Teknologi       | Versi  | Fungsi                                    |
| --------------- | ------ | ----------------------------------------- |
| Next.js         | 16+    | Framework, App Router, SSR/SSG            |
| React           | 19+    | UI library                                |
| TypeScript      | 5+     | Type safety                               |
| Tailwind CSS    | 3+     | Utility-first styling                     |
| shadcn/ui       | latest | Base component library                    |
| Zustand         | 4+     | Client state (game state, auth)           |
| TanStack Query  | 5+     | Server state, caching, background refetch |
| Framer Motion   | 11+    | Animasi (respects prefers-reduced-motion) |
| next-pwa        | latest | Service worker, PWA manifest              |
| Zod             | 3+     | Schema validation (form + API response)   |
| React Hook Form | 7+     | Form state management                     |
| Lucide React    | latest | Icon library                              |
| next-themes     | latest | Dark mode support                         |
| next-intl       | latest | Internationalization                      |
| web-push        | latest | PWA push notification client              |

### 15.3 Backend Stack

| Teknologi               | Versi  | Fungsi                                          |
| ----------------------- | ------ | ----------------------------------------------- |
| Go                      | 1.26+  | Bahasa pemrograman utama                        |
| Fiber                   | v2     | HTTP framework (Express-like, high performance) |
| GORM                    | v2     | ORM PostgreSQL                                  |
| go-redis                | v9     | Redis client                                    |
| golang-jwt              | v5     | JWT generation & validation                     |
| bcrypt                  | stdlib | Password hashing                                |
| Viper                   | latest | Configuration management                        |
| Zap                     | latest | Structured logging                              |
| Validator               | v10    | Request struct validation                       |
| godotenv                | latest | .env loading                                    |
| robfig/cron             | v3     | Scheduler (daily challenge reset, streak check) |
| SherClockHolmes/webpush | latest | Web Push notification                           |
| Air                     | latest | Hot reload (dev only)                           |
| golang-migrate          | latest | Database migrations                             |

### 15.4 Frontend Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard
│   │   ├── games/
│   │   │   ├── page.tsx                # Game Hub
│   │   │   ├── [slug]/page.tsx         # Game Detail + Play
│   │   ├── leaderboard/page.tsx
│   │   ├── daily/page.tsx
│   │   └── profile/
│   │       ├── page.tsx
│   │       └── settings/page.tsx
│   ├── (legal)/
│   │   ├── privacy-policy/page.tsx
│   │   ├── terms-of-service/page.tsx
│   │   └── about/page.tsx
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── error.tsx
│   └── globals.css
│
├── components/
│   ├── games/
│   │   ├── MathQuiz/
│   │   │   ├── index.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   └── useGameLogic.ts
│   │   ├── Wordle/
│   │   ├── Sudoku/
│   │   ├── Game2048/
│   │   ├── FlagQuiz/
│   │   ├── SpellingBee/
│   │   ├── TimesTable/
│   │   └── CapitalQuiz/
│   ├── ui/
│   │   ├── GameCard.tsx
│   │   ├── Timer.tsx
│   │   ├── ScoreDisplay.tsx
│   │   ├── XPBar.tsx
│   │   ├── StreakCounter.tsx
│   │   ├── AchievementToast.tsx
│   │   ├── LevelUpModal.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── LeaderboardTable.tsx
│   │   ├── DailyChallengeCard.tsx
│   │   ├── VirtualKeyboard.tsx
│   │   └── ConfettiCanvas.tsx
│   ├── ads/
│   │   ├── BannerAd.tsx
│   │   ├── InterstitialModal.tsx
│   │   └── RewardedAdButton.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Footer.tsx
│   │   └── CookieBanner.tsx
│   └── providers/
│       ├── QueryProvider.tsx
│       ├── ThemeProvider.tsx
│       └── AuthProvider.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts               # Axios instance + interceptors
│   │   ├── auth.ts
│   │   ├── games.ts
│   │   ├── leaderboard.ts
│   │   ├── user.ts
│   │   └── daily.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGame.ts
│   │   ├── useAds.ts
│   │   ├── useLeaderboard.ts
│   │   └── usePushNotification.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── gameStore.ts
│   │   └── notificationStore.ts
│   ├── game-engines/
│   │   ├── sudokuGenerator.ts
│   │   ├── wordleEngine.ts
│   │   └── game2048Engine.ts
│   ├── data/
│   │   ├── wordlist-id.ts          # Kata Wordle Indonesia
│   │   ├── flags.ts                # Data negara + bendera
│   │   ├── capitals.ts             # Data ibukota
│   │   └── questions-fallback.ts   # Soal offline fallback
│   └── utils/
│       ├── xp.ts
│       ├── score.ts
│       ├── format.ts
│       └── analytics.ts
│
├── types/
│   ├── game.ts
│   ├── user.ts
│   ├── api.ts
│   └── ads.ts
│
├── public/
│   ├── flags/                      # SVG bendera 195 negara
│   ├── icons/                      # PWA icons (192x192, 512x512)
│   ├── manifest.json
│   ├── sw.js                       # Service worker (generated)
│   └── robots.txt
│
├── messages/
│   ├── id.json                     # Bahasa Indonesia
│   └── en.json                     # English
│
├── middleware.ts                    # Auth + i18n middleware
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

### 15.5 Backend Project Structure

```
backend/
├── cmd/
│   └── main.go
├── internal/
│   ├── auth/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── middleware.go
│   │   └── dto.go
│   ├── user/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── model.go
│   ├── game/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   ├── validator.go            # Anti-cheat score validation
│   │   └── model.go
│   ├── leaderboard/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository.go           # Redis sorted set
│   ├── daily/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── scheduler.go            # Cron: daily reset, streak check
│   ├── achievement/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── evaluator.go            # Cek achievement triggers
│   ├── notification/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── push.go                 # Web push sender
│   ├── ai/
│   │   ├── service.go              # Claude API calls
│   │   └── prompts.go              # Prompt templates
│   └── admin/
│       ├── handler.go
│       └── middleware.go           # Admin role check
├── pkg/
│   ├── database/
│   │   ├── postgres.go
│   │   └── redis.go
│   ├── response/
│   │   └── response.go
│   ├── logger/
│   │   └── zap.go
│   ├── email/
│   │   └── resend.go
│   └── validator/
│       └── validator.go
├── config/
│   └── config.go
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_games.sql
│   ├── 003_create_sessions.sql
│   ├── 004_create_leaderboard.sql
│   ├── 005_create_daily.sql
│   ├── 006_create_achievements.sql
│   ├── 007_create_push_subscriptions.sql
│   └── 008_seed_games.sql
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── Makefile
```

### 15.6 Caching Strategy

```
Layer 1 — Browser Cache (Next.js):
  Static assets (JS, CSS, images): Cache-Control: public, max-age=31536000, immutable
  API responses (TanStack Query):
    - Game list: staleTime 5 menit
    - Leaderboard: staleTime 1 menit
    - User profile: staleTime 30 detik
    - Daily challenge: staleTime sampai reset berikutnya

Layer 2 — CDN Cache (Cloudflare):
  Static pages (SSG): Edge cache 1 jam
  API responses: Tidak di-cache (dynamic)

Layer 3 — Redis Cache (Backend):
  AI questions:       TTL 1 jam per game+difficulty combo
  Daily challenge:    TTL sampai midnight WIB
  Leaderboard:        Live (Redis sorted set, tidak di-cache lagi)
  Rate limit counters: TTL sesuai window (3 menit untuk ads)
  JWT blacklist:      TTL = sisa waktu expire token

Layer 4 — PostgreSQL:
  Connection pool: 10-25 connections
  Query cache: pgBouncer (v1.1)
```

### 15.7 API Versioning Strategy

- Semua endpoint diprefix `/api/v1/`
- Breaking changes → `/api/v2/`
- v1 didukung minimal 6 bulan setelah v2 release
- Deprecated endpoints mengembalikan header `X-API-Deprecated: true`

---

## 16. Database Schema

### 16.1 PostgreSQL Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- USERS
-- =====================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(30) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),                    -- NULL jika OAuth
    oauth_provider  VARCHAR(20),                     -- 'google', NULL
    oauth_id        VARCHAR(255),
    email_verified  BOOLEAN DEFAULT FALSE,
    xp              INTEGER DEFAULT 0 CHECK (xp >= 0),
    level           INTEGER DEFAULT 1 CHECK (level >= 1),
    streak          INTEGER DEFAULT 0 CHECK (streak >= 0),
    last_active     DATE,
    role            VARCHAR(10) DEFAULT 'user',       -- 'user', 'admin'
    is_active       BOOLEAN DEFAULT TRUE,
    is_banned       BOOLEAN DEFAULT FALSE,
    ban_reason      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_xp ON users(xp DESC);

-- =====================
-- GAMES (Master Data)
-- =====================
CREATE TABLE games (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    description     TEXT,
    description_en  TEXT,
    category        VARCHAR(20) NOT NULL,
    icon            VARCHAR(50),                     -- Lucide icon name
    color           VARCHAR(7),                      -- Hex color untuk card
    is_active       BOOLEAN DEFAULT TRUE,
    is_new          BOOLEAN DEFAULT FALSE,
    order_index     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- GAME SESSIONS
-- =====================
CREATE TABLE game_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id         UUID REFERENCES games(id),
    score           INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
    duration        INTEGER CHECK (duration > 0),    -- Detik
    difficulty      VARCHAR(10),
    xp_earned       INTEGER DEFAULT 0,
    is_daily        BOOLEAN DEFAULT FALSE,
    checksum        VARCHAR(64),                     -- Anti-cheat hash
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_sessions_created_at ON game_sessions(created_at DESC);

-- =====================
-- USER HIGHSCORES
-- =====================
CREATE TABLE user_highscores (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id         UUID REFERENCES games(id),
    highscore       INTEGER DEFAULT 0 CHECK (highscore >= 0),
    games_played    INTEGER DEFAULT 0,
    total_score     BIGINT DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

-- =====================
-- DAILY CHALLENGES
-- =====================
CREATE TABLE daily_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id         UUID REFERENCES games(id),
    questions_json  JSONB NOT NULL,
    answers_json    JSONB NOT NULL,                  -- Hashed answers
    challenge_date  DATE UNIQUE NOT NULL,
    generated_by    VARCHAR(10) DEFAULT 'ai',        -- 'ai', 'manual'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_daily_date ON daily_challenges(challenge_date DESC);

-- =====================
-- DAILY SUBMISSIONS
-- =====================
CREATE TABLE daily_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id    UUID REFERENCES daily_challenges(id),
    score           INTEGER NOT NULL,
    xp_earned       INTEGER DEFAULT 0,
    completed_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, challenge_id)
);

-- =====================
-- ACHIEVEMENTS (Master)
-- =====================
CREATE TABLE achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    description     TEXT,
    description_en  TEXT,
    icon            VARCHAR(50),
    xp_reward       INTEGER DEFAULT 0,
    trigger_type    VARCHAR(30),    -- 'streak', 'score', 'games_played', 'level', etc
    trigger_value   INTEGER,
    trigger_game_id UUID REFERENCES games(id),      -- NULL = any game
    is_active       BOOLEAN DEFAULT TRUE
);

-- =====================
-- USER ACHIEVEMENTS
-- =====================
CREATE TABLE user_achievements (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id  UUID REFERENCES achievements(id),
    unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- =====================
-- PUSH SUBSCRIPTIONS
-- =====================
CREATE TABLE push_subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint        TEXT UNIQUE NOT NULL,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_push_user_id ON push_subscriptions(user_id);

-- =====================
-- FEATURE FLAGS
-- =====================
CREATE TABLE feature_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(50) UNIQUE NOT NULL,
    value           BOOLEAN DEFAULT FALSE,
    description     TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AUDIT LOG
-- =====================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(30),
    entity_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### 16.2 Redis Key Schema

```
# ================================
# LEADERBOARD (Sorted Sets)
# ================================
leaderboard:game:{game_id}:alltime        ZADD score member=user_id
leaderboard:game:{game_id}:weekly         ZADD score member=user_id  [EXPIREAT next Monday 00:00]
leaderboard:global:xp                     ZADD xp member=user_id

# ================================
# DAILY CHALLENGE
# ================================
daily:challenge:{YYYY-MM-DD}              JSON string challenge data  [EXPIREAT next midnight]
daily:submitted:{user_id}:{YYYY-MM-DD}   "1"  [EXPIREAT next midnight]

# ================================
# AD RATE LIMITING
# ================================
ratelimit:interstitial:{user_id}          "1"  [EX 180]  (3 menit)
ratelimit:api:{user_id}                   counter  [EX 60]

# ================================
# AUTH
# ================================
jwt:blacklist:{jti}                       "1"  [EX = remaining token TTL]
session:refresh:{user_id}                 refresh_token_hash  [EX 7days]

# ================================
# AI QUESTIONS CACHE
# ================================
ai:questions:{game_slug}:{difficulty}     JSON array questions  [EX 3600]

# ================================
# FEATURE FLAGS CACHE
# ================================
feature_flags                             JSON map  [EX 300]  (5 menit)

# ================================
# PUSH NOTIFICATION QUEUE
# ================================
notif:queue:daily                         List of user_ids to notify
notif:queue:streak                        List of user_ids streak warning

# ================================
# USER SESSION DATA
# ================================
user:streak_check:{user_id}              last check timestamp  [EX 86400]
```

---

## 17. API Specification

### Standard Response Format

```json
{
  "success": true,
  "data": {},
  "message": "OK",
  "error": null,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}

// Error response
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Email tidak valid" }
    ]
  }
}
```

### Error Codes

| Code             | HTTP Status | Deskripsi                                    |
| ---------------- | ----------- | -------------------------------------------- |
| VALIDATION_ERROR | 400         | Input tidak valid                            |
| UNAUTHORIZED     | 401         | Token tidak ada / tidak valid                |
| FORBIDDEN        | 403         | Tidak punya akses                            |
| NOT_FOUND        | 404         | Resource tidak ditemukan                     |
| CONFLICT         | 409         | Duplikat (email/username sudah ada)          |
| RATE_LIMITED     | 429         | Terlalu banyak request                       |
| INTERNAL_ERROR   | 500         | Server error                                 |
| AI_UNAVAILABLE   | 503         | Claude API tidak tersedia (gunakan fallback) |

### 17.1 Auth

```
POST /api/v1/auth/register
  Body: { username: string, email: string, password: string }
  Response: { user, access_token, refresh_token }
  Errors: VALIDATION_ERROR, CONFLICT

POST /api/v1/auth/login
  Body: { email: string, password: string }
  Response: { user, access_token, refresh_token }
  Errors: UNAUTHORIZED, NOT_FOUND

POST /api/v1/auth/refresh
  Body: { refresh_token: string }
  Response: { access_token, refresh_token }
  Errors: UNAUTHORIZED

POST /api/v1/auth/logout
  Auth: Bearer token
  Response: { message }

POST /api/v1/auth/forgot-password
  Body: { email: string }
  Response: { message }  // Selalu 200 untuk prevent email enumeration

POST /api/v1/auth/reset-password
  Body: { token: string, new_password: string }
  Response: { message }
  Errors: UNAUTHORIZED (token expired/invalid)
```

### 17.2 User

```
GET /api/v1/user/me
  Auth: Bearer token
  Response: { id, username, email, xp, level, streak, last_active, email_verified, created_at }

PATCH /api/v1/user/me
  Auth: Bearer token
  Body: { username?: string }
  Response: { user }
  Errors: CONFLICT (username taken), VALIDATION_ERROR

GET /api/v1/user/stats
  Auth: Bearer token
  Response: {
    total_games, total_xp,
    highscores: [{ game_id, game_name, highscore, games_played }],
    recent_sessions: [{ game_name, score, xp_earned, created_at }],
    streak, level, xp
  }

GET /api/v1/user/achievements
  Auth: Bearer token
  Response: {
    all: [{ id, slug, name, description, xp_reward, icon }],
    unlocked: [{ achievement_id, unlocked_at }]
  }

POST /api/v1/user/push-subscription
  Auth: Bearer token
  Body: { endpoint, p256dh, auth }
  Response: { message }

DELETE /api/v1/user/push-subscription
  Auth: Bearer token
  Response: { message }
```

### 17.3 Games

```
GET /api/v1/games
  Auth: Optional
  Query: ?category=math|language|geography|logic
  Response: { games: [{ id, slug, name, category, icon, color, is_new }] }

GET /api/v1/games/:slug
  Auth: Optional
  Response: {
    game: { id, slug, name, description, category },
    user_highscore?: number,
    user_games_played?: number
  }

POST /api/v1/games/:slug/score
  Auth: Bearer token
  Body: { score: int, duration: int, difficulty: string, checksum: string }
  Response: {
    session_id,
    xp_earned,
    new_highscore: boolean,
    previous_highscore: int,
    achievements_unlocked: [{ id, name, xp_reward }],
    level_up: boolean,
    new_level?: int
  }
  Errors: VALIDATION_ERROR (score invalid), RATE_LIMITED (1 submit per 30 detik)

GET /api/v1/games/:slug/questions
  Auth: Optional
  Query: ?difficulty=easy|medium|hard&count=10
  Response: { questions: [...], source: 'ai'|'fallback' }
  Note: AI-generated jika tersedia, fallback ke pre-generated jika tidak
```

### 17.4 Leaderboard

```
GET /api/v1/leaderboard/game/:slug
  Auth: Optional
  Query: ?period=alltime|weekly&limit=100
  Response: {
    entries: [{ rank, user_id, username, score, created_at }],
    user_rank?: { rank, score }
  }

GET /api/v1/leaderboard/global
  Auth: Optional
  Query: ?period=alltime|weekly&limit=100
  Response: {
    entries: [{ rank, user_id, username, xp, level }],
    user_rank?: { rank, xp }
  }
```

### 17.5 Daily Challenge

```
GET /api/v1/daily
  Auth: Optional
  Response: {
    challenge_id,
    game: { slug, name },
    questions: [...],  // Tanpa answers
    challenge_date,
    expires_at,        // Midnight WIB
    user_submitted: boolean,
    user_score?: int
  }

POST /api/v1/daily/submit
  Auth: Bearer token
  Body: { challenge_id: string, answers: [...], score: int }
  Response: {
    score,
    xp_earned,
    streak_updated: boolean,
    new_streak: int,
    achievements_unlocked: [...]
  }
  Errors: CONFLICT (sudah submit hari ini), NOT_FOUND
```

### 17.6 Admin (Protected — role: admin)

```
GET    /api/v1/admin/users?page=1&limit=20&search=
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id/ban    Body: { reason: string }
PATCH  /api/v1/admin/users/:id/unban

GET    /api/v1/admin/games
PATCH  /api/v1/admin/games/:id       Body: { is_active?, is_new?, order_index? }

GET    /api/v1/admin/analytics/summary
GET    /api/v1/admin/analytics/games
GET    /api/v1/admin/analytics/revenue

GET    /api/v1/admin/feature-flags
PATCH  /api/v1/admin/feature-flags/:key  Body: { value: boolean }

DELETE /api/v1/admin/leaderboard/game/:slug/user/:user_id  // Remove cheated score
POST   /api/v1/admin/leaderboard/game/:slug/reset

POST   /api/v1/admin/daily           Body: { game_id, questions_json, challenge_date }
PATCH  /api/v1/admin/daily/:id
```

---

## 18. Error Handling & Fallback Strategy

### 18.1 Frontend Error Handling

**Global Error Boundary:**
```
app/error.tsx  — Catch React rendering errors
app/not-found.tsx  — 404 halaman
```

**API Error Handling (TanStack Query + Axios):**
- Network error → Tampilkan "Koneksi bermasalah, coba lagi"
- 401 → Auto redirect ke login
- 429 → Tampilkan "Terlalu banyak percobaan, tunggu beberapa saat"
- 500 → Tampilkan "Terjadi kesalahan server" + tombol retry
- Semua error di-log ke Sentry

**Game Error Handling:**
- Game crash → Tampilkan result screen dengan skor saat itu
- Score submit gagal → Retry otomatis 3x dengan exponential backoff
- Jika tetap gagal → Simpan di localStorage, retry saat online

### 18.2 Backend Error Handling

**Panic Recovery:**
- Fiber middleware RecoverFromPanic
- Log dengan Zap, return 500

**Database Error:**
- Connection pool exhausted → Return 503, log alert
- Query timeout (> 5 detik) → Timeout context, return 408
- Unique constraint → Return 409 dengan pesan jelas

**External Service Errors:**

| Service        | Error            | Fallback                                           |
| -------------- | ---------------- | -------------------------------------------------- |
| Claude API     | Timeout / Error  | Return soal pre-generated dari pool                |
| Claude API     | Rate limit       | Queue request, return fallback                     |
| Redis          | Connection error | Operasi tetap berjalan tanpa cache (degraded mode) |
| Resend (email) | Error            | Log, retry 3x, alert admin jika tetap gagal        |
| Web Push       | Error            | Log, mark subscription as inactive                 |

### 18.3 Offline Mode (PWA)

**Service Worker Cache Strategy:**
```
Network First (dengan fallback):
  - API calls (user data, leaderboard)

Cache First:
  - Static assets (JS, CSS, fonts, icons)
  - Game data yang jarang berubah (word list, flag SVGs)

Stale While Revalidate:
  - Game list
  - User profile (tampilkan cached, update di background)

Network Only:
  - Score submission (tidak bisa offline)
  - Auth endpoints
```

**Offline UI:**
- Banner "Kamu sedang offline" saat tidak ada koneksi
- Game yang bisa dimainkan offline (dengan soal cached): Math Quiz, 2048, Sudoku
- Score disimpan di IndexedDB, submit otomatis saat online kembali
- Leaderboard menampilkan data terakhir yang di-cache

---

## 19. Security Requirements

### 19.1 Authentication & Session

- Password di-hash dengan **bcrypt** (cost factor 12)
- JWT Access Token: expire **15 menit**
- JWT Refresh Token: expire **7 hari**, HTTP-only cookie
- Refresh token rotation: token baru setiap refresh
- Logout: blacklist JTI di Redis (TTL = sisa expire)
- Failed login: lockout setelah 5x gagal dalam 15 menit (rate limit)
- Password reset token: expire 1 jam, single-use

### 19.2 API Security

- **CORS:** Whitelist hanya domain frontend resmi
- **Rate Limiting:**
  - Public endpoints: 100 req/menit per IP
  - Auth endpoints: 10 req/menit per IP
  - Authenticated: 200 req/menit per user_id
- **Input Validation:** Semua input divalidasi dengan Go validator v10
- **SQL Injection:** GORM dengan parameterized queries (never raw SQL)
- **XSS:** Next.js escapes secara default, sanitasi tambahan di backend
- **CSRF:** Tidak perlu (JWT-based, bukan cookie-based auth untuk API)
- **HTTPS:** Wajib, enforce via Cloudflare
- **Security Headers:**
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Content-Security-Policy: [strict policy]
  Referrer-Policy: strict-origin-when-cross-origin
  ```

### 19.3 Score Anti-Cheat

**Server-side Validation:**
```go
// Validasi yang dilakukan saat score submit:
1. Score range check: 0 <= score <= MAX_SCORE[game][difficulty]
2. Duration check: duration >= MIN_DURATION[game]
3. Rate limit: 1 submit per 30 detik per user per game
4. Checksum verification: hash(user_id + game_id + score + timestamp + secret)
5. Anomaly detection: score > 3x median score → flag untuk review
6. Velocity check: tidak bisa main > 100 games per jam
```

**Anomaly Flagging:**
- Skor yang di-flag masuk ke tabel `flagged_scores` untuk review manual admin
- User tidak langsung di-ban, tapi skor di-hide dari leaderboard pending review

### 19.4 Data Privacy

- Password tidak pernah dikembalikan di response
- Email tidak ditampilkan ke user lain (hanya username)
- Log tidak menyimpan password, token, atau data sensitif
- IP address di-log untuk keamanan, bukan untuk tracking
- User dapat request hapus akun (soft delete → hard delete setelah 30 hari)

### 19.5 Dependency Security

- `dependabot` atau `renovate` untuk update dependencies otomatis
- `npm audit` dan `govulncheck` di CI pipeline
- Tidak menggunakan package dengan known vulnerabilities

---

## 20. Performance Requirements

### 20.1 Frontend Metrics

| Metric              | Target          | Measurement             |
| ------------------- | --------------- | ----------------------- |
| LCP                 | < 2.5 detik     | Lighthouse, CrUX        |
| FID / INP           | < 200ms         | Web Vitals              |
| CLS                 | < 0.1           | Web Vitals              |
| Initial JS Bundle   | < 200KB gzipped | Webpack bundle analyzer |
| Time to Interactive | < 4 detik (3G)  | Lighthouse              |
| Game frame rate     | 60fps           | requestAnimationFrame   |
| Game input lag      | < 50ms          | Manual testing          |

### 20.2 Backend Metrics

| Metric                | Target  |
| --------------------- | ------- |
| API P50 response time | < 50ms  |
| API P95 response time | < 200ms |
| API P99 response time | < 500ms |
| Concurrent users (v1) | 1,000   |
| Concurrent users (v2) | 10,000  |
| Database query P95    | < 100ms |
| Redis operation       | < 5ms   |

### 20.3 Optimization Strategies

**Frontend:**
- Code splitting per route (App Router)
- Dynamic import untuk game components (tidak load semua game sekaligus)
- `next/image` untuk optimasi gambar (flag SVG = inline, tidak pakai next/image)
- Font preload, font-display: swap
- Service Worker pre-cache critical assets
- Prefetch game questions saat user hover/focus pada game card
- Virtualization untuk leaderboard panjang

**Backend:**
- Redis untuk leaderboard (O(log N) ZADD/ZRANK)
- Database connection pooling
- AI questions di-cache 1 jam
- Pagination semua list endpoints (default limit 20)
- Async: achievement evaluation dan notification kirim di goroutine terpisah
- Daily challenge di-pregenerate H-1 via scheduler

**Infrastructure:**
- CDN untuk static assets (Cloudflare)
- Lazy load ads (tidak block render utama)
- Gzip compression di semua response

---

## 21. Testing Strategy

### 21.1 Testing Pyramid

```
         /\
        /E2E\           5% — Playwright
       /──────\
      /  Integ  \       25% — API tests (Go httptest)
     /────────────\
    /     Unit      \   70% — Game logic, services, utils
   /──────────────────\
```

### 21.2 Backend Testing (Go)

**Unit Tests:**
- Game score validation logic
- XP calculation formula
- Achievement trigger evaluation
- Leaderboard ranking logic
- Anti-cheat checksum verification
- AI prompt construction

**Integration Tests (httptest):**
- Auth flow: register → login → refresh → logout
- Game score submit flow: submit → XP update → leaderboard update → achievement check
- Daily challenge: get → submit → streak update
- Rate limiting behavior

**Tools:**
```go
"testing"              // stdlib
"github.com/stretchr/testify"  // assert & mock
"net/http/httptest"    // HTTP test server
"github.com/DATA-DOG/go-sqlmock"  // DB mock
"github.com/alicebob/miniredis"   // Redis mock
```

**Coverage Target:** ≥ 70% untuk service layer

### 21.3 Frontend Testing

**Unit Tests (Jest + Testing Library):**
- Game engine logic (Sudoku generator, 2048 engine, Wordle validator)
- Score calculation utilities
- XP formula utils
- Custom hooks (useGame, useAuth)

**Component Tests:**
- Game components render correctly
- Timer countdown behavior
- Score display updates
- Ad frequency cap logic

**Tools:**
```
Jest
@testing-library/react
@testing-library/user-event
MSW (Mock Service Worker) — mock API calls
```

### 21.4 E2E Testing (Playwright)

**Critical Flows:**
1. Register → Play game → See score on leaderboard
2. Guest play → Score submit → Register prompt → Register → Score saved
3. Daily challenge: view → play → submit → streak updated
4. Wordle: main 6 percobaan, kalah → game over
5. Sudoku: complete puzzle → skor terecord
6. Ad interstitial: game over → interstitial shown → dismiss → result screen
7. Rewarded ad: tap hint → confirm → ad shown → hint revealed

**Browser Coverage:**
- Chrome (desktop + mobile emulation)
- Safari (desktop + iOS emulation)
- Firefox

### 21.5 Performance Testing

**Load Testing (k6):**
```javascript
// Scenario: 1000 concurrent users selama 5 menit
export const options = {
  vus: 1000,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  }
};
```

**Target Scenarios:**
- 1,000 concurrent users (v1 launch)
- Spike test: 0 → 2,000 users dalam 30 detik (viral scenario)
- Leaderboard read-heavy: 500 concurrent leaderboard reads

### 21.6 Security Testing

- OWASP ZAP scan sebelum launch
- Dependency audit (npm audit, govulncheck)
- Manual pen test: SQL injection, XSS, auth bypass
- Score manipulation attempt test

---

## 22. CI/CD Pipeline

### 22.1 Git Branching Strategy

```
main          — Production-ready, deploy otomatis ke production
staging       — Staging environment, deploy otomatis ke staging
develop       — Integration branch
feature/*     — Feature branches, PR ke develop
fix/*         — Bug fix branches
hotfix/*      — Critical fix langsung ke main
```

### 22.2 GitHub Actions — Frontend (Next.js)

```yaml
# .github/workflows/frontend.yml

name: Frontend CI/CD

on:
  push:
    branches: [main, staging, develop]
    paths: ['frontend/**']
  pull_request:
    branches: [develop]
    paths: ['frontend/**']

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging' || github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd frontend && npm ci
      - run: cd frontend && npx playwright install --with-deps
      - run: cd frontend && npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/

  deploy-staging:
    needs: [lint-and-type-check, test]
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel --token=${{ secrets.VERCEL_TOKEN }} --env=staging

  deploy-production:
    needs: [lint-and-type-check, test, e2e]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### 22.3 GitHub Actions — Backend (Go)

```yaml
# .github/workflows/backend.yml

name: Backend CI/CD

on:
  push:
    branches: [main, staging, develop]
    paths: ['backend/**']
  pull_request:
    branches: [develop]
    paths: ['backend/**']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - uses: golangci/golangci-lint-action@v4

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: edugame_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - run: cd backend && go test ./... -coverprofile=coverage.out -covermode=atomic
      - run: cd backend && go tool cover -func=coverage.out
      - uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
      - run: go install golang.org/x/vuln/cmd/govulncheck@latest
      - run: cd backend && govulncheck ./...

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
      - run: cd backend && go build -o bin/server ./cmd/main.go

  deploy-staging:
    needs: [lint, test, build]
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service=backend-staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-production:
    needs: [lint, test, security, build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: railway up --service=backend-production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 22.4 PR Requirements

- Minimum 1 reviewer approval
- Semua CI jobs harus pass (lint, test, build)
- Coverage tidak boleh turun > 5%
- No merge ke `main` tanpa staging test pass
- Squash merge untuk feature branches

---

## 23. Infrastructure & Deployment

### 23.1 Environment Matrix

| Environment | URL                | Frontend       | Backend         | DB           | Redis           |
| ----------- | ------------------ | -------------- | --------------- | ------------ | --------------- |
| Development | localhost          | localhost:3000 | localhost:8080  | Docker local | Docker local    |
| Staging     | staging.eduplay.id | Vercel Preview | Railway staging | Neon staging | Upstash staging |
| Production  | eduplay.id         | Vercel prod    | Railway prod    | Neon prod    | Upstash prod    |

### 23.2 Hosting Stack

| Service            | Provider   | Plan                 | Est. Cost/Bulan            |
| ------------------ | ---------- | -------------------- | -------------------------- |
| Frontend (Next.js) | Vercel     | Hobby (free)         | Rp 0                       |
| Backend (Go)       | Railway    | Starter ($5)         | Rp 75.000                  |
| PostgreSQL         | Neon       | Free (0.5GB) → Pro   | Rp 0 - 150.000             |
| Redis              | Upstash    | Free (10K cmd/hari)  | Rp 0                       |
| Email              | Resend     | Free (3K/bln)        | Rp 0                       |
| CDN + DNS          | Cloudflare | Free                 | Rp 0                       |
| Monitoring         | Sentry     | Free (5K errors/bln) | Rp 0                       |
| Analytics          | GA4        | Free                 | Rp 0                       |
| **Total**          |            |                      | **~Rp 75.000-225.000/bln** |

### 23.3 Docker Compose (Local)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: edugame
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./backend:/app
    env_file:
      - ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: air  # hot reload

volumes:
  postgres_data:
  redis_data:
```

### 23.4 Dockerfile (Backend Production)

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/main.go

# Stage 2: Run
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations
EXPOSE 8080
CMD ["./server"]
```

### 23.5 Environment Variables

**Backend (.env.example):**
```env
# App
APP_ENV=development          # development|staging|production
APP_PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edugame
DB_USER=admin
DB_PASSWORD=secret
DB_SSL_MODE=disable          # require di production

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=change-this-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h      # 7 hari

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514
AI_QUESTIONS_PER_REQUEST=20

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@eduplay.id

# Push Notification
VAPID_PUBLIC_KEY=xxxxx
VAPID_PRIVATE_KEY=xxxxx
VAPID_EMAIL=mailto:admin@eduplay.id

# Frontend
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://eduplay.id

# Sentry
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Admin
ADMIN_SECRET=change-this-too  # Untuk create admin account
```

**Frontend (.env.local.example):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Ads
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADMOB_APP_ID=ca-app-pub-xxxxxxxx~xxxxxxxx

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Push Notification
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxxxx

# Feature
NEXT_PUBLIC_ENABLE_DARK_MODE=true
NEXT_PUBLIC_ENABLE_SOUNDS=true
```

---

## 24. Backup & Disaster Recovery

### 24.1 Backup Strategy

**PostgreSQL:**
- Neon: Automatic backup setiap hari (retained 7 hari di free tier, 30 hari di pro)
- Manual backup: pg_dump setiap minggu, disimpan di cloud storage

**Redis:**
- Upstash: Persistent storage (RDB snapshots)
- Data yang hilang dapat direkonstruksi dari PostgreSQL

**Application Code:**
- Git repository (GitHub) sebagai source of truth
- Multi-environment deployment (staging + production)

### 24.2 Recovery Time Objective (RTO)

| Skenario                    | RTO Target                       |
| --------------------------- | -------------------------------- |
| Database failure            | < 30 menit                       |
| Backend crash               | < 5 menit (auto-restart Railway) |
| Frontend down               | < 2 menit (Vercel auto-redeploy) |
| Full infrastructure failure | < 2 jam                          |

### 24.3 Recovery Point Objective (RPO)

| Data                          | RPO Target                        |
| ----------------------------- | --------------------------------- |
| User data                     | < 24 jam (daily backup)           |
| Game scores                   | < 1 jam                           |
| Real-time leaderboard (Redis) | < 15 menit (rekonstruksi dari DB) |

### 24.4 Incident Response

**Level 1 — Minor (latency tinggi, error rate < 5%):**
- Auto-alert ke Slack (#alerts channel)
- On-call engineer check dalam 30 menit

**Level 2 — Major (service degraded, error rate 5-20%):**
- Alert ke seluruh tim engineering
- Response dalam 15 menit
- Status page update

**Level 3 — Critical (service down, error rate > 20%):**
- Semua tangan di dek
- Response dalam 5 menit
- Rollback ke versi sebelumnya jika deploy-related
- Status page update setiap 15 menit
- Post-mortem dalam 48 jam

---

## 25. Legal & Compliance

### 25.1 Required Legal Pages

**Privacy Policy** — Wajib untuk AdSense dan PDPA:
- Data apa yang dikumpulkan (email, username, skor, device info)
- Bagaimana data digunakan
- Third-party sharing (Google Ads, Google Analytics)
- Hak pengguna (hapus akun, export data)
- Cookie policy
- Kontak: privacy@eduplay.id

**Terms of Service:**
- Usia minimum: 7 tahun (dengan izin orang tua untuk < 13 tahun)
- Acceptable use policy
- Larangan: cheat, spam, konten ofensif username
- Disclaimer: Platform untuk hiburan dan edukasi informal

**Cookie Policy:**
- Cookie yang digunakan: session, preferences, analytics, ads
- Cara opt-out

### 25.2 Cookie Consent Banner

- Tampilkan saat pertama kali visit
- Kategorikan: Essential / Analytics / Advertising
- User bisa accept all atau customize
- Tersimpan di localStorage, tidak di-reset setiap visit
- Library: `react-cookie-consent` atau custom

### 25.3 Regulasi yang Perlu Dipatuhi

| Regulasi           | Lingkup             | Requirement                                              |
| ------------------ | ------------------- | -------------------------------------------------------- |
| UU PDP Indonesia   | Data pribadi WNI    | Privacy policy, user consent, data minimization          |
| COPPA (AS)         | Anak < 13 tahun     | Jika ada user AS, perlu parental consent                 |
| GDPR (EU)          | Jika ada user EU    | Privacy rights, data export, right to be forgotten       |
| Google AdSense TOS | Wajib untuk AdSense | Privacy policy, no invalid clicks, no prohibited content |

### 25.4 Content Safety

- Tidak ada konten dewasa
- Tidak ada konten kekerasan
- Tidak ada konten SARA
- Username filter: blacklist kata kasar (bahasa Indonesia + Inggris)
- Soal AI di-moderate dengan system prompt yang ketat
- Tidak ada gambar manusia atau makhluk hidup

---

## 26. Content Guidelines

### 26.1 Soal Game

**Standar Kualitas:**
- Soal harus jelas dan tidak ambigu
- Satu jawaban yang definitif benar
- Bahasa Indonesia yang baik dan benar (atau English untuk mode EN)
- Tingkat kesulitan harus sesuai level yang dipilih
- Tidak ada konten politik, SARA, atau sensitif

**Standar untuk Setiap Kategori:**

*Math:*
- Easy: Operasi 1 langkah, angka kecil
- Medium: Operasi 2 langkah, angka sedang
- Hard: Operasi 3+ langkah, angka besar, campuran operasi

*Language (Wordle):*
- Kata harus ada di KBBI
- Panjang tepat 5 huruf
- Bukan kata kasar, nama orang, atau nama tempat
- Bukan kata yang terlalu obscure (kata sehari-hari lebih baik)

*Geography:*
- Data harus akurat dan up-to-date (ibukota bisa berubah)
- Sumber: Data resmi PBB / Wikipedia verified
- Update berkala setiap 6 bulan

### 26.2 AI Question Generation

**System Prompt Template (Math Quiz):**
```
Kamu adalah generator soal matematika untuk platform edukasi anak-anak.
Buat [COUNT] soal matematika dengan ketentuan:
- Kesulitan: [DIFFICULTY]
- Bahasa: Bahasa Indonesia
- Format: JSON array
- Setiap soal: { question, options: [4 pilihan], answer, explanation }
- Soal tidak boleh mengandung konten negatif, kekerasan, atau SARA
- Variasikan tipe soal: perhitungan langsung dan soal cerita
- Soal cerita menggunakan konteks sehari-hari yang relevan untuk anak Indonesia
- HANYA return JSON, tanpa markdown atau teks lain
```

**Validasi Output AI:**
- Parse JSON, jika gagal → gunakan fallback
- Cek semua field hadir
- Cek `answer` ada di dalam `options`
- Cek tidak ada konten terlarang (keyword filter sederhana)

### 26.3 Username Guidelines

**Aturan Username:**
- 3-30 karakter
- Hanya huruf, angka, underscore, dash
- Tidak boleh mulai/akhir dengan underscore atau dash
- Tidak boleh mengandung kata kasar (blacklist)
- Tidak boleh mengandung kata yang menyinggung (blacklist)
- Case-insensitive uniqueness check

**Username Blacklist (contoh):**
- Kata kasar bahasa Indonesia
- Kata kasar bahasa Inggris
- Nama brand sensitif (admin, support, help, dll)

---

## 27. Admin Panel

### 27.1 Scope Admin Panel v1

Admin panel adalah web interface terpisah atau di path `/admin` dengan auth role-based.

### 27.2 Halaman Admin

**Dashboard:**
- Total users, DAU, MAU, new users hari ini
- Total games played hari ini
- Error rate
- Graph sederhana 7 hari terakhir

**User Management:**
- List semua user (search, filter by date, filter by status)
- Detail user: info, history game, achievement
- Aksi: Ban, Unban, Reset password manual

**Game Management:**
- List semua game
- Toggle active/inactive
- Edit nama, deskripsi, urutan tampil
- Lihat statistik per game (total plays, avg score)

**Daily Challenge Manager:**
- Lihat daily challenge yang sudah dibuat (calendar view)
- Buat challenge manual untuk tanggal tertentu
- Edit challenge yang belum mulai
- Override AI-generated challenge

**Leaderboard Management:**
- Lihat leaderboard per game
- Hapus score yang dicurigai cheat
- Reset weekly leaderboard manual (emergency)

**Content Moderation:**
- Queue username yang dilaporkan
- Approve / reject / ban

**Feature Flags:**
- Toggle fitur on/off
- View current state semua flag

**Analytics:**
- Basic charts: DAU/MAU, games per category, top games
- Export data ke CSV

---

## 28. Support & Bug Reporting

### 28.1 User Support Channels

| Channel                   | Tujuan                      | Response Time Target       |
| ------------------------- | --------------------------- | -------------------------- |
| Email: support@eduplay.id | Bug report, pertanyaan umum | < 48 jam                   |
| In-app "Laporkan Masalah" | Bug report cepat            | Auto-log, manual follow-up |
| FAQ Page                  | Self-service                | N/A                        |

### 28.2 In-App Bug Report

- Tombol "Laporkan Masalah" di Settings → hidden menu (long press)
- Form: kategori bug + deskripsi (optional screenshot)
- Auto-include: user_id, device info, app version, last 5 actions (anonymized)
- Dikirim ke backend, disimpan di database, notif ke admin

### 28.3 Sentry Error Monitoring

- Semua uncaught errors otomatis masuk Sentry
- Alert ke email/Slack jika error baru muncul
- Error grouped by fingerprint
- P0 errors (fatal, affects > 1% users) → immediate response

---

## 29. Feature Flags & A/B Testing

### 29.1 Feature Flags

Implementasi: Database table `feature_flags` + Redis cache (5 menit TTL)

**Flags v1:**
```
ENABLE_DARK_MODE           — Toggle dark mode untuk semua user
ENABLE_SOUNDS              — Toggle sound effects
ENABLE_AI_QUESTIONS        — Jika false, selalu gunakan fallback questions
ENABLE_PUSH_NOTIFICATIONS  — Toggle push notification system
ENABLE_DAILY_CHALLENGE      — Toggle daily challenge section
ENABLE_ACHIEVEMENTS        — Toggle achievement system
MAINTENANCE_MODE           — Tampilkan halaman maintenance
SHOW_BANNER_ADS            — Toggle banner ads
SHOW_INTERSTITIAL_ADS      — Toggle interstitial ads
```

**Cara Kerja:**
```go
// Backend: check feature flag
func IsEnabled(key string) bool {
    // Check Redis cache dulu
    // Fallback ke database
    // Fallback ke default (false) jika error
}
```

```typescript
// Frontend: check feature flag
const { data: flags } = useQuery({ queryKey: ['feature-flags'] });
if (flags?.ENABLE_DARK_MODE) { ... }
```

### 29.2 A/B Testing Framework (v1.1)

**Variabel yang akan di-test:**
- Posisi tombol "Main Sekarang" di game card
- Jumlah XP reward yang diberikan (apakah lebih banyak XP meningkatkan retention?)
- Timing interstitial ads (game over vs 3 detik setelah result screen)
- Onboarding flow panjang vs singkat

**Implementasi:**
- Deterministic assignment berdasarkan `hash(user_id + experiment_id) % 100`
- Track variant di GA4 events
- Analisis setelah 2 minggu data

---

## 30. Internationalization (i18n)

### 30.1 Bahasa yang Didukung

| Bahasa           | Code | Status    | Priority |
| ---------------- | ---- | --------- | -------- |
| Bahasa Indonesia | id   | Primary   | P0       |
| English          | en   | Secondary | P1       |

### 30.2 Implementasi

**Frontend:** `next-intl`
```
messages/
├── id.json    # Semua string dalam Bahasa Indonesia
└── en.json    # Semua string dalam English
```

**URL Structure:**
- Default (tanpa prefix): Bahasa Indonesia
- `/en/...`: English

**Game Content:**
- Wordle: Word list berbeda per bahasa (id: KBBI, en: common English words)
- Spelling Bee: Dictionary per bahasa
- Math / Logic: Bahasa soal mengikuti pilihan bahasa
- Geography: Nama negara dalam bahasa yang dipilih

**Language Switcher:**
- Tersedia di navbar dan settings
- Tersimpan di localStorage + user preferences (jika login)
- Default: detect dari browser `Accept-Language` header

### 30.3 Non-Translatable Content

- Username (selalu ASCII)
- Skor dan angka (universal)
- Bendera SVG (tidak ada teks)

---

## 31. Development Roadmap

### Phase 1 — Foundation (Minggu 1-3) ✅ Done

**Backend:**
- [x] Project setup: Fiber, GORM, Redis, config, logger
- [x] Database migrations (semua tabel)
- [x] Auth module: register, login, refresh, logout, forgot password
- [x] User module: profile, stats
- [x] Game module: list, detail, score submit (dengan validasi basic)
- [x] Seed data: 8 games master data
- [x] Docker compose untuk local dev

**Frontend:**
- [x] Next.js 16 setup + Tailwind + shadcn/ui + TypeScript
- [x] Design tokens (warna, typography, spacing)
- [x] Auth pages (login, register, forgot password)
- [x] Main layout (navbar desktop, bottom nav mobile)
- [x] Game Hub halaman (card grid, filter kategori)
- [x] API client setup (Axios + TanStack Query)
- [x] Auth state management (Zustand)

### Phase 2 — Core Games (Minggu 4-6) ✅ Done

**Games:**
- [x] Math Quiz Blitz (dengan timer, pilihan ganda, scoring)
- [x] 2048 (engine, swipe + keyboard, undo)
- [x] Wordle Bahasa Indonesia (engine, keyboard virtual, color feedback)
- [x] Sudoku (generator backtracking, grid UI, hint, keyboard navigation)

**Backend:**
- [x] Leaderboard module (Redis sorted set, per-game + global)
- [x] XP & level calculation service
- [x] Score anti-cheat (range check, rate limit, checksum)
- [x] Unit tests untuk game service & auth service

### Phase 3 — Remaining Games & Gamification (Minggu 7-9) ✅ Done

**Games:**
- [x] Times Table Challenge
- [x] Spelling Bee
- [x] Flag Quiz (195 bendera SVG)
- [x] Capital City Quiz

**Gamifikasi:**
- [x] Achievement system (evaluator + 10 achievement awal)
- [x] Daily Streak system
- [x] Daily Challenge (scheduler + UI)
- [x] Result screen (skor, XP, animasi highscore)
- [x] Level up modal + konfetti
- [x] Achievement toast

**Leaderboard UI:**
- [x] Leaderboard page (per-game + global)
- [x] User rank display
- [x] Weekly tab

### Phase 4 — Monetisasi, Notifikasi & PWA (Minggu 10-12) ✅ Partial

**Monetisasi:**
- [x] Google AdSense integration (banner — stub components siap)
- [x] Interstitial ads dengan frequency cap (stub)
- [x] Rewarded ads system (stub)
- [x] Ad placeholder components (agar ada space saat iklan load)

**Notifikasi:**
- [x] PWA manifest + service worker (next-pwa)
- [x] Push notification subscription
- [x] Daily reminder notification
- [x] Streak alert notification
- [x] In-app notification (achievement, level up)

**Polish:**
- [ ] Dark mode — belum diimplementasi
- [ ] Animasi (Framer Motion) — belum diimplementasi
- [x] Sound effects (toggle) — Web Audio API
- [ ] Onboarding flow — belum diimplementasi
- [x] Empty states
- [x] Error states
- [x] Loading states (skeleton)

### Phase 5 — Testing, Legal & Launch (Minggu 13-14) ⏳ In Progress

**Testing:**
- [x] Backend integration tests (partial — game service & auth)
- [x] Frontend unit tests (Vitest — 21 tests)
- [ ] E2E tests (critical flows) — belum diimplementasi
- [ ] Load testing (k6) — belum diimplementasi
- [ ] Manual QA (mobile + desktop) — belum dilakukan

**Legal & SEO:**
- [ ] Privacy Policy halaman — **P0 blocker untuk AdSense approval**
- [ ] Terms of Service halaman — **P0 blocker untuk AdSense approval**
- [ ] Cookie consent banner — **P0 blocker untuk AdSense/GDPR**
- [ ] About halaman — **P0 blocker untuk AdSense approval**
- [x] SEO meta tags, sitemap.xml, robots.txt
- [x] Structured data JSON-LD

**Deployment:**
- [ ] Staging deployment + testing
- [ ] Production deployment
- [x] Monitoring setup (Sentry, GA4) — konfigurasi siap
- [ ] CI/CD pipeline final
- [ ] DNS + SSL setup

**Launch:**
- [ ] Beta testing (50-100 user)
- [ ] Bug fix dari beta feedback
- [ ] Soft launch
- [ ] Pantau metrics 2 minggu pertama

---

### v1.1 Roadmap (Bulan 3-4) ✅ Done (dipercepat)

- [x] 3 game baru: Nonogram, Crossword Indonesia, Mental Arithmetic
- [x] Google OAuth login
- [ ] Ad mediation (Ad Manager)
- [ ] Remove ads subscription / IAP
- [ ] Blog section (konten SEO)
- [ ] Weekly email summary
- [ ] A/B testing framework

### v1.2 Roadmap (Bulan 5-6) ✅ Done (dipercepat)

- [x] 3 game baru: Element Quiz, Timeline History, Bubble Shooter Math
- [x] English language support penuh (i18n framework siap)
- [ ] Score sharing (WhatsApp, Instagram Stories)
- [ ] Near-rank leaderboard
- [x] Progress history chart (7-day XP graph di Profile)

### v1.3 Roadmap (Bulan 7-8) ✅ Done (dipercepat)

- [x] 4 game baru: Memory Match, Typing Speed, Simon Says, Snake Classic
- [x] Sound effects (Web Audio API)
- [x] Friends system (view friend list + per-user stats)
- [x] Support / bug reporting (in-app form + email notification via Resend)
- [x] Accessibility WCAG 2.1 AA (skip links, ARIA, reduced-motion)

### v2.0 Backlog (Prioritas)

| Feature | Priority | Notes |
| ------- | -------- | ----- |
| Privacy Policy + Terms + About pages | **P0** | Blocker untuk AdSense approval |
| Cookie consent banner | **P0** | Blocker untuk AdSense/GDPR |
| Dark mode | P1 | Framer Motion animations sekalian |
| Onboarding flow | P1 | First-time user experience |
| Score sharing (WhatsApp, Instagram) | P1 | Viral mechanic |
| Guest mode (main tanpa daftar) | P1 | Turunkan friction onboarding |
| Near-rank leaderboard | P2 | "Kamu rank #47, 23 poin di bawah rank #46" |
| Referral system | P2 | Kode referral → bonus XP |
| Number Match game | P2 | New logic game |
| Fraction Visualizer | P2 | New math game |
| Ad mediation (Ad Manager) | P2 | Maximize ad revenue |
| Remove ads subscription / IAP | P2 | Freemium monetization |
| Blog section | P3 | SEO content |
| Weekly email summary | P3 | Retention email |

---

## 32. Risks & Mitigations

| Risk                            | Probability | Impact   | Mitigation                                                                                                  |
| ------------------------------- | ----------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| AdSense approval ditolak        | Medium      | High     | Lengkapi legal pages, bangun organic traffic dulu, apply saat sudah ada 50+ unique pages                    |
| Claude API cost membengkak      | Medium      | Medium   | Cache 1 jam, rate limit 10 req/menit per user, set budget cap di Anthropic console                          |
| Low day-1 retention             | Medium      | High     | Onboarding yang engaging, daily challenge, push notification opt-in                                         |
| Score cheating merajalela       | Low         | Medium   | Server-side validation, anomaly detection, manual review queue                                              |
| Mobile performance buruk        | Low         | High     | Test di low-end device (Redmi 9, 2GB RAM, Android 10), lazy load, code split                                |
| Database cost scaling           | Low         | Medium   | Monitor query performance, index optimization, archive old sessions > 6 bulan                               |
| COPPA violation                 | Low         | Critical | Tidak targetkan user < 13 secara langsung, privacy policy yang jelas, parental consent flow jika diperlukan |
| Plagiasi konten game            | Low         | Medium   | Pastikan semua game engine ditulis sendiri, tidak copy code dari existing games                             |
| Konten AI yang tidak pantas     | Medium      | High     | System prompt yang ketat, output validation, manual review sample AI output setiap minggu                   |
| Redis down — leaderboard hilang | Low         | Medium   | Leaderboard bisa direkonstruksi dari PostgreSQL `user_highscores` tabel                                     |
| Viral traffic spike             | Low         | Medium   | Railway auto-scale, Redis caching, CDN untuk static assets                                                  |

---

## 33. Open Questions

| #   | Pertanyaan                                                                         | Owner       | Deadline   |
| --- | ---------------------------------------------------------------------------------- | ----------- | ---------- |
| 1   | Apakah ada anggaran iklan untuk user acquisition awal?                             | Business    | Pre-launch |
| 2   | Domain yang digunakan: eduplay.id atau alternatif?                                 | Business    | Week 1     |
| 3   | Apakah Wordle perlu mode multiplayer di v1?                                        | Product     | Week 2     |
| 4   | Username filter bahasa kasar — pakai library atau manual blacklist?                | Engineering | Week 2     |
| 5   | Daily challenge — apakah semua user dapat soal yang sama atau personalized?        | Product     | Week 3     |
| 6   | Bagaimana handle user yang ganti timezone? (Streak fairness)                       | Product     | Week 4     |
| 7   | Apakah perlu parent dashboard untuk pantau progress anak? (v1 atau v2?)            | Product     | Week 4     |
| 8   | Sound effects: buat sendiri atau beli asset?                                       | Design      | Week 5     |
| 9   | Wordle word list: 500 kata awal sudah cukup atau butuh lebih?                      | Content     | Week 5     |
| 10  | Apakah perlu halaman "Tentang" yang menjelaskan tim/company? (Perlu untuk AdSense) | Business    | Pre-launch |

---

## 34. Appendices

### Appendix A: XP & Level Formula

```
XP Earned per Game Session:
  questions_answered = jumlah soal yang dijawab
  accuracy_rate = soal_benar / questions_answered
  time_bonus = max(0, (max_time - time_taken) / max_time * 0.3)

  base_xp = score / 10  (rounded down)
  accuracy_bonus = base_xp * accuracy_rate * 0.2
  difficulty_multiplier = { easy: 1.0, medium: 1.5, hard: 2.0 }
  daily_bonus = 2.0 jika is_daily, 1.0 jika tidak

  xp_earned = (base_xp + accuracy_bonus) * difficulty_multiplier * daily_bonus
  xp_earned = min(xp_earned, MAX_XP_PER_GAME = 500)

Level Thresholds:
  Level 1:  0 XP
  Level 2:  100 XP
  Level 3:  300 XP
  Level 4:  600 XP
  Level 5:  1,000 XP
  Level N:  Level(N-1) + (N-1) * 200 XP

  Max Level: 50 (untuk v1)
```

### Appendix B: Achievement List v1

| Slug            | Nama            | Deskripsi                                         | Trigger                                 | XP   |
| --------------- | --------------- | ------------------------------------------------- | --------------------------------------- | ---- |
| first-game      | Langkah Pertama | Main game pertama kali                            | games_played >= 1                       | 50   |
| streak-3        | Konsisten       | Streak 3 hari berturut-turut                      | streak >= 3                             | 100  |
| streak-7        | Seminggu Penuh  | Streak 7 hari                                     | streak >= 7                             | 300  |
| streak-30       | Dedikasi Tinggi | Streak 30 hari                                    | streak >= 30                            | 1000 |
| math-master     | Math Master     | Skor 500+ di Math Quiz (hard)                     | score >= 500, game=math-quiz, diff=hard | 300  |
| wordle-genius   | Wordle Genius   | Tebak Wordle dalam 2 percobaan                    | games, game=wordle, attempts <= 2       | 300  |
| wordle-champion | Wordle Champion | Selesaikan 50 game Wordle                         | games_played >= 50 (wordle)             | 500  |
| sudoku-solver   | Sudoku Solver   | Selesaikan Sudoku tanpa hint                      | sudoku complete, hints_used = 0         | 400  |
| daily-5         | Daily Warrior   | Complete 5 daily challenge                        | daily_completed >= 5                    | 200  |
| daily-30        | Daily Champion  | Complete 30 daily challenge                       | daily_completed >= 30                   | 1000 |
| top-10          | Elite Player    | Masuk top 10 leaderboard game apapun              | rank <= 10                              | 500  |
| level-5         | Naik Kelas      | Capai Level 5                                     | level >= 5                              | 0    |
| level-10        | Pelajar Sejati  | Capai Level 10                                    | level >= 10                             | 0    |
| explorer        | Explorer        | Coba semua 8 game                                 | all_games_played = true                 | 300  |
| 2048-master     | 2048 Master     | Capai tile 2048                                   | max_tile >= 2048                        | 500  |
| speed-demon     | Speed Demon     | Jawab 10 soal Math berturut-turut dalam < 3 detik | streak_fast >= 10                       | 400  |

### Appendix C: Browser & Device Support Matrix

| Browser / OS        | Minimum Version | Supported       |
| ------------------- | --------------- | --------------- |
| Chrome Android      | 90+             | ✅ Full          |
| Safari iOS          | 14+             | ✅ Full          |
| Chrome Desktop      | 90+             | ✅ Full          |
| Firefox Desktop     | 88+             | ✅ Full          |
| Safari Desktop      | 14+             | ✅ Full          |
| Samsung Internet    | 14+             | ✅ Full          |
| Edge                | 90+             | ✅ Full          |
| Chrome Android < 90 | -               | ⚠️ Basic         |
| IE 11               | -               | ❌ Not supported |

**PWA Installation Support:**
- Chrome Android: ✅ Full (Add to Home Screen)
- Safari iOS: ✅ Partial (Add to Home Screen, no push notifications)
- Chrome Desktop: ✅ Full

**Minimum Device Requirements:**
- RAM: 1GB
- CPU: Octa-core 1.5GHz atau lebih
- Screen: 320px minimum width
- OS: Android 8+, iOS 12+

### Appendix D: Data Flow Diagram — Score Submit

```
User selesai game
        │
        ▼
Frontend kalkulasi skor + generate checksum
(checksum = HMAC-SHA256(user_id+game_id+score+timestamp, client_secret))
        │
        ▼
POST /api/v1/games/:slug/score
  { score, duration, difficulty, checksum }
        │
        ▼
Backend middleware: JWT validation
        │
        ▼
Game Service:
  1. Validasi checksum
  2. Range check skor
  3. Duration check
  4. Rate limit check (Redis: 1 submit/30 detik)
  5. Anomaly detection (bandingkan dengan median)
        │
   ┌────┴────┐
   │ Invalid │ → Return 400 / 429
   └─────────┘
        │ Valid
        ▼
Database Transaction:
  1. INSERT game_sessions
  2. UPSERT user_highscores (jika skor > highscore lama)
  3. UPDATE users SET xp = xp + xp_earned
  4. UPDATE users SET level jika XP threshold tercapai
        │
        ▼
Async (goroutine):
  1. Achievement evaluator — cek semua trigger
  2. Leaderboard update — Redis ZADD
  3. Push notification jika level up
        │
        ▼
Response:
  { session_id, xp_earned, new_highscore, achievements_unlocked, level_up }
```

### Appendix E: Makefile Commands

```makefile
# Backend
make dev          # Jalankan dengan hot reload (air)
make test         # Jalankan semua test
make coverage     # Test + coverage report
make build        # Build production binary
make migrate      # Jalankan database migrations
make seed         # Seed data awal
make lint         # Jalankan golangci-lint
make docker-up    # Jalankan docker compose
make docker-down  # Stop docker compose

# Frontend
make fe-dev       # next dev
make fe-build     # next build
make fe-test      # jest
make fe-e2e       # playwright test
make fe-lint      # eslint

# General
make setup        # Install semua dependencies
make clean        # Hapus build artifacts
```

---

## 35. PRD Sync Policy

**Aturan:** Dokumen ini harus selalu mencerminkan keputusan implementasi aktual. Jika development mengubah ketentuan di PRD ini, update dokumen ini sekalian — sebagai bagian dari PR/commit yang sama.

### Kapan PRD harus diupdate

| Perubahan | Tindakan |
| --------- | -------- |
| Menambah / menghapus / merename game atau fitur | Update section 8 (Game Catalog) + Roadmap |
| Mengubah priority (P0/P1/P2) | Update tabel di section relevan + v2.0 Backlog |
| Mengubah versi tech stack atau library | Update section 15 (Technical Architecture) |
| Memindahkan sesuatu antara "In Scope" dan "Out of Scope" | Update section 3 (Product Overview) |
| Mengubah struktur navigasi (tabs, routes) | Update section 7 (Features) dan UX section |
| Mengubah formula skor, XP, atau mekanik game | Update section 8 (game spec) + Appendix A |
| Menambah endpoint yang belum ada di API spec | Update section 17 (API Specification) |
| Mengubah database schema | Update section 16 (Database Schema) |

### File PRD

- `PRD_EduPlay_v2.md` — **master spec** (selalu update ini dulu)
- `PRD_Addendum_Multiplayer_Bot.md` — multiplayer + bot system
- `PRD_Addendum_Multiplayer_Games.md` — game multiplayer tambahan
- `PRD.md` — deprecated v1 (jangan diedit, referensi historis)

---

*Dokumen ini adalah living document. Setiap perubahan signifikan harus di-review oleh Product Lead dan Tech Lead sebelum diimplementasikan.*

*Last Updated: 2026-05-20 | Version: 2.0.0*