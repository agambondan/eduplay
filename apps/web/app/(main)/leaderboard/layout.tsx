import type { Metadata } from 'next';
import { openGraphFor } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/leaderboard' },
  openGraph: openGraphFor('/leaderboard'),
  title: 'Peringkat',
  description:
    'Lihat peringkat pemain terbaik di semua game EduPlay. Bersaing untuk menjadi yang teratas!',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
