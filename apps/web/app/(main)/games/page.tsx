'use client';

import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api/games';
import { GameCard } from '@/components/ui/GameCard';
import { useState } from 'react';
import { GameCategory } from '@/types/game';
import { cn } from '@/lib/utils/cn';

const CATEGORIES: { label: string; value: GameCategory | 'all' }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Math', value: 'math' },
  { label: 'Language', value: 'language' },
  { label: 'Geography', value: 'geography' },
  { label: 'Logic', value: 'logic' },
];

export default function GamesPage() {
  const [category, setCategory] = useState<GameCategory | 'all'>('all');
  const { data: games, isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.list,
  });

  const filteredGames = games?.filter((g) => category === 'all' || g.category === category);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Game Hub</h1>
        <p className="text-gray-500 dark:text-slate-400">Pilih game edukatif favoritmu!</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-bold transition-all',
              category === cat.value
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames?.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
          {filteredGames?.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="text-gray-500">Tidak ada game di kategori ini.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
