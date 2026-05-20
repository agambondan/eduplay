import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isGuest: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setGuest: (user: User, accessToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isGuest: false,
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken, isGuest: false }),
      setGuest: (user, accessToken) => set({ user, accessToken, refreshToken: null, isGuest: true }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isGuest: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
