'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const STORAGE_KEY = 'eduplay-cookie-consent';

export function ConsentAwareScripts() {
  const [consent, setConsent] = useState<string | null>(null);

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    setConsent(v);
  }, []);

  if (consent !== 'accepted') return null;

  return (
    <>
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
    </>
  );
}
