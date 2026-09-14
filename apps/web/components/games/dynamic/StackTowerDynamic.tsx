'use client';
import dynamic from 'next/dynamic';

const StackTower = dynamic(() => import('@/components/games/StackTower'), {
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
    </div>
  ),
  ssr: false,
});

export default StackTower;
