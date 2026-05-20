'use client';
import dynamic from 'next/dynamic';

const CapitalQuiz = dynamic(() => import('@/components/games/CapitalQuiz'), {
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  ),
  ssr: false,
});

export default CapitalQuiz;
