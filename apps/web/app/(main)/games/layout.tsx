import type { Metadata } from 'next';
import { openGraphFor } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: 'Semua Game Edukatif', template: '%s | EduPlay' },
  description:
    'Jelajahi 36 mini game edukatif gratis: matematika, bahasa Indonesia, geografi, sains, sejarah, dan puzzle logika.',
  alternates: { canonical: '/games' },
  openGraph: openGraphFor('/games'),
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
