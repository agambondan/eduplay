import type { Metadata } from 'next';
import { openGraphFor } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Challenge',
  description: 'Tantang teman lewat challenge kuis dan game edukatif EduPlay.',
  alternates: { canonical: '/challenge' },
  openGraph: openGraphFor('/challenge'),
};

export default function ChallengeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
