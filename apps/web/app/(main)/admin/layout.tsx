import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | EduPlay',
  description: 'Panel admin EduPlay — kelola user, game, dan pengaturan platform.',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
