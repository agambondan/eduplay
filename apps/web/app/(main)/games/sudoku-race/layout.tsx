import type { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';

export const metadata: Metadata = gameMetadata('sudoku-race');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
