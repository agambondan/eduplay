import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900">
      <div className="max-w-md text-center">
        <div className="mb-6 text-8xl font-black text-indigo-200 dark:text-indigo-900">404</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          Halaman Tidak Ditemukan
        </h1>
        <p className="mb-8 text-gray-500 dark:text-slate-400">
          Sepertinya halaman yang kamu cari tidak ada. Yuk kembali main game!
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
          >
            <Home className="h-4 w-4" />
            Ke Beranda
          </Link>
          <Link
            href="/games"
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            <Search className="h-4 w-4" />
            Jelajahi Game
          </Link>
        </div>
      </div>
    </div>
  );
}
