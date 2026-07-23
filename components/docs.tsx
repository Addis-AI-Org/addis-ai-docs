import type { ReactNode } from 'react';
import { ArrowUpRight, Megaphone } from 'lucide-react';

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

export function AnnouncementHero({
  children,
  date,
}: {
  children: ReactNode;
  date: string;
}) {
  return (
    <div className="not-prose relative my-8 overflow-hidden rounded-2xl border border-fd-primary/20 bg-gradient-to-br from-fd-primary/12 via-fd-card to-fd-card px-6 py-7 sm:px-8 sm:py-9">
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-20 size-56 rounded-full bg-fd-primary/10 blur-3xl"
      />
      <div className="relative max-w-2xl">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fd-primary">
          <span className="grid size-7 place-items-center rounded-full border border-fd-primary/25 bg-fd-primary/10">
            <Megaphone aria-hidden="true" className="size-3.5" />
          </span>
          Product updates
        </div>
        <p className="m-0 text-2xl font-semibold tracking-tight text-fd-foreground sm:text-3xl">
          Built for the next generation of Addis AI applications.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-6 text-fd-muted-foreground sm:text-base">
          {children}
        </p>
        <time
          className="mt-6 inline-flex rounded-full border border-fd-border bg-fd-background/70 px-3 py-1.5 text-xs font-medium text-fd-muted-foreground"
          dateTime={date}
        >
          Released {date}
        </time>
      </div>
    </div>
  );
}

export function AnnouncementFeed({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-8 divide-y divide-fd-border overflow-hidden rounded-2xl border border-fd-border bg-fd-card/50 shadow-sm">
      {children}
    </div>
  );
}

export function AnnouncementItem({
  children,
  label,
  title,
  isNew = false,
}: {
  children: ReactNode;
  label: string;
  title: string;
  isNew?: boolean;
}) {
  return (
    <article className="group relative grid gap-4 p-5 transition-colors hover:bg-fd-accent/30 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6 sm:p-7">
      <div className="flex items-center gap-2 self-start pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-fd-muted-foreground">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-fd-primary" />
        {label}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <h2 className="m-0 text-xl font-semibold tracking-tight text-fd-foreground">
            {title}
          </h2>
          {isNew ? (
            <span className="shrink-0">
              <NewBadge />
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-3 text-sm leading-6 text-fd-muted-foreground [&_a]:font-medium [&_a]:text-fd-foreground [&_a]:underline [&_a]:decoration-fd-primary/50 [&_a]:underline-offset-4 [&_a:hover]:text-fd-primary [&_li]:pl-1 [&_p]:m-0 [&_ul]:my-0 [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </article>
  );
}

export function AnnouncementLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <a
      className="mt-1 inline-flex items-center gap-1.5 font-semibold text-fd-foreground no-underline transition-colors hover:text-fd-primary"
      href={href}
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
    </a>
  );
}
