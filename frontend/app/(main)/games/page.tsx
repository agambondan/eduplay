"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api/client";
import { Game } from "@/types/game";
import Link from "next/link";

export default function GameHubPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/games")
      .then((res) => {
        setGames(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading games...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Pusat Game Edukasi</h1>
        <p className="mt-2 text-sm text-gray-500">Pilih game edukatif seru untuk mulai bermain dan mengumpulkan XP!</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <div key={game.id} className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-6 space-y-4">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 uppercase">
                {game.category}
              </span>
              <h3 className="text-lg font-semibold leading-6 text-gray-900">{game.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{game.description}</p>
              <div className="pt-4">
                <Link
                  href={`/games/${game.slug}`}
                  className="block w-full text-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Main Sekarang
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
