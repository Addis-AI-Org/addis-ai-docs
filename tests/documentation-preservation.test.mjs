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
  assert.match(meta, /"platform\/errors",\s*"platform\/status",\s*"platform\/faq"/);
  assert.doesNotMatch(meta, /get-started\/models/);
  assert.doesNotMatch(meta, /text-to-speech-legacy/);
});

test('removes the broken Models template page without redirecting old URLs', () => {
  const docsPage = read('app/docs/[[...slug]]/page.tsx');
  const files = walk('content/docs')
    .filter((file) => /\.(mdx?|tsx?|json)$/.test(file))
    .map((file) => read(file.slice(root.length + 1)))
    .join('\n');

  assert.equal(existsSync(join(root, 'content/docs/get-started/models.mdx')), false);
  assert.doesNotMatch(docsPage, /get-started\/models/);
  assert.match(docsPage, /if \(!page\) notFound\(\)/);
  assert.doesNotMatch(files, /\/docs\/get-started\/models/);
  assert.doesNotMatch(files, /Displaying Shiki highlighted code blocks/);
});

test('keeps the approved Useful Links permanently visible above the tree', () => {
  const layout = read('lib/layout.shared.tsx');

  assert.match(layout, /Useful Links/);
  assert.match(layout, /API keys/);
  assert.match(layout, /Node\.js on npm/);
  assert.match(layout, /Python on PyPI/);
  assert.doesNotMatch(layout, /SDK resources/);
  assert.doesNotMatch(layout, /Node\.js on GitHub|Python on GitHub/);
  assert.doesNotMatch(layout, /collapsible/i);
});

test('uses Addis AI documentation metadata for page titles and link previews', () => {
  const appLayout = read('app/layout.tsx');
  const docsPage = read('app/docs/[[...slug]]/page.tsx');
  const sharedMetadata = read('lib/metadata.ts');
  const meta = read('content/docs/meta.json');

  assert.match(sharedMetadata, /Addis AI Documentation \| APIs & SDKs for African Languages/);
  assert.match(
    sharedMetadata,
    /Build with Addis AI APIs and official Node\.js and Python SDKs for text generation, speech-to-text, Addis Voices 2, translation, multimodal reasoning, and realtime voice in Amharic and Afaan Oromo\./,
  );
  assert.match(appLayout, /template: `%s \| \$\{DOCUMENTATION_SITE_NAME\}`/);
  assert.match(appLayout, /openGraph:/);
  assert.match(appLayout, /twitter:/);
  assert.match(docsPage, /formatDocumentationTitle\(page\.data\.title\)/);
  assert.match(meta, /Addis AI Documentation \| APIs & SDKs for African Languages/);
});

test('shows responsive social links beside the sidebar theme switcher', () => {
  const layout = read('lib/layout.shared.tsx');
  const docsLayout = read('app/docs/layout.tsx');

  for (const url of [
    'https://discord.gg/8cF6d9CkTM',
    'https://www.linkedin.com/company/addisai/?',
    'https://github.com/Addis-AI-Org',
    'https://huggingface.co/addisai',
  ]) {
    assert.match(layout, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(docsLayout, /sidebar=\{\{ footer:/);
  assert.match(layout, /type: 'icon' as const/g);
  assert.match(layout, /external: true/g);
  assert.match(layout, /on: 'menu' as const/g);
  assert.match(layout, /\.\.\.communityLinks/);
  assert.match(layout, /fill="none"/);
  assert.match(layout, /stroke="currentColor"/);
  assert.match(layout, /viewBox="4\.5 2\.5 15 15"/);
  assert.doesNotMatch(layout, /Addis AI website/);
  assert.doesNotMatch(layout, /text-\[#(?:5865F2|0A66C2|FFD21E)\]/);
  assert.match(layout, /url: 'https:\/\/addisassistant\.com'/);
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

  assert.match(quickstart, /https:\/\/addisassistant\.com\/playground/);
  assert.match(quickstart, /Open the Addis AI Playground/);
  assert.match(quickstart, /https:\/\/addisassistant\.com\/apikeys/);
  assert.match(quickstart, /The \*\*Voice Lab\*\* experience/);
  assert.doesNotMatch(quickstart, /Voice Labs/);
  assert.match(quickstart, /Current Addis AI Playground showing model, language, output, temperature, and token controls/);
  assert.match(quickstart, /Addis AI API Keys page with the Create API Key button/);
  assert.match(quickstart, /Create API Key dialog with the key-name field/);
  assert.match(quickstart, /one-time Copy action/);

  assert.match(read('content/docs/platform/faq.mdx'), /<Accordions>/);
  assert.match(read('content/docs/integration/web.mdx'), /## Security: The Golden Rule/);
  assert.match(read('content/docs/integration/server.mdx'), /<ArchitectureFlow \/>/);
  assert.match(read('content/docs/integration/voice-interface.mdx'), /<VoiceLoopFlow \/>/);
  assert.match(introduction, /addis-offset-shell/);
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
    '## Migrate from Legacy Text-to-Speech',
    '/api/v1/voice/generations',
    'no credential change',
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
  assert.match(catalogComponent, /addis-offset-shell/);
  assert.match(catalogComponent, /grid border-l border-fd-border/);
  assert.doesNotMatch(catalogComponent, /bg-gradient/);
});

test('applies the second-round Introduction and chat-control refinements', () => {
  const introduction = read('content/docs/get-started/introduction.mdx');
  const textGeneration = read('content/docs/capabilities/text-generation.mdx');

  assert.doesNotMatch(introduction, /GPT-4|Silicon Valley/);
  assert.doesNotMatch(introduction, /v2 Models Live/);
  assert.doesNotMatch(introduction, /We solve the \*\*three hardest problems\*\* in African NLP/);
  assert.doesNotMatch(introduction, /Join 500\+ developers building with Addis AI/);
  assert.match(introduction, /major general-purpose AI models can misinterpret or hallucinate/);
  assert.match(introduction, /Addis Voices 2 · 28 production voices/);
  assert.match(introduction, /https:\/\/docs\.addisassistant\.com\/docs\/capabilities\/text-to-speech/);
  assert.match(introduction, /Voice-first AI infrastructure,/);
  assert.match(introduction, /for African languages\./);
  assert.match(introduction, /Addis AI gives developers a unified infrastructure layer for text generation, speech recognition, natural voices, translation, multimodal reasoning, and realtime voice/);
  assert.match(introduction, /Why language-specific infrastructure matters/);
  assert.match(introduction, /Choose the capability your product needs, then follow the corresponding guide to start building\./);
  assert.match(introduction, /Addis Voices 2/);
  assert.match(introduction, /<NewBadge \/>/);
  assert.match(introduction, /### 🚀 Get Started/);
  assert.match(introduction, /### ⚡ Capabilities/);
  assert.match(introduction, /\[Playground Guide\]\(https:\/\/docs\.addisassistant\.com\/docs\/get-started\/quickstart\)/);
  assert.match(introduction, /Build chat, summarization, RAG, structured-output, and function-calling applications/);
  assert.match(introduction, /Discover, preview, estimate, and generate completed audio clips with Addis Voices 2/);
  assert.match(introduction, /Transcribe Amharic and Afaan Oromo audio into text/);
  assert.match(introduction, /Translate between Amharic, Afaan Oromo, and English in every direction/);
  assert.match(introduction, /Reason over images, audio recordings, and documents through the chat API/);
  assert.match(introduction, /Build low-latency, interruption-capable voice conversations through WebSockets/);
  assert.match(introduction, /### 🧩 Integration/);
  assert.match(introduction, /### ⚙️ Platform/);
  assert.match(introduction, /Join 1,500\+ developers building with Addis AI/);

  for (const parameter of ["'persona'", "'system'"]) {
    assert.match(textGeneration, new RegExp(parameter));
  }
  assert.match(textGeneration, /'persona': \{[\s\S]*?type: 'string',[\s\S]*?required: false/);
  assert.match(textGeneration, /'system': \{[\s\S]*?type: 'string',[\s\S]*?required: false/);
  assert.match(textGeneration, /System Instructions and Personas <NewBadge/);
  assert.match(textGeneration, /Function Calling <NewBadge/);
  assert.match(textGeneration, /platform safeguards remain in force/);
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

test('completes Quick Start capability coverage across REST and Realtime', () => {
  const quickstart = read('content/docs/get-started/quickstart.mdx');

  assert.match(quickstart, /REST API requests use the following production base URL:/);
  assert.match(quickstart, /https:\/\/api\.addisassistant\.com/);
  assert.match(quickstart, /Realtime voice uses a separate WebSocket endpoint:/);
  assert.match(quickstart, /wss:\/\/relay\.addisassistant\.com\/ws/);
  assert.doesNotMatch(quickstart, /All API requests should be made to the production Base URL:/);

  for (const row of [
    '| Chat and Text Generation | `/api/v1/chat_generate` | `POST` |',
    '| Text-to-Speech (Addis Voices 2) | `/api/v1/voice/generations` | `POST` |',
    '| Speech-to-Text | `/api/v2/stt` | `POST` |',
    '| Translation | `/api/v1/translate` | `POST` |',
    '| Multimodal | `/api/v1/chat_generate` | `POST multipart/form-data` |',
    '| Realtime Voice | `wss://relay.addisassistant.com/ws` | `WebSocket` |',
  ]) {
    assert.ok(quickstart.includes(row), `Quick Start is missing capability row: ${row}`);
  }

  assert.match(quickstart, /<Tabs items=\{\['Text Generation', 'Speech-to-Text', 'Translation', 'Multimodal'\]\}>/);
  assert.match(quickstart, /addis\.translate\.create/);
  assert.match(quickstart, /source_language/);
  assert.match(quickstart, /attachments: \[\{ file: await fileFromPath\("market\.jpg", "image\/jpeg"\) \}\]/);
  assert.match(quickstart, /attachment_0=@market\.jpg;type=image\/jpeg/);
  assert.match(quickstart, /<Card href="\/docs\/capabilities\/realtime" icon=\{<Radio \/>\} title="Realtime API">/);
});

test('documents the unified SDK capability matrix', () => {
  const sdks = read('content/docs/get-started/sdks.mdx');

  assert.match(sdks, /## SDK capability matrix/);
  for (const row of [
    '| Chat and text generation | `addis.chat.completions.create` |',
    '| Multi-turn chat | `addis.chat.completions.create` with `messages` |',
    '| Function calling | `addis.chat.completions.create` and SDK tool runners |',
    '| Speech-to-text | `addis.speech.transcribe` |',
    '| Translation | `addis.translate.create` |',
    '| Image and document reasoning | `addis.chat.completions.create` with `attachments` |',
    '| Audio reasoning | `addis.chat.completions.create` with audio input |',
    '| List voices | `addis.voices.list` |',
    '| Preview a voice | `addis.voices.preview` |',
    '| Estimate voice cost | `addis.voice.estimate` |',
    '| Generate a voice clip | `addis.voice.generate` |',
    '| Check voice usage | `addis.voice.usage` |',
    '| List and manage clips | `addis.voice.clips` |',
  ]) {
    assert.ok(sdks.includes(row), `SDK page is missing matrix row: ${row}`);
  }

  assert.match(sdks, /Realtime voice uses a separate WebSocket integration\. Addis Voices 2 and the unified SDK generate completed audio clips and do not replace the Realtime API\./);
});

test('corrects capability page descriptions, terminology, and title badges', () => {
  const docsPage = read('app/docs/[[...slug]]/page.tsx');
  const textGeneration = read('content/docs/capabilities/text-generation.mdx');
  const textToSpeech = read('content/docs/capabilities/text-to-speech.mdx');
  const speechToText = read('content/docs/capabilities/speech-to-text.mdx');
  const translation = read('content/docs/capabilities/translation.mdx');
  const multimodal = read('content/docs/capabilities/multimodal.mdx');
  const voiceInterface = read('content/docs/integration/voice-interface.mdx');
  const errors = read('content/docs/platform/errors.mdx');
  const voiceCatalog = read('components/voice-catalog.tsx');
  const visibleDocs = [
    ...walk('content/docs')
      .filter((file) => /\.(mdx?|json)$/.test(file))
      .map((file) => read(file.slice(root.length + 1))),
    voiceCatalog,
  ].join('\n');

  assert.match(textGeneration, /^description: Chat, summarization, RAG, structured output, and function calling for African languages\.$/m);
  assert.match(textGeneration, /Use Text Generation for chat, summarization, extraction, classification, RAG, structured output, and multi-turn conversations\. Use the dedicated Translation API for direct language-to-language translation\./);
  assert.match(textGeneration, /Token counts vary by language, script, punctuation, and input structure\. For Amharic, one word typically uses around 1\.5 to 1\.8 tokens\. For the exact count, use usage_metadata returned in the REST API response or the corresponding usage value returned by the official SDK\./);
  assert.doesNotMatch(textGeneration, /Typically \*\*1 word ≈ 1\.5 to 1\.8 tokens\*\*|1 Word ≈ 1\.8 Tokens|cultural context \*\*|simple one-off tasks \(like translation\)|Extraction, translation/);

  assert.match(docsPage, /<DocsTitle>\{page\.data\.title\}<\/DocsTitle>/);
  assert.match(docsPage, /page\.data\.isNew \? <NewBadge \/> : null/);
  assert.match(textToSpeech, /^title: Text-to-Speech$/m);
  assert.match(textToSpeech, /^isNew: true$/m);
  assert.match(voiceCatalog, /label: 'Afaan Oromo'/);
  assert.match(voiceCatalog, /'Afaan Oromo'/);

  assert.match(speechToText, /^title: Speech-to-Text$/m);
  assert.match(speechToText, /^description: Transcribe Amharic and Afaan Oromo audio into text\.$/m);
  assert.match(translation, /^description: Translate text between Amharic, Afaan Oromo, and English\.$/m);
  assert.match(translation, /The Translation API supports bidirectional translation between Amharic \(`am`\), Afaan Oromo \(`om`\), and English \(`en`\)\. All six source-to-target language combinations are available through the REST API and official SDKs\./);
  assert.match(translation, /Supported language pairs/);
  assert.match(translation, /Amharic ↔ Afaan Oromo/);
  assert.match(translation, /Amharic ↔ English/);
  assert.match(translation, /Afaan Oromo ↔ English/);
  assert.doesNotMatch(visibleDocs, /Afan Oromo/);
  assert.doesNotMatch(translation, /Triangular Support|High-accuracy neural machine translation/);

  assert.match(multimodal, /^description: Reason over images, audio recordings, and documents through the unified chat API\.$/m);
  assert.match(multimodal, /You can upload images, audio files, and documents/);
  assert.match(multimodal, /Use the chat endpoint with an image or document attachment and an explicit extraction prompt for OCR and document-text extraction\./);
  assert.doesNotMatch(multimodal, /finalizing a dedicated OCR endpoint|You can upload \*\*Images\*\* and \*\*Audio files\*\*/);
  assert.match(voiceInterface, /For live, interruption-capable conversations, use the \*\*\[Realtime API\]\(\/docs\/capabilities\/realtime\)\*\* instead of the request-response STT → LLM → Addis Voices 2 pipeline\./);
  assert.doesNotMatch(voiceInterface, /The Ultimate Solution|If latency is critical/);
  assert.match(errors, /If the issue continues, check \[Addis AI Status\]\(https:\/\/status\.addisassistant\.com\)\. If all systems are operational, contact `support@addisassistant\.com` and include the endpoint, status code, request ID, and approximate request time\./);
  assert.doesNotMatch(errors, /check our status page/);
});

test('publishes status documentation and legacy route redirects', () => {
  const status = read('content/docs/platform/status.mdx');
  const errors = read('content/docs/platform/errors.mdx');
  const config = read('next.config.mjs');
  const proxy = read('proxy.ts');

  assert.match(status, /^title: Status$/m);
  assert.match(status, /^description: Current availability, incidents, and uptime history for Addis AI services\.$/m);
  for (const service of [
    'REST API',
    'Realtime API',
    'Developer platform and API Keys',
    'Playground',
    'Voice Lab',
  ]) {
    assert.match(status, new RegExp(service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const label of [
    'Operational',
    'Degraded Performance',
    'Partial Outage',
    'Major Outage',
    'Maintenance',
  ]) {
    assert.match(status, new RegExp(label));
  }
  assert.match(status, /## Current incidents/);
  assert.match(status, /## Resolved incidents/);
  assert.match(status, /## Recent uptime history/);
  assert.match(errors, /https:\/\/status\.addisassistant\.com/);
  assert.match(proxy, /status\.addisassistant\.com/);
  assert.match(proxy, /\/docs\/platform\/status/);

  for (const [source, destination] of [
    ['/docs/get-started/quick-start', '/docs/get-started/quickstart'],
    ['/docs/capabilities/realtime-api', '/docs/capabilities/realtime'],
    ['/docs/integration-guides/web-applications', '/docs/integration/web'],
    ['/docs/examples-and-tutorials/basic-chat', '/docs/capabilities/text-generation'],
    ['/docs/technical-reference/error-codes', '/docs/platform/errors'],
    ['/docs/faq', '/docs/platform/faq'],
  ]) {
    assert.match(config, new RegExp(`source: '${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
    assert.match(config, new RegExp(`destination: '${destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  }
  assert.doesNotMatch(config, /get-started\/models/);
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
  assert.match(components, /flex flex-wrap items-center gap-2/);
  assert.match(components, /\{isNew \? <NewBadge \/> : null\}/);
  assert.match(components, /text-fd-primary/);
  assert.match(components, /addis-offset-shell/);
  assert.doesNotMatch(components, /bg-gradient/);
});

test('uses the shared cyan New badge for page, section, and announcement titles', () => {
  const components = read('components/docs.tsx');
  const page = read('app/docs/[[...slug]]/page.tsx');
  const schema = read('source.config.ts');
  const voice = read('content/docs/capabilities/text-to-speech.mdx');

  assert.match(components, /export function NewBadge/);
  assert.match(components, /border-fd-primary\/35 bg-fd-primary\/10/);
  assert.match(page, /page\.data\.isNew \? <NewBadge \/> : null/);
  assert.match(schema, /isNew: z\.boolean\(\)\.default\(false\)/);
  assert.match(voice, /^title: Text-to-Speech$/m);
  assert.match(voice, /^isNew: true$/m);
});

test('uses one reversible visual system across custom documentation surfaces', () => {
  const styles = read('app/global.css');

  for (const className of ['addis-offset-shell', 'addis-panel', 'addis-grid', 'addis-cell', 'addis-meta']) {
    assert.match(styles, new RegExp(`\\.${className}\\b`), `Missing centralized ${className} utility`);
  }

  for (const path of [
    'content/docs/index.mdx',
    'content/docs/get-started/introduction.mdx',
    'content/docs/get-started/sdks.mdx',
    'content/docs/capabilities/text-generation.mdx',
    'content/docs/capabilities/text-to-speech.mdx',
    'content/docs/capabilities/text-to-speech-legacy.mdx',
    'content/docs/capabilities/speech-to-text.mdx',
    'content/docs/capabilities/multimodal.mdx',
    'content/docs/capabilities/realtime.mdx',
    'content/docs/capabilities/translation.mdx',
    'content/docs/integration/web.mdx',
    'content/docs/integration/mobile.mdx',
    'content/docs/integration/server.mdx',
    'content/docs/integration/voice-interface.mdx',
    'content/docs/platform/pricing.mdx',
    'content/docs/platform/limits.mdx',
    'content/docs/platform/errors.mdx',
  ]) {
    assert.match(read(path), /addis-(?:offset-shell|panel|grid)/, `${path} is missing the shared visual system`);
  }

  const customSurfaces = [
    ...walk('content/docs').filter((path) => path.endsWith('.mdx')),
    ...walk('components').filter((path) => path.endsWith('.tsx')),
  ].map((path) => readFileSync(path, 'utf8')).join('\n');

  assert.doesNotMatch(customSurfaces, /bg-gradient/);
});

test('animates the voice pipeline as sequential nodes and connections', () => {
  const voiceLoop = read('components/voice-loop-flow.tsx');

  assert.match(voiceLoop, /activationStep: 0/);
  assert.match(voiceLoop, /activationStep: 8/);
  assert.match(voiceLoop, /transition-\[left,opacity\] duration-700/);
  assert.match(voiceLoop, /isCurrent \? "opacity-100" : "opacity-0"/);
  assert.match(voiceLoop, /overflow-x-auto/);
  assert.match(voiceLoop, /aria-live="polite"/);
  assert.match(voiceLoop, /prefers-reduced-motion: reduce/);
  assert.match(voiceLoop, /Live request path/);
});

test('uses the same sequential motion system for server-side integration', () => {
  const architecture = read('components/architecture-flow.tsx');

  assert.match(architecture, /activationStep=\{0\}/);
  assert.match(architecture, /activationStep=\{4\}/);
  assert.match(architecture, /transition-\[left,opacity\] duration-700/);
  assert.match(architecture, /Secure request path/);
  assert.match(architecture, /annotation="Secure zone"/);
  assert.match(architecture, /overflow-x-auto/);
  assert.match(architecture, /aria-live="polite"/);
  assert.match(architecture, /prefers-reduced-motion: reduce/);
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
  assert.match(pricing, /Text Generation & Translation \(Input\)/);
  assert.match(pricing, /Text Generation & Translation \(Output\)/);
  assert.match(pricing, /Realtime Audio \(Input\)/);
  assert.match(pricing, /Realtime Audio \(Output\)/);
  assert.doesNotMatch(pricing, /Text Generation & Translation —|Realtime Audio —/);
  assert.equal(existsSync(join(root, 'public/pricing.json')), false);
  assert.equal(existsSync(join(root, 'app/pricing.json')), false);
});

test('uses current platform routes and consistent release terminology', () => {
  const docsText = walk('content/docs')
    .filter((path) => path.endsWith('.mdx'))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  assert.doesNotMatch(docsText, /platform\.addisassistant\.com/);
  assert.doesNotMatch(docsText, /Addis Voice 2/);
  assert.doesNotMatch(docsText, /Legacy Text to Speech/);
  assert.match(docsText, /Addis Voices 2/);
  assert.match(docsText, /Legacy Text-to-Speech/);
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
