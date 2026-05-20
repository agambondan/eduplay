import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — EduPlay',
  description: 'Syarat dan ketentuan penggunaan platform EduPlay.',
};

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Syarat &amp; Ketentuan</h1>
      <p className="lead">Terakhir diperbarui: 20 Mei 2026</p>

      <p>
        Dengan mengakses atau menggunakan platform EduPlay, Anda menyetujui syarat dan ketentuan
        ini. Harap baca dengan seksama sebelum menggunakan layanan kami.
      </p>

      <h2>1. Penerimaan Syarat</h2>
      <p>
        Dengan mendaftar akun atau menggunakan platform EduPlay, Anda menyatakan bahwa Anda berusia
        minimal 7 tahun atau menggunakan platform di bawah pengawasan orang tua/wali yang sah.
      </p>

      <h2>2. Deskripsi Layanan</h2>
      <p>
        EduPlay adalah platform game edukatif berbasis web yang menyediakan mini game interaktif
        untuk mendukung pembelajaran. Layanan tersedia secara gratis dengan dukungan iklan, dan
        tersedia opsi berlangganan premium untuk pengalaman bebas iklan.
      </p>

      <h2>3. Akun Pengguna</h2>
      <ul>
        <li>Anda bertanggung jawab atas keamanan akun dan kata sandi Anda</li>
        <li>Satu orang hanya boleh memiliki satu akun aktif</li>
        <li>Anda wajib memberikan informasi yang akurat saat mendaftar</li>
        <li>Kami berhak menangguhkan akun yang melanggar ketentuan ini</li>
      </ul>

      <h2>4. Aturan Penggunaan</h2>
      <p>Pengguna dilarang:</p>
      <ul>
        <li>Menggunakan bot, script, atau metode otomatis untuk memanipulasi skor</li>
        <li>Menggunakan kata-kata kasar, pelecehan, atau konten tidak pantas sebagai username</li>
        <li>Mencoba meretas, merusak, atau mengganggu sistem platform</li>
        <li>Menjual, memperdagangkan, atau mentransfer akun</li>
        <li>Melanggar hak cipta atau hak kekayaan intelektual pihak lain</li>
      </ul>

      <h2>5. Konten dan Hak Kekayaan Intelektual</h2>
      <p>
        Seluruh konten platform EduPlay (game, desain, teks, kode) adalah milik EduPlay dan
        dilindungi hak cipta. Anda tidak diperkenankan menggandakan, mendistribusikan, atau
        memodifikasi konten tanpa izin tertulis dari kami.
      </p>

      <h2>6. Iklan</h2>
      <p>
        Platform EduPlay menampilkan iklan dari Google AdSense/AdMob. Pengguna dengan langganan
        premium bebas dari iklan. Kami tidak bertanggung jawab atas konten iklan yang ditampilkan
        oleh pihak ketiga.
      </p>

      <h2>7. Penafian dan Batasan Tanggung Jawab</h2>
      <p>
        Platform disediakan &quot;sebagaimana adanya&quot; tanpa jaminan apapun. Kami tidak
        bertanggung jawab atas kerugian yang timbul dari penggunaan platform, gangguan layanan, atau
        kehilangan data.
      </p>

      <h2>8. Penghentian Layanan</h2>
      <p>
        Kami berhak menangguhkan atau menghentikan akses Anda jika melanggar ketentuan ini. Anda
        dapat menghapus akun kapan saja melalui pengaturan profil atau dengan menghubungi tim kami.
      </p>

      <h2>9. Perubahan Syarat</h2>
      <p>
        Kami dapat mengubah syarat ini sewaktu-waktu. Perubahan akan diumumkan melalui platform atau
        email. Penggunaan berkelanjutan setelah perubahan berarti Anda menyetujui syarat baru.
      </p>

      <h2>10. Hukum yang Berlaku</h2>
      <p>
        Syarat ini diatur oleh hukum Republik Indonesia. Sengketa diselesaikan melalui musyawarah,
        atau jika diperlukan, melalui pengadilan yang berwenang di Indonesia.
      </p>

      <h2>11. Kontak</h2>
      <p>
        Pertanyaan mengenai syarat ini dapat dikirimkan ke:{' '}
        <a href="mailto:legal@eduplay.id">legal@eduplay.id</a>
      </p>
    </article>
  );
}
