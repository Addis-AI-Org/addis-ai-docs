import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { NextResponse, type NextRequest } from 'next/server';

const STATUS_HOST = 'status.addisassistant.com';

const { rewrite: rewriteDocsToMarkdown } = rewritePath('/docs/*path', '/llms.mdx/*path');

export function proxy(request: NextRequest) {
  if (isMarkdownPreferred(request)) {
    const markdownPath = rewriteDocsToMarkdown(request.nextUrl.pathname);
    if (markdownPath) return NextResponse.rewrite(new URL(markdownPath, request.nextUrl));
  }

  const host = request.headers.get('host')?.split(':')[0];
  if (host !== STATUS_HOST) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (url.pathname === '/') {
    url.pathname = '/docs/platform/status';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
