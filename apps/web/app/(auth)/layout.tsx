import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Masuk | EduPlay — Game Edukasi Online',
  description: 'Daftar atau masuk ke akun EduPlay untuk mulai bermain game edukasi online gratis. Matematika, bahasa, geografi, dan logika.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
