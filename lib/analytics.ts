// Docs product analytics: the typed events and the listeners that send them.
// PostHog itself is set up in instrumentation-client.ts; the tags on every
// event and the closed value lists are in lib/analytics-tags.ts, and the URL
// allowlist in lib/analytics-privacy.ts.

import {
  getCodeLanguageFromClass,
  getDeploymentEnvironment,
  getDocsCapability,
  getDocsSection,
  getPlaygroundFailure,
  getPortalCtaTarget,
  type CodeLanguage,
  type CtaTarget,
  type DocsCapability,
  type DocsSection,
  type LinkLocation,
  type PlaygroundEndpoint,
  type PlaygroundOutcome,
} from '@/lib/analytics-tags';
import { withPostHog } from '@/lib/posthog-client';

export const ANALYTICS_ENVIRONMENT =
  typeof window === 'undefined' ? 'production' : getDeploymentEnvironment(window.location.host);

/**
 * A laptop sends nothing unless asked to, so development never mixes with
 * production numbers. Same switch as the developer portal.
 */
export const ANALYTICS_ENABLED =
  ANALYTICS_ENVIRONMENT !== 'development' || process.env.NEXT_PUBLIC_POSTHOG_IN_DEV === '1';

/**
 * Every docs event and its properties. A closed map: an event or property
 * that is not here does not compile. None carries text a visitor typed: no
 * search query, request body or API key.
 */
export interface DocsEventPropertyMap {
  docs_code_copied: {
    docs_section: DocsSection;
    docs_capability: DocsCapability;
    code_language: CodeLanguage;
  };
  docs_search_performed: { result_count: number; has_results: boolean };
  docs_cta_clicked: { target: CtaTarget; location: LinkLocation };
  docs_api_playground_used: { endpoint: PlaygroundEndpoint; outcome: PlaygroundOutcome };
}
export type DocsEvent = keyof DocsEventPropertyMap;

export function trackDocs<E extends DocsEvent>(event: E, properties: DocsEventPropertyMap[E]): void {
  if (!ANALYTICS_ENABLED || typeof window === 'undefined') return;
  withPostHog((posthog) => {
    posthog.capture(event, properties);
  });
}

export interface PlaygroundRun {
  /** `fetch`, noting the first error status the API answers with. */
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  succeeded: () => void;
  failed: () => void;
}

/**
 * One use of a playground call, reported once when it ends: its endpoint id
 * and whether it succeeded or how it failed. A run the visitor stops is not
 * reported. Never the request, the response or the key.
 */
export function startPlaygroundRun(endpoint: PlaygroundEndpoint): PlaygroundRun {
  let errorStatus: number | null = null;
  let reported = false;
  const report = (outcome: PlaygroundOutcome) => {
    if (reported) return;
    reported = true;
    trackDocs('docs_api_playground_used', { endpoint, outcome });
  };
  return {
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      if (!response.ok && errorStatus === null) errorStatus = response.status;
      return response;
    },
    succeeded: () => report('success'),
    failed: () => report(getPlaygroundFailure(errorStatus)),
  };
}

/** Checked in order: the TOC popover has a header of its own. */
const LINK_LOCATION_SELECTORS: ReadonlyArray<readonly [string, LinkLocation]> = [
  ['#nd-toc, [data-toc-popover]', 'toc'],
  ['#nd-sidebar, #nd-sidebar-mobile, [data-sidebar-placeholder]', 'sidebar'],
  ['#nd-nav, #nd-subnav, header', 'nav'],
  ['#nd-page, article, main', 'content'],
];

function linkLocation(element: Element): LinkLocation {
  for (const [selector, location] of LINK_LOCATION_SELECTORS) {
    if (element.closest(selector)) return location;
  }
  return 'other';
}

/** Fumadocs' code block copy button (fumadocs-ui/components/codeblock). */
function isCodeCopyButton(button: Element): boolean {
  const label = button.getAttribute('aria-label');
  return (label === 'Copy Text' || label === 'Copied Text') && button.closest('figure') !== null;
}

function onDocumentClick(event: MouseEvent) {
  if (event.type === 'auxclick' && event.button !== 1) return;
  const target = event.target;
  if (!(target instanceof Element)) return;

  const button = target.closest('button');
  if (button && event.type === 'click' && isCodeCopyButton(button)) {
    const path = window.location.pathname;
    const code = button.closest('figure')?.querySelector('pre code');
    trackDocs('docs_code_copied', {
      docs_section: getDocsSection(path, window.location.host),
      docs_capability: getDocsCapability(path, window.location.host),
      code_language: getCodeLanguageFromClass(code?.getAttribute('class')),
    });
    return;
  }

  const anchor = target.closest('a[href]');
  if (anchor instanceof HTMLAnchorElement) {
    const ctaTarget = getPortalCtaTarget(anchor.href);
    if (ctaTarget) {
      trackDocs('docs_cta_clicked', { target: ctaTarget, location: linkLocation(anchor) });
    }
  }
}

let listening = false;

/**
 * One delegated listener for the whole site: code block copies and links to
 * the developer portal. Installed before hydration, so early clicks wait for
 * PostHog instead of being lost.
 */
export function installDocsListeners(): void {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  const options = { capture: true, passive: true } as const;
  document.addEventListener('click', onDocumentClick, options);
  // A middle click opens the portal in a new tab without a `click` event.
  document.addEventListener('auxclick', onDocumentClick, options);
}
