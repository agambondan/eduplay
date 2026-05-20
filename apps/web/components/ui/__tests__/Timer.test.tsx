import { Timer } from '../Timer';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/lib/stores/gameStore';

beforeEach(() => {
  vi.useFakeTimers();
  useGameStore.getState().resetGame();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Timer', () => {
  it('renders initial seconds', () => {
    render(<Timer initialSeconds={30} />);
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('decrements every second', () => {
    render(<Timer initialSeconds={5} />);
    expect(screen.getByText('5s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('4s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('2s')).toBeInTheDocument();
  });

  it('updates game store timeLeft on tick', () => {
    render(<Timer initialSeconds={5} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useGameStore.getState().timeLeft).toBe(4);
  });

  it('calls onTimeUp when timer hits zero', () => {
    const onTimeUp = vi.fn();
    render(<Timer initialSeconds={2} onTimeUp={onTimeUp} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it('does not tick when not running', () => {
    render(<Timer initialSeconds={10} isRunning={false} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('10s')).toBeInTheDocument();
  });

  it('shows red pulse class when seconds <= 10', () => {
    render(<Timer initialSeconds={5} />);
    const span = screen.getByText('5s');
    expect(span.className).toContain('text-rose-600');
  });
});
