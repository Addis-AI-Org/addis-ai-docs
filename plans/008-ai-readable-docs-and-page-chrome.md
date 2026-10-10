# Plan 008: Every page is AI-readable (llms.txt, .mdx, Copy / Open in AI) and shows freshness, source and a proper 404

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat eaf808b..HEAD -- app/ lib/source.ts source.config.ts next.config.mjs proxy.ts components/`
> Plans 001 and 003 may have touched `next.config.mjs` and `components/`.
> Compare `app/docs/[[...slug]]/page.tsx`, `app/llms-full.txt/route.ts`,
> `lib/source.ts` and `proxy.ts` against the excerpts below; on a mismatch,
> STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW. The routes are additive, and page chrome uses props the pinned Fumadocs already supports.
- **Depends on**: `plans/001-remove-placeholder-and-dead-pages.md`. Without it, the new AI endpoints would publish the Fumadocs template and the stub pages.
- **Category**: dx / docs platform
- **Planned at**: commit `eaf808b`, 2026-10-10

## Why this matters

Developers increasingly read docs through an AI assistant. Vercel, Better Auth (same Fumadocs stack as us) and ElevenLabs all provide these, and we provide none of them:
- `/llms.txt` (an index)
- a Markdown version of every page (`/docs/<page>.mdx`)
- "Copy page" and "Open in ChatGPT / Claude" buttons on every page

The only AI endpoint today, `/llms-full.txt`, sends no `charset`, although the content is full of Ethiopic script.

Pages also show no "last updated" date and no "Edit on GitHub" link. There is no `sitemap.xml`, no `robots.txt` and no canonical URL, and a mistyped URL lands on Next's bare default 404 outside the docs layout.

Every piece needed is already in the pinned dependencies. Versions verified from the published packages:
- `fumadocs-ui@16.3.0`: `DocsPage` accepts `lastUpdate` and `editOnGithub`.
- `fumadocs-mdx@14.1.1`: ships `fumadocs-mdx/plugins/last-modified`.
- `fumadocs-core@16.3.0`: exports `isMarkdownPreferred` and `rewritePath` from `fumadocs-core/negotiation`.

## Current state

`app/docs/[[...slug]]/page.tsx` (render part):
```tsx
  return (
    <DocsPage
      toc={page.data.toc}
      tableOfContent={{
        style: "clerk",
        single: false,
      }}
      full={page.data.full}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DocsTitle>{page.data.title}</DocsTitle>
        {page.data.isNew ? <NewBadge /> : null}
      </div>
      <DocsDescription>{page.data.description}</DocsDescription>
```
`generateMetadata` in the same file returns `title`, `description`, `openGraph`, `twitter`, but no `alternates`.

`app/llms-full.txt/route.ts`:
```ts
import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\n\n'));
}
```

`lib/source.ts` already has:
```ts
export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
```
`source.config.ts` sets `postprocess: { includeProcessedMarkdown: true }`, so `getText('processed')` works. Its default export is `defineConfig({ mdxOptions: { … } })`. `GlobalConfig` also accepts `plugins?: PluginOption[]`.

`proxy.ts` (Next 16 "proxy", formerly middleware) only rewrites `/` on `status.addisassistant.com`:
```ts
import { NextResponse, type NextRequest } from 'next/server';

const STATUS_HOST = 'status.addisassistant.com';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0];
  if (host !== STATUS_HOST) return NextResponse.next();
  …
}
```

The production site URL logic is in `app/layout.tsx`:
```ts
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://docs.addisassistant.com'
    : 'http://localhost:3000');
```

The repo is `Addis-AI-Org/addis-ai-docs` (from `git remote -v`). The default branch is `main`.

`page.path` (fumadocs-core 16.3.0 `SharedFileInfo.path`) is the file path relative to the content directory, e.g. `get-started/quickstart.mdx`.

There is no `app/sitemap.ts`, `app/robots.ts`, `app/llms.txt/`, `app/llms.mdx/` or `app/docs/not-found.tsx`.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Serve | `pnpm start` (after build, in the background) | listens on :3000 |
| Tests | `node --test tests/*.test.mjs` | `# fail 0` |

Use `curl` against `pnpm start` for verification. **Do not install a browser or Playwright** (repo `AGENTS.md`).

## Scope

**In scope (create)**:
- `lib/site-url.ts`
- `app/llms.txt/route.ts`
- `app/llms.mdx/[[...slug]]/route.ts`
- `components/page-actions.tsx`
- `app/sitemap.ts`
- `app/robots.ts`
- `app/docs/not-found.tsx`

**In scope (modify)**:
- `app/layout.tsx` (use `lib/site-url.ts`)
- `app/docs/[[...slug]]/page.tsx`
- `app/llms-full.txt/route.ts` (content type only)
- `next.config.mjs` (add `rewrites()`)
- `proxy.ts` (Markdown negotiation)
- `source.config.ts` (add the `lastModified` plugin)

**Out of scope**:
- Ask-AI chat, analytics or feedback widgets (need a backend and owner decisions)
- search configuration
- the status-host behaviour beyond what's described here
- any content file

## Git workflow

- Branch: `advisor/008-ai-readable-docs`. Base it on the branch of the previous plan in `plans/README.md` order (stacked branches), or on `main` once that plan has merged. Plans 001-003 each append a test to the same file, so unstacked branches conflict.
- Commits, one per Step group, plain imperative style, e.g. `Add llms.txt and per-page Markdown routes`, `Show last updated and Edit on GitHub on docs pages`, `Add sitemap, robots, canonical URLs, and a docs 404`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Share the site URL

Create `lib/site-url.ts`:
```ts
// Absolute origin for metadata, sitemaps, and AI endpoints. Production falls
// back to the public docs domain so generated URLs never point at localhost.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://docs.addisassistant.com'
    : 'http://localhost:3000');
```
In `app/layout.tsx`, replace the local `siteUrl` constant (and the two comment lines above it) with `import { siteUrl } from '@/lib/site-url';`.

**Careful:** `tests/documentation-preservation.test.mjs` (test `ships a visible favicon and absolute link-preview URLs in production`) asserts that `app/layout.tsx` contains `'https://docs.addisassistant.com'`. Update that assertion to read `lib/site-url.ts` instead of `app/layout.tsx`, and leave everything else in that test as is.

**Verify**: `pnpm typecheck` → exit 0. `node --test tests/documentation-preservation.test.mjs` → `# fail 0`.

### Step 2: `/llms.txt` index

Create `app/llms.txt/route.ts`:
```ts
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/site-url';

export const revalidate = false;

export function GET() {
  const lines = source.getPages().map((page) => {
    const description = page.data.description ? `: ${page.data.description}` : '';
    return `- [${page.data.title}](${siteUrl}${page.url}.mdx)${description}`;
  });

  const body = [
    '# Addis AI Documentation',
    '',
    '> APIs and official Node.js and Python SDKs for text generation, speech-to-text, Addis Voices 2, translation, multimodal reasoning, and realtime voice in Amharic and Afaan Oromo.',
    '',
    `Full text: ${siteUrl}/llms-full.txt`,
    '',
    '## Pages',
    '',
    ...lines,
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
```
The blockquote sentence is the approved site description from `lib/metadata.ts` (`DEFAULT_METADATA_DESCRIPTION`) without its leading "Build with". Import that constant and use it rather than re-typing, if you prefer.

In `app/llms-full.txt/route.ts`, change `return new Response(scanned.join('\n\n'));` to `return new Response(scanned.join('\n\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });`.

**Verify** (after `pnpm build && pnpm start &`):
- `curl -s localhost:3000/llms.txt | head -12` → starts with `# Addis AI Documentation` and lists pages
- `curl -sI localhost:3000/llms-full.txt | grep -i content-type` → contains `charset=utf-8`
- `curl -s localhost:3000/llms.txt | grep -ci "goes here\|fumadocs"` → `0` (needs plan 001)

### Step 3: Per-page Markdown (`/docs/<page>.mdx`)

Create `app/llms.mdx/[[...slug]]/route.ts`:
```ts
import { notFound } from 'next/navigation';
import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
```
In `next.config.mjs`, add an `async rewrites()` method next to `redirects()` in the config object:
```js
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/:path*',
      },
    ];
  },
```
In `proxy.ts`, serve Markdown to clients that ask for it (agents send `Accept: text/markdown`). Add `import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';`, define `const { rewrite: rewriteDocsToMarkdown } = rewritePath('/docs/*path', '/llms.mdx/*path');` at module level, and make these the first lines of `proxy()`:
```ts
  if (isMarkdownPreferred(request)) {
    const markdownPath = rewriteDocsToMarkdown(request.nextUrl.pathname);
    if (markdownPath) return NextResponse.rewrite(new URL(markdownPath, request.nextUrl));
  }
```
Leave the existing status-host logic below it unchanged.

**Verify**:
- `curl -s localhost:3000/docs/get-started/quickstart.mdx | head -3` → `# Quick Start (/docs/get-started/quickstart)`
- `curl -s -H 'Accept: text/markdown' localhost:3000/docs/get-started/quickstart | head -1` → the same heading
- `curl -s localhost:3000/docs/get-started/quickstart | grep -c "<html"` → `1` (HTML still served to browsers)

If the `/docs/*path` pattern syntax is rejected at build time, use `/docs{/*path}` (path-to-regexp v8 syntax). Note which one worked in the report.

### Step 4: Copy page / Open in AI buttons

Create `components/page-actions.tsx`. Match the tone of the existing small client components, e.g. `components/demo-navigation.tsx`, which uses a similar `link` class string and a `navigator.clipboard` try/catch:
```tsx
'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

const action =
  'inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-primary';

export function PageActions({ markdownUrl }: { markdownUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    try {
      const markdown = await fetch(markdownUrl).then((response) => response.text());
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(markdownUrl, '_blank', 'noopener,noreferrer');
    }
  }

  const absolute = typeof window === 'undefined' ? markdownUrl : new URL(markdownUrl, window.location.origin).href;
  const prompt = encodeURIComponent(`Read ${absolute} so I can ask questions about it.`);

  return (
    <div className="not-prose flex flex-wrap items-center gap-2">
      <button type="button" className={action} onClick={copyMarkdown}>
        {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
        {copied ? 'Copied' : 'Copy page'}
      </button>
      <a className={action} href={`https://chatgpt.com/?hints=search&q=${prompt}`} target="_blank" rel="noopener noreferrer">
        Open in ChatGPT <ExternalLink aria-hidden="true" className="size-3" />
      </a>
      <a className={action} href={`https://claude.ai/new?q=${prompt}`} target="_blank" rel="noopener noreferrer">
        Open in Claude <ExternalLink aria-hidden="true" className="size-3" />
      </a>
    </div>
  );
}
```
In `app/docs/[[...slug]]/page.tsx`, import it (`import { PageActions } from "@/components/page-actions";`) and render it directly after `<DocsDescription>…</DocsDescription>`:
```tsx
      <PageActions markdownUrl={`${page.url}.mdx`} />
```

**Verify**: `pnpm typecheck && pnpm lint` → exit 0. `curl -s localhost:3000/docs/get-started/quickstart | grep -c "Copy page"` → at least `1`.

### Step 5: Last updated + Edit on GitHub

1. In `source.config.ts`, add `import lastModified from 'fumadocs-mdx/plugins/last-modified';` and add `plugins: [lastModified()],` as the first property of the object passed to the default `defineConfig({ … })`. Do not touch `source.script.ts`.
2. In `app/docs/[[...slug]]/page.tsx`, add these props to `<DocsPage …>`:
```tsx
      lastUpdate={(page.data as { lastModified?: Date }).lastModified}
      editOnGithub={{
        owner: "Addis-AI-Org",
        repo: "addis-ai-docs",
        sha: "main",
        path: `content/docs/${page.path}`,
      }}
```
The cast is defensive: if `pnpm typecheck` shows `page.data.lastModified` is already typed, drop the cast.

Git-based dates need full history on the build host. In the report, tell the owner that on Vercel the env var `VERCEL_DEEP_CLONE=true` must be set (per the plugin's own doc comment). Don't change hosting settings yourself.

**Verify**: after rebuild, `curl -s localhost:3000/docs/platform/pricing | grep -c "github.com/Addis-AI-Org/addis-ai-docs"` → at least `1`. `curl -s localhost:3000/docs/platform/pricing | grep -ci "last updated"` → at least `1` (the wording comes from Fumadocs).

### Step 6: Canonical URLs, sitemap, robots

1. In `generateMetadata` of `app/docs/[[...slug]]/page.tsx`, add `alternates: { canonical: page.url },` to the returned object. `metadataBase` in `app/layout.tsx` makes it absolute.
2. Create `app/sitemap.ts`:
```ts
import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((page) => ({ url: `${siteUrl}${page.url}` }));
  const playgrounds = ['/docs/playground/speech-to-text', '/docs/playground/text-to-speech'].map((path) => ({
    url: `${siteUrl}${path}`,
  }));
  return [...pages, ...playgrounds];
}
```
3. Create `app/robots.ts`:
```ts
import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
```

**Verify**:
- `curl -s localhost:3000/sitemap.xml | grep -c "<loc>"` → the number of pages plus 2
- `curl -s localhost:3000/robots.txt` → contains `Sitemap:`
- `curl -s localhost:3000/docs/platform/faq | grep -o '<link rel="canonical"[^>]*>'` → one tag ending in `/docs/platform/faq"`

### Step 7: A docs 404 inside the docs layout

Create `app/docs/not-found.tsx`:
```tsx
import Link from 'next/link';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';

const destinations = [
  { href: '/docs/get-started/introduction', label: 'Introduction' },
  { href: '/docs/get-started/quickstart', label: 'Quick Start' },
  { href: '/docs/capabilities/text-generation', label: 'Text Generation' },
  { href: '/docs/capabilities/text-to-speech', label: 'Text-to-Speech' },
  { href: '/docs/capabilities/speech-to-text', label: 'Speech-to-Text' },
  { href: '/docs/platform/errors', label: 'Errors' },
];

export default function NotFound() {
  return (
    <DocsPage>
      <DocsTitle>Page not found</DocsTitle>
      <DocsDescription>This page moved or never existed. Search the docs with ⌘K, or start from one of these pages.</DocsDescription>
      <DocsBody>
        <ul>
          {destinations.map((destination) => (
            <li key={destination.href}>
              <Link href={destination.href}>{destination.label}</Link>
            </li>
          ))}
        </ul>
      </DocsBody>
    </DocsPage>
  );
}
```

**Verify**: `curl -s -o /dev/null -w '%{http_code}' localhost:3000/docs/does-not-exist` → `404`. `curl -s localhost:3000/docs/does-not-exist | grep -c "Page not found"` → at least `1`.

### Step 8: Lock it with a test

Append to `tests/docs-invariants.test.mjs` if it exists (plan 004), otherwise to `tests/documentation-preservation.test.mjs`. Both files define `read`.

```js
test('publishes AI-readable docs and page chrome', () => {
  for (const path of [
    'app/llms.txt/route.ts',
    'app/llms.mdx/[[...slug]]/route.ts',
    'app/sitemap.ts',
    'app/robots.ts',
    'app/docs/not-found.tsx',
    'components/page-actions.tsx',
  ]) {
    assert.ok(read(path).length > 0, `${path} is missing`);
  }
  const page = read('app/docs/[[...slug]]/page.tsx');
  assert.match(page, /editOnGithub=/);
  assert.match(page, /lastUpdate=/);
  assert.match(page, /<PageActions /);
  assert.match(page, /canonical: page\.url/);
  assert.match(read('next.config.mjs'), /source: '\/docs\/:path\*\.mdx'/);
  assert.match(read('app/llms-full.txt/route.ts'), /charset=utf-8/);
});
```

**Verify**: `node --test tests/*.test.mjs` → `# fail 0` (with deps installed).

## Test plan

- The new structural test from Step 8.
- The curl checks in Steps 2-7 are the behavioural verification. Put their outputs in the report.
- Regression: the full existing suite stays green, including the updated site-URL assertion from Step 1.

## Done criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm build` → all exit 0
- [ ] All curl checks in Steps 2-7 return the stated results (outputs pasted in the report)
- [ ] `node --test tests/*.test.mjs` → `# fail 0`
- [ ] The report reminds the owner about `VERCEL_DEEP_CLONE=true`
- [ ] `plans/README.md` status row for 008 updated

## STOP conditions

- Plan 001 has not landed and `curl -s localhost:3000/llms.txt` lists "Quick Start" twice or any stub page. Stop: publishing this would spread the template content.
- `fumadocs-mdx/plugins/last-modified` cannot be imported, or `DocsPage` rejects `lastUpdate`/`editOnGithub` in typecheck. The pinned versions may have changed; report the installed versions.
- The proxy change breaks the existing `status.addisassistant.com` rewrite. Check this with `curl -s -H 'Host: status.addisassistant.com' localhost:3000/ | grep -c "Status"` → at least `1`, before and after.
- Lint requires an `<img>`/`<Link>` change in files outside scope.

## Maintenance notes

- `llms.txt`, `.mdx` and the sitemap all use `source.getPages()`. Keeping placeholder pages out of `content/docs` (plan 001's test) is what keeps these endpoints clean.
- Follow-ups not in this plan:
  - Ask AI (Fumadocs ships an AI search dialog; see the direction section of `plans/REVIEW.md`).
  - A page feedback widget (needs an analytics sink).
  - Redirect non-root paths on the status host to the docs host, to remove the duplicate-host problem.
- If the docs ever move to a `.md` suffix (Better Auth style), add a second rewrite rather than replacing `.mdx`, because links will exist in the wild.
