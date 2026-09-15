'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  favorites: string[];
  toggleFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (slug: string) => {
        const current = get().favorites;
        if (current.includes(slug)) {
          set({ favorites: current.filter((s) => s !== slug) });
        } else {
          set({ favorites: [...current, slug] });
        }
      },
      isFavorite: (slug: string) => get().favorites.includes(slug),
    }),
    {
      name: 'favorites-storage',
    }
  )
);
