'use client';
import dynamic from 'next/dynamic';

const VectorSlash = dynamic(() => import('@/components/games/VectorSlash'), {
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
    </div>
  ),
  ssr: false,
});

export default VectorSlash;
