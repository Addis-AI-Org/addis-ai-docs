import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((page) => ({ url: `${siteUrl}${page.url}` }));
  const playgrounds = ['/docs/playground/speech-to-text', '/docs/playground/text-to-speech'].map((path) => ({
    url: `${siteUrl}${path}`,
  }));
  return [...pages, ...playgrounds];
}
