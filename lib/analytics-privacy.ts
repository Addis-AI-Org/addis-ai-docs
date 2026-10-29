// What may leave the browser in an analytics event. URLs are cleaned from an
// allowlist: a query parameter reaches PostHog only if it is named below, so a
// parameter that carries an email, a sign-in code, a token or a search is
// dropped until someone adds it on purpose. Adapted from the developer
// portal's src/lib/analyticsPrivacy.ts; the docs and the portal share one
// PostHog project, so they clean URLs the same way.
//
// No imports: tests/analytics.test.mjs loads this file on its own.

/** Ad click ids. Attribution reads them; URLs keep only that one was there. */
export const CLICK_ID_KEYS = [
  'gclid',
  'fbclid',
  'ttclid',
  'msclkid',
  'li_fat_id',
] as const;

/**
 * Screen-state parameters the docs read. None today: tabs and anchors live in
 * the fragment or in storage, never the query. Add a parameter here only if
 * its values are fixed, never content.
 */
export const ALLOWED_URL_PARAMS: ReadonlySet<string> = new Set<string>();

const CLICK_ID_PARAMS: ReadonlySet<string> = new Set<string>(CLICK_ID_KEYS);

/** Event and person properties that hold a full URL. */
export const URL_PROPERTIES = [
  '$current_url',
  '$referrer',
  '$initial_current_url',
  '$initial_referrer',
  '$prev_pageview_url',
] as const;

/**
 * A URL with only allowlisted parameters, `utm_*`, and `click_id_present=1`
 * in place of any ad click id. The fragment is dropped, and a path segment
 * that looks like an email address is replaced.
 */
export function cleanAnalyticsUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Not absolute: keep only the path, which is all a relative value needs.
    const path = value.split(/[?#]/)[0] ?? '';
    return maskPath(path);
  }

  const kept = new URLSearchParams();
  let clickId = false;
  for (const [key, paramValue] of url.searchParams) {
    if (key.startsWith('utm_') || ALLOWED_URL_PARAMS.has(key)) {
      kept.append(key, paramValue);
    } else if (CLICK_ID_PARAMS.has(key)) {
      clickId = true;
    }
  }
  if (clickId) kept.set('click_id_present', '1');

  const query = kept.toString();
  return `${url.origin}${maskPath(url.pathname)}${query ? `?${query}` : ''}`;
}

function maskPath(path: string): string {
  return path
    .split('/')
    .map((segment) => (safeDecode(segment).includes('@') ? ':redacted' : segment))
    .join('/');
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

type PropertyBag = Record<string, unknown>;

/**
 * Cleans every URL in a property bag, including attribution touches the
 * portal may have stored in the shared cookie. An event's own properties also
 * lose `email`: it belongs on the person, never on an event.
 */
export function cleanAnalyticsProperties<T extends PropertyBag>(
  properties: T,
  { keepEmail = false }: { keepEmail?: boolean } = {},
): T {
  const cleaned: PropertyBag = { ...properties };
  for (const key of URL_PROPERTIES) {
    const value = cleaned[key];
    if (typeof value === 'string' && value) {
      cleaned[key] = cleanAnalyticsUrl(value);
    }
  }
  for (const key of ['first_touch', 'last_touch']) {
    const touch = cleaned[key];
    if (isRecord(touch)) cleaned[key] = cleanTouch(touch);
  }
  if (!keepEmail) delete cleaned.email;
  return cleaned as T;
}

function cleanTouch(touch: PropertyBag): PropertyBag {
  const next = { ...touch };
  for (const key of ['landing_url', 'referrer']) {
    const value = next[key];
    if (typeof value === 'string' && value) next[key] = cleanAnalyticsUrl(value);
  }
  return next;
}

type CapturedEvent = {
  event?: string;
  properties?: PropertyBag;
  $set?: PropertyBag;
  $set_once?: PropertyBag;
};

/**
 * posthog-js `before_send`: cleans the event's URLs, and those it sets on
 * the person. Never drops the event.
 */
export function cleanCapturedEvent<T extends CapturedEvent | null>(event: T): T {
  if (!event) return event;
  const next = { ...event };
  const person = { keepEmail: true };
  if (next.properties) {
    const properties = cleanAnalyticsProperties(next.properties);
    for (const nested of ['$set', '$set_once'] as const) {
      const bag = properties[nested];
      if (isRecord(bag)) {
        properties[nested] = cleanAnalyticsProperties(bag, person);
      }
    }
    next.properties = properties;
  }
  if (next.$set) next.$set = cleanAnalyticsProperties(next.$set, person);
  if (next.$set_once) {
    next.$set_once = cleanAnalyticsProperties(next.$set_once, person);
  }
  return next;
}

function isRecord(value: unknown): value is PropertyBag {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
