'use client';

import { cn } from '@/lib/utils/cn';

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50',
        'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg',
        'focus:outline-2 focus:outline-offset-2 focus:outline-indigo-400'
      )}
    >
      Langsung ke konten
    </a>
  );
}
