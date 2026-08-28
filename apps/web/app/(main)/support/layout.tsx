import type { Metadata } from 'next';
import { openGraphFor } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/support' },
  openGraph: openGraphFor('/support'),
  title: 'Bantuan',
  description: 'Hubungi tim dukungan EduPlay untuk laporan bug, saran, atau pertanyaan.',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
