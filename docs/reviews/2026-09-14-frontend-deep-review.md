# Deep Review: Frontend — Perubahan Belum Commit (apps/web)

**Tanggal:** 14 September 2026 (diperbarui 15 September 2026)
**Status:** #1-15 sudah diperbaiki (lihat tabel di bawah). #16 tetap informasional, tidak perlu fix kode.
**Scope:** Seluruh working-tree diff `apps/web` (28 file modified + 6 file/folder baru), fokus pada game baru **Bastion Siege**, sistem suara/haptic baru, `favoritesStore`, dan refactor ref/hook di beberapa game realtime.
**Metode:** Multi-angle review (correctness, reuse/duplikasi, simplification, efficiency, cross-file tracing, konvensi) pada level _high_, seluruh temuan di bawah ini diverifikasi manual dengan membaca source langsung (bukan sekadar hasil mentah agent).

File yang diperiksa langsung: `BastionSiege.tsx` (baru, ~1000 baris), `favoritesStore.ts` (baru), `GameCard.tsx`, `soundStore.ts`, `haptics.ts`, `useGame.ts`, `Onet.tsx`, `fraction-visualizer/page.tsx`, `chess/page.tsx`, `wordle-duel/page.tsx`, `games/page.tsx`, `profile/settings/page.tsx`, plus `.prettierrc` project.

---

## Ringkasan Eksekutif

Diff ini secara umum solid — refactor `useGame.ts` (destructuring field dari store alih-alih depend ke seluruh objek) itu perbaikan yang benar dan jadi prasyarat aman untuk beberapa `useEffect` lain di diff ini. Tapi ada **5 bug kritis** yang perlu diperbaiki sebelum merge, dua di antaranya ada di game baru **Bastion Siege** (double score submission, mekanik `chainHp` yang mati total), satu regresi timer di **Onet** yang ironisnya adalah bug yang sama persis yang sudah diperbaiki dengan benar di `trivia-challenge` pada diff yang sama — polanya cuma tidak ditiru ke Onet.

Root cause yang berulang di banyak temuan: **tidak ada `useLatestRef` hook bersama**. Pola "mirror state ke ref supaya closure di WebSocket/interval/RAF selalu baca nilai terbaru" ditulis ulang secara manual di 4+ file dengan hasil tidak konsisten — salah satunya (Onet) lupa menerapkannya.

---

## Ringkasan Temuan

| #   | Severity     | File                                                       | Masalah                                                                                 | Status                                      |
| --- | ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | 🔴 Kritis    | `Onet.tsx:125`                                             | Countdown timer berhenti selama pemain aktif mencetak skor                              | ✅ Fixed                                    |
| 2   | 🔴 Kritis    | `BastionSiege.tsx:646`                                     | Skor bisa ke-submit dua kali (double `handleGameOver`)                                  | ✅ Fixed                                    |
| 3   | 🔴 Kritis    | `BastionSiege.tsx:67,267,536`                              | `chainHp` dideklarasikan tapi tidak pernah dipakai — rantai barrel putus di hit pertama | ✅ Fixed (dihapus, lihat §1.3)              |
| 4   | 🔴 Kritis    | `fraction-visualizer/page.tsx:146`                         | Ganti difficulty men-trigger `init()` dua kali                                          | ✅ Fixed                                    |
| 5   | 🔴 Kritis    | `soundStore.ts:49-59`                                      | Envelope gain audio terbalik (naik, bukan fade-out) di volume rendah                    | ✅ Fixed                                    |
| 6   | 🟠 Sedang    | `BastionSiege.tsx:175-230`                                 | `playSfx` tidak menghormati toggle Sound/Volume/Haptics di Settings                     | ✅ Fixed                                    |
| 7   | 🟠 Sedang    | `BastionSiege.tsx:984`                                     | `isNewHighscore` tidak diteruskan ke `ResultScreen`                                     | ✅ Fixed                                    |
| 8   | 🟠 Sedang    | `BastionSiege.tsx:497-574`                                 | 1 proyektil bisa kena pillar+barrel+enemy sekaligus dalam 1 tick                        | ✅ Fixed                                    |
| 9   | 🟠 Sedang    | `chess/page.tsx:190`                                       | Dua penulis independen untuk `isPlaying` global (redundant + jebakan laten)             | ✅ Fixed                                    |
| 10  | 🟡 Efisiensi | `soundStore.ts:37`, `BastionSiege.tsx:179`                 | `AudioContext` baru tiap panggil, tidak pernah `.close()`                               | ✅ Fixed                                    |
| 11  | 🟡 Efisiensi | `GameCard.tsx:14`                                          | `useFavoritesStore()` tanpa selector → semua card re-render tiap toggle                 | ✅ Fixed                                    |
| 12  | 🔵 Reuse     | 3 file game realtime                                       | Pola ref-mirror di-_hand-copy_, tidak ada `useLatestRef`                                | ✅ Fixed (`lib/hooks/useLatestRef.ts`)      |
| 13  | 🔵 Reuse     | `soundStore`, `BastionSiege`, `GridRelayTD`, `VectorSlash` | 3-4 implementasi oscillator Web Audio independen                                        | ✅ Fixed (`lib/utils/audioSynth.ts`)        |
| 14  | 🔵 Reuse     | `profile/settings/page.tsx`                                | Toggle switch di-copy-paste 4×                                                          | ✅ Fixed (`components/ui/ToggleSwitch.tsx`) |
| 15  | ⚪ Minor     | `favoritesStore.ts:27`                                     | Key persist `eduplay_favorites` tidak ikuti konvensi `-storage`                         | ✅ Fixed (`favorites-storage`)              |
| 16  | ⚪ Konvensi  | Semua file baru                                            | Aturan global prettier kamu **bertentangan** dengan `.prettierrc` project ini           | Informasional, tidak perlu fix kode         |

**Catatan #3:** dead field `chainHp` dihapus, bukan diimplementasikan sebagai mekanik multi-hit — karena nilai damage-per-hit yang "benar" adalah keputusan desain/balance game yang bukan wewenang saya untuk menebak. Kalau kamu memang mau chain butuh beberapa hit untuk putus, bilang saja, nanti diimplementasikan dengan nilai yang kamu tentukan.

**Catatan #12:** akhirnya tetap diekstrak jadi `apps/web/lib/hooks/useLatestRef.ts` dan dipakai di 4 file (Onet, sudoku-race, wordle-duel [5 ref], trivia-challenge) — atas permintaan eksplisit, sadar akan trade-off-nya. Karena ESLint `exhaustive-deps` tidak mengenali ref dari custom hook sebagai stabil (beda dengan `useRef()` langsung), setiap `useEffect`/`useCallback` yang memakai ref ini butuh `// eslint-disable-next-line react-hooks/exhaustive-deps` tepat di atas baris dependency array-nya (5 komentar total). Baris komentar harus persis di atas baris array `[...]`-nya, bukan di atas `}` penutup — kalau formatter memecah `useCallback` jadi multi-baris, taruh di tempat yang salah bikin ESLint melaporkan "unused eslint-disable directive" plus warning aslinya tetap muncul (sempat kejadian di `wordle-duel`'s `handleKey`, sudah diperbaiki).

**Catatan #13:** dibuat `apps/web/lib/utils/audioSynth.ts` dengan satu fungsi `playTone(soundEnabled, volume, configure)` yang menangani AudioContext creation, connect, dan `onended`-close secara terpusat. Setiap pemanggil (soundStore, BastionSiege, GridRelayTD, VectorSlash) cuma mengirim callback `configure` berisi kurva frekuensi/gain masing-masing suara (dipindah verbatim, bukan ditulis ulang, supaya tidak ada risiko salah transkrip nada). Efek samping bonus: `GridRelayTD.playSynthesizedTone` dan `VectorSlash.playSfx` sebelumnya **juga** bypass toggle Sound/Volume di Settings (bug yang sama seperti #6) — sekarang ikut kepatch karena keduanya lewat `playTone` yang sudah mengecek `soundEnabled`/`volume`.

**Catatan #14:** komponen baru `apps/web/components/ui/ToggleSwitch.tsx` (props: `checked`, `onClick`, `loading?`, `disabled?`) menggantikan 4 blok switch yang di-copy-paste di `profile/settings/page.tsx`. Label/deskripsi teks dan spacing antar-section tetap di halaman induknya — cuma elemen switch-nya sendiri yang diekstrak.

---

## 1. Bug Kritis

### 1.1 Timer Onet berhenti saat pemain aktif bermain — `Onet.tsx:101-125`

```tsx
const finishGame = useCallback((finalScore: number) => {
  setGameOver(true);
  endGame();
  submitScore(finalScore);
}, [endGame, submitScore]);

useEffect(() => {
  if (!isPlaying || gameOver || paused || timer <= 0) return;
  timerRef.current = setInterval(() => {
    setTimer((prev) => { ... });
  }, 1000);
  return () => clearInterval(timerRef.current!);
}, [isPlaying, gameOver, paused, timer, finishGame]); // <- finishGame baru ditambahkan
```

**Rantai sebabnya** (sudah ditelusuri sampai ke sumbernya):
`submitScore` (`useGame.ts:15-68`) punya dependency `score` — field global dari `useGameStore`. Onet memanggil `addScore(pts)` di setiap match tile yang berhasil, yang mengubah `score` global itu. Setiap `score` berubah → identitas `submitScore` berubah → identitas `finishGame` berubah → `useEffect` di atas (yang sekarang depend ke `finishGame`) melakukan cleanup+rebuild `setInterval` dari nol.

**Akibat:** kalau pemain mencocokkan ubin lebih cepat dari 1x/detik (sangat umum di game matching), interval selalu di-_restart_ sebelum sempat men-tick 1000ms penuh. Countdown di layar **berhenti terlihat** selama pemain aktif main, padahal `timeLimit` seharusnya jalan terus.

Ironisnya, **pola yang benar sudah ada di diff yang sama**: `trivia-challenge/page.tsx` menghadapi masalah identik (`handleTimeout` yang unstable) dan diperbaiki pakai `handleTimeoutRef` — ref yang di-assign ulang tiap render, dibaca dari dalam interval tanpa masuk dependency array. Onet tidak mendapat perlakuan yang sama.

**Saran fix:** terapkan pola yang sama seperti trivia-challenge — simpan `finishGame` ke ref, dan hilangkan `finishGame` dari dependency array effect:

```tsx
const finishGameRef = useRef(finishGame);
finishGameRef.current = finishGame;
// di dalam interval: finishGameRef.current(scoreRef.current);
// deps effect: [isPlaying, gameOver, paused, timer]  // tanpa finishGame
```

### 1.2 Skor Bastion Siege bisa ke-submit dua kali — `BastionSiege.tsx:612-648`

```tsx
for (const e of enemiesRef.current) {
  ...
  if (e.x <= 120 && !e.isFalling) {
    bastionHpRef.current -= e.isGiant ? 35 : 15;
    ...
    if (bastionHpRef.current <= 0) {
      handleGameOver();          // <- tidak ada guard re-entry
    }
  }
}
```

`handleGameOver` (`:278-287`) set `isPlayingRef.current = false` secara sinkron di baris pertama, tapi loop `for (const e of enemiesRef.current)` **tidak berhenti** dan tidak mengecek flag itu — ia terus memproses enemy berikutnya dalam iterasi yang sama. Kalau 2 musuh sama-sama mencapai `e.x <= 120` di tick fisika yang sama (plausible saat _wave_ berat / _giant_ + _scout_ datang bareng), musuh pertama menjatuhkan HP ke ≤0 dan memanggil `handleGameOver()`, lalu musuh kedua di iterasi berikutnya **masih** melihat kondisi `bastionHpRef.current <= 0` dan memanggil `handleGameOver()` lagi → `submitScore` + `endGame` terpanggil dua kali.

**Saran fix:** tambahkan guard, misal `gameOverTriggeredRef`:

```tsx
if (bastionHpRef.current <= 0 && !gameOverTriggeredRef.current) {
  gameOverTriggeredRef.current = true;
  handleGameOver();
}
```

### 1.3 `chainHp` mati total — barrel jatuh di hit pertama — `BastionSiege.tsx:67, 267-268, 536-541`

```ts
interface Barrel { ...; chainHp: number; }
// init: chainHp: 20
...
if (Math.abs(p.x - b.pulleyX) < 12 && p.y >= b.pulleyY && p.y <= b.y) {
  b.isFalling = true;   // langsung jatuh, chainHp tidak pernah dibaca/dikurangi
  ...
}
```

Sudah dikonfirmasi via `grep`: `chainHp` cuma muncul di deklarasi tipe dan inisialisasi — **tidak ada satu pun tempat lain yang membaca atau mengurangi nilainya**. Data model menyiratkan rantai butuh beberapa hit untuk putus (HP 20), tapi kode sebenarnya memutuskan rantai di kontak pertama, berapa pun sisa `chainHp`-nya.

**Saran fix:** pilih salah satu — (a) implementasikan: `b.chainHp -= dmg; if (b.chainHp <= 0) b.isFalling = true;`, atau (b) kalau memang didesain 1-hit, hapus field `chainHp` yang tidak terpakai supaya tidak menyesatkan pembaca berikutnya.

### 1.4 Ganti difficulty di Fraction Visualizer memicu init dua kali — `fraction-visualizer/page.tsx:146,199-202`

```tsx
useEffect(() => { init(); }, [init]);   // sebelumnya: useEffect(() => init(), [])
...
<button onClick={() => { setDifficulty(d); init(); }}>...
```

`init` adalah `useCallback` yang depend ke `difficulty`. Saat tombol difficulty diklik: `init()` dipanggil manual dengan closure `difficulty` lama, lalu re-render membuat identitas `init` berubah (karena `difficulty` sudah baru) → effect `[init]` ikut menembak `init()` lagi dengan `difficulty` baru. Hasilnya `startGame()`, `analytics.gameStarted`, dan generate soal terpanggil **dua kali** per klik ganti difficulty (event analytics dobel, kerja sia-sia).

**Saran fix:** kembalikan ke mount-only `useEffect(() => { init(); }, [])` — pemanggilan eksplisit di `onClick` sudah cukup untuk kasus ganti difficulty.

### 1.5 Envelope volume audio terbalik di volume rendah — `soundStore.ts:49-50, 58-59`

```ts
gainNode.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); // target TIDAK dikali volume
```

Nilai awal gain diskalakan dengan `volume` baru (fitur ini), tapi target ramp-down (`0.01`) dibiarkan konstan. Kalau user set Volume Master 5% (`0.1 × 0.05 = 0.005`), target ramp (`0.01`) jadi **lebih besar** dari nilai awal → `exponentialRampToValueAtTime` menaikkan gain alih-alih fade-out. Sound `click`/`pop` jadi makin kencang tepat sebelum berhenti — glitch yang baru muncul karena fitur volume ini. Sound `correct`/`wrong` (pakai `linearRampToValueAtTime`) kena masalah sama di bawah ambang tertentu.

**Saran fix:** skalakan target ramp juga, dengan floor kecil (exponential ramp tidak boleh target 0):

```ts
const target = Math.max(0.0001, 0.01 * volume);
gainNode.gain.exponentialRampToValueAtTime(target, ctx.currentTime + 0.1);
```

---

## 2. Bug Sedang (UX / Konsistensi)

### 2.1 `playSfx` di Bastion Siege bypass semua pengaturan suara — `BastionSiege.tsx:175-230`

Diff yang sama menambahkan halaman Settings dengan toggle "Efek Suara (SFX)", slider Volume, dan toggle Haptics — semuanya membaca/menulis `useSoundStore`. Tapi `playSfx` (dipakai untuk launch, rock impact, bridge snap, barrel explode, gate hit — nyaris semua suara gameplay Bastion Siege) adalah implementasi Web Audio lokal yang **tidak pernah memanggil `useSoundStore.getState()`**. User yang mematikan SFX atau menurunkan volume ke 0 di Settings tetap mendengar semua suara Bastion Siege di volume penuh.

**Saran fix:** paling bersih — perluas union type `playSound` di `soundStore.ts` dengan 5 efek baru ini dan hapus `playSfx` lokal, supaya cuma ada satu pipeline audio dan satu titik kontrol setting. Alternatif minimal: cek `useSoundStore.getState().soundEnabled/volume` di awal `playSfx`.

### 2.2 `isNewHighscore` tidak diteruskan — `BastionSiege.tsx:984-991`

```tsx
<ResultScreen
  score={score}
  xpEarned={result.xp}
  gameSlug="bastion-siege"
  gameName="Bastion Siege"
  onReplay={() => handleStart('easy')}
  description={t('game.over')}
/>
```

`result.new_highscore` sudah diambil dari response submit score (`:285`) dan disimpan di state, tapi tidak pernah dikirim ke `ResultScreen`. Cek `grep isNewHighscore` menunjukkan **18 game lain** (MathQuiz, Sudoku, Wordle, Game2048, dst.) semuanya meneruskan `isNewHighscore={result.highscore}` — ini konvensi yang konsisten di seluruh codebase. `ResultScreen.tsx:173` merender banner selebrasi kalau prop ini true. Bastion Siege jadi satu-satunya game yang tidak menampilkan banner high-score baru.

**Saran fix:** `isNewHighscore={result.new_highscore}` — perhatikan juga penamaan field API-nya beda (`new_highscore` vs konvensi field `highscore` di game lain), pastikan konsisten dengan response backend yang sebenarnya.

### 2.3 Satu proyektil bisa kena 3 tipe entitas sekaligus — `BastionSiege.tsx:497-574`

```tsx
if (p && p.active) {              // <- cek p.active cuma sekali di sini
  ...
  for (const pil of pillarsRef.current) { if (...) { p.active = false; ... break; } }
  for (const b of barrelsRef.current)   { if (!b.exploded) { ... p.active = false; ... } }  // tidak cek p.active
  for (const e of enemiesRef.current)   { if (...) { ... p.active = false; ... } }          // tidak cek p.active
}
```

Setelah loop pillar men-set `p.active = false`, loop barrel dan loop enemy tetap jalan penuh karena keduanya tidak mengecek ulang `p.active` — mereka hanya mengecek kondisi entitasnya sendiri (`!b.exploded`, jarak ke enemy). Kalau posisi proyektil kebetulan overlap dengan hit-box lebih dari satu tipe entitas di tick yang sama (masuk akal di sekitar ambang barrel jatuh `y>=295`, persis di bawah `pillar.topY=300`), satu proyektil bisa memberi damage ke pillar **dan** meledakkan barrel **dan/atau** mengenai enemy sekaligus.

**Saran fix:** bungkus setiap loop berikutnya dengan `if (p.active) { ... }`, atau restrukturisasi jadi satu resolver yang berhenti begitu ada hit pertama.

### 2.4 Dua penulis independen untuk `isPlaying` global — `chess/page.tsx:183-200`

```tsx
onSuccess: (data) => {
  ...
  setScreen('playing');
  useGameStore.getState().setPlaying(true);   // <- manual, redundant
},
...
useEffect(() => {
  useGameStore.getState().setPlaying(screen === 'playing');  // <- sudah otomatis dari screen
  return () => useGameStore.getState().setPlaying(false);
}, [screen]);
```

`createMutation.onSuccess` (mode vs-bot) memanggil `setPlaying(true)` secara manual **setelah** `setScreen('playing')` — padahal `useEffect` yang di-key oleh `screen` sudah otomatis melakukan hal yang sama. Terbukti redundant karena `quickMatchMutation.onSuccess` (path multiplayer, baris 202+) **tidak** punya panggilan manual serupa dan tetap benar, karena mengandalkan effect saja.

Ini bukan bug aktif hari ini (effect menang), tapi jebakan laten: kalau suatu saat effect ini dihapus/diubah dengan asumsi panggilan manual di `onSuccess` itu authoritative, path non-bot (quickMatch, resign, game-over) tidak akan pernah men-set `isPlaying=false` dengan benar → `MobileNav`/padding di `layout.tsx` bisa nyangkut.

**Saran fix:** hapus baris `useGameStore.getState().setPlaying(true)` di `onSuccess`, biarkan effect jadi satu-satunya sumber kebenaran.

---

## 3. Efisiensi & Resource Leak

### 3.1 `AudioContext` bocor — tidak pernah `.close()` — `soundStore.ts:37`, `BastionSiege.tsx:179`

Baik `playSound` (dipakai semua game) maupun `playSfx` baru di Bastion Siege membuat `new AudioContext()`/`new AudioCtx()` di **setiap panggilan**, dan tidak pernah memanggil `ctx.close()`. `playSfx` terpicu nyaris di setiap event fisika (pillar hit, ledakan barrel, gate hit) — bisa beberapa kali per detik saat wave berat. Browser membatasi jumlah `AudioContext` aktif bersamaan; sesi bermain beberapa menit bisa mengakumulasi cukup banyak untuk memicu audio glitch/silent dan native memory yang terus naik selama tab terbuka.

**Saran fix:** pakai satu `AudioContext` singleton per halaman/komponen (dibuat sekali, di-_resume_ saat user gesture pertama) alih-alih instansiasi baru tiap bunyi; atau minimal `osc.onended = () => ctx.close();`.

### 3.2 `GameCard` re-render semua card tiap toggle favorit — `GameCard.tsx:14`

```tsx
const { isFavorite, toggleFavorite } = useFavoritesStore(); // subscribe ke seluruh store
```

Tanpa selector, **setiap** `GameCard` yang ter-mount subscribe ke seluruh objek `favorites`. `toggleFavorite` selalu membuat array baru (`favoritesStore.ts:19,21`), jadi klik satu hati me-re-render semua card yang sedang tampil (grid kategori + hasil pencarian + section favorit baru di `games/page.tsx`), bukan cuma card yang berubah.

**Saran fix:** pakai selector granular, konsisten dengan pola yang sudah ada di `useAuthStore((s) => s.user)`:

```tsx
const favorited = useFavoritesStore((s) => s.favorites.includes(game.slug));
const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
```

---

## 4. Duplikasi & Reuse (utang teknis, bukan bug)

Ini bukan bug hari ini, tapi pola berulang yang jadi sumber bug berikutnya (lihat §1.1 — Onet kena karena pola ini tidak konsisten diterapkan).

| Temuan                                         | Lokasi                                                                                                                    | Catatan                                                                                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tidak ada `useLatestRef` hook                  | `sudoku-race/page.tsx:122-123`, `wordle-duel/page.tsx:135-146` (5 ref!), `trivia-challenge/page.tsx` (`handleTimeoutRef`) | Pola `const xRef = useRef(x); xRef.current = x;` ditulis manual di 3 file berbeda. Satu hook kecil di `apps/web/lib/hooks/useLatestRef.ts` akan menghilangkan duplikasi ini sekaligus mencegah kasus seperti Onet.    |
| 3-4 implementasi oscillator Web Audio terpisah | `soundStore.playSound`, `BastionSiege.playSfx`, kemungkinan pola serupa di `GridRelayTD`/`VectorSlash`                    | Boilerplate `createOscillator`/`createGain`/ramp nyaris identik di tiap tempat. Helper `synthesizeTone(ctx, {type, freqFrom, freqTo, gain, duration})` bersama akan menyelesaikan ini + temuan §2.1 + §3.1 sekaligus. |
| Toggle switch 4× copy-paste                    | `profile/settings/page.tsx` (SFX, Haptics, Push, Weekly email — baris ~180-336)                                           | Markup `role="switch"` ~15 baris diulang 4×; 2 toggle lama punya state loading, 2 toggle baru tidak — sudah mulai drift. Ekstrak `<ToggleSwitch checked loading? onChange />`.                                        |

---

## 5. Catatan Minor

### 5.1 Key persist `favoritesStore` tidak ikuti konvensi — `favoritesStore.ts:27`

Store lain: `auth-storage`, `sound-storage`, `eduplay-theme` — semua kebab-case. `favoritesStore` pakai `eduplay_favorites` (snake_case, prefix beda). Tidak bug, tapi karena store ini belum pernah dirilis ke user manapun (masih uncommitted), sekarang momen paling murah untuk menyamakan jadi `favorites-storage` sebelum ada data ter-persist di localStorage user.

### 5.2 Aturan prettier global kamu bertentangan dengan `.prettierrc` project ini

`.prettierrc` di root repo ini:

```json
{ "tabWidth": 2, "singleQuote": true } // jsxSingleQuote tidak di-set -> default false (JSX pakai ")
```

Sementara `~/.claude/rules/prettier-formatting.md` (aturan global kamu, berlaku "for all projects") minta **4-space indent**, **single quote untuk JSX**, **double quote untuk string JS/TS** — persis kebalikan dari project ini di ketiga aspek. Semua file baru di diff ini (`BastionSiege.tsx`, `favoritesStore.ts`, dll.) sudah konsisten dengan `.prettierrc` project (2-space, single-quote import, double-quote JSX) — jadi **bukan pelanggaran di kode**, tapi tanda aturan global itu ditulis untuk project lain dan akan terus salah kalau dipakai literal di sini. Sekadar informasi untuk kamu putuskan — mau di-scope per-project atau dibiarkan.

---

## 6. Yang Sudah Benar (tidak perlu diubah)

- `useGame.ts` — destructuring field store alih-alih depend ke seluruh objek adalah perbaikan yang tepat, bukan sekadar gaya; ini yang membuat `useEffect(() => init(), [init])` di `number-match/page.tsx` aman (beda dengan fraction-visualizer di §1.4, karena `init`-nya cuma depend ke `startGame` yang stabil).
- `wordle-duel/page.tsx` — migrasi `grid`/`colors`/`currentRow`/`currentCol` ke ref sudah benar; JSX tetap baca state asli, ref cuma dipakai di handler WebSocket.
- `trivia-challenge/page.tsx` — pola `handleTimeoutRef` adalah cara yang **benar** untuk masalah yang sama persis dengan §1.1; harusnya jadi acuan untuk fix Onet.
- RAF loop Bastion Siege — `cancelAnimationFrame` dipanggil dengan benar saat cleanup, tidak ada layout thrashing (`getBoundingClientRect` cuma di pointer handler, bukan di loop fisika).
- Tidak ada pelanggaran arrow-function-parens, semicolon, atau trailing-comma di seluruh diff — bagian dari `.prettierrc` yang konsisten diikuti.

---

## Rekomendasi Prioritas

1. **Sebelum merge:** fix #1-#5 (bug kritis) — terutama #1 dan #2 karena langsung mempengaruhi fairness gameplay dan integritas skor.
2. **Sebelum rilis Bastion Siege ke user:** fix #6-#8 (playSfx bypass settings, isNewHighscore, projectile multi-hit) — user-facing, gampang ketahuan.
3. **Boleh menyusul (follow-up PR):** #9-#11 (chess dual-writer, AudioContext leak, GameCard selector).
4. **Kalau ada waktu luang:** ekstrak `useLatestRef` + `synthesizeTone` + `<ToggleSwitch>` (§4) — ini investasi kecil yang mencegah kelas bug yang sama muncul lagi di game berikutnya.

---

## 7. Babak Tambahan: Review `VectorSlash.tsx` & `GridRelayTD.tsx` (15 September 2026)

Game baru lain yang ditambahkan bareng Bastion Siege (14-15 Sept) — belum pernah direview penuh sebelumnya, cuma disentuh sebagian waktu dedup audio (§13). Semua temuan di bawah **sudah diverifikasi manual dan diperbaiki**.

Sekalian dicek wiring end-to-end seluruh 42 game: route frontend ↔ `games-seo.ts` ↔ backend `seedGames()` (`services/api/cmd/main.go`) — **cocok persis 42/42/42**, tidak ada yang bolong.

| #   | Severity  | File                                                     | Masalah                                                                                                                                                                                                      | Status                                 |
| --- | --------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 17  | 🔴 Kritis | `GridRelayTD.tsx:722`                                    | Kill-check turret scan seluruh array enemy, bukan cuma target yang baru kena hit → skor/ledakan/sound bisa dobel kalau 2+ turret nembak di frame yang sama                                                   | ✅ Fixed                               |
| 18  | 🔴 Kritis | `GridRelayTD.tsx:864`                                    | Enemy yang nyampe base di-set `hp=0` tapi baru dibersihkan 1 frame kemudian → turret lain bisa salah klaim itu sebagai kill-nya sendiri                                                                      | ✅ Fixed (root cause sama dengan #17)  |
| 19  | 🟠 Sedang | `GridRelayTD.tsx:327`                                    | Klik cell yang sudah ada turret selalu di-intercept jadi "select turret", bahkan di mode cable — jadi tidak bisa menyambung kabel langsung dari satu turret ke turret sebelahnya                             | ✅ Fixed                               |
| 20  | 🟠 Sedang | `VectorSlash.tsx:441`                                    | Handler keydown global buat dodge (Space/Shift) tidak dicek `isPlaying`/`isPaused`, beda dengan semua pointer handler di file yang sama — dodge bisa ke-trigger di menu/pause                                | ✅ Fixed                               |
| 21  | 🟠 Sedang | `VectorSlash.tsx:552`, `BastionSiege.tsx:502`            | `waveRef` diinisialisasi 1 dan dipakai buat mempercepat spawn enemy, tapi **tidak pernah di-increment** di kedua file — ramp kesulitan mati total, susah main tetap sama dari detik pertama sampai kapan pun | ✅ Fixed (kedua file)                  |
| 22  | 🔵 Reuse  | `GridRelayTD.tsx`, `VectorSlash.tsx`, `BastionSiege.tsx` | Scaling koordinat pointer→canvas (`getBoundingClientRect`+`scaleX`/`scaleY`) diulang 6× di 3 file                                                                                                            | ✅ Fixed (`lib/utils/canvasCoords.ts`) |

**Catatan #17/#18:** akar masalahnya sama — kill-scoring dilakukan lewat scan generik "enemy mana saja yang HP-nya ≤0" setelah setiap turret nembak, bukan dicek spesifik ke target yang baru kena damage. Fix-nya: `enemiesInRange` sekarang exclude enemy yang sudah mati (`e.hp > 0`), dan scoring/ledakan/sound dipindah jadi fungsi `applyKill(target)` yang dipanggil tepat setelah damage diberikan ke target spesifik itu — bukan scan ulang seluruh array. Ini otomatis juga membereskan #18, karena enemy yang mati akibat nyampe base (bukan akibat ditembak turret) tidak pernah lewat `applyKill` sama sekali.

**Catatan #21:** dipilih ramp +1 wave tiap 15 detik bertahan (angka saya yang tentukan, bukan dari spek manapun — kalau kamu mau kurva kesulitan yang beda, kasih tahu angkanya). Untuk VectorSlash, itu berarti spawn interval mencapai batas tercepatnya (1.0s) di wave 11 (~2:45). Untuk BastionSiege, batas tercepat (1.4s) di wave ~9 (~2:15).

**Catatan #22:** `toCanvasCoords(canvas, clientX, clientY, width, height)` di `apps/web/lib/utils/canvasCoords.ts` — helper generik, dipakai di 3 file × 2 titik = 6 pemanggilan, `getBoundingClientRect` tersisa 0 di ketiga file game canvas.
