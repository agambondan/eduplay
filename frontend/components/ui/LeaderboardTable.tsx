import { LeaderboardEntry } from '@/types/game';
import { cn } from '@/lib/utils/cn';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  isXP?: boolean;
}

export function LeaderboardTable({ entries, currentUserId, isXP = false }: LeaderboardTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead className="bg-gray-50 dark:bg-slate-900/50 text-left">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest w-20">Rank</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Player</th>
            {!isXP && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Lvl</th>}
            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">{isXP ? 'Total XP' : 'Score'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
          {entries.map((entry) => {
            const isMe = entry.user_id === currentUserId;
            return (
              <tr key={entry.user_id} className={cn(
                "transition-colors",
                isMe ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
              )}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {entry.rank === 1 ? (
                      <span className="text-2xl">🥇</span>
                    ) : entry.rank === 2 ? (
                      <span className="text-2xl">🥈</span>
                    ) : entry.rank === 3 ? (
                      <span className="text-2xl">🥉</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-400 dark:text-slate-500">#{entry.rank}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", isMe ? "text-indigo-600 dark:text-indigo-400" : "text-gray-900 dark:text-white")}>
                      {entry.username}
                      {isMe && <span className="ml-2 text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">You</span>}
                    </span>
                  </div>
                </td>
                {!isXP && (
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-xs font-bold bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-slate-400">
                      Lvl {entry.level || 1}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {entry.score.toLocaleString()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
