import assert from 'node:assert/strict';
import test from 'node:test';
import { exists, headingAnchors, loadTs, read, walk } from './support.mjs';

// Internal links resolve statically against the content tree and app routes, including
// #anchors on documentation pages. Set ADDIS_LINKS=1 to also request every external link
// and every voice preview clip.

const sources = [
  ...walk('content').filter((path) => /\.(mdx|json)$/.test(path)),
  ...walk('components').filter((path) => /\.tsx?$/.test(path)),
  ...walk('app').filter((path) => /\.tsx?$/.test(path)),
  ...walk('lib').filter((path) => /\.tsx?$/.test(path)),
];

const redirects = new Set([...read('next.config.mjs').matchAll(/source: '([^']+)'/g)].map((match) => match[1]));

function documentFor(route) {
  for (const path of [`content${route}.mdx`, `content${route}/index.mdx`]) if (exists(path)) return path;
  return null;
}

function resolves(route) {
  return (
    route === '/docs' ||
    documentFor(route) !== null ||
    exists(`app${route}/page.tsx`) ||
    ['/llms.txt', '/llms-full.txt', '/sitemap.xml', '/robots.txt'].includes(route) ||
    redirects.has(route)
  );
}

const internalLink = /(?:\]\(|href=\{?["'`]|href: ?["'`]|docsHref=["'])(\/(?:docs|llms)[^)"'`\s]*)/g;

function internalLinks(path) {
  return [...read(path).matchAll(internalLink)].map((match) => match[1]);
}

test('every internal link resolves to a page, app route or redirect', () => {
  let count = 0;
  for (const path of sources) {
    for (const link of internalLinks(path)) {
      if (link.includes('${')) continue; // built at runtime from a resolved page
      const route = link.split('#')[0].replace(/\.mdx$/, '').replace(/\/$/, '') || '/docs';
      count += 1;
      assert.ok(resolves(route), `${path} links to missing ${link}`);
    }
  }
  assert.ok(count > 100, `expected to check the internal links, found ${count}`);
});

test('every #anchor on a documentation link exists on the target page', () => {
  const anchors = new Map();
  const anchorsOf = (document) => {
    if (!anchors.has(document)) anchors.set(document, headingAnchors(read(document)));
    return anchors.get(document);
  };
  for (const path of sources) {
    const source = read(path);
    for (const link of internalLinks(path)) {
      const [route, anchor] = link.split('#');
      if (!anchor || link.includes('${')) continue;
      const document = documentFor(route.replace(/\/$/, ''));
      if (!document) continue;
      assert.ok(anchorsOf(document).has(anchor), `${path} links to missing anchor ${link}`);
    }
    if (path.endsWith('.mdx')) {
      for (const [, anchor] of source.matchAll(/\]\(#([^)\s]+)\)/g)) {
        assert.ok(anchorsOf(path).has(anchor), `${path} links to missing in-page anchor #${anchor}`);
      }
    }
  }
});

// Hosts that answer automated requests with 4xx/999 (bot protection) although the page works
// in a browser. They are skipped rather than reported as broken.
const BOT_BLOCKING_HOSTS = ['linkedin.com', 'www.linkedin.com', 'x.com', 'twitter.com', 'www.npmjs.com'];
// Pages that ship with an open developer-portal pull request (branch feat/scribe-ha-sid-wal-sw).
// They are reported, not failed, until they are live; delete each entry once it answers 200.
const PENDING_URLS = new Set([
  'https://addisassistant.com/benchmarks/addis-scribe-hausa',
  'https://addisassistant.com/benchmarks/addis-scribe-sidama',
  'https://addisassistant.com/benchmarks/addis-scribe-wolaytta',
  'https://addisassistant.com/benchmarks/addis-scribe-swahili',
]);
// API endpoints need an API key; they are documented, not browsed.
const SKIPPED_HOSTS = ['api.addisassistant.com', 'localhost', '127.0.0.1'];

async function externalUrls() {
  const urls = new Set();
  const external = /(?:\]\(|href=\{?["'`]|href: ?["'`]|url: ?["'`])(https?:\/\/[^)"'`\s]+)/g;
  for (const path of sources) {
    for (const [, url] of read(path).matchAll(external)) {
      if (/[${}<>]/.test(url)) continue;
      urls.add(url.replace(/[.,]$/, ''));
    }
  }
  const { voiceCatalog } = await loadTs('data/voice-catalog.ts');
  for (const voice of voiceCatalog) urls.add(voice.sample);
  return [...urls].filter((url) => {
    const host = new URL(url).hostname;
    return ![...BOT_BLOCKING_HOSTS, ...SKIPPED_HOSTS].includes(host);
  });
}

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, {
          method,
          redirect: 'manual',
          headers: { 'user-agent': 'addis-docs-link-check/1.0 (+https://docs.addisassistant.com)', range: 'bytes=0-1023' },
          signal: AbortSignal.timeout(20_000),
        });
        await response.body?.cancel();
        if (response.status < 400) return response.status;
        if (method === 'GET' && attempt === 1) return response.status;
        if (method === 'HEAD') break; // some servers reject HEAD; try GET
      } catch (error) {
        if (method === 'GET' && attempt === 1) return `error: ${error.cause?.code ?? error.message}`;
      }
    }
  }
  return 'unreachable';
}

test('live: external links and voice previews answer 2xx/3xx', { skip: process.env.ADDIS_LINKS !== '1' && 'set ADDIS_LINKS=1', timeout: 300_000 }, async (t) => {
  const urls = await externalUrls();
  assert.ok(urls.some((url) => url.includes('/voice-previews/')), 'voice previews are checked');
  const failures = [];
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const url = queue.shift();
        const status = await check(url);
        const broken = typeof status !== 'number' || status >= 400;
        if (PENDING_URLS.has(url)) t.diagnostic(`${broken ? 'pending' : 'now live, remove from PENDING_URLS'}: ${status} ${url}`);
        else if (broken) failures.push(`${status} ${url}`);
      }
    }),
  );
  assert.deepEqual(failures, [], `broken external links:\n${failures.join('\n')}`);
});
