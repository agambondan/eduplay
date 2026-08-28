import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export function WebAppJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'id-ID',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function GameJsonLd({
  name,
  description,
  gameSlug,
}: {
  name: string;
  description: string;
  gameSlug: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name,
    description,
    url: `${SITE_URL}/games/${gameSlug}`,
    applicationCategory: 'GameApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
