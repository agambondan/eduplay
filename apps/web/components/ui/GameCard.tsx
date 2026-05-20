import { Game } from '@/types/game';
import Link from 'next/link';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Link href={`/games/${game.slug}`}>
      <div className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500">
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
              {game.name}
            </h3>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:ring-indigo-400/30">
              {game.category}
            </span>
          </div>
          <p className="line-clamp-2 text-sm text-gray-500 dark:text-slate-400">
            {game.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
