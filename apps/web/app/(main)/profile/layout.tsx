import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/profile' },
  robots: { index: false, follow: false },
  title: 'Profil',
  description: 'Lihat profil, XP, level, streak, dan pencapaian kamu di EduPlay.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
