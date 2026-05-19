Struktur backend saat ini menggunakan konsep Layered Architecture.

1.  **cmd/**: Berisi `main.go` yang merupakan entry point aplikasi. Di sini konfigurasi di-load, database dikoneksikan, router di-setup, dan semua dependency (repository, service, controller) di-wire up secara manual.
2.  **config/**: Konfigurasi aplikasi yang mengambil dari environment variables.
3.  **internal/**: Kode utama aplikasi terbagi menjadi layer-layer:
    - **controller/**: Handler untuk HTTP request (misal: `auth_controller.go`, `game_controller.go`). Menerima request dari route Fiber, mem-parsing input, memanggil service, dan mereturn response.
    - **middleware/**: Fiber middlewares (seperti auth middleware untuk memvalidasi JWT).
    - **model/**: Definisi struktur data (GORM models) seperti `User`, `Game`, dll.
    - **repository/**: Layer yang berkomunikasi langsung dengan database (Postgres via GORM, Redis). Misal `user_repository.go` untuk query ke tabel users.
    - **service/**: Business logic layer. Controller memanggil service. Service menggunakan repository untuk mengambil/menyimpan data dan menjalankan aturan bisnis (seperti `game_service.go` atau `ai_service.go`).
4.  **pkg/**: Package utility atau helper yang bisa di-reuse.
    - **database/**: Inisialisasi koneksi Postgres & Redis.
    - **logger/**: Setup Zap logger.
    - **response/**: Format standar response API.
    - **validator/**: Custom struct validation.

Struktur ini memisahkan concern dengan baik: Controller mengurus HTTP, Service mengurus business logic, dan Repository mengurus akses data. Semuanya dihubungkan melalui dependency injection di `cmd/main.go`.
