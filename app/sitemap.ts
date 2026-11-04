import type { MetadataRoute } from 'next';
import { getIndexablePages } from '@/lib/source';
import { SITE_URL } from '@/lib/site';

// Public pages that are app routes rather than MDX documents. Every
// app/docs/playground/*/page.tsx must be listed (tests/seo.test.mjs).
const APP_ROUTES = ['/docs/playground/speech-to-text', '/docs/playground/text-to-speech'];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...getIndexablePages().map((page) => ({
      url: `${SITE_URL}${page.url}`,
      changeFrequency: 'weekly' as const,
      priority: page.url === '/docs' ? 1 : 0.7,
    })),
    ...APP_ROUTES.map((route) => ({
      url: `${SITE_URL}${route}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
