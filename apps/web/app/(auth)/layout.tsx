import type { Metadata } from 'next';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Masuk | EduPlay — Game Edukasi Online',
  description:
    'Daftar atau masuk ke akun EduPlay untuk mulai bermain game edukasi online gratis. Matematika, bahasa, geografi, dan logika.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 dark:bg-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-md flex-grow px-4 py-8">{children}</main>
      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
