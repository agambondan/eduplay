import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from '../toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useRealTimers();
  });

  it('adds toast to the store with correct default type and duration', () => {
    useToastStore.getState().addToast('Sample message');
    const toasts = useToastStore.getState().toasts;

    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Sample message');
    expect(toasts[0].type).toBe('info');
    expect(toasts[0].duration).toBe(3000);
  });

  it('removes toast by id', () => {
    useToastStore.getState().addToast('Toast 1');
    const id = useToastStore.getState().toasts[0].id;

    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it('dispatches helper functions for different toast types', () => {
    toast.success('Success message');
    toast.error('Error message');
    toast.warning('Warning message');
    toast.info('Info message');

    const toasts = useToastStore.getState().toasts;
    expect(toasts.length).toBe(4);
    expect(toasts[0].type).toBe('success');
    expect(toasts[1].type).toBe('error');
    expect(toasts[2].type).toBe('warning');
    expect(toasts[3].type).toBe('info');
  });

  it('auto-dismisses toast after duration', () => {
    vi.useFakeTimers();
    useToastStore.getState().addToast('Auto dismiss', 'info', 1000);

    expect(useToastStore.getState().toasts.length).toBe(1);
    vi.advanceTimersByTime(1001);

    expect(useToastStore.getState().toasts.length).toBe(0);
  });
});
