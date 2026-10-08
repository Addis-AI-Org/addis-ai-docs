'use client';

import { useState } from 'react';
import { ArrowUpRight, Copy, Expand } from 'lucide-react';

export function DemoNavigation({ fullPage, href, docsHref }: { fullPage: boolean; href: string; docsHref: string }) {
  const [message, setMessage] = useState('');
  const link = 'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-fd-muted-foreground hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-primary';
  async function share() {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
      setMessage('Link copied');
    } catch {
      setMessage('Copy the page URL from your address bar.');
    }
  }
  return (
    <nav aria-label="Demo navigation" className="mb-4 flex flex-wrap items-center justify-end gap-2">
      {fullPage ? <>
        <a href={docsHref} target="_blank" rel="noopener noreferrer" className={link}>Docs</a>
        <a href="https://addisassistant.com" target="_blank" rel="noopener noreferrer" className={link}>Addis AI<ArrowUpRight aria-hidden="true" className="size-3.5" /></a>
        <button type="button" onClick={share} className={link}><Copy aria-hidden="true" className="size-3.5" />Copy link</button>
        <span role="status" className="text-xs text-fd-muted-foreground">{message}</span>
      </> : <a href={href} target="_blank" rel="noopener noreferrer" className={link}><Expand aria-hidden="true" className="size-3.5" />Full page</a>}
    </nav>
  );
}
