'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import Navbar from '@/components/layout/Navbar';
import { BannerAd } from '@/components/ads/BannerAd';
import { GameLevelUpHandler } from '@/components/ui/GameLevelUpHandler';
import { PauseOverlay } from '@/components/ui/PauseOverlay';
import { useGameStore } from '@/lib/stores/gameStore';
import { cn } from '@/lib/utils/cn';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlaying = useGameStore((s) => s.isPlaying);
  const resetGame = useGameStore((s) => s.resetGame);

  useEffect(() => {
    resetGame();
  }, [pathname]);

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-gray-50 dark:bg-slate-900',
        !isPlaying && 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0',
      )}
    >
      {!isPlaying && <Navbar />}
      <main
        id="main-content"
        className={cn(
          'mx-auto w-full flex-grow',
          isPlaying ? 'max-w-full p-0' : 'max-w-7xl p-4 sm:p-6 lg:p-8',
        )}
      >
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
      {!isPlaying && (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <BannerAd />
        </div>
      )}
      {!isPlaying && <MobileNav />}
      {!isPlaying && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
      <GameLevelUpHandler />
      <PauseOverlay />
    </div>
  );
}
