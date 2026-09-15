# Deep Review: Responsive Mobile Web & Game Layout Behaviors (EduPlay)

**Tanggal:** 14 September 2026  
**Status:** Audit & Action Plan  
**Target Platform:** Mobile Web / PWA (iOS Safari, Android Chrome, 360px–430px Viewport)

---

## 1. Executive Summary & Root Architecture Issues

Permasalahan layout non-responsive pada EduPlay bersumber dari **perbedaan fundamental paradigma interaksi antargame** yang dipaksakan masuk ke wrapper layout generik. Sebagian game membutuhkan *single-screen zero-scroll* (canvas/arcade), sebagian butuh *dense matrix touch* (sudoku, onet), sebagian membutuhkan *virtual typing* (wordle, TTS), dan sebagian lainnya merupakan *multi-panel turn-based match* (battleship, chess).

### 4 Akar Masalah Utama di Seluruh Aplikasi

1. **Inkonsistensi State Shell & Bottom Nav Overlap (`isPlaying`)**
   - Di `apps/web/app/(main)/layout.tsx`, `Navbar` dan `MobileNav` disembunyikan berdasarkan `useGameStore.isPlaying`.
   - **Bug Kritis:** Game multiplayer (`wordle-duel`, `crossword-duel`, `chess`, `battleship-math`, dll.) **tidak memakai `useGameStore`**, melainkan state lokal / WebSocket.
   - **Dampak:** Pada game multiplayer di mobile, `MobileNav` (tinggi ~64px + safe area) tetap muncul di bawah, menutupi tombol kontrol, papan catur, atau log permainan.

2. **Perangkap Virtual Keyboard Native OS (Layout Shift & Viewport Squish)**
   - Game seperti `Crossword` (TTS), `MentalMath`, `TimesTable`, dan `TypingSpeed` memakai elemen `<input>` HTML standar.
   - **Dampak:** Begitu pemain mengetuk input di smartphone, keyboard native OS muncul mengambil 40–50% tinggi layar (`dvh` menyusut dari 844px menjadi ~420px). Layout langsung terdorong ke atas, daftar petunjuk tersembunyi di luar layar, dan game berbasis kecepatan (mental math) terhambat oleh lag fokus input.

3. **Kerusakan Interaksi Gesture Touch / Pointer Drag pada Grid**
   - Game seperti `WordSearch` dan `Nonogram` mengandalkan event `onPointerEnter` pada elemen `<div>` untuk deteksi swipe/drag antarcell.
   - **Dampak:** Pada perangkat touchscreen (iOS/Android), event `pointerenter` **tidak pernah ter-trigger** saat jari digeser melintasi elemen DOM lain kecuali menggunakan Pointer Capture atau `document.elementFromPoint`. Akibatnya, pemain tidak bisa melakukan drag-select kata atau drag-fill puzzle di mobile.

4. **Ukuran Canvas Kaku (Hardcoded Pixel & Landscape Aspect Ratio)**
   - Game seperti `StackTower` memakai hardcoded width `360px` (`style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}`), yang memicu overflow horizontal pada layar kecil (iPhone SE / layar 320–360px dengan padding).
   - Game seperti `VectorSlash` dan `GridRelayTD` memakai canvas fixed landscape 640×480 (rasio 4:3). Pada layar portrait mobile (lebar ~360px), tinggi canvas menjadi ~270px, menghasilkan grid cell `GridRelayTD` berukuran **22.5px × 22.5px** (jauh di bawah standar minimum tap target 44px–48px Apple/Google).

---

## 2. Analisis Mendalam per Kategori Perilaku Game

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TAKSONOMI PERILAKU GAME                             │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ Kategori             │ Karakteristik        │ Isu Kritis Mobile             │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ A. Canvas & Arcade   │ Real-time, 60fps,    │ Tap target < 24px, gesture    │
│    (Snake, Vector,   │ Koordinat piksel     │ keluar canvas, aspect ratio   │
│    Grid Relay TD)    │                      │ 4:3 terlalu pipih di portrait │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ B. Logic & Grid      │ Dense matrix,        │ PointerEnter gagal di touch,  │
│    (Sudoku, TTS,     │ Dragging, Tap,       │ Input native merusak layout,  │
│    WordSearch, Onet) │ Virtual Numpad/Keys  │ Ukuran tile Onet hard < 25px  │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ C. Timed Arithmetic  │ Fast-pace typing,    │ Input number native vs keypad │
│    (Mental, Times,   │ Pilihan ganda,       │ custom, tombol meluber keluar │
│    Make24, Quiz)     │ Kartu ekspresi       │ viewport vertikal             │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ D. Multiplayer Duel  │ Multi-panel, Radar,  │ Urutan stacking terbalik      │
│    (Battleship,      │ Chat/Log, WebSocket, │ (radar di paling bawah),      │
│    Chess, Word Duel) │ Turn indicators      │ MobileNav menutupi kontrol    │
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

---

### Kategori A: Real-Time Canvas & Action Games

#### 1. `GridRelayTD`
- **Behavior:** Tower defense berbasis grid 16×12 + kabel transmisi listrik + toolbar pemilihan turret (Pulse, Tesla, Relay, Kabel, Overcharge).
- **Isu Responsif:**
  - Canvas 640×480 dipaksa mengecil ke lebar layar HP (~360px). Ukuran 1 cell grid = `360 / 16 = 22.5px`.
  - Pemain harus mengetuk cell 22.5px lalu mengetuk cell 22.5px lain untuk menarik kabel. Akibatnya sering terjadi salah tap (fat-finger).
  - Toolbar aksi di atas canvas memakan ruang vertikal dan tombolnya kecil (`text-xs px-2.5 py-1.5`).
- **Rekomendasi:**
  - Ganti grid mode mobile menjadi 10×8 atau gunakan pinch-to-zoom / viewport kamera terfokus.
  - Sediakan tombol mode "Rotate to Landscape" untuk pengalaman terbaik pada game bergenre strategi/tower defense.

#### 2. `VectorSlash`
- **Behavior:** Slash combat berbasis gesture arah garis lurus (Dash Thrust) dan lingkaran (Whirlwind) + kontrol dodge roll.
- **Isu Responsif:**
  - Canvas 640×480 menjadi sangat sempit secara vertikal (~270px).
  - Gesture lingkaran memerlukan diameter >110px. Dengan ibu jari di atas layar 270px, area tertutup jari mencapai 35%, dan swipe sering terpotong batas canvas (`pointerup` hilang tanpa pointer capture).
- **Rekomendasi:**
  - Pasang `canvas.setPointerCapture(e.pointerId)` pada `onPointerDown`.
  - Sesuaikan threshold gesture pada mobile (radius lingkaran minimum diturunkan menjadi 60px).

#### 3. `StackTower`
- **Behavior:** Menumpuk balok bergerak secara presisi (timing based).
- **Isu Responsif:**
  - Komponen menggunakan `style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}` dengan nilai tetap 360×480.
  - Pada layar di bawah 380px (atau dengan container padding), terjadi horizontal scroll / potong.
- **Rekomendasi:**
  - Ubah wrapper canvas menjadi `w-full max-w-[360px] aspect-[3/4]`.
  - Gunakan CSS scaling `width: 100%; height: 100%` pada canvas dengan internal resolution tetap 360×480.

#### 4. `SnakeGame` & `BubbleShooter` & `BrickBreaker`
- **Behavior:** Physics / projectile shooting / directional movement.
- **Isu Responsif:**
  - `SnakeGame`: Kontrol D-Pad on-screen di bawah canvas memakan ruang vertikal besar dan tidak responsif terhadap swipe kontinu.
  - `BubbleShooter`: Kalkulasi koordinat tembak `(e.clientX - rect.left) * (canvas.width / rect.width)` sudah ada, tetapi tidak ada visual aiming guide / laser pointer untuk jari yang menutupi moncong meriam.

---

### Kategori B: Grid & Matrix Logic Puzzles

#### 1. `Crossword` (TTS Single Player) vs `crossword-duel` & `crossword-coop`
- **Behavior:** Pengisian kotak TTS berdasarkan petunjuk mendatar dan menurun.
- **Isu Responsif Kritis:**
  - **Single Player:** Memakai `<input>` HTML di tiap cell. Saat keyboard HP terbuka, area petunjuk terdorong ke bawah layar. Pemain tidak bisa membaca petunjuk sambil mengetik.
  - **Multiplayer (Duel & Coop):** **TIDAK MEMILIKI ON-SCREEN KEYBOARD SAMA SEKALI**. Komponen hanya mendengar event `onKeyDown` window. Di HP/tablet tanpa keyboard fisik, **game sama sekali tidak bisa dimainkan**.
- **Rekomendasi:**
  - Buat komponen bersama `GameVirtualKeyboard` (QWERTY layout compact + Backspace + Navigasi Panah).
  - Tempatkan baris "Petunjuk Aktif" tepat di atas grid TTS (1 baris ringkas), bukan me-render seluruh daftar clue di bawah grid.

#### 2. `WordSearch`
- **Behavior:** Menemukan kata dalam grid huruf 10×10 dengan cara drag / swipe.
- **Isu Responsif Kritis:**
  - Menggunakan `onPointerDown` dan `onPointerEnter` pada elemen `<div>`. Pada touch event, `pointerenter` **tidak bekerja saat drag**.
  - Daftar kata diletakkan di bawah grid (`flex-col md:flex-row`). Di mobile, pemain harus scroll bolak-balik antara grid dan daftar kata. Grid memiliki `touch-action: none` sehingga saat menyentuh grid layar tidak bisa di-scroll.
- **Rekomendasi:**
  - Implementasikan hit-testing touch berbasis koordinat:
    ```ts
    const handleTouchMove = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = target?.closest('[data-cell]');
      if (cell) {
        const [r, c] = cell.getAttribute('data-cell')!.split('-').map(Number);
        updateSelection(r, c);
      }
    };
    ```
  - Buat daftar kata menjadi horizontal pill tag yang ringkas dan sticky di atas grid.

#### 3. `Nonogram`
- **Behavior:** Grid angka clue di atas dan samping + isi cell (hitam / silang).
- **Isu Responsif:**
  - Clue atas `clamp(4rem, 15vw, 8rem)` + Clue kiri `w-14` memakan ruang 40% dari total lebar layar.
  - Pada tingkat *Hard* (grid 15×15), sisa lebar layar 360px untuk 15 cell hanya menyisakan ~16px per cell. Tap jari pada cell 16px menghasilkan banyak salah klik.
  - Fitur drag-fill tidak berfungsi di touchscreen karena mengandalkan `onPointerEnter`.
- **Rekomendasi:**
  - Perkecil clue kiri dan atas dengan font ultra-compact (`text-[8px] sm:text-[10px]`).
  - Tambahkan tombol kursor arah / D-pad presisi opsional untuk mode Hard 15×15.

#### 4. `Onet` (Connect 2)
- **Behavior:** Menghubungkan 2 ubin identik dengan maksimal 2 belokan garis.
- **Isu Responsif:**
  - Tingkat *Hard* memiliki konfigurasi 10 baris × 12 kolom = 120 ubin.
  - Pada layar 360px: `(360 - padding - gaps) / 12` = **~23px per ubin**. Emoji/ikon buah menjadi sangat kecil dan mustahil dibedakan dengan cepat.
- **Rekomendasi:**
  - Di mobile view (< 640px), batasi grid hard maksimal 8 kolom × 10 baris atau ubah orientasi menjadi portrait-optimized.

#### 5. `Sudoku`
- **Behavior:** Papan 9×9 + Numpad 1–9 + Hapus.
- **Isu Responsif:**
  - Papan 9×9 dan numpad on-screen sudah tepat secara konsep.
  - Masalah ada pada jarak vertikal (margin & padding): Pada iPhone dengan tinggi viewport 667px–740px, numpad terpotong ke bawah (off-screen) karena padding container yang terlalu longgar (`py-6`, `gap-6`).
- **Rekomendasi:**
  - Bungkus Sudoku dalam `max-h-[100dvh] flex flex-col justify-between py-2`.

---

### Kategori C: Timed Arithmetic & Quiz Games

#### 1. `MentalMath` & `TimesTable`
- **Behavior:** Menjawab soal matematika cepat dalam 60–90 detik.
- **Isu Responsif:**
  - Keduanya memakai `<input type="number">`.
  - Begitu mengetik di mobile, viewport mengecil drastis, tombol submit tergeser, dan pemain terganggu oleh animasi naik-turun keyboard native.
- **Rekomendasi:**
  - Ganti input native dengan **On-Screen Numpad Grid 3×4** (angka 1–9, C, 0, ⌫) bawaan aplikasi.
  - Zero keyboard shift, latensi instan, dan 100% konsisten di semua device.

#### 2. `Make24`
- **Status:** **Best Practice Reference!**
  - Menggunakan 4 kartu angka besar + operator buttons `+ - × ÷ ( )` + evaluasi ekspresi on-screen.
  - Tidak memicu keyboard native, layout stabil, tombol sentuh proporsional (`h-20 sm:h-24`).

#### 3. `TimelineHistory`, `CapitalQuiz`, `FlagQuiz`, `ElementQuiz`, `MathQuiz`
- **Behavior:** 4 tombol pilihan ganda (2×2 grid).
- **Isu Responsif:**
  - Teks pertanyaan yang panjang (misal deskripsi sejarah di `TimelineHistory`) memicu tinggi kartu membengkak dan mendorong 4 tombol pilihan ke luar layar bawah.
- **Rekomendasi:**
  - Pasang `line-clamp` atau batas tinggi maksimum pada kartu pertanyaan.
  - Buat tombol pilihan ganda fleksibel (`min-h-[52px]` dengan `text-sm sm:text-base`).

---

### Kategori D: Multiplayer & Turn-Based Games

#### 1. `BattleshipMath`
- **Behavior:** Match multiplayer turn-based. Memerlukan: Board Armada Sendiri, Radar Lawan, Panel Soal Matematika, dan Log Match.
- **Isu Responsif Kritis:**
  - Pada layar mobile (< 1024px), layout me-render komponen secara vertikal berurutan:
    1. *Armada Kamu* (Board 8×8)
    2. *Panel Tembakan* (Soal + Input)
    3. *Log Match*
    4. *Radar Lawan* (Board 8×8 tempat menembak)
  - **Dampak Kritis:** Saat giliran menembak, instruksi berbunyi *"Klik sel di radar lawan"*, tetapi Radar Lawan berada di **paling bawah layar (harus scroll 3 halaman ke bawah)**. Setelah memilih sel, pemain harus scroll naik lagi ke Panel Tembakan untuk mengetik jawaban!
- **Rekomendasi:**
  - Di mobile (< 1024px), gunakan **Tab Switcher** ringkas di atas: `[ Radar Lawan 🎯 ] | [ Armada Saya 🛡️ ] | [ Log 📜 ]`.
  - Modal soal tembakan muncul langsung sebagai overlay/bottom-sheet begitu sel radar diketuk.

#### 2. `Chess`
- **Behavior:** Papan catur 8×8 + Status Giliran + Move History + Resign Button.
- **Isu Responsif:**
  - Tombol kembali `absolute left-4 top-4` bertabrakan dengan header navigasi jika layout shell berubah.
  - Riwayat langkah (`moveHistory`) mendorong tombol Resign ke bawah batas scroll.
- **Rekomendasi:**
  - Kunci layout catur dalam `h-[100dvh] flex flex-col justify-between`. Board mengisi sisa ruang menggunakan `max-h-[min(85vw,45vh)] aspect-square`.

#### 3. `WordleDuel`
- **Behavior:** Tebak kata 5 huruf duel real-time dengan lawan.
- **Isu Responsif:**
  - Baris keyboard virtual di-render sebagai `flex-wrap` satu baris alfabet 26 huruf (`allKeys.map(...)`), bukan layout standar 3 baris QWERTY seperti di `Wordle` single-player.
  - Akibatnya huruf tersusun acak-acakan di layar HP (lebar tombol menjadi 9px / terpotong).
- **Rekomendasi:**
  - Samakan komponen keyboard dengan `Wordle` single-player (3 baris: Q-P, A-L, Enter-Z-M-Del).

---

## 3. Matriks Audit Komprehensif Seluruh Game

| Game Slug | Kategori | Fit 100dvh | Input Method | Touch Drag / Tap | Keparahan Isu | Tindakan Perbaikan |
|---|---|---|---|---|---|---|
| `crossword-duel` | Duel | ❌ Buruk | ❌ KeyDown only | ⚠️ Cell tap OK | 🔴 **P0 (Blocker)** | Tambahkan On-Screen Virtual Keyboard |
| `crossword-coop` | Coop | ❌ Buruk | ❌ KeyDown only | ⚠️ Cell tap OK | 🔴 **P0 (Blocker)** | Tambahkan On-Screen Virtual Keyboard |
| `word-search` | Logic | ❌ Buruk | N/A | ❌ PointerEnter fail | 🔴 **P0 (Blocker)** | Perbaiki touch drag via `elementFromPoint` |
| `nonogram` | Logic | ❌ Buruk | Mode toggle | ❌ PointerEnter fail | 🔴 **P0 (Blocker)** | Perbaiki touch drag + perkecil clue border |
| `battleship-math`| Multi | ❌ Buruk | Input + Grid | ⚠️ Terpisah jauh | 🔴 **P0 (Blocker)** | Ubah ke Tab Switcher (Radar vs Armada) |
| `wordle-duel` | Duel | ⚠️ Sedang | Virtual flex | ⚠️ Non-QWERTY wrap | 🟠 **P1 (Tinggi)** | Ganti ke 3-row QWERTY keyboard |
| `crossword` (TTS)| Logic | ❌ Buruk | ⚠️ Native input | ⚠️ Cell tap OK | 🟠 **P1 (Tinggi)** | Ganti native input ke in-game keypad |
| `mental-math` | Math | ⚠️ Sedang | ⚠️ Native input | ⚠️ Butuh keyboard | 🟠 **P1 (Tinggi)** | Ganti ke On-Screen Numpad Grid |
| `times-table` | Math | ⚠️ Sedang | ⚠️ Native input | ⚠️ Butuh keyboard | 🟠 **P1 (Tinggi)** | Ganti ke On-Screen Numpad Grid |
| `grid-relay-td` | Canvas| ⚠️ Sedang | Toolbar + Grid | ❌ Cell 22.5px | 🟠 **P1 (Tinggi)** | Zoomable viewport / Landscape prompt |
| `stack-tower` | Canvas| ❌ Overflow| Screen tap | ✅ Tap OK | 🟠 **P1 (Tinggi)** | Hapus fixed 360px inline style |
| `onet` | Logic | ⚠️ Sedang | Cell tap | ⚠️ Hard cell < 24px | 🟠 **P1 (Tinggi)** | Kurangi kolom hard mode di mobile |
| `vector-slash` | Canvas| ⚠️ Sedang | Gesture swipe | ⚠️ Canvas sempit | 🟡 **P2 (Sedang)** | Pasang `setPointerCapture` + tune radius |
| `sudoku` | Logic | ⚠️ Sedang | Numpad on-screen| ✅ Tap OK | 🟡 **P2 (Sedang)** | Kompresi margin & padding vertikal |
| `wordle` | Logic | ⚠️ Sedang | QWERTY on-screen| ✅ Tap OK | 🟡 **P2 (Sedang)** | Sesuaikan tile size di HP pendek |
| `chess` | Board | ⚠️ Sedang | Square tap | ✅ Tap OK | 🟡 **P2 (Sedang)** | Sembunyikan MobileNav + compact layout |
| `timeline-history`| Quiz | ⚠️ Sedang | 4 Option buttons| ✅ Tap OK | 🟡 **P2 (Sedang)** | Batasi max-height deskripsi peristiwa |
| `typing-speed` | Speed | ⚠️ Sedang | ⚠️ Native input | ✅ Wajib keyboard | 🟢 **P3 (Minor)** | Beri instruksi optimal di desktop/tablet |
| `snake` | Canvas| ✅ Baik | D-Pad / Swipe | ✅ Swipe OK | 🟢 **P3 (Minor)** | Optimalkan area sentuh swipe |
| `make-24` | Math | ✅ Sangat Baik| Keypad custom | ✅ Tap OK | 🟢 **Good** | Reference Model |
| `color-shift` | Quiz | ✅ Sangat Baik| 4 Option buttons| ✅ Tap OK | 🟢 **Good** | Reference Model |
| `simon-says` | Memory| ✅ Sangat Baik| 4 Color buttons | ✅ Tap OK | 🟢 **Good** | Reference Model |
| `memory-match` | Memory| ✅ Baik | Card tap | ✅ Tap OK | 🟢 **Good** | Reference Model |
| `game-2048` | Logic | ✅ Baik | Swipe touch | ✅ Swipe OK | 🟢 **Good** | Reference Model |

---

## 4. Standar Solusi & Pola Arsitektur Responsif

### A. Template Game Container Standar (`100dvh Zero-Scroll`)
Untuk semua game aksi, canvas, dan puzzle layar penuh, gunakan container viewport kaku:

```tsx
// Pattern: Single Screen Responsive Layout
<div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col justify-between overflow-hidden px-2 py-2 sm:px-4 sm:py-4">
  {/* Top HUD (Score, Timer, Pause) */}
  <header className="flex h-12 w-full flex-shrink-0 items-center justify-between">
    <GameHeader />
  </header>

  {/* Main Game Stage (Scales to fit remaining vertical space) */}
  <main className="flex flex-1 items-center justify-center overflow-hidden py-1">
    <GameStage className="max-h-full max-w-full aspect-square" />
  </main>

  {/* Bottom Controls / Virtual Keypad */}
  <footer className="w-full flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
    <GameControls />
  </footer>
</div>
```

### B. Komponen Bersama: On-Screen Virtual Keyboards & Numpad
1. **`GameNumpad` (Untuk `MentalMath`, `TimesTable`, `Sudoku`):**
   - 3×4 Grid: `[1, 2, 3]`, `[4, 5, 6]`, `[7, 8, 9]`, `[Clear, 0, Submit/Del]`.
   - Tombol berukuran minimal `min-h-[48px]`, feedback suara/haptic instan.
2. **`GameQWERTYKeyboard` (Untuk `Wordle`, `WordleDuel`, `Crossword`, `CrosswordDuel`):**
   - 3 baris standar, key state warna (correct/present/absent), touch-target minimal 40px tinggi.

### C. Helper Multi-Touch Drag Hit-Testing
Untuk game grid swipe (`WordSearch`, `Nonogram`):
```ts
export function useGridTouchDrag(onCellSelect: (r: number, c: number) => void) {
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellEl = el?.closest('[data-grid-cell]');
    if (cellEl) {
      const r = Number(cellEl.getAttribute('data-r'));
      const c = Number(cellEl.getAttribute('data-c'));
      onCellSelect(r, c);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
```

---

## 5. Rencana Aksi & Prioritas Implementasi

### Fase 1 — Perbaikan Isu Kritis (P0 Blocker)
1. **Perbaiki Input `CrosswordDuel` & `CrosswordCoop`:** Tambahkan virtual on-screen keyboard agar pengguna HP bisa bermain.
2. **Perbaiki Touch Drag `WordSearch` & `Nonogram`:** Ganti `onPointerEnter` dengan pointer coordinate hit-testing (`elementFromPoint`).
3. **Perbaiki Stacking `BattleshipMath` di Mobile:** Buat tab view pemisah antara "Radar Tembak Lawan" dan "Armada Sendiri".
4. **Sembunyikan `MobileNav` pada Seluruh Mode Multiplayer:** Sinkronkan route `/games/*` agar menonaktifkan navigation bar bawah saat berada di dalam room pertandingan.

### Fase 2 — Eliminasi Virtual Keyboard Native (P1)
1. **Migrasi `MentalMath` & `TimesTable` ke Virtual Numpad:** Hapus `<input type="number">`, gunakan keypad 3×4 in-game.
2. **Perbaiki Keyboard `WordleDuel`:** Standarisasi ke 3-row QWERTY layout seragam dengan `Wordle`.
3. **Responsifkan `StackTower` & `Onet`:** Hapus fixed width `360px` di StackTower dan sesuaikan densitas ubin Onet pada layar kecil.

### Fase 3 — Ergonomi & Polishing Viewport (P2)
1. **Standarisasi `100dvh` pada Seluruh Game:** Terapkan layout zero-scroll tanpa pergeseran vertical header/footer.
2. **Peningkatan Safe-Area Insets:** Pastikan padding bawah `pb-[env(safe-area-inset-bottom)]` terpasang di semua kontrol sentuh.
3. **Landscape Orientation Prompt:** Beri banner anjuran rotasi layar untuk game bertipe canvas 4:3 lebar (`GridRelayTD`, `VectorSlash`).
