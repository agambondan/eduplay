'use client';
import dynamic from 'next/dynamic';

const BastionSiege = dynamic(() => import('@/components/games/BastionSiege'), {
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
    </div>
  ),
  ssr: false,
});

export default BastionSiege;
