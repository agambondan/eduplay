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
];

export default function sitemap(): MetadataRoute.Sitemap {
    const staticPages: MetadataRoute.Sitemap = [
        { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${BASE_URL}/games`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
        { url: `${BASE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
        { url: `${BASE_URL}/daily`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${BASE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
        { url: `${BASE_URL}/terms-of-service`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ];

    const gamePages: MetadataRoute.Sitemap = games.map((slug) => ({
        url: `${BASE_URL}/games/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    return [...staticPages, ...gamePages];
}
