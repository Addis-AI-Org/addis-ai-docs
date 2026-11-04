'use client';

import { ExternalLink } from 'lucide-react';
import { SITE_URL as siteUrl } from '@/lib/site';

const action =
  'inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-primary';

export function PageActions({ markdownUrl }: { markdownUrl: string }) {
  // Same value on server and client: a window-based URL would cause a hydration
  // mismatch that React 19 does not patch, leaving relative links for the AI tools.
  const absolute = new URL(markdownUrl, siteUrl).href;
  const prompt = encodeURIComponent(`Read ${absolute} so I can ask questions about it.`);

  return (
    <div className="not-prose flex flex-wrap items-center gap-2">
      <a className={action} href={`https://chatgpt.com/?hints=search&q=${prompt}`} target="_blank" rel="noopener noreferrer">
        Open in ChatGPT <ExternalLink aria-hidden="true" className="size-3" />
      </a>
      <a className={action} href={`https://claude.ai/new?q=${prompt}`} target="_blank" rel="noopener noreferrer">
        Open in Claude <ExternalLink aria-hidden="true" className="size-3" />
      </a>
    </div>
  );
}
