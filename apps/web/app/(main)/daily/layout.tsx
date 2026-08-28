import type { Metadata } from 'next';
import { openGraphFor } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/daily' },
  openGraph: openGraphFor('/daily'),
  title: 'Daily Challenge',
  description:
    'Main daily challenge setiap hari untuk bonus XP 2x! Tantangan soal baru setiap hari.',
};

export default function DailyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
