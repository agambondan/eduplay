import { useAuthStore } from '../authStore';
import { beforeEach, describe, expect, it } from 'vitest';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('starts with null user and tokens', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  const mockUser = {
    id: '1',
    username: 'test',
    email: 'test@test.com',
    xp: 0,
    level: 1,
    streak: 0,
    streak_freeze: 0,
    last_active: null,
    email_verified_at: null,
    avatar_color: '#4F46E5',
    role: 'user',
    is_active: true,
    referral_code: 'ABC123',
    avatar_url: '',
    created_at: '',
    updated_at: '',
  };

  it('setAuth stores user and tokens', () => {
    useAuthStore.getState().setAuth(mockUser, 'abc', 'xyz');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('abc');
    expect(state.refreshToken).toBe('xyz');
  });

  it('setTokens updates tokens without changing user', () => {
    useAuthStore.getState().setAuth(mockUser, 'old', 'old-refresh');
    useAuthStore.getState().setTokens('new', 'new-refresh');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('new');
    expect(state.refreshToken).toBe('new-refresh');
  });

  it('logout clears user and tokens', () => {
    useAuthStore.getState().setAuth(mockUser, 'abc', 'xyz');
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
