import type { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';

export const metadata: Metadata = gameMetadata('word-chain');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
