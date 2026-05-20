'use client';

import { useGameStore } from '@/lib/stores/gameStore';
import { cn } from '@/lib/utils/cn';

interface Props {
    children: React.ReactNode;
    maxWidth?: string;
    className?: string;
}

export function GameContainer({ children, maxWidth = 'max-w-2xl', className }: Props) {
    const isPlaying = useGameStore((s) => s.isPlaying);

    return (
        <div
            className={cn(
                isPlaying
                    ? 'flex min-h-dvh w-full flex-col items-center justify-center px-4 py-4'
                    : cn('container mx-auto py-8', maxWidth),
                className,
            )}
        >
            {children}
        </div>
    );
}
