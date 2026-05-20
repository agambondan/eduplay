import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Kebijakan Privasi — EduPlay',
    description: 'Kebijakan privasi platform EduPlay terkait pengumpulan dan penggunaan data pengguna.',
};

export default function PrivacyPolicyPage() {
    return (
        <article className='prose prose-gray max-w-none dark:prose-invert'>
            <h1>Kebijakan Privasi</h1>
            <p className='lead'>Terakhir diperbarui: 20 Mei 2026</p>

            <p>
                EduPlay (&quot;kami&quot;, &quot;kita&quot;, atau &quot;platform&quot;) berkomitmen untuk melindungi
                privasi pengguna (&quot;Anda&quot;). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan,
                menggunakan, dan melindungi informasi Anda saat menggunakan layanan EduPlay di{' '}
                <strong>eduplay.id</strong>.
            </p>

            <h2>1. Informasi yang Kami Kumpulkan</h2>
            <h3>1.1 Informasi yang Anda Berikan</h3>
            <ul>
                <li>
                    <strong>Akun:</strong> Nama pengguna (username), alamat email, dan kata sandi (disimpan dalam
                    bentuk hash terenkripsi)
                </li>
                <li>
                    <strong>Profil:</strong> Foto profil (opsional), preferensi game
                </li>
                <li>
                    <strong>Laporan:</strong> Pesan yang Anda kirim melalui formulir dukungan/bug report
                </li>
            </ul>

            <h3>1.2 Informasi yang Dikumpulkan Otomatis</h3>
            <ul>
                <li>
                    <strong>Data permainan:</strong> Skor, durasi bermain, level, XP, dan riwayat game
                </li>
                <li>
                    <strong>Data teknis:</strong> Alamat IP, jenis browser, sistem operasi, dan waktu akses
                </li>
                <li>
                    <strong>Cookie:</strong> Cookie sesi dan cookie analitik (lihat bagian Cookie di bawah)
                </li>
            </ul>

            <h2>2. Cara Kami Menggunakan Informasi</h2>
            <ul>
                <li>Menyediakan dan meningkatkan layanan platform EduPlay</li>
                <li>Mengelola akun dan memverifikasi identitas pengguna</li>
                <li>Menampilkan leaderboard dan statistik permainan</li>
                <li>Mengirimkan email transaksional (verifikasi, reset kata sandi)</li>
                <li>Menganalisis penggunaan platform untuk peningkatan produk (via Google Analytics 4)</li>
                <li>Menampilkan iklan relevan melalui Google AdSense/AdMob</li>
                <li>Mencegah kecurangan dan penyalahgunaan platform</li>
            </ul>

            <h2>3. Cookie dan Teknologi Pelacakan</h2>
            <p>Kami menggunakan cookie untuk:</p>
            <ul>
                <li>
                    <strong>Cookie Esensial:</strong> Mempertahankan sesi login Anda
                </li>
                <li>
                    <strong>Cookie Analitik:</strong> Google Analytics 4 untuk memahami pola penggunaan
                </li>
                <li>
                    <strong>Cookie Iklan:</strong> Google AdSense untuk menampilkan iklan yang relevan
                </li>
            </ul>
            <p>
                Anda dapat menolak cookie non-esensial melalui banner cookie yang muncul saat pertama kali mengunjungi
                platform.
            </p>

            <h2>4. Berbagi Informasi dengan Pihak Ketiga</h2>
            <p>Kami tidak menjual data pribadi Anda. Kami berbagi data hanya dengan:</p>
            <ul>
                <li>
                    <strong>Google Analytics:</strong> Data analitik anonim untuk pemahaman penggunaan
                </li>
                <li>
                    <strong>Google AdSense:</strong> Data untuk penargetan iklan (dapat dinonaktifkan)
                </li>
                <li>
                    <strong>Resend:</strong> Layanan pengiriman email transaksional
                </li>
                <li>
                    <strong>Sentry:</strong> Laporan error anonim untuk perbaikan bug
                </li>
            </ul>

            <h2>5. Keamanan Data</h2>
            <p>
                Kami menggunakan enkripsi HTTPS, hash bcrypt untuk kata sandi, dan JWT dengan masa berlaku terbatas.
                Data disimpan di server yang aman. Meski demikian, tidak ada sistem yang 100% aman.
            </p>

            <h2>6. Hak Pengguna</h2>
            <p>Anda berhak untuk:</p>
            <ul>
                <li>Mengakses dan mengunduh data pribadi Anda</li>
                <li>Mengoreksi informasi yang tidak akurat</li>
                <li>Meminta penghapusan akun dan data Anda</li>
                <li>Menarik persetujuan penggunaan data</li>
            </ul>
            <p>
                Untuk menggunakan hak-hak ini, hubungi kami di{' '}
                <a href='mailto:privacy@eduplay.id'>privacy@eduplay.id</a>.
            </p>

            <h2>7. Privasi Anak</h2>
            <p>
                EduPlay dapat digunakan oleh pengguna di bawah 13 tahun dengan pengawasan orang tua. Kami tidak
                dengan sengaja mengumpulkan data pribadi anak di bawah 13 tahun tanpa persetujuan orang tua. Jika
                Anda percaya anak Anda telah memberikan data tanpa izin, hubungi kami segera.
            </p>

            <h2>8. Perubahan Kebijakan</h2>
            <p>
                Kami dapat memperbarui kebijakan ini. Perubahan signifikan akan diberitahukan melalui email atau
                notifikasi di platform. Penggunaan berkelanjutan setelah perubahan berarti Anda menyetujui kebijakan
                yang diperbarui.
            </p>

            <h2>9. Kontak</h2>
            <p>
                Untuk pertanyaan tentang privasi, hubungi:{' '}
                <a href='mailto:privacy@eduplay.id'>privacy@eduplay.id</a>
            </p>
        </article>
    );
}
