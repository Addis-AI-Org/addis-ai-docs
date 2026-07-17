import type { MetadataRoute } from 'next';

import { source } from '@/lib/source';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.addisassistant.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => ({
    url: `${siteUrl}${page.url}`,
    lastModified: new Date('2026-07-17'),
    changeFrequency: 'weekly',
    priority: page.url === '/docs/overview' ? 1 : 0.8,
  }));
}
