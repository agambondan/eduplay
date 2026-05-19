"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api/client";
import { DailyChallenge } from "@/types/game";

export default function DailyChallengePage() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    api.get("/daily").then((res) => {
      setChallenge(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!challenge?.expires_at) return;
    const interval = setInterval(() => {
      const diff = new Date(challenge.expires_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); clearInterval(interval); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [challenge]);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  if (!challenge) return <div className="text-center py-8 text-gray-500">Daily Challenge belum tersedia.</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Daily Challenge</h1>
        <p className="mt-2 text-sm text-gray-500">Selesaikan untuk mendapat bonus 2x XP!</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow text-center">
        <div className="text-4xl font-mono font-bold text-indigo-600 tabular-nums">{timeLeft || "00:00:00"}</div>
        <div className="text-sm text-gray-500 mt-1">Reset berikutnya</div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Game: {challenge.game?.name}</h2>
          <span className="text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">
            2x XP
          </span>
        </div>
        {challenge.user_submitted ? (
          <div className="rounded-md bg-green-50 p-4 text-center text-green-800 font-medium">
            ✅ Kamu sudah menyelesaikan challenge hari ini!
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Belum menyelesaikan challenge hari ini. Mainkan sekarang!</div>
        )}
      </div>
    </div>
  );
}
