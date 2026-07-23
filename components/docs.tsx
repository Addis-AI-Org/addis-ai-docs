import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function StatusBadge({
  children,
  status,
}: {
  children: ReactNode;
  status: 'beta' | 'deprecated';
}) {
  const styles = {
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

export function LastVerified({ date }: { date: string }) {
  return (
    <p className="not-prose text-xs text-fd-muted-foreground">
      Contract last verified: <time dateTime={date}>{date}</time>
    </p>
  );
}
