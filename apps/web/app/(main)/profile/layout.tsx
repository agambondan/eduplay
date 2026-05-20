import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profil | EduPlay',
  description: 'Lihat profil, XP, level, streak, dan pencapaian kamu di EduPlay.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
