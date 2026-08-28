const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://games.jangkauin.site';

/** Canonical origin of the deployed site, never with a trailing slash. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, '');

export const SITE_NAME = 'EduPlay';

export const SITE_DESCRIPTION =
  'Platform mini game edukatif gratis untuk pelajar SD hingga SMA — matematika, bahasa, sains, dan puzzle logika.';

/**
 * Static Open Graph card. Kept as a real `.png` file rather than a generated
 * route because WhatsApp/Telegram crawlers only reliably preview image URLs
 * that end in a known extension and answer fast with a small payload.
 */
export const OG_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: 'EduPlay — 30+ game edukatif gratis untuk pelajar SD sampai SMA',
} as const;

/** Absolute URL for a site-relative path. */
export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Open Graph block for one route.
 *
 * Next.js replaces — never merges — a parent segment's `openGraph`, so a child
 * that sets only `url` would silently drop the site's og:image and og:site_name.
 * Every route that needs its own og:url must go through this helper.
 * (`title`/`description` are filled in by Next from the route's own metadata.)
 */
export const openGraphFor = (path = '/', extra: Record<string, unknown> = {}) => ({
  type: 'website' as const,
  siteName: SITE_NAME,
  locale: 'id_ID',
  url: path,
  images: [OG_IMAGE],
  ...extra,
});
