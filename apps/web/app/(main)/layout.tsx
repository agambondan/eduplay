'use client';

import Navbar from '@/components/layout/Navbar';
import MobileNav from '@/components/layout/MobileNav';
import Footer from '@/components/layout/Footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 dark:bg-slate-900">
      <Navbar />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-grow p-4 sm:p-6 lg:p-8">{children}</main>
      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
