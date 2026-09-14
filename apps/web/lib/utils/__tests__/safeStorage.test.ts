import { beforeEach, describe, expect, it } from 'vitest';
import { safeStorage } from '../safeStorage';

describe('safeStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and retrieves JSON serializable objects', () => {
    const data = { score: 100, solved: true, tags: ['math', 'quiz'] };
    safeStorage.setItem('test-key', data);

    const retrieved = safeStorage.getItem('test-key', null);
    expect(retrieved).toEqual(data);
  });

  it('returns defaultValue if key does not exist', () => {
    const defaultValue = { empty: true };
    const retrieved = safeStorage.getItem('non-existent-key', defaultValue);
    expect(retrieved).toEqual(defaultValue);
  });

  it('returns defaultValue if stored value is invalid JSON', () => {
    window.localStorage.setItem('corrupted-key', 'INVALID{JSON');
    const retrieved = safeStorage.getItem('corrupted-key', 'fallback');
    expect(retrieved).toBe('fallback');
  });

  it('removes item successfully', () => {
    safeStorage.setItem('item-to-remove', 'val');
    expect(safeStorage.getItem('item-to-remove', null)).toBe('val');

    safeStorage.removeItem('item-to-remove');
    expect(safeStorage.getItem('item-to-remove', null)).toBeNull();
  });
});
