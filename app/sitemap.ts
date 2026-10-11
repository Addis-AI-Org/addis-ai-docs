import type { MetadataRoute } from 'next';
import { getIndexablePages } from '@/lib/source';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return getIndexablePages().map((page) => ({
    url: `${SITE_URL}${page.url}`,
    changeFrequency: 'weekly',
    priority: page.url === '/docs' ? 1 : 0.7,
  }));
}
