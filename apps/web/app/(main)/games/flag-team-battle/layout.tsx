import type { Metadata } from 'next';
import { gameMetadata } from '@/lib/games-seo';

export const metadata: Metadata = gameMetadata('flag-team-battle');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
