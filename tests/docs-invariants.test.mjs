import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function walk(path) {
  const absolute = join(root, path);
  return readdirSync(absolute).flatMap((name) => {
    const child = join(absolute, name);
    if (statSync(child).isDirectory()) return walk(child.slice(root.length + 1));
    return [child.slice(root.length + 1)];
  });
}

const pages = walk('content/docs').filter((path) => path.endsWith('.mdx'));

function frontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

test('every documentation page has a title and a description', () => {
  for (const path of pages) {
    const fields = frontmatter(read(path));
    assert.match(fields, /^title: \S/m, `${path} has no title`);
    assert.match(fields, /^description: \S/m, `${path} has no description`);
  }
});

test('documentation links are relative and resolve to a page, app route, or redirect', () => {
  const redirectSources = new Set(
    [...read('next.config.mjs').matchAll(/source: '([^']+)'/g)].map((match) => match[1]),
  );
  const resolves = (route) =>
    route === '/docs' ||
    existsSync(join(root, 'content', `${route}.mdx`)) ||
    existsSync(join(root, 'content', route, 'index.mdx')) ||
    existsSync(join(root, 'app', route, 'page.tsx')) ||
    redirectSources.has(route);

  const sources = [
    ...pages,
    ...walk('content/docs').filter((path) => path.endsWith('meta.json')),
  ];

  for (const path of sources) {
    const source = read(path);
    assert.doesNotMatch(
      source,
      /https:\/\/docs\.addisassistant\.com\/docs/,
      `${path} links to the production docs host; use a relative /docs/... link`,
    );

    const routes = [
      ...source.matchAll(/\]\((\/docs[^)#\s]*)/g),
      ...source.matchAll(/href=["'](\/docs[^"'#]*)/g),
    ].map((match) => match[1].replace(/\/$/, ''));

    for (const route of routes) {
      assert.ok(resolves(route), `${path} links to missing ${route}`);
    }

    for (const match of source.matchAll(/!\[[^\]]*]\((\/images\/[^)]+)\)/g)) {
      assert.ok(existsSync(join(root, 'public', match[1])), `${path} links to missing image ${match[1]}`);
    }
  }
});
