'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Gamepad2, Home, Trophy, User as UserIcon } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const navItems = [
    { name: t('nav.home'), path: '/', icon: Home },
    { name: t('nav.games'), path: '/games', icon: Gamepad2 },
    { name: t('nav.daily'), path: '/daily', icon: CalendarCheck },
    { name: t('nav.leaderboard'), path: '/leaderboard', icon: Trophy },
    { name: t('nav.profile'), path: '/profile', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/80 backdrop-blur-lg md:hidden dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
              )}
            >
              {isActive && (
                <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
