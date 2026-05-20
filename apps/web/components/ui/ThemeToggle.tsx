'use client';

import { useEffect } from 'react';
import { useThemeStore, applyTheme } from '@/lib/stores/themeStore';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const modes = [
  { value: 'light' as const, icon: Sun, label: 'Terang' },
  { value: 'dark' as const, icon: Moon, label: 'Gelap' },
  { value: 'system' as const, icon: Monitor, label: 'Sistem' },
];

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (useThemeStore.getState().theme === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5 dark:border-slate-600">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          className={cn(
            'touch-target flex items-center justify-center rounded-md p-1.5 transition-colors',
            theme === value
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
              : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
