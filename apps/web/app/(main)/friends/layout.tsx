import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teman | EduPlay',
  description: 'Tambah teman, lihat leaderboard teman, dan bersaing di EduPlay.',
};

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
