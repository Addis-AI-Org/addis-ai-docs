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
    if (statSync(child).isDirectory()) {
      return walk(child.slice(root.length + 1));
    }
    return [child];
  });
}

test('keeps the original documentation tree and adds only approved primary pages', () => {
  const meta = read('content/docs/meta.json');

  for (const route of [
    'get-started/introduction',
    'get-started/quickstart',
    'capabilities/text-generation',
    'capabilities/text-to-speech',
    'capabilities/speech-to-text',
    'capabilities/multimodal',
    'capabilities/realtime',
    'capabilities/translation',
    'integration/web',
    'integration/mobile',
    'integration/server',
    'integration/voice-interface',
    'platform/errors',
    'platform/faq',
  ]) {
    assert.ok(meta.includes(`"${route}"`), `Navigation is missing ${route}`);
  }

  assert.match(meta, /"announcements"/);
  assert.match(meta, /"get-started\/sdks"/);
  assert.match(meta, /"platform\/pricing"/);
  assert.doesNotMatch(meta, /text-to-speech-legacy/);
});

test('keeps the approved SDK resources permanently visible above the tree', () => {
  const layout = read('lib/layout.shared.tsx');

  assert.match(layout, /SDK resources/);
  assert.match(layout, /API keys/);
  assert.match(layout, /Node\.js on npm/);
  assert.match(layout, /Python on PyPI/);
  assert.doesNotMatch(layout, /GitHub/);
  assert.doesNotMatch(layout, /collapsible/i);
});

test('preserves original onboarding screenshots and page structures', () => {
  const quickstart = read('content/docs/get-started/quickstart.mdx');
  const introduction = read('content/docs/get-started/introduction.mdx');
  for (const image of [
    '/images/playgroundchat.png',
    '/images/api_page.png',
    '/images/api_name.png',
    '/images/secretkey.png',
  ]) {
    assert.ok(quickstart.includes(image), `Quick Start is missing ${image}`);
    assert.ok(existsSync(join(root, 'public', image)));
  }

  assert.match(read('content/docs/platform/faq.mdx'), /<Accordions>/);
  assert.match(read('content/docs/integration/web.mdx'), /## Security: The Golden Rule/);
  assert.match(read('content/docs/integration/server.mdx'), /<ArchitectureFlow \/>/);
  assert.match(read('content/docs/integration/voice-interface.mdx'), /<VoiceLoopFlow \/>/);
  assert.match(introduction, /pointer-events-none absolute -inset-3/);
  assert.doesNotMatch(introduction, /bg-gradient/);
});

test('preserves capability depth and best-practice guidance', () => {
  const required = new Map([
    ['content/docs/capabilities/text-generation.mdx', ['## API Reference', '## Best Practices']],
    ['content/docs/capabilities/speech-to-text.mdx', ['## API Reference', '## Best Practices']],
    ['content/docs/capabilities/multimodal.mdx', ['## API Reference', '## Best Practices']],
    ['content/docs/capabilities/translation.mdx', ['## Use Cases', '#### Available Parameters', '## API Reference', '## Best Practices']],
    ['content/docs/capabilities/realtime.mdx', ['## Audio Format Requirements', '## Protocol & Events', '## Live Interactive Demo', '## Capabilities Roadmap']],
  ]);

  for (const [path, markers] of required) {
    const page = read(path);
    for (const marker of markers) assert.match(page, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('documents Voice 2 while retaining the full hidden legacy workflow', () => {
  const voice2 = read('content/docs/capabilities/text-to-speech.mdx');
  const legacy = read('content/docs/capabilities/text-to-speech-legacy.mdx');
  const catalog = read('data/voice-catalog.ts');
  const catalogComponent = read('components/voice-catalog.tsx');

  for (const marker of [
    'am-hamen',
    '## Discover voices',
    '## Preview a voice',
    '## Estimate cost',
    '## Generate and save a clip',
    '## Usage and clip history',
    '## Best Practices',
    '/api/v1/voice/generations',
    '5 ETB per generated minute',
    '/docs/capabilities/text-to-speech-legacy',
  ]) {
    assert.ok(voice2.includes(marker), `Voice 2 page is missing: ${marker}`);
  }

  for (const marker of [
    'status="deprecated"',
    '/api/v1/audio',
    '<Base64Player />',
    'addis.legacy.audio.generate',
    'addis.legacy.audio.stream',
    '### Best Practices',
    '/docs/capabilities/text-to-speech',
  ]) {
    assert.ok(legacy.includes(marker), `Legacy page is missing: ${marker}`);
  }

  assert.equal((catalog.match(/\bid: '(?:am|om)-/g) ?? []).length, 28);
  assert.match(catalog, /id: 'am-loza'/);
  assert.match(catalogComponent, /INITIAL_VISIBLE_VOICES = 6/);
  assert.match(catalogComponent, /voices\.slice\(0, INITIAL_VISIBLE_VOICES\)/);
  assert.match(catalogComponent, /aria-expanded=\{isExpanded\}/);
  assert.match(catalogComponent, /Show fewer voices/);
  assert.match(catalogComponent, /absolute -inset-3/);
  assert.match(catalogComponent, /grid border-l border-fd-border/);
  assert.doesNotMatch(catalogComponent, /bg-gradient/);
});

test('keeps SDK examples primary without removing cURL interoperability', () => {
  for (const path of [
    'content/docs/get-started/quickstart.mdx',
    'content/docs/capabilities/text-generation.mdx',
    'content/docs/capabilities/text-to-speech.mdx',
    'content/docs/capabilities/speech-to-text.mdx',
    'content/docs/capabilities/multimodal.mdx',
    'content/docs/capabilities/translation.mdx',
  ]) {
    const page = read(path);
    const node = page.indexOf('Node.js');
    const python = page.indexOf('Python');
    const curl = page.indexOf('cURL');
    assert.ok(node >= 0 && python > node && curl > python, `${path} must lead with Node.js, then Python, then cURL`);
  }

  const text = read('content/docs/capabilities/text-generation.mdx');
  assert.match(text, /addis\.chat\.runTools/);
  assert.match(text, /addis\.chat\.run_tools/);
  assert.match(text, /tool_call_id/);
  assert.match(text, /Tool calling is currently non-streaming/);

  const sdks = read('content/docs/get-started/sdks.mdx');
  assert.doesNotMatch(sdks, /cURL/);
});

test('keeps raw endpoint panels only where the Realtime protocol requires one', () => {
  for (const path of [
    'content/docs/capabilities/text-generation.mdx',
    'content/docs/capabilities/text-to-speech.mdx',
    'content/docs/capabilities/text-to-speech-legacy.mdx',
    'content/docs/capabilities/speech-to-text.mdx',
    'content/docs/capabilities/multimodal.mdx',
    'content/docs/capabilities/translation.mdx',
  ]) {
    assert.doesNotMatch(read(path), /^## Endpoint$/m, `${path} should lead with SDK usage, not a raw endpoint panel`);
  }

  assert.match(read('content/docs/capabilities/realtime.mdx'), /^## Endpoint$/m);
});

test('renders announcements as a release feed with in-card cyan New labels', () => {
  const announcements = read('content/docs/announcements.mdx');
  const components = read('components/docs.tsx');

  assert.match(announcements, /<AnnouncementHero date="2026-07-23">/);
  assert.equal((announcements.match(/<AnnouncementItem/g) ?? []).length, 4);
  assert.equal((announcements.match(/\bisNew\b/g) ?? []).length, 3);
  assert.doesNotMatch(announcements, /<NewBadge/);
  assert.match(components, /justify-between/);
  assert.match(components, /text-fd-primary/);
  assert.match(components, /pointer-events-none absolute -inset-3/);
  assert.doesNotMatch(components, /bg-gradient/);
});

test('uses only the production Voice 2 example and API-key realtime auth', () => {
  const searchable = [
    ...walk('content'),
    ...walk('components'),
    ...walk('data'),
    ...walk('lib'),
    join(root, 'public/realtime-demo.html'),
  ];
  const allText = searchable.map((path) => readFileSync(path, 'utf8')).join('\n');

  assert.doesNotMatch(allText, /am-hiwot/i);

  for (const path of [
    'content/docs/capabilities/realtime.mdx',
    'components/realtime-voice-demo.tsx',
    'public/realtime-demo.html',
  ]) {
    const realtime = read(path);
    assert.match(realtime, /apiKey/);
    assert.doesNotMatch(realtime, /\bjwt\b/i);
  }
});

test('keeps pricing as documentation rather than a public JSON interface', () => {
  const pricing = read('content/docs/platform/pricing.mdx');
  assert.match(pricing, /5 ETB \/ minute/);
  assert.match(pricing, /0\.3 ETB \/ 1,000 tokens/);
  assert.match(pricing, /0\.8 ETB \/ 1,000 tokens/);
  assert.match(pricing, /3\.5 ETB \/ 1,000 characters/);
  assert.equal(existsSync(join(root, 'public/pricing.json')), false);
  assert.equal(existsSync(join(root, 'app/pricing.json')), false);
});

test('resolves local documentation links and image assets', () => {
  const meta = JSON.parse(read('content/docs/meta.json'));
  const publicPages = [
    ...meta.pages.filter((page) => !page.startsWith('---')),
    'capabilities/text-to-speech-legacy',
  ];

  for (const page of publicPages) {
    const absolute = join(root, 'content/docs', `${page}.mdx`);
    const source = readFileSync(absolute, 'utf8');

    for (const match of source.matchAll(/\]\((\/docs(?:\/[^)#\s]+)?)(?:#[^)]+)?\)/g)) {
      const route = match[1];
      if (route === '/docs') continue;
      const page = join(root, 'content', `${route}.mdx`);
      assert.ok(existsSync(page), `${absolute.slice(root.length + 1)} links to missing ${route}`);
    }

    for (const match of source.matchAll(/!\[[^\]]*]\((\/images\/[^)]+)\)/g)) {
      assert.ok(
        existsSync(join(root, 'public', match[1])),
        `${absolute.slice(root.length + 1)} links to missing image ${match[1]}`,
      );
    }
  }
});
