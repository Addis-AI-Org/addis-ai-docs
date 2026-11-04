import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Studio is not live: no Studio API page is published', () => {
  const published = readdirSync(join(root, 'content/docs/api-reference'));
  assert.deepEqual(published.filter((name) => /studio/i.test(name)), []);
  assert.doesNotMatch(read('content/docs/api-reference/meta.json'), /studio/i);
});

test('Announcements is the first sidebar entry, right under Useful Links', () => {
  const pages = JSON.parse(read('content/docs/meta.json')).pages;
  assert.equal(pages[0], 'announcements');
  assert.equal(pages.filter((page) => page === 'announcements').length, 1);
});

test('pages offer no "Copy page" button', () => {
  const actions = read('components/page-actions.tsx');
  assert.doesNotMatch(actions, /Copy page|clipboard/);
  assert.match(actions, /Open in ChatGPT/);
});

test('Realtime Audio is priced as billed: 2 / 8 ETB per 1,000 input / output tokens (since 2026-11-04)', () => {
  const pricing = read('content/docs/platform/pricing.mdx');
  assert.match(pricing, /\*\*Realtime Audio \(Input\)\*\* \| Input tokens \| \*\*2 ETB \/ 1,000 tokens\*\*/);
  assert.match(pricing, /\*\*Realtime Audio \(Output\)\*\* \| Output tokens \| \*\*8 ETB \/ 1,000 tokens\*\*/);
});
