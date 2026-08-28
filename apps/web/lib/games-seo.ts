import type { Metadata } from 'next';
import { OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';

type GameSeo = { name: string; description: string };

/**
 * Per-game copy for <title>, meta description and the social card. Every game
 * route needs its own entry: without one the route would fall back to the site
 * title and Google would see 36 pages with duplicate titles/descriptions.
 */
export const GAME_SEO: Record<string, GameSeo> = {
  '2048': {
    name: '2048',
    description: 'Gabungkan angka-angka hingga mencapai 2048!',
  },
  'battleship-math': {
    name: 'Battleship Math',
    description: 'Tembak kapal lawan dengan menjawab soal matematika di setiap tembakan.',
  },
  'brick-breaker': {
    name: 'Brick Breaker Soal',
    description: 'Hancurkan block dan jawab soal matematika dadakan untuk bonus skor!',
  },
  'bubble-shooter': {
    name: 'Bubble Shooter Math',
    description: 'Tembak bubble dan jumlahkan angka dengan tepat!',
  },
  'capital-quiz': {
    name: 'Capital City Quiz',
    description: 'Tebak ibukota negara-negara di dunia!',
  },
  chess: {
    name: 'Catur Online',
    description: 'Main catur melawan bot atau lawan pemain lain secara real-time.',
  },
  crossword: {
    name: 'Crossword Indonesia',
    description: 'Uji wawasan kosakata dengan Teka-Teki Silang!',
  },
  'crossword-coop': {
    name: 'Crossword Co-op',
    description: 'Isi teka-teki silang bersama teman dalam satu papan secara real-time.',
  },
  'crossword-duel': {
    name: 'Crossword Duel',
    description: 'Adu cepat mengisi teka-teki silang melawan pemain lain.',
  },
  'element-quiz': {
    name: 'Element Quiz',
    description: 'Tebak nama unsur kimia dari simbolnya!',
  },
  'flag-quiz': {
    name: 'Flag Quiz',
    description: 'Tebak nama negara dari gambar benderanya!',
  },
  'flag-team-battle': {
    name: 'Flag Team Battle',
    description: 'Tebak bendera negara dalam pertandingan tim melawan tim.',
  },
  'fraction-visualizer': {
    name: 'Fraction Visualizer',
    description: 'Pahami konsep pecahan lewat visualisasi interaktif yang mudah dimengerti.',
  },
  'math-battle': {
    name: 'Math Battle',
    description: 'Adu cepat berhitung melawan pemain lain secara langsung.',
  },
  'math-quiz': {
    name: 'Math Quiz Blitz',
    description: 'Uji kecepatan berhitungmu dalam 60 detik!',
  },
  'math-relay': {
    name: 'Math Relay',
    description: 'Estafet soal matematika bersama tim — setiap anggota menyelesaikan satu babak.',
  },
  'math-tournament': {
    name: 'Math Tournament',
    description: 'Turnamen matematika bergaya bracket — menang terus sampai jadi juara!',
  },
  'memory-match': {
    name: 'Memory Match',
    description:
      'Cocokkan pasangan kartu dalam waktu tercepat. Latih daya ingat dan konsentrasimu!',
  },
  'mental-math': {
    name: 'Mental Math Speed',
    description: 'Uji kecepatan berhitungmu dengan mengetik jawaban secepat mungkin!',
  },
  nonogram: {
    name: 'Nonogram',
    description: 'Asah logika dengan mengungkapkan gambar tersembunyi lewat Nonogram!',
  },
  'number-match': {
    name: 'Number Match',
    description: 'Pasangkan angka yang sama atau berjumlah sepuluh untuk mengosongkan papan.',
  },
  onet: {
    name: 'Onet Connect',
    description: 'Cocokkan gambar kembar yang bisa dihubungkan dengan maksimal tiga garis.',
  },
  'quiz-showdown': {
    name: 'Quiz Showdown',
    description: 'Kuis cepat multi-pemain — siapa paling banyak benar dalam waktu terbatas?',
  },
  'simon-says': {
    name: 'Simon Says',
    description:
      'Ingat dan ulangi urutan warna yang menyala. Sampai berapa level kamu bisa bertahan?',
  },
  snake: {
    name: 'Snake Classic',
    description:
      'Game snake klasik — makan bola, panjangkan ular, jangan sampai menabrak dirimu sendiri!',
  },
  'spelling-bee': {
    name: 'Spelling Bee',
    description: 'Susun huruf acak menjadi kata yang benar!',
  },
  sudoku: {
    name: 'Sudoku',
    description: 'Asah logika dengan teka-teki Sudoku!',
  },
  'sudoku-race': {
    name: 'Sudoku Race',
    description: 'Balapan menyelesaikan papan Sudoku yang sama melawan pemain lain.',
  },
  'timeline-history': {
    name: 'Timeline History',
    description: 'Tebak tahun kejadian penting di Indonesia dan Dunia!',
  },
  'times-table': {
    name: 'Times Table Challenge',
    description: 'Latih perkalian 1-12 dengan cara seru!',
  },
  'trivia-challenge': {
    name: 'Trivia Challenge',
    description: 'Tantang temanmu dengan kuis pengetahuan umum lintas topik.',
  },
  'typing-speed': {
    name: 'Typing Speed',
    description:
      'Uji kecepatan mengetikmu! Ketik kata-kata Bahasa Indonesia secepat mungkin dalam 60 detik.',
  },
  'word-chain': {
    name: 'Word Chain',
    description: 'Sambung kata dari huruf terakhir lawan — jangan sampai kehabisan ide!',
  },
  'word-search': {
    name: 'Word Search',
    description: 'Asah ketelitianmu dengan mencari kata-kata tersembunyi!',
  },
  wordle: {
    name: 'Wordle Indonesia',
    description: 'Tebak kata 5 huruf Bahasa Indonesia dalam 6 percobaan!',
  },
  'wordle-duel': {
    name: 'Wordle Duel',
    description: 'Adu cepat menebak kata 5 huruf melawan pemain lain.',
  },
};

/** Full metadata (canonical + Open Graph + Twitter card) for one game route. */
export function gameMetadata(slug: string): Metadata {
  const game = GAME_SEO[slug];
  if (!game) {
    throw new Error(`gameMetadata: no GAME_SEO entry for "${slug}"`);
  }

  const title = `${game.name} — Game Edukatif`;
  const path = `/games/${slug}`;
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description: game.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      siteName: SITE_NAME,
      url,
      title: `${game.name} | ${SITE_NAME}`,
      description: game.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${game.name} | ${SITE_NAME}`,
      description: game.description,
      images: [OG_IMAGE.url],
    },
  };
}
