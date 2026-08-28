import { MetadataRoute } from 'next';
import { GAME_SEO } from '@/lib/games-seo';
import { SITE_URL as BASE_URL } from '@/lib/site';

// Single source of truth: every route under app/(main)/games has a GAME_SEO entry.
const games = Object.keys(GAME_SEO);

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '',
    '/games',
    '/daily',
    '/leaderboard',
    '/about',
    '/privacy-policy',
    '/terms-of-service',
    '/support',
  ];

  const blogSlugs = [
    'belajar-matematika-seru-dengan-game-edukasi',
    'manfaat-bermain-puzzle-untuk-kecerdasan-otak',
    'mengenal-wordle-bahasa-indonesia',
  ];

  return [
    ...staticPages.map((path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '' ? 1.0 : 0.8,
    })),
    ...games.map((slug) => ({
      url: `${BASE_URL}/games/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    ...blogSlugs.map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
