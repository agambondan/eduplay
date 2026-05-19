"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api/client";
import { LeaderboardEntry } from "@/types/game";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/leaderboard/global")
      .then((res) => {
        setEntries(res.data.data?.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leaderboard Global</h1>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          Belum ada data leaderboard.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Player</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {entries.map((entry) => (
                <tr key={entry.user_id} className={entry.rank <= 3 ? "bg-amber-50" : ""}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{entry.username}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{entry.level || "-"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-indigo-600 font-semibold">{entry.xp || entry.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
