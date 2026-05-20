'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { authApi } from '@/lib/api/auth';
import { LoginRequest, RegisterRequest } from '@/types/api';
import { analytics } from '@/lib/utils/analytics';

export function useAuth() {
  const router = useRouter();
  const { user, setAuth, logout: clearAuth } = useAuthStore();

  const login = useCallback(
    async (data: LoginRequest) => {
      const res = await authApi.login(data);
      setAuth(res.user as any, res.access_token, res.refresh_token);
      analytics.userLoggedIn('email');
      router.push('/');
    },
    [setAuth, router]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const res = await authApi.register(data);
      setAuth(res.user as any, res.access_token, res.refresh_token);
      analytics.userRegistered('email');
      router.push('/');
    },
    [setAuth, router]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    router.push('/login');
  }, [clearAuth, router]);

  return { user, login, register, logout, isAuthenticated: !!user };
}
