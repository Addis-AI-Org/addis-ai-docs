import { source } from '@/lib/source';
import { siteUrl } from '@/lib/site-url';

export const revalidate = false;

export function GET() {
  const lines = source.getPages().map((page) => {
    const description = page.data.description ? `: ${page.data.description}` : '';
    return `- [${page.data.title}](${siteUrl}${page.url}.mdx)${description}`;
  });

  const body = [
    '# Addis AI Documentation',
    '',
    '> APIs and official Node.js and Python SDKs for text generation, speech-to-text, Addis Voices 2, translation, multimodal reasoning, and realtime voice in Amharic and Afaan Oromo.',
    '',
    `Full text: ${siteUrl}/llms-full.txt`,
    '',
    '## Pages',
    '',
    ...lines,
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
