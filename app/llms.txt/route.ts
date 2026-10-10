import { getIndexablePages } from '@/lib/source';
import { ORGANIZATION_DEFINITION, SITE_URL } from '@/lib/site';

// llms.txt (https://llmstxt.org): an index of the docs for AI assistants.
// The full text of every page is at /llms-full.txt.
export const revalidate = false;

export function GET() {
  const pages = getIndexablePages()
    .map((page) => {
      const description = page.data.description
        ? `: ${page.data.description}`
        : '';
      return `- [${page.data.title}](${SITE_URL}${page.url})${description}`;
    })
    .join('\n');

  const body = `# Addis AI Documentation

> ${ORGANIZATION_DEFINITION}

API and SDK documentation for Addis AI: text generation, speech-to-text, text-to-speech, translation and realtime voice in Amharic and Afaan Oromo. Developer platform: https://addisassistant.com. Company site: https://addisai.ch. Full text of every page: ${SITE_URL}/llms-full.txt

## Pages

${pages}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
