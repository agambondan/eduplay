import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Challenge | EduPlay',
  description: 'Main daily challenge setiap hari untuk bonus XP 2x! Tantangan soal baru setiap hari.',
};

export default function DailyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
