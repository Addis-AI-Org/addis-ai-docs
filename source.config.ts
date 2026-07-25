import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { z } from 'zod';
import {
  rehypeCodeDefaultOptions,
  remarkSteps,
} from 'fumadocs-core/mdx-plugins';
import { remarkAutoTypeTable } from 'fumadocs-typescript';

type HastNode = {
  type: string;
  value?: string;
  children?: HastNode[];
};

export const docs = defineDocs({
  docs: {
    schema: frontmatterSchema.extend({
      preview: z.string().optional(),
      index: z.boolean().default(false),
      isNew: z.boolean().default(false),
      /**
       * API routes only
       */
      method: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema.extend({
      description: z.string().optional(),
    }),
  },
});

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.iso.date().or(z.date()),
  }),
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      lazy: true,
      langs: ['ts', 'js', 'html', 'tsx', 'mdx'],
      inline: 'tailing-curly-colon',
      themes: {
        light: 'catppuccin-latte',
        dark: 'catppuccin-mocha',
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
        }),
        {
          name: '@shikijs/transformers:remove-notation-escape',
          code(hast) {
            function replace(node: HastNode): void {
              if (node.type === 'text' && typeof node.value === 'string') {
                node.value = node.value.replace('[\\!code', '[!code');
              } else if (Array.isArray(node.children)) {
                for (const child of node.children) {
                  replace(child);
                }
              }
            }

            replace(hast);
            return hast;
          },
        },
      ],
    },
    remarkCodeTabOptions: {
      parseMdx: true,
    },
    remarkNpmOptions: {
      persist: {
        id: 'package-manager',
      },
    },
    remarkPlugins: [
      remarkSteps,
      remarkMath,
      remarkAutoTypeTable,
    ],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});
