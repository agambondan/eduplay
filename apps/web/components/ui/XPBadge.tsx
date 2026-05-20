'use client';

import { Trophy } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

interface XPBadgeProps {
  level: number;
  xp: number;
}

export function XPBadge({ level, xp }: XPBadgeProps) {
  const { t } = useLocale();
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-white shadow-sm">
      <Trophy className="h-4 w-4" />
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase leading-none opacity-90">
          {t('profile.level')} {level}
        </span>
        <span className="mt-0.5 text-xs font-bold leading-none">
          {xp} {t('profile.xp')}
        </span>
      </div>
    </div>
  );
}
