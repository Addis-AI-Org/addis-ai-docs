import { defineConfig } from 'fumadocs-mdx/config';
import { visit } from 'unist-util-visit';

export { blog, docs } from './source.config';

function remarkElementIds() {
  return (tree: unknown, vfile: unknown) => {
    const file = vfile as { data?: { elementIds?: string[] } };
    file.data ??= {};
    file.data.elementIds ??= [];

    // The visitor's MDX node types are supplied by the parser at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visit(tree as any, 'mdxJsxFlowElement', (element) => {
      if (!element.name || !element.attributes) return;

      const idAttr = element.attributes.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (attr: any) => attr.type === 'mdxJsxAttribute' && attr.name === 'id',
      );

      if (idAttr && typeof idAttr.value === 'string') {
        file.data!.elementIds!.push(idAttr.value);
      }
    });
  };
}

export default defineConfig({
  mdxOptions: {
    valueToExport: ['elementIds', 'toc'],
    remarkNpmOptions: {
      persist: {
        id: 'package-manager',
      },
    },
    remarkHeadingOptions: {
      generateToc: true,
    },
    remarkPlugins: [remarkElementIds],
    rehypePlugins: () => [],
  },
});
