'use client';

import { useGameStore } from '@/lib/stores/gameStore';
import { cn } from '@/lib/utils/cn';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface Props {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function GameContainer({ children, maxWidth = 'max-w-2xl', className }: Props) {
  const isPlaying = useGameStore((s) => s.isPlaying);

  return (
    <ErrorBoundary>
      <div
        role="main"
        aria-label={isPlaying ? 'Game area' : 'Game menu'}
        className={cn(
          isPlaying
            ? 'flex min-h-dvh w-full flex-col items-center px-2 py-3 sm:px-4 sm:py-4'
            : cn('container mx-auto px-3 py-6 sm:px-4 sm:py-8', maxWidth),
          className
        )}
      >
        {children}
      </div>
    </ErrorBoundary>
  );
}
