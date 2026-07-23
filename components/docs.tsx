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

export function NewBadge({
  children = 'New',
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-label="New"
      className={cn(
        'not-prose inline-flex shrink-0 items-center rounded-full border border-fd-primary/35 bg-fd-primary/10 px-2.5 py-1 text-xs font-semibold leading-none text-fd-primary',
        className,
      )}
    >
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
    <div className="not-prose addis-offset-shell my-10">
      <div className="relative border border-fd-border bg-fd-background">
        <div className="flex items-stretch justify-between border-b border-fd-border">
          <div className="flex items-center gap-2 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-fd-primary">
            <Megaphone aria-hidden="true" className="size-3.5" />
            Product updates
          </div>
          <time
            className="flex items-center border-l border-fd-border px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-fd-muted-foreground"
            dateTime={date}
          >
            {date}
          </time>
        </div>
        <div className="px-6 py-8 sm:px-9 sm:py-10">
          <div className="mb-6 h-px w-9 bg-fd-primary" aria-hidden="true" />
          <p className="m-0 max-w-2xl text-2xl font-semibold tracking-tight text-fd-foreground sm:text-3xl">
            Built for the next generation of Addis AI applications.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-fd-muted-foreground sm:text-base">
            {children}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementFeed({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose addis-offset-shell my-10">
      <div className="relative border border-fd-border bg-fd-background">
        {children}
      </div>
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
    <article className="group relative grid border-b border-fd-border bg-fd-background transition-colors last:border-b-0 hover:bg-fd-accent/20 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <div className="flex items-start gap-2 border-b border-fd-border px-5 py-5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fd-muted-foreground sm:border-b-0 sm:border-r sm:py-7">
        <span aria-hidden="true" className="mt-1.5 h-px w-4 shrink-0 bg-fd-primary" />
        <span>{label}</span>
      </div>
      <div className="min-w-0 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-xl font-semibold tracking-tight text-fd-foreground">
            {title}
          </h2>
          {isNew ? <NewBadge /> : null}
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
