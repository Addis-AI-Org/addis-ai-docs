'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, CircleHelp, CircleX, Loader2, TriangleAlert, type LucideIcon } from 'lucide-react';
import { StatusBadge } from '@/components/docs';
import { cn } from '@/lib/cn';
import {
  STATE_DOTS, STATUS_REFRESH_MS, STATUS_TIMEOUT_MS, STATUS_URL,
  activeIncidents, componentLabel, fetchStatus, groupComponents, normalizeState, overallLabel,
  type StatusSnapshot, type StatusState,
} from '@/lib/status-client';

const statusHost = STATUS_URL.replace(/^https?:\/\//, '');
const overallIcons: Record<StatusState, { icon: LucideIcon; tone: string }> = {
  operational: { icon: CheckCircle2, tone: 'text-green-500' },
  degraded: { icon: TriangleAlert, tone: 'text-amber-500' },
  partial_outage: { icon: TriangleAlert, tone: 'text-orange-500' },
  major_outage: { icon: CircleX, tone: 'text-red-500' },
  no_data: { icon: CircleHelp, tone: 'text-fd-muted-foreground' },
};
const formatTime = (ms: number) => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const humanize = (value: string) => value.replace(/_/g, ' ');

function StatusLink({ className }: { className?: string }) {
  return (
    <a href={STATUS_URL} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-1 font-medium text-fd-primary hover:underline', className)}>
      {statusHost}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </a>
  );
}

export function LiveStatus() {
  const [data, setData] = useState<StatusSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let controller: AbortController | undefined;
    let alive = true;
    const load = async () => {
      if (document.hidden && controller) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timeout = setTimeout(() => current.abort(), STATUS_TIMEOUT_MS);
      try {
        const snapshot = await fetchStatus(current.signal);
        if (alive && controller === current) { setData(snapshot); setFailed(false); }
      } catch {
        if (alive && controller === current) setFailed(true);
      } finally {
        clearTimeout(timeout);
      }
    };
    void load();
    const interval = setInterval(() => void load(), STATUS_REFRESH_MS);
    return () => { alive = false; clearInterval(interval); controller?.abort(); };
  }, []);

  if (!data) {
    return (
      <div className="not-prose addis-offset-shell my-6">
        <div className="addis-panel p-5" aria-live="polite">
          {failed ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-fd-foreground">
              <CircleHelp className="size-4 text-fd-muted-foreground" aria-hidden="true" />
              <span>Live status unavailable — see <StatusLink className="font-semibold" /></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-fd-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading live status…
            </div>
          )}
        </div>
      </div>
    );
  }

  const overall = normalizeState(data.overall);
  const { icon: OverallIcon, tone } = overallIcons[overall];
  const groups = groupComponents(data.components);
  const incidents = activeIncidents(data.incidents);

  return (
    <div className="not-prose addis-offset-shell my-6">
      <div className="addis-panel" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fd-border px-5 py-4">
          <div className="flex items-center gap-2 text-base font-semibold text-fd-foreground">
            <OverallIcon className={cn('size-5', tone)} aria-hidden="true" />
            {overallLabel(overall)}
          </div>
          <time className="font-mono text-[10px] uppercase tracking-[0.14em] text-fd-muted-foreground" dateTime={new Date(data.updated).toISOString()}>
            Updated {formatTime(data.updated)}
          </time>
        </div>

        {failed && (
          <p className="m-0 border-b border-fd-border px-5 py-2 text-xs text-fd-muted-foreground">
            Live status unavailable — see <StatusLink />. Showing the last successful update.
          </p>
        )}

        {incidents.length > 0 && (
          <div className="border-b border-fd-border px-5 py-4">
            <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-fd-primary">Active incidents</div>
            <ul className="m-0 list-none space-y-3 p-0">
              {incidents.map(incident => (
                <li key={incident.id} className="text-sm">
                  <div className="flex items-start gap-2 font-semibold text-fd-foreground">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
                    {incident.title}
                  </div>
                  <p className="m-0 mt-1 pl-6 text-xs capitalize text-fd-muted-foreground">
                    {humanize(incident.severity)} · {humanize(incident.status)} · since {formatTime(incident.started_at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {groups.length === 0 ? (
          <p className="m-0 px-5 py-4 text-sm text-fd-muted-foreground">No components are reporting yet.</p>
        ) : groups.map(({ group, components }) => (
          <div key={group} className="border-b border-fd-border last:border-b-0">
            <div className="px-5 pt-4 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-fd-muted-foreground">{group}</div>
            <ul className="m-0 list-none p-0">
              {components.map(component => (
                <li key={component.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-fd-foreground">
                    {component.name}
                    {component.stage === 'beta' && <StatusBadge status="beta">Beta</StatusBadge>}
                  </span>
                  <span className="flex items-center gap-2 text-fd-muted-foreground" title={component.note}>
                    <span className={cn('size-2 rounded-full', STATE_DOTS[normalizeState(component.state)])} aria-hidden="true" />
                    {componentLabel(component)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fd-border px-5 py-3 text-xs text-fd-muted-foreground">
          <span>Refreshes every minute.</span>
          <span>Full history and incident details at <StatusLink /></span>
        </div>
      </div>
    </div>
  );
}
