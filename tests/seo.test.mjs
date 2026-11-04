import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { codes, exists, loadTs, read, root, walk } from './support.mjs';

// Source-level SEO checks (no build needed). Set ADDIS_SEO_LIVE=1 after `next build` to also
// check the prerendered output in .next/server/app.

// Evaluate lib/site.ts as a production build does.
delete process.env.NEXT_PUBLIC_SITE_URL;
process.env.NODE_ENV = 'production';
const site = await loadTs('lib/site.ts');
const metadata = await loadTs('lib/metadata.ts');
const PRODUCTION = 'https://docs.addisassistant.com';
const MAX_DESCRIPTION = 160;

const docs = walk('content/docs').filter((path) => path.endsWith('.mdx'));
const playgrounds = walk('app/docs/playground').filter((path) => path.endsWith('/page.tsx'));
const routeOf = (path) => '/' + path.replace(/^app\//, '').replace(/\/page\.tsx$/, '');
const frontmatter = (source) => source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
const field = (fields, name) => fields.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1]?.trim();

test('absolute URLs resolve against the production docs host', () => {
  assert.equal(site.SITE_URL, PRODUCTION);
  const layout = read('app/layout.tsx');
  assert.match(layout, /metadataBase: new URL\(siteUrl\)/);
  assert.match(layout, /const siteUrl = SITE_URL;/);
});

test('the sitemap lists every indexable docs page and every public app route', () => {
  const sitemap = read('app/sitemap.ts');
  assert.match(sitemap, /getIndexablePages\(\)/);
  assert.match(sitemap, /\$\{SITE_URL\}\$\{page\.url\}/);
  const appRoutes = [...sitemap.match(/APP_ROUTES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(appRoutes.sort(), playgrounds.map(routeOf).sort());
  const unindexed = [...read('lib/source.ts').match(/unindexedDocUrls = new Set\(\[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const route of ['/docs/capabilities/text-to-speech', '/docs/capabilities/text-to-speech/streaming', '/docs/capabilities/speech-to-text', '/docs/capabilities/speech-to-text/live', '/docs/announcements']) {
    assert.ok(!unindexed.includes(route), `${route} must be indexable`);
    assert.ok(exists(`content${route}.mdx`) || exists(`content${route}/index.mdx`), `${route} exists`);
  }
});

test('robots allows crawling and points at the sitemap', () => {
  const robots = read('app/robots.ts');
  assert.match(robots, /\{ userAgent: '\*', allow: '\/'/);
  assert.match(robots, /sitemap: `\$\{SITE_URL\}\/sitemap\.xml`/);
  for (const [, list] of robots.matchAll(/disallow: \[([^\]]*)\]/g)) {
    for (const [, path] of list.matchAll(/'([^']+)'/g)) {
      assert.ok(!['/', '/docs', '/docs/'].includes(path), `robots must not disallow ${path}`);
    }
  }
});

test('Organization JSON-LD is valid JSON and knows every speech language', () => {
  const jsonLd = JSON.parse(JSON.stringify(site.ORGANIZATION_JSON_LD));
  assert.deepEqual(jsonLd, site.ORGANIZATION_JSON_LD, 'JSON-LD survives serialization unchanged');
  assert.equal(jsonLd['@context'], 'https://schema.org');
  assert.equal(jsonLd['@type'], 'Organization');
  assert.equal(jsonLd['@id'], 'https://addisai.ch/#organization');
  assert.equal(jsonLd.description, site.ORGANIZATION_DEFINITION);
  assert.deepEqual([...jsonLd.knowsLanguage].sort(), [...codes].sort());
  const layout = read('app/layout.tsx');
  assert.match(layout, /const organizationJsonLd = ORGANIZATION_JSON_LD;/);
  assert.match(layout, /type="application\/ld\+json"\s+dangerouslySetInnerHTML=\{\{ __html: JSON\.stringify\(organizationJsonLd\) \}\}/);
});

test('every docs page has a title and a description of at most 160 characters', () => {
  for (const path of docs) {
    const fields = frontmatter(read(path));
    assert.ok(field(fields, 'title'), `${path} has no title`);
    const description = field(fields, 'description');
    assert.ok(description, `${path} has no description`);
    assert.ok(description.length <= MAX_DESCRIPTION, `${path} description is ${description.length} characters`);
  }
});

test('docs pages publish title, description, canonical and Open Graph metadata', () => {
  const page = read('app/docs/[[...slug]]/page.tsx');
  assert.match(page, /title: page\.data\.title,/);
  assert.match(page, /const description = page\.data\.description \?\? DEFAULT_METADATA_DESCRIPTION;/);
  assert.match(page, /alternates: \{ canonical: page\.url \}/);
  assert.match(page, /openGraph: \{\s+title,\s+description,\s+url: page\.url,/);
  assert.match(page, /twitter: \{\s+card: "summary_large_image",\s+title,\s+description,/);
});

test('site defaults and app routes have short descriptions, Open Graph and relative canonicals', () => {
  assert.ok(metadata.DEFAULT_DOCUMENTATION_TITLE.length > 0);
  assert.ok(metadata.DEFAULT_METADATA_DESCRIPTION.length <= MAX_DESCRIPTION, 'default description length');
  const layout = read('app/layout.tsx');
  assert.match(layout, /openGraph: \{\s+title: DEFAULT_DOCUMENTATION_TITLE,\s+description: DEFAULT_METADATA_DESCRIPTION,/);

  assert.ok(playgrounds.length >= 2, 'expected the playground pages');
  for (const path of playgrounds) {
    const source = read(path);
    const description = source.match(/^ {2}description: '([^']+)',$/m)?.[1];
    assert.ok(source.match(/^ {2}title: '([^']+)',$/m), `${path} has a title`);
    assert.ok(description && description.length <= MAX_DESCRIPTION, `${path} description`);
    assert.match(source, new RegExp(`canonical: '${routeOf(path)}'`), `${path} canonical`);
    const openGraph = source.match(/openGraph: \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';
    assert.match(openGraph, /title: '[^']+'/, `${path} og:title`);
    assert.ok(openGraph.includes(`description: '${description}'`), `${path} og:description`);
  }
});

test('no hreflang alternates: the docs have no localized routes', () => {
  for (const path of [...walk('app').filter((p) => /\.tsx?$/.test(p)), 'lib/metadata.ts']) {
    assert.doesNotMatch(read(path), /hreflang|alternates: \{[^}]*languages:/, `${path} declares hreflang`);
  }
});

// ---- Built output (CI, after `next build`) ----
const live = process.env.ADDIS_SEO_LIVE === '1';
const built = (path) => join(root, '.next/server/app', path);
const decode = (value) =>
  value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (html, attribute, name) =>
  html.match(new RegExp(`<meta[^>]*${attribute}="${name}"[^>]*content="([^"]*)"`))?.[1] ??
  html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attribute}="${name}"`))?.[1];

test('built: sitemap.xml and robots.txt', { skip: !live && 'set ADDIS_SEO_LIVE=1 after next build' }, () => {
  const sitemap = readFileSync(built('sitemap.xml.body'), 'utf8');
  for (const route of ['/docs/capabilities/text-to-speech', '/docs/capabilities/text-to-speech/streaming', '/docs/capabilities/speech-to-text', '/docs/playground/text-to-speech', '/docs/playground/speech-to-text']) {
    assert.ok(sitemap.includes(`<loc>${PRODUCTION}${route}</loc>`), `sitemap lists ${route}`);
  }
  const robots = readFileSync(built('robots.txt.body'), 'utf8');
  assert.match(robots, new RegExp(`Sitemap: ${PRODUCTION}/sitemap\\.xml`));
  assert.match(robots, /User-Agent: \*\nAllow: \//i);
});

test('built: pages carry title, description, Open Graph, absolute canonical and JSON-LD', { skip: !live && 'set ADDIS_SEO_LIVE=1 after next build' }, () => {
  const pages = [
    'docs/capabilities/text-to-speech.html',
    'docs/capabilities/text-to-speech/streaming.html',
    'docs/capabilities/speech-to-text.html',
    'docs/get-started/introduction.html',
    'docs/announcements.html',
    'docs/playground/text-to-speech.html',
  ];
  for (const page of pages) {
    assert.ok(existsSync(built(page)), `${page} was prerendered`);
    const html = readFileSync(built(page), 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/, `${page} title`);
    const description = decode(meta(html, 'name', 'description') ?? '');
    assert.ok(description && description.length <= MAX_DESCRIPTION, `${page} description (${description.length})`);
    assert.ok(meta(html, 'property', 'og:title'), `${page} og:title`);
    assert.ok(meta(html, 'property', 'og:description'), `${page} og:description`);
    const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
    assert.ok(canonical?.startsWith(`${PRODUCTION}/`), `${page} canonical ${canonical}`);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    const organization = blocks.find((block) => block['@type'] === 'Organization');
    assert.ok(organization, `${page} has Organization JSON-LD`);
    assert.deepEqual([...organization.knowsLanguage].sort(), [...codes].sort());
  }
});
