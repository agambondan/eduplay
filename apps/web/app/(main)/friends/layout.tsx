import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/friends' },
  robots: { index: false, follow: false },
  title: 'Teman',
  description: 'Tambah teman, lihat leaderboard teman, dan bersaing di EduPlay.',
};

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
