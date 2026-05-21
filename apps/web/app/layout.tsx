import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { ConsentAwareScripts } from '@/components/layout/CookieConsentProvider';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { Providers } from '@/components/layout/Providers';
import { SkipLink } from '@/components/layout/SkipLink';
import { WebAppJsonLd } from '@/components/seo/JsonLd';
import { AchievementToast } from '@/components/ui/AchievementToast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#4F46E5',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://eduplay.id'),
  title: 'EduPlay — Educational Mini Games',
  description: 'Platform mini game edukatif untuk pelajar SD hingga SMA',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'EduPlay',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@eduplay_id',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function(){try{var t=JSON.parse(localStorage.getItem('eduplay-theme'));var e=t&&t.state&&t.state.theme||'system';var n=e==='dark'||(e==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(n)document.documentElement.classList.add('dark')}catch(e){}})()
        `}</Script>
        <ConsentAwareScripts />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SkipLink />
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
          <AchievementToast />
          <CookieBanner />
        </Providers>
        <WebAppJsonLd />
      </body>
    </html>
  );
}
