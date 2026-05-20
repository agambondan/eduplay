'use client';

import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api/games';
import { GameCard } from '@/components/ui/GameCard';
import { useMemo, useState } from 'react';
import { GameCategory } from '@/types/game';
import { cn } from '@/lib/utils/cn';

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Semua',
  math: 'Math',
  language: 'Language',
  geography: 'Geography',
  logic: 'Logic',
  science: 'Science',
  history: 'History',
  card: 'Card',
  car: 'Car',
  edu: 'Edu',
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function GamesPage() {
  const [category, setCategory] = useState<string>('all');
  const { data: games, isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.list,
  });

  const categories = useMemo(() => {
    if (!games) return ['all'];
    const cats = [...new Set(games.map((g) => g.category))];
    return ['all', ...cats.sort()];
  }, [games]);

  const filteredGames = games?.filter((g) => category === 'all' || g.category === category);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Game Hub</h1>
        <p className="text-gray-500 dark:text-slate-400">Pilih game edukatif favoritmu!</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-bold transition-all',
              category === cat
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            {categoryLabel(cat)}
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
