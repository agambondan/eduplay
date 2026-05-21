import { ScoreBoard } from '../ScoreBoard';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ScoreBoard', () => {
  it('renders score with default label', () => {
    render(<ScoreBoard score={42} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('renders score with custom label', () => {
    render(<ScoreBoard score={99} label="Points" />);
    expect(screen.getByText('Points:')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('shows green text for non-negative scores', () => {
    render(<ScoreBoard score={0} />);
    const span = screen.getByText('0');
    expect(span.className).toContain('text-emerald-600');
  });

  it('shows red text for negative scores', () => {
    render(<ScoreBoard score={-5} />);
    const span = screen.getByText('-5');
    expect(span.className).toContain('text-rose-600');
  });
});
