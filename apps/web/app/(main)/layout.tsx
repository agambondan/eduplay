'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import MobileNav from '@/components/layout/MobileNav';
import Footer from '@/components/layout/Footer';
import { GameLevelUpHandler } from '@/components/ui/GameLevelUpHandler';
import { PauseOverlay } from '@/components/ui/PauseOverlay';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 dark:bg-slate-900">
      <Navbar />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-grow p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
      <GameLevelUpHandler />
      <PauseOverlay />
    </div>
  );
}
