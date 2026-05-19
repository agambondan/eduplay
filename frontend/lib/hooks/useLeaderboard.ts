import { useEffect, useState } from "react";
import { leaderboardApi } from "@/lib/api/leaderboard";
import { LeaderboardEntry } from "@/types/game";

export function useLeaderboard(slug?: string, period: "all" | "weekly" = "all") {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = slug
          ? await leaderboardApi.getGameLeaderboard(slug, period)
          : await leaderboardApi.getGlobalLeaderboard(period);
        setEntries(data.entries || []);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, [slug, period]);

  return { entries, loading };
}
