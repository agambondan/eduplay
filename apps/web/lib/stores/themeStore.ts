import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'eduplay-theme' }
  )
);

export function getThemeClass(theme: Theme): boolean {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return theme === 'dark';
}

export function applyTheme(theme: Theme) {
  const isDark = getThemeClass(theme);
  document.documentElement.classList.toggle('dark', isDark);
}

export function initTheme() {
  const stored = localStorage.getItem('eduplay-theme');
  if (stored) {
    try {
      const { theme } = JSON.parse(stored) as { theme: Theme };
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
      return;
    } catch {}
  }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
}
