import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Peringkat | EduPlay',
  description: 'Lihat peringkat pemain terbaik di semua game EduPlay. Bersaing untuk menjadi yang teratas!',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
