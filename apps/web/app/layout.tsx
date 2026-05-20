import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { AchievementToast } from '@/components/ui/AchievementToast';
import { WebAppJsonLd } from '@/components/seo/JsonLd';
import { SkipLink } from '@/components/layout/SkipLink';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CookieBanner } from '@/components/layout/CookieBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EduPlay — Educational Mini Games',
  description: 'Platform mini game edukatif untuk pelajar SD hingga SMA',
  manifest: '/manifest.json',
  themeColor: '#4F46E5',
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
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </head>
        <body className={inter.className}>
          <SkipLink />
          <Providers>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <AchievementToast />
            <CookieBanner />
          </Providers>
          <WebAppJsonLd />
        </body>
    </html>
  );
}
