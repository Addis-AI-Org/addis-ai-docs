// Tags every docs analytics event carries, and the closed value lists of the
// docs events. The docs send to the same PostHog project as the developer
// portal (EU, 205574), so one developer's docs reading, signup, API key and
// usage form one timeline; `app` keeps the two apart. The environment rules
// mirror the portal's src/lib/analyticsTags.ts.
//
// No imports: tests/analytics.test.mjs loads this file on its own.

/** Constant on every docs event. The portal sends "developer_portal". */
export const ANALYTICS_APP = 'docs';

export const DEPLOYMENT_ENVIRONMENTS = ['production', 'preview', 'development'] as const;
export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];

/** The status page host is served by this deployment too (proxy.ts). */
const STATUS_HOST = 'status.addisassistant.com';

const PRODUCTION_HOSTS: ReadonlySet<string> = new Set([
  'addisassistant.com',
  'www.addisassistant.com',
  'beta.addisassistant.com',
  'platform.addisassistant.com',
  'docs.addisassistant.com',
  STATUS_HOST,
]);

/**
 * Which deployment a host belongs to. Only the public hostnames are
 * production; Vercel previews (*.vercel.app) and every other host are
 * previews, and a laptop is development.
 */
export function getDeploymentEnvironment(host: string | null | undefined): DeploymentEnvironment {
  const hostname = normalizeHost(host);
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    return 'development';
  }
  return PRODUCTION_HOSTS.has(hostname) ? 'production' : 'preview';
}

/** The first part of the docs a path belongs to (content/docs/meta.json). */
export const DOCS_SECTIONS = [
  'get-started',
  'capabilities',
  'integration',
  'playground',
  'api-reference',
  'platform',
  'announcements',
  'other',
] as const;
export type DocsSection = (typeof DOCS_SECTIONS)[number];

/** The section after `/docs`, or `other` outside the docs. */
export function getDocsSection(pathname: string, host?: string | null): DocsSection {
  const [root, section] = docsPath(pathname, host).split('/').slice(1);
  if (root !== 'docs' || !section) return 'other';
  return isOneOf(DOCS_SECTIONS, section) ? section : 'other';
}

/**
 * The product a page documents. One fixed value per page, from the content
 * tree: batch generation is a section of the text-to-speech page, and Voice
 * Lab, MCP and authentication have no page of their own, so they have no
 * value until they do.
 */
export const DOCS_CAPABILITIES = [
  'tts',
  'stt',
  'live',
  'chat',
  'translation',
  'realtime',
  'voice_agent',
  'studio',
  'sdk',
  'billing',
  'other',
] as const;
export type DocsCapability = (typeof DOCS_CAPABILITIES)[number];

/** First match wins, so a more specific path comes before its parent. */
const CAPABILITY_PATHS: ReadonlyArray<readonly [RegExp, DocsCapability]> = [
  [/^\/docs\/capabilities\/speech-to-text\/live(\/|$)/, 'live'],
  [/^\/docs\/(capabilities|playground)\/speech-to-text(\/|$)/, 'stt'],
  [/^\/docs\/(capabilities|playground)\/text-to-speech(-legacy)?(\/|$)/, 'tts'],
  [/^\/docs\/capabilities\/(text-generation|multimodal)(\/|$)/, 'chat'],
  [/^\/docs\/api-reference\/chat-generate(\/|$)/, 'chat'],
  [/^\/docs\/capabilities\/translation(\/|$)/, 'translation'],
  [/^\/docs\/capabilities\/realtime(\/|$)/, 'realtime'],
  [/^\/docs\/integration\/(voice-interface|streaming-voice-agent)(\/|$)/, 'voice_agent'],
  [/^\/docs\/api-reference\/studio-/, 'studio'],
  [/^\/docs\/get-started\/sdks(\/|$)/, 'sdk'],
  [/^\/docs\/platform\/pricing(\/|$)/, 'billing'],
];

export function getDocsCapability(pathname: string, host?: string | null): DocsCapability {
  const path = docsPath(pathname, host);
  for (const [pattern, capability] of CAPABILITY_PATHS) {
    if (pattern.test(path)) return capability;
  }
  return 'other';
}

/** Code block languages, as the docs write them, folded to one name each. */
export const CODE_LANGUAGES = [
  'bash',
  'python',
  'typescript',
  'javascript',
  'json',
  'html',
  'dart',
  'kotlin',
  'go',
  'php',
  'dockerfile',
  'text',
  'other',
] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

const LANGUAGE_ALIASES: ReadonlyMap<string, CodeLanguage> = new Map<string, CodeLanguage>([
  ['bash', 'bash'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['shellscript', 'bash'],
  ['zsh', 'bash'],
  ['console', 'bash'],
  ['python', 'python'],
  ['py', 'python'],
  ['typescript', 'typescript'],
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['javascript', 'javascript'],
  ['js', 'javascript'],
  ['jsx', 'javascript'],
  ['mjs', 'javascript'],
  ['cjs', 'javascript'],
  ['json', 'json'],
  ['jsonc', 'json'],
  ['html', 'html'],
  ['dart', 'dart'],
  ['kotlin', 'kotlin'],
  ['kt', 'kotlin'],
  ['go', 'go'],
  ['php', 'php'],
  ['dockerfile', 'dockerfile'],
  ['docker', 'dockerfile'],
  ['text', 'text'],
  ['txt', 'text'],
  ['plaintext', 'text'],
]);

export function getCodeLanguage(lang: string | null | undefined): CodeLanguage {
  return LANGUAGE_ALIASES.get((lang ?? '').trim().toLowerCase()) ?? 'other';
}

/**
 * The language of a highlighted block, read from the `language-*` class
 * Shiki puts on its `<code>` (source.config.ts, `addLanguageClass`).
 */
export function getCodeLanguageFromClass(className: string | null | undefined): CodeLanguage {
  const match = /(?:^|\s)language-(\S+)/.exec(className ?? '');
  return getCodeLanguage(match?.[1]);
}

/** Where a docs link to the developer portal leads. */
export const CTA_TARGETS = [
  'signup',
  'login',
  'dashboard',
  'api_keys',
  'playground',
  'studio',
  'pricing',
  'other',
] as const;
export type CtaTarget = (typeof CTA_TARGETS)[number];

/** The developer portal. Not the docs, status, API or CDN subdomains. */
const PORTAL_HOSTS: ReadonlySet<string> = new Set([
  'addisassistant.com',
  'www.addisassistant.com',
  'beta.addisassistant.com',
  'platform.addisassistant.com',
]);

/** Portal paths, as in the portal's getProductArea. */
const CTA_PREFIXES: ReadonlyArray<readonly [string, CtaTarget]> = [
  ['/signup', 'signup'],
  ['/login', 'login'],
  ['/auth', 'login'],
  ['/verify-otp', 'login'],
  ['/forgot-password', 'login'],
  ['/reset-password', 'login'],
  ['/apikeys', 'api_keys'],
  ['/playground', 'playground'],
  ['/studio-access', 'studio'],
  ['/studio', 'studio'],
  ['/pricing', 'pricing'],
  ['/dashboard', 'dashboard'],
  ['/usage', 'dashboard'],
  ['/billing', 'dashboard'],
  ['/credit', 'dashboard'],
  ['/batches', 'dashboard'],
  ['/voices', 'dashboard'],
  ['/voice', 'dashboard'],
  ['/integrations', 'dashboard'],
  ['/settings', 'dashboard'],
  ['/profile', 'dashboard'],
  ['/notifications', 'dashboard'],
];

/** The portal page a link opens, or null when it does not open the portal. */
export function getPortalCtaTarget(href: string, base?: string): CtaTarget | null {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!PORTAL_HOSTS.has(normalizeHost(url.hostname))) return null;
  const path = normalizePath(url.pathname);
  for (const [prefix, target] of CTA_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return target;
  }
  return 'other';
}

/** The part of a docs page a link sits in. */
export const LINK_LOCATIONS = ['nav', 'sidebar', 'toc', 'content', 'other'] as const;
export type LinkLocation = (typeof LINK_LOCATIONS)[number];

/** The API calls the interactive playgrounds make with a visitor's key. */
export const PLAYGROUND_ENDPOINTS = [
  'tts_account_check',
  'tts_stream_http',
  'tts_stream_websocket',
  'stt_account_check',
  'stt_transcribe_upload',
  'stt_live_websocket',
  'stt_request_recover',
  'realtime_voice_websocket',
] as const;
export type PlaygroundEndpoint = (typeof PLAYGROUND_ENDPOINTS)[number];

/**
 * How a playground call ended: `client_error` and `server_error` are a 4xx or
 * 5xx answer; `failed` is any other failure (network, WebSocket, an error in
 * the stream, or the browser refusing the microphone).
 */
export const PLAYGROUND_OUTCOMES = ['success', 'client_error', 'server_error', 'failed'] as const;
export type PlaygroundOutcome = (typeof PLAYGROUND_OUTCOMES)[number];

export function getPlaygroundFailure(errorStatus: number | null): Exclude<PlaygroundOutcome, 'success'> {
  if (errorStatus !== null && errorStatus >= 400 && errorStatus < 500) return 'client_error';
  if (errorStatus !== null && errorStatus >= 500 && errorStatus < 600) return 'server_error';
  return 'failed';
}

type TaggableEvent = { properties?: Record<string, unknown> } | null;

/**
 * posthog-js `before_send`: puts `app`, `environment`, `docs_section` and
 * `docs_capability` on every event, the last two from the event's own page.
 *
 * Set here rather than with `posthog.register`: registered properties are
 * saved in PostHog's cookie, which is shared with addisassistant.com, so they
 * would follow the visitor onto portal events. Reading the event's own URL
 * also keeps a pageview captured during a route change on the right page.
 */
export function tagDocsEvent<T extends TaggableEvent>(event: T, environment: DeploymentEnvironment): T {
  if (!event?.properties) return event;
  const properties = event.properties;
  const url = parseUrl(properties.$current_url);
  const pathname = typeof properties.$pathname === 'string' ? properties.$pathname : (url?.pathname ?? '');
  const host = typeof properties.$host === 'string' ? properties.$host : (url?.host ?? '');
  return {
    ...event,
    properties: {
      ...properties,
      app: ANALYTICS_APP,
      environment,
      docs_section: getDocsSection(pathname, host),
      docs_capability: getDocsCapability(pathname, host),
    },
  };
}

function parseUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** The docs path a page shows: the status host serves the status page at `/`. */
function docsPath(pathname: string, host?: string | null): string {
  const path = normalizePath(pathname);
  if (path === '/' && normalizeHost(host) === STATUS_HOST) return '/docs/platform/status';
  return path;
}

function normalizePath(pathname: string): string {
  const path = (pathname.split(/[?#]/)[0] ?? '/').toLowerCase();
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

/** A hostname without port, brackets or trailing dot: `[::1]:3000` is `::1`. */
function normalizeHost(host: string | null | undefined): string {
  let value = (host ?? '').trim().toLowerCase();
  const bracketed = /^\[([^\]]*)\](?::\d+)?$/.exec(value);
  if (bracketed) value = bracketed[1] ?? '';
  else if (value.split(':').length === 2) value = value.replace(/:\d+$/, '');
  return value.replace(/\.$/, '');
}

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}
