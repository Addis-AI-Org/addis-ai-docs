import type { PostHog, PostHogConfig } from 'posthog-js';

/**
 * The PostHog project the developer portal sends to (EU, 205574), so a docs
 * visit and the account it leads to are one timeline. A project token is a
 * public browser key; the portal commits the same one in wrangler.toml.
 */
const DEFAULT_PROJECT_TOKEN = 'phc_oris4ZJMY5TCGFzJMTZPgG5goeWX3vpgoqLW9ND9eRnk';

const POSTHOG_PROJECT_TOKEN =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() || DEFAULT_PROJECT_TOKEN;

/** Calls made before PostHog loads are kept, up to this many. */
const MAX_WAITING = 50;

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const waiting: Array<(posthog: PostHog) => void> = [];

/**
 * Runs `send` with PostHog now if it has loaded, or as soon as it does, so an
 * event tracked in the first moments of a visit is sent rather than dropped.
 */
export function withPostHog(send: (posthog: PostHog) => void): void {
  if (client) {
    send(client);
    return;
  }
  if (typeof window === 'undefined') return;
  if (waiting.length < MAX_WAITING) waiting.push(send);
}

/**
 * Loads PostHog after the page is up rather than in every page's first
 * bundle; `instrumentation-client.ts` starts it when the browser is idle.
 * Mirrors the developer portal's src/lib/posthog-client.ts.
 */
export function loadPostHog(
  config: Partial<PostHogConfig>,
  onLoaded?: (posthog: PostHog) => void,
): Promise<PostHog | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  loading ??= import('posthog-js')
    .then(
      ({ default: posthog }) =>
        new Promise<PostHog>((resolve) => {
          posthog.init(POSTHOG_PROJECT_TOKEN, {
            ...config,
            loaded: () => {
              client = posthog;
              onLoaded?.(posthog);
              for (const send of waiting.splice(0)) {
                try {
                  send(posthog);
                } catch {
                  /* analytics must never break the docs */
                }
              }
              resolve(posthog);
            },
          });
        }),
    )
    .catch(() => null);
  return loading;
}
