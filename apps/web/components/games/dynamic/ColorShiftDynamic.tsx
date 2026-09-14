'use client';
import dynamic from 'next/dynamic';

const ColorShift = dynamic(() => import('@/components/games/ColorShift'), {
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
    </div>
  ),
  ssr: false,
});

export default ColorShift;
