import { docs } from 'fumadocs-mdx:collections/server';
import type * as PageTree from 'fumadocs-core/page-tree';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { createElement } from 'react';

const newDocUrls = new Set([
  '/docs/announcements',
  '/docs/get-started/node-sdk',
  '/docs/get-started/python-sdk',
  '/docs/core-concepts/system-instructions',
  '/docs/core-concepts/personas',
  '/docs/core-concepts/function-calling',
  '/docs/guides/voice',
]);

const newDocsPlugin = {
  transformPageTree: {
    file(node: PageTree.Item): PageTree.Item {
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
                'shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-emerald-700 dark:text-emerald-300',
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
  plugins: [lucideIconsPlugin(), newDocsPlugin],
});

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
