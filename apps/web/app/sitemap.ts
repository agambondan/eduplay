import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://eduplay.id';

const games = [
  'math-quiz',
  'times-table',
  'mental-math',
  'bubble-shooter',
  'wordle',
  'spelling-bee',
  'word-search',
  'crossword',
  'flag-quiz',
  'capital-quiz',
  'sudoku',
  '2048',
  'nonogram',
  'element-quiz',
  'timeline-history',
  'brick-breaker',
  'math-battle',
  'math-tournament',
  'memory-match',
  'typing-speed',
  'simon-says',
  'snake',
  'trivia-challenge',
  'word-chain',
  'battleship-math',
  'number-match',
  'fraction-visualizer',
  'onet',
];

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
  ];
}
