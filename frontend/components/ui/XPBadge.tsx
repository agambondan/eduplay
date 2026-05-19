import { Trophy } from 'lucide-react';

interface XPBadgeProps {
  level: number;
  xp: number;
}

export function XPBadge({ level, xp }: XPBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 rounded-full text-white shadow-sm">
      <Trophy className="w-4 h-4" />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold leading-none opacity-90">Lvl {level}</span>
        <span className="text-xs font-bold leading-none mt-0.5">{xp} XP</span>
      </div>
    </div>
  );
}
