import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('starts with null user and tokens', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('setAuth stores user and tokens', () => {
    const user = { id: '1', username: 'test', email: 'test@test.com', xp: 0, level: 1, streak: 0, last_active: null, is_active: true, created_at: '', updated_at: '' };
    useAuthStore.getState().setAuth(user, 'abc', 'xyz');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('abc');
    expect(state.refreshToken).toBe('xyz');
  });

  it('setTokens updates tokens without changing user', () => {
    const user = { id: '1', username: 'test', email: 'test@test.com', xp: 0, level: 1, streak: 0, last_active: null, is_active: true, created_at: '', updated_at: '' };
    useAuthStore.getState().setAuth(user, 'old', 'old-refresh');
    useAuthStore.getState().setTokens('new', 'new-refresh');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('new');
    expect(state.refreshToken).toBe('new-refresh');
  });

  it('logout clears user and tokens', () => {
    useAuthStore.getState().setAuth({ id: '1', username: 'test', email: 'test@test.com', xp: 0, level: 1, streak: 0, last_active: null, is_active: true, created_at: '', updated_at: '' }, 'abc', 'xyz');
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
