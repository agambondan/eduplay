import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bantuan | EduPlay',
  description: 'Hubungi tim dukungan EduPlay untuk laporan bug, saran, atau pertanyaan.',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
