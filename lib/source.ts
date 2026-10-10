import { docs } from 'fumadocs-mdx:collections/server';
import type * as PageTree from 'fumadocs-core/page-tree';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { createElement } from 'react';

const newDocUrls = new Set([
  '/docs/get-started/sdks',
  '/docs/capabilities/text-to-speech',
  '/docs/capabilities/speech-to-text',
  '/docs/capabilities/streaming',
  '/docs/capabilities/text-to-speech/streaming',
  '/docs/capabilities/speech-to-text/live',
]);

const navigationLabelsPlugin = {
  transformPageTree: {
    file(node: PageTree.Item): PageTree.Item {
      if (node.url === '/docs/announcements') {
        return {
          ...node,
          name: createElement('strong', null, node.name),
        };
      }

      if (!newDocUrls.has(node.url)) return node;

      return {
        ...node,
        name: createElement(
          'span',
          { className: 'flex min-w-0 flex-1 items-center justify-between gap-2' },
          createElement('span', { className: 'truncate' }, node.name),
          createElement(
            'span',
            {
              className:
                'shrink-0 rounded-full border border-fd-primary/35 bg-fd-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-fd-primary',
              'aria-label': 'New documentation',
            },
            'New',
          ),
        ),
      };
    },
  },
};

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin(), navigationLabelsPlugin],
});

/**
 * Pages kept out of search indexes, the sitemap and llms.txt. The quick-start
 * page is leftover Fumadocs scaffolding ("Getting Started with Fumadocs") and
 * describes the docs framework, not Addis AI.
 */
const unindexedDocUrls = new Set(['/docs/get-started/quick-start']);

export function isIndexable(page: InferPageType<typeof source>) {
  return !unindexedDocUrls.has(page.url);
}

export function getIndexablePages() {
  return source.getPages().filter(isIndexable);
}

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
