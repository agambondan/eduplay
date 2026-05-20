'use client';

import { LeaderboardEntry } from '@/types/game';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  isXP?: boolean;
  userRank?: LeaderboardEntry | null;
  nearbyEntries?: LeaderboardEntry[];
}

export function LeaderboardTable({
  entries,
  currentUserId,
  isXP = false,
  userRank,
  nearbyEntries,
}: LeaderboardTableProps) {
  const { t } = useLocale();
  const displayEntries =
    entries.length >= 20
      ? entries
      : nearbyEntries && nearbyEntries.length > 0
        ? nearbyEntries
        : entries;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        <thead className="bg-gray-50 text-left dark:bg-slate-900/50">
          <tr>
            <th className="w-20 px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">
              Rank
            </th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">
              Player
            </th>
            {!isXP && (
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
                {t('profile.level')}
              </th>
            )}
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-gray-500">
              {isXP ? t('profile.total_xp') : t('game.score')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
          {displayEntries.map((entry) => {
            const isMe = entry.user_id === currentUserId;
            return (
              <tr
                key={entry.user_id}
                className={cn(
                  'transition-colors',
                  isMe
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/10'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                )}
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    {entry.rank === 1 ? (
                      <span className="text-2xl">🥇</span>
                    ) : entry.rank === 2 ? (
                      <span className="text-2xl">🥈</span>
                    ) : entry.rank === 3 ? (
                      <span className="text-2xl">🥉</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-400 dark:text-slate-500">
                        #{entry.rank}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isMe
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {entry.username}
                      {isMe && (
                        <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] uppercase tracking-tighter text-indigo-600 dark:bg-indigo-900/40">
                          You
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                {!isXP && (
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600 dark:bg-slate-700 dark:text-slate-400">
                      {t('profile.level')} {entry.level || 1}
                    </span>
                  </td>
                )}
                <td className="whitespace-nowrap px-6 py-4 text-right">
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
