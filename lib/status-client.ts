export const STATUS_URL = (process.env.NEXT_PUBLIC_STATUS_URL || 'https://status.addisassistant.com').replace(/\/+$/, '');
export const STATUS_API = `${STATUS_URL}/api/status.json`;
export const STATUS_TIMEOUT_MS = 10_000;
export const STATUS_REFRESH_MS = 60_000;

export type StatusState = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'no_data';
export type StatusComponent = {
  id: string; group: string; name: string; stage: 'ga' | 'beta'; state: StatusState; cold: boolean; p95?: number; note?: string;
};
export type StatusIncident = {
  id: number; title: string; severity: string; status: string; started_at: number; resolved_at: number | null;
};
export type StatusSnapshot = {
  updated: number; overall: StatusState; components: StatusComponent[]; incidents: StatusIncident[];
};
export type StatusGroup = { group: string; components: StatusComponent[] };

export const STATE_LABELS: Record<StatusState, string> = {
  operational: 'Operational',
  degraded: 'Degraded Performance',
  partial_outage: 'Partial Outage',
  major_outage: 'Major Outage',
  no_data: 'No data',
};
export const STATE_DOTS: Record<StatusState, string> = {
  operational: 'bg-green-500',
  degraded: 'bg-amber-500',
  partial_outage: 'bg-orange-500',
  major_outage: 'bg-red-500',
  no_data: 'bg-fd-muted-foreground/40',
};

export function normalizeState(value: unknown): StatusState {
  return typeof value === 'string' && value in STATE_LABELS ? value as StatusState : 'no_data';
}
export function stateLabel(value: unknown): string {
  return STATE_LABELS[normalizeState(value)];
}
export function overallLabel(value: unknown): string {
  const state = normalizeState(value);
  if (state === 'operational') return 'All systems operational';
  if (state === 'no_data') return 'No live status data yet';
  return STATE_LABELS[state];
}
export function componentLabel(component: Pick<StatusComponent, 'state' | 'cold'>): string {
  const label = stateLabel(component.state);
  return component.cold ? `${label} · cold start` : label;
}
export function groupComponents(components: StatusComponent[]): StatusGroup[] {
  const groups = new Map<string, StatusComponent[]>();
  for (const component of components) {
    const key = component.group || 'Other';
    groups.set(key, [...(groups.get(key) ?? []), component]);
  }
  return [...groups].map(([group, items]) => ({ group, components: items }));
}
export function activeIncidents(incidents: StatusIncident[]): StatusIncident[] {
  return incidents.filter(incident => incident.resolved_at == null).sort((a, b) => b.started_at - a.started_at);
}
export function parseStatus(body: unknown): StatusSnapshot {
  if (!body || typeof body !== 'object') throw new Error('Status response is not an object.');
  const raw = body as Record<string, unknown>;
  if (typeof raw.updated !== 'number' || !Array.isArray(raw.components)) throw new Error('Status response is missing required fields.');
  const components = raw.components
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object' && typeof c.id === 'string' && typeof c.name === 'string')
    .map(c => ({
      id: c.id as string,
      group: typeof c.group === 'string' ? c.group : 'Other',
      name: c.name as string,
      stage: c.stage === 'beta' ? 'beta' as const : 'ga' as const,
      state: normalizeState(c.state),
      cold: c.cold === true,
      ...(typeof c.p95 === 'number' ? { p95: c.p95 } : {}),
      ...(typeof c.note === 'string' ? { note: c.note } : {}),
    }));
  const incidents = (Array.isArray(raw.incidents) ? raw.incidents : [])
    .filter((i): i is StatusIncident => !!i && typeof i === 'object' && typeof i.title === 'string' && typeof i.started_at === 'number')
    .map(i => ({ ...i, resolved_at: typeof i.resolved_at === 'number' ? i.resolved_at : null }));
  return { updated: raw.updated, overall: normalizeState(raw.overall), components, incidents };
}
export async function fetchStatus(signal?: AbortSignal, url = STATUS_API): Promise<StatusSnapshot> {
  const response = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' }, signal });
  if (!response.ok) throw new Error(`Status request failed (${response.status}).`);
  return parseStatus(await response.json());
}
