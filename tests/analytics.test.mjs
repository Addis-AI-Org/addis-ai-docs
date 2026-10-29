import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');

async function load(path) {
  const source = readFileSync(join(root, path), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}

const { cleanAnalyticsUrl, cleanCapturedEvent } = await load('lib/analytics-privacy.ts');
const {
  CODE_LANGUAGES,
  DOCS_CAPABILITIES,
  DOCS_SECTIONS,
  getCodeLanguage,
  getCodeLanguageFromClass,
  getDeploymentEnvironment,
  getDocsCapability,
  getDocsSection,
  getPlaygroundFailure,
  getPortalCtaTarget,
  tagDocsEvent,
} = await load('lib/analytics-tags.ts');

function walk(path) {
  return readdirSync(join(root, path)).flatMap((name) => {
    const child = join(path, name);
    return statSync(join(root, child)).isDirectory() ? walk(child) : [child];
  });
}

/** Every docs URL, from content/docs and the playground routes. */
const docsUrls = [
  ...walk('content/docs')
    .filter((path) => path.endsWith('.mdx'))
    .map((path) => `/docs/${path.slice('content/docs/'.length).replace(/\.mdx$/, '').replace(/(^|\/)index$/, '')}`),
  ...readdirSync(join(root, 'app/docs/playground')).map((name) => `/docs/playground/${name}`),
];

test('URLs keep utm parameters and drop emails, codes, tokens, searches and the fragment', () => {
  assert.equal(
    cleanAnalyticsUrl(
      'https://docs.addisassistant.com/docs/get-started/quickstart?email=dev%40example.com&code=482913&token=sk_live_abc&access_token=x&q=speech&query=amharic&search=tts&utm_source=newsletter&utm_campaign=launch#step-2',
    ),
    'https://docs.addisassistant.com/docs/get-started/quickstart?utm_source=newsletter&utm_campaign=launch',
  );
  assert.equal(
    cleanAnalyticsUrl('https://docs.addisassistant.com/docs/platform/errors#401'),
    'https://docs.addisassistant.com/docs/platform/errors',
  );
});

test('ad click ids become click_id_present=1', () => {
  for (const key of ['gclid', 'fbclid', 'ttclid', 'msclkid', 'li_fat_id']) {
    assert.equal(
      cleanAnalyticsUrl(`https://docs.addisassistant.com/docs?${key}=abc123&utm_medium=cpc`),
      'https://docs.addisassistant.com/docs?utm_medium=cpc&click_id_present=1',
    );
  }
  assert.equal(
    cleanAnalyticsUrl('https://docs.addisassistant.com/docs?gclid=a&fbclid=b'),
    'https://docs.addisassistant.com/docs?click_id_present=1',
  );
});

test('an email in the path is masked, and a relative URL keeps only its path', () => {
  assert.equal(
    cleanAnalyticsUrl('https://docs.addisassistant.com/u/dev%40example.com/keys?token=x'),
    'https://docs.addisassistant.com/u/:redacted/keys',
  );
  assert.equal(cleanAnalyticsUrl('/docs/capabilities/translation?code=1#top'), '/docs/capabilities/translation');
});

test('before_send cleans every URL on the event and the person, and keeps email only on the person', () => {
  const event = cleanCapturedEvent({
    event: '$pageview',
    properties: {
      $current_url: 'https://docs.addisassistant.com/docs?email=a%40b.com&utm_source=x#h',
      $referrer: 'https://www.google.com/search?q=addis+ai+api+key',
      $initial_current_url: 'https://docs.addisassistant.com/docs?token=t',
      $prev_pageview_url: 'https://docs.addisassistant.com/docs/a?code=9',
      email: 'a@b.com',
      first_touch: { landing_url: 'https://addisassistant.com/signup?code=1&gclid=g', referrer: 'https://x.com/?s=1' },
      $set: { $current_url: 'https://docs.addisassistant.com/docs?token=t', email: 'kept@person.com' },
    },
    $set_once: { $initial_referrer: 'https://www.bing.com/search?q=secret' },
  });
  assert.equal(event.properties.$current_url, 'https://docs.addisassistant.com/docs?utm_source=x');
  assert.equal(event.properties.$referrer, 'https://www.google.com/search');
  assert.equal(event.properties.$initial_current_url, 'https://docs.addisassistant.com/docs');
  assert.equal(event.properties.$prev_pageview_url, 'https://docs.addisassistant.com/docs/a');
  assert.equal(event.properties.email, undefined);
  assert.deepEqual(event.properties.first_touch, {
    landing_url: 'https://addisassistant.com/signup?click_id_present=1',
    referrer: 'https://x.com/',
  });
  assert.deepEqual(event.properties.$set, {
    $current_url: 'https://docs.addisassistant.com/docs',
    email: 'kept@person.com',
  });
  assert.deepEqual(event.$set_once, { $initial_referrer: 'https://www.bing.com/search' });
  assert.equal(cleanCapturedEvent(null), null);
});

test('only the public hostnames are production; laptops are development; the rest are previews', () => {
  for (const host of [
    'docs.addisassistant.com',
    'DOCS.addisassistant.com:443',
    'docs.addisassistant.com.',
    'status.addisassistant.com',
    'addisassistant.com',
    'www.addisassistant.com',
    'beta.addisassistant.com',
    'platform.addisassistant.com',
  ]) {
    assert.equal(getDeploymentEnvironment(host), 'production', host);
  }
  for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000', '::1', 'docs.localhost', 'mac.local', '', null, undefined]) {
    assert.equal(getDeploymentEnvironment(host), 'development', String(host));
  }
  for (const host of ['addis-ai-docs-git-main-addis.vercel.app', 'studio.addisassistant.com', 'docs.addisassistant.com.evil.com']) {
    assert.equal(getDeploymentEnvironment(host), 'preview', host);
  }
});

test('every docs page belongs to a named section, and the section is the segment after /docs', () => {
  for (const url of docsUrls) {
    const section = getDocsSection(url);
    assert.notEqual(section, 'other', `${url} needs a section in DOCS_SECTIONS`);
    assert.equal(section, url.split('/')[2], url);
  }
  assert.deepEqual(
    [...new Set(docsUrls.map((url) => getDocsSection(url)))].sort(),
    DOCS_SECTIONS.filter((section) => section !== 'other').sort(),
  );
  assert.equal(getDocsSection('/docs/Capabilities/Translation/?utm_source=x#top'), 'capabilities');
  assert.equal(getDocsSection('/docs'), 'other');
  assert.equal(getDocsSection('/'), 'other');
  assert.equal(getDocsSection('/docs/unknown-section/page'), 'other');
  assert.equal(getDocsSection('/llms.txt'), 'other');
  assert.equal(getDocsSection('/', 'status.addisassistant.com'), 'platform');
});

test('each page maps to the capability it documents', () => {
  const expected = {
    '/docs/announcements': 'other',
    '/docs/api-reference/chat-generate': 'chat',
    '/docs/api-reference/studio-analyses': 'studio',
    '/docs/api-reference/studio-conversation-analysis': 'studio',
    '/docs/api-reference/studio-top-questions': 'studio',
    '/docs/capabilities/multimodal': 'chat',
    '/docs/capabilities/realtime': 'realtime',
    '/docs/capabilities/speech-to-text': 'stt',
    '/docs/capabilities/speech-to-text/live': 'live',
    '/docs/capabilities/streaming': 'other',
    '/docs/capabilities/text-generation': 'chat',
    '/docs/capabilities/text-generation/function-calling': 'chat',
    '/docs/capabilities/text-generation/multi-turn': 'chat',
    '/docs/capabilities/text-generation/streaming': 'chat',
    '/docs/capabilities/text-generation/system-instructions': 'chat',
    '/docs/capabilities/text-to-speech': 'tts',
    '/docs/capabilities/text-to-speech/streaming': 'tts',
    '/docs/capabilities/text-to-speech-legacy': 'tts',
    '/docs/capabilities/translation': 'translation',
    '/docs/get-started/api-overview': 'other',
    '/docs/get-started/introduction': 'other',
    '/docs/get-started/playground': 'other',
    '/docs/get-started/quickstart': 'other',
    '/docs/get-started/sdks': 'sdk',
    '/docs/integration/mobile': 'other',
    '/docs/integration/server': 'other',
    '/docs/integration/streaming-voice-agent': 'voice_agent',
    '/docs/integration/voice-interface': 'voice_agent',
    '/docs/integration/web': 'other',
    '/docs/platform/errors': 'other',
    '/docs/platform/faq': 'other',
    '/docs/platform/limits': 'other',
    '/docs/platform/pricing': 'billing',
    '/docs/platform/status': 'other',
    '/docs/playground/speech-to-text': 'stt',
    '/docs/playground/text-to-speech': 'tts',
  };
  // A new page fails here until someone decides what it documents.
  assert.deepEqual(docsUrls.slice().sort(), Object.keys(expected).sort());
  for (const [url, capability] of Object.entries(expected)) {
    assert.equal(getDocsCapability(url), capability, url);
    assert.ok(DOCS_CAPABILITIES.includes(capability), capability);
  }
  // Every value but `other` is used by some page.
  assert.deepEqual(
    [...new Set(Object.values(expected))].sort(),
    DOCS_CAPABILITIES.slice().sort(),
  );
  assert.equal(getDocsCapability('/docs/capabilities/speech-to-text/live/'), 'live');
  assert.equal(getDocsCapability('/docs/capabilities/text-to-speechx'), 'other');
  assert.equal(getDocsCapability('/', 'status.addisassistant.com'), 'other');
});

test('code block languages fold to one closed list', () => {
  assert.equal(getCodeLanguage('ts'), 'typescript');
  assert.equal(getCodeLanguage('TSX'), 'typescript');
  assert.equal(getCodeLanguage('js'), 'javascript');
  assert.equal(getCodeLanguage('sh'), 'bash');
  assert.equal(getCodeLanguage('py'), 'python');
  assert.equal(getCodeLanguage('constructor'), 'other');
  assert.equal(getCodeLanguage(undefined), 'other');
  assert.equal(getCodeLanguageFromClass('language-python'), 'python');
  assert.equal(getCodeLanguageFromClass('twoslash language-ts lsp'), 'typescript');
  assert.equal(getCodeLanguageFromClass('no-language-here'), 'other');
  assert.equal(getCodeLanguageFromClass(null), 'other');
  // Every language a code fence in content/docs uses has a name of its own.
  const fences = walk('content/docs')
    .filter((path) => path.endsWith('.mdx'))
    .flatMap((path) => [...readFileSync(join(root, path), 'utf8').matchAll(/^\s*```(\w+)/gm)].map((match) => match[1]));
  for (const lang of new Set(fences)) {
    assert.notEqual(getCodeLanguage(lang), 'other', `${lang} needs an alias in LANGUAGE_ALIASES`);
    assert.ok(CODE_LANGUAGES.includes(getCodeLanguage(lang)));
  }
});

test('links to the developer portal name where they lead; other hosts are not CTAs', () => {
  const cases = {
    'https://addisassistant.com/signup': 'signup',
    'https://addisassistant.com/signup?ref=docs': 'signup',
    'https://addisassistant.com/login': 'login',
    'https://addisassistant.com/verify-otp': 'login',
    'https://addisassistant.com/apikeys': 'api_keys',
    'https://www.addisassistant.com/apikeys/': 'api_keys',
    'https://addisassistant.com/usage': 'dashboard',
    'https://addisassistant.com/billing': 'dashboard',
    'https://addisassistant.com/batches': 'dashboard',
    'https://beta.addisassistant.com/playground': 'playground',
    'https://addisassistant.com/studio/agents/new': 'studio',
    'https://addisassistant.com/studio-access': 'studio',
    'https://platform.addisassistant.com/pricing': 'pricing',
    'https://addisassistant.com': 'other',
    'https://addisassistant.com/terms': 'other',
  };
  for (const [href, target] of Object.entries(cases)) {
    assert.equal(getPortalCtaTarget(href), target, href);
  }
  for (const href of [
    'https://docs.addisassistant.com/docs/get-started/quickstart',
    'https://api.addisassistant.com/api/v1/chat_generate',
    'https://status.addisassistant.com/',
    'https://addisassistant.com.evil.com/signup',
    'https://evil.com/addisassistant.com/signup',
    'mailto:support@addisassistant.com',
    'not a url',
  ]) {
    assert.equal(getPortalCtaTarget(href), null, href);
  }
  assert.equal(getPortalCtaTarget('/docs/platform/pricing', 'https://docs.addisassistant.com'), null);
});

test('a failed playground call is classed by the first error status the API returned', () => {
  assert.equal(getPlaygroundFailure(401), 'client_error');
  assert.equal(getPlaygroundFailure(402), 'client_error');
  assert.equal(getPlaygroundFailure(429), 'client_error');
  assert.equal(getPlaygroundFailure(500), 'server_error');
  assert.equal(getPlaygroundFailure(503), 'server_error');
  assert.equal(getPlaygroundFailure(null), 'failed');
  assert.equal(getPlaygroundFailure(302), 'failed');
});

test('every event carries app, environment, and the section and capability of its own page', () => {
  const tagged = tagDocsEvent(
    {
      event: '$pageview',
      properties: {
        $current_url: 'https://docs.addisassistant.com/docs/capabilities/speech-to-text/live',
        // Saved in the cookie shared with addisassistant.com by the portal.
        app: 'developer_portal',
        environment: 'preview',
      },
    },
    'production',
  );
  assert.deepEqual(tagged.properties, {
    $current_url: 'https://docs.addisassistant.com/docs/capabilities/speech-to-text/live',
    app: 'docs',
    environment: 'production',
    docs_section: 'capabilities',
    docs_capability: 'live',
  });
  const fromPathname = tagDocsEvent(
    { event: '$autocapture', properties: { $pathname: '/docs/platform/pricing', $host: 'docs.addisassistant.com' } },
    'production',
  );
  assert.equal(fromPathname.properties.docs_section, 'platform');
  assert.equal(fromPathname.properties.docs_capability, 'billing');
  const status = tagDocsEvent({ event: '$pageview', properties: { $current_url: 'https://status.addisassistant.com/' } }, 'production');
  assert.equal(status.properties.docs_section, 'platform');
  assert.equal(tagDocsEvent(null, 'production'), null);
  assert.deepEqual(tagDocsEvent({ event: 'x' }, 'production'), { event: 'x' });
});
