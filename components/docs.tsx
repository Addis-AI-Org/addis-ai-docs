import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function StatusBadge({
  children,
  status = 'ga',
}: {
  children: ReactNode;
  status?: 'ga' | 'beta' | 'deprecated';
}) {
  const styles = {
    ga: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    beta: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    deprecated: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  };

  return (
    <span className={cn('not-prose inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', styles[status])}>
      {children}
    </span>
  );
}

export function NewBadge({ children = 'New' }: { children?: ReactNode }) {
  return (
    <span className="not-prose inline-flex rounded-full border border-fd-primary/35 bg-fd-primary/10 px-2.5 py-1 text-xs font-semibold text-fd-primary">
      {children}
    </span>
  );
}

export function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="not-prose my-4 flex items-center gap-3 rounded-lg border bg-fd-card px-4 py-3 font-mono text-sm">
      <span className="rounded bg-fd-primary px-2 py-1 text-xs font-bold text-fd-primary-foreground">
        {method.toUpperCase()}
      </span>
      <span className="overflow-x-auto">{path}</span>
    </div>
  );
}

export function RestDisclosure({ children }: { children: ReactNode }) {
  return (
    <details className="not-prose my-6 rounded-lg border bg-fd-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
        View raw REST request
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}

export function LastVerified({ date }: { date: string }) {
  return (
    <p className="not-prose text-xs text-fd-muted-foreground">
      Contract last verified: <time dateTime={date}>{date}</time>
    </p>
  );
}

export function AudioPreview({ src, title }: { src: string; title: string }) {
  return (
    <figure className="not-prose my-5 rounded-xl border bg-fd-card p-4">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      <audio className="w-full" controls preload="none" src={src}>
        Your browser does not support audio playback.
      </audio>
    </figure>
  );
}
