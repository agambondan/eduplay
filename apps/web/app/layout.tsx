import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { ConsentAwareScripts } from '@/components/layout/CookieConsentProvider';
import { Providers } from '@/components/layout/Providers';
import { SkipLink } from '@/components/layout/SkipLink';
import { WebAppJsonLd } from '@/components/seo/JsonLd';
import { AchievementToast } from '@/components/ui/AchievementToast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: 'EduPlay — Game Edukatif Gratis untuk Pelajar',
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'game edukatif',
    'game edukasi anak',
    'belajar sambil bermain',
    'game matematika',
    'kuis online',
    'game asah otak',
    'wordle indonesia',
    'sudoku online',
    'belajar SD SMP SMA',
  ],
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: 'EduPlay — Game Edukatif Gratis untuk Pelajar',
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@eduplay_id',
    title: 'EduPlay — Game Edukatif Gratis untuk Pelajar',
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
