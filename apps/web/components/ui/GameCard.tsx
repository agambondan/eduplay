'use client';

import { Game } from '@/types/game';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { cn } from '@/lib/utils/cn';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const favorited = useFavoritesStore((s) => s.favorites.includes(game.slug));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(game.slug);
  };

  return (
    <Link href={`/games/${game.slug}`}>
      <div className="group relative block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500">
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-gray-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
              {game.name}
            </h3>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/30">
                {game.category}
              </span>
              <button
                type="button"
                onClick={handleFavoriteClick}
                aria-label={favorited ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400"
              >
                <Heart
                  className={cn(
                    'h-4 w-4 transition-transform active:scale-125',
                    favorited
                      ? 'fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400'
                      : 'hover:stroke-rose-500'
                  )}
                />
              </button>
            </div>
          </div>
          <p className="line-clamp-2 text-sm text-gray-500 dark:text-slate-400">
            {game.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
