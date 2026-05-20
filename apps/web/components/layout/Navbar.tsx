'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useLocale } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t } = useLocale();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    logout();
    router.push('/login');
  };

  const navItems = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.games'), path: '/games' },
    { name: t('nav.leaderboard'), path: '/leaderboard' },
    { name: t('nav.daily'), path: '/daily' },
    { name: t('nav.support'), path: '/support' },
  ];

  return (
    <nav className="hidden border-b border-gray-200 bg-white/90 backdrop-blur-md md:block dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex">
            <Link
              href="/"
              className="flex flex-shrink-0 items-center text-xl font-bold text-indigo-600 dark:text-indigo-400"
            >
              EduPlay
            </Link>
            <div className="ml-6 flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors ${
                    pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
                      ? 'border-indigo-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <LanguageSwitcher />
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: user.avatar_color || '#4F46E5' }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                  {user.username} (Lv.{user.level || 1})
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  {t('auth.logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold leading-6 text-gray-900">
                  {t('auth.login')}
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  {t('auth.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
