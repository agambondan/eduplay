import type { Metadata } from 'next';
import { openGraphFor } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Tips belajar, panduan game edukatif, dan artikel seputar pendidikan untuk pelajar dan orang tua.',
  alternates: { canonical: '/blog' },
  openGraph: openGraphFor('/blog'),
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
