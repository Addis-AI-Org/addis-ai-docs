import assert from 'node:assert/strict';
import test from 'node:test';
import {
  codes,
  facts,
  languageName,
  loadTs,
  read,
  realtimeLanguages,
  scribeLanguages,
  section,
  tableRows,
  voiceLanguages,
  walk,
} from './support.mjs';

// Every language and voice list the docs render must match data/addis-languages.json,
// the copy of the GA source of truth. Set ADDIS_DRIFT=1 to also compare that file with
// the live public API.

const CDN = 'https://cdn.addisassistant.com/voice-previews/';
const previewUrl = (id) => CDN + (facts.preview_files[id] ?? `${id}-v1.mp3`);
const titleCase = (value) => value[0].toUpperCase() + value.slice(1);
const sameMembers = (actual, expected, message) =>
  assert.deepEqual([...actual].sort(), [...expected].sort(), message);

test('the source-of-truth file is internally consistent', () => {
  assert.deepEqual(codes, ['am', 'om', 'ti', 'sw', 'ha', 'sid', 'wal']);
  assert.deepEqual(Object.keys(facts.voices), voiceLanguages);
  assert.deepEqual(Object.keys(facts.default_voices), voiceLanguages);
  assert.deepEqual(realtimeLanguages, ['am', 'om', 'ti', 'sw']);
  assert.equal(facts.voices.ha.length, 4, 'Hausa has exactly four voices');
  for (const lang of voiceLanguages) {
    assert.equal(facts.voices[lang][0], facts.default_voices[lang], `${lang} lists its default voice first`);
    for (const id of facts.voices[lang]) {
      assert.match(id, new RegExp(`^${lang}-[a-z]+(-[a-z]+)?$`), `${id} is a <lang>-<name> ID`);
      assert.ok(!facts.retired_voices.includes(id), `${id} is retired`);
    }
    assert.ok(facts.example_text[lang]?.length >= 20, `${lang} has a full example sentence`);
  }
});

test('the playable voice catalog lists exactly the live voices with their details and CDN previews', async () => {
  const { voiceCatalog } = await loadTs('data/voice-catalog.ts');
  sameMembers(new Set(voiceCatalog.map((voice) => voice.language)), voiceLanguages, 'catalog languages');
  assert.equal(new Set(voiceCatalog.map((voice) => voice.id)).size, voiceCatalog.length, 'voice IDs are unique');
  for (const lang of voiceLanguages) {
    const ids = voiceCatalog.filter((voice) => voice.language === lang).map((voice) => voice.id);
    sameMembers(ids, facts.voices[lang], `${lang} voices in data/voice-catalog.ts`);
  }
  for (const voice of voiceCatalog) {
    assert.ok(voice.id.startsWith(`${voice.language}-`), `${voice.id} matches its language`);
    assert.ok(voice.sample.startsWith(CDN), `${voice.id} previews from the CDN`);
    assert.match(voice.sample, new RegExp(`/${voice.id}-v\\d+\\.mp3$`), `${voice.id} previews its own generated clip`);
    const details = facts.voice_details[voice.id];
    if (!details) continue;
    for (const field of ['name', 'descriptor', 'gender', 'style']) {
      assert.equal(voice[field], details[field], `${voice.id} ${field}`);
    }
    assert.equal(voice.sample, previewUrl(voice.id), `${voice.id} preview URL`);
  }
});

test('the catalog language filter offers every voice language by name', () => {
  const component = read('components/voice-catalog.tsx');
  const options = [...component.matchAll(/\{ id: '([a-z]+)', label: '([^']+)' \}/g)].map(([, id, label]) => [id, label]);
  assert.deepEqual(options, voiceLanguages.map((lang) => [lang, languageName(lang)]));
  for (const lang of voiceLanguages) assert.match(component, new RegExp(`type Language = [^;]*'${lang}'`));
});

test('streaming and real-time lists offer exactly the realtime languages', async () => {
  const { streamingVoiceCatalog } = await loadTs('data/streaming-voice-catalog.ts');
  const { STREAMING_LANGUAGES } = await loadTs('lib/voice-stream-client.ts');
  assert.deepEqual([...STREAMING_LANGUAGES], realtimeLanguages);
  sameMembers(new Set(streamingVoiceCatalog.map((voice) => voice.language)), realtimeLanguages, 'streaming catalog languages');
  for (const lang of realtimeLanguages) {
    const voices = streamingVoiceCatalog.filter((voice) => voice.language === lang);
    assert.deepEqual(voices.map((voice) => voice.id), facts.voices[lang], `${lang} streaming voices`);
    assert.deepEqual(voices.filter((voice) => voice.is_default).map((voice) => voice.id), [facts.default_voices[lang]]);
  }

  const demo = read('components/voice-streaming-demo.tsx');
  const examples = [...demo.matchAll(/^ {2}([a-z]+): \{ name: '([^']+)', voice: '([^']+)', text: '([^']+)' \},$/gm)];
  assert.deepEqual(examples.map(([, code]) => code), realtimeLanguages, 'demo language options');
  for (const [, code, name, voice, text] of examples) {
    assert.equal(name, languageName(code));
    assert.equal(voice, facts.default_voices[code]);
    assert.equal(text, facts.example_text[code], `${code} demo sentence is the checked example`);
  }
});

test('the Text-to-Speech page documents every voice language and its voices', () => {
  const page = read('content/docs/capabilities/text-to-speech/index.mdx');
  const filters = tableRows(section(page, '### Catalog filters')).find((row) => row[0] === 'Language');
  assert.deepEqual([...filters[3].matchAll(/`([a-z]+)`/g)].map((match) => match[1]), voiceLanguages);

  for (const lang of voiceLanguages.filter((code) => !['am', 'om'].includes(code))) {
    const name = languageName(lang);
    const body = section(page, `### ${name} voices`);
    assert.ok(body, `missing "### ${name} voices"`);
    const defaultVoice = facts.default_voices[lang];
    const rows = tableRows(body);
    assert.deepEqual(rows.map((row) => row[0]), facts.voices[lang].map((id) => `\`${id}\``), `${name} voice table`);
    for (const [id, label, gender, style] of rows) {
      const voiceId = id.slice(1, -1);
      assert.equal(label.includes('(default)'), voiceId === defaultVoice, `${voiceId} default marker`);
      const details = facts.voice_details[voiceId];
      if (details) {
        assert.equal(label.replace(' (default)', ''), details.name);
        assert.equal(gender, titleCase(details.gender));
        assert.equal(style, details.style);
      }
    }
    assert.ok(body.includes(`language: "${lang}"`), `${name} sends language "${lang}"`);
    for (const sample of [`voiceId: "${defaultVoice}"`, `voice_id="${defaultVoice}"`, `"voice_id":"${defaultVoice}"`]) {
      assert.ok(body.includes(sample), `${name} samples use ${defaultVoice} (${sample})`);
    }
    assert.equal(body.split(facts.example_text[lang]).length - 1, 3, `${name} samples speak the checked example text`);
    if (!facts.languages[lang].voice_realtime) {
      assert.match(body, /not available/, `${name} says streaming is not available yet`);
    }
  }

  const batches = section(page, '## Batch generation');
  for (const lang of voiceLanguages) assert.ok(batches.includes(`(\`${lang}\`)`), `batches accept ${lang}`);
});

test('the streaming page lists only realtime languages and says the others are not available yet', () => {
  const page = read('content/docs/capabilities/text-to-speech/streaming.mdx');
  const rows = tableRows(section(page, '## Choose a language and voice'));
  assert.deepEqual(
    rows.map(([language, code, , voice]) => [language, code, voice]),
    realtimeLanguages.map((lang) => [languageName(lang), `\`${lang}\``, `\`${facts.default_voices[lang]}\``]),
  );
  const others = voiceLanguages.filter((lang) => !realtimeLanguages.includes(lang));
  const notice = page.split('\n').find((line) => line.includes('not available for streaming'));
  assert.ok(notice, 'the streaming page names the languages without streaming');
  for (const lang of others) {
    assert.ok(notice.includes(languageName(lang)), `${languageName(lang)} is named as not streaming yet`);
    assert.doesNotMatch(page, new RegExp(`language[=:]\\s*"${lang}"`), `streaming samples never use ${lang}`);
  }
});

test('site-wide copy, JSON-LD and llms.txt name every speech language', async () => {
  const { SPEECH_LANGUAGE_CODES, ORGANIZATION_JSON_LD, ORGANIZATION_DEFINITION } = await loadTs('lib/site.ts');
  const speech = codes.filter((code) => facts.languages[code].voice || facts.languages[code].scribe);
  assert.deepEqual(SPEECH_LANGUAGE_CODES, speech);
  assert.deepEqual(ORGANIZATION_JSON_LD.knowsLanguage, speech);

  const { DEFAULT_METADATA_DESCRIPTION } = await loadTs('lib/metadata.ts');
  const surfaces = {
    'organization definition': ORGANIZATION_DEFINITION,
    'default description': DEFAULT_METADATA_DESCRIPTION,
    'llms.txt': read('app/llms.txt/route.ts'),
    FAQ: read('content/docs/platform/faq.mdx'),
    introduction: read('content/docs/get-started/introduction.mdx'),
    pricing: read('content/docs/platform/pricing.mdx'),
    'Text-to-Speech page': read('content/docs/capabilities/text-to-speech/index.mdx'),
    'Speech-to-Text page': read('content/docs/capabilities/speech-to-text/index.mdx'),
    announcements: read('content/docs/announcements.mdx'),
  };
  for (const [surface, text] of Object.entries(surfaces)) {
    for (const lang of speech) assert.ok(text.includes(languageName(lang)), `${surface} names ${languageName(lang)}`);
  }
  assert.match(read('content/docs/announcements.mdx'), /<AnnouncementHero date="2026-11-04">/);
});

test('Scribe language lists match the Scribe languages', async () => {
  const { SCRIBE_LANGUAGES } = await loadTs('lib/scribe-client.ts');
  assert.deepEqual(Object.keys(SCRIBE_LANGUAGES).sort(), [...scribeLanguages].sort());
  for (const lang of scribeLanguages) assert.equal(SCRIBE_LANGUAGES[lang], languageName(lang));
});

test('retired voices are never listed or linked', () => {
  const published = [...walk('content'), ...walk('data'), ...walk('components'), ...walk('app'), ...walk('lib'), ...walk('public')]
    .filter((path) => path !== 'data/addis-languages.json' && /\.(mdx?|json|tsx?|mjs|js|html|txt)$/.test(path));
  for (const path of published) {
    for (const id of facts.retired_voices) {
      assert.ok(!read(path).includes(id), `${path} mentions retired voice ${id}`);
    }
  }
});

const live = process.env.ADDIS_DRIFT === '1';
const API = 'https://api.addisassistant.com/api/v1';
async function capabilities(path) {
  const response = await fetch(`${API}${path}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200, `${path} answered ${response.status}`);
  return (await response.json()).data;
}

test('live: Scribe languages, backends and speaker labels match the source of truth', { skip: !live && 'set ADDIS_DRIFT=1' }, async () => {
  const data = await capabilities('/scribe');
  assert.deepEqual(Object.keys(data.languages).sort(), [...scribeLanguages].sort());
  for (const lang of scribeLanguages) {
    assert.deepEqual([...data.languages[lang].backends].sort(), [...facts.languages[lang].scribe_backends].sort(), `${lang} backends`);
    assert.equal(data.languages[lang].speakers, facts.languages[lang].scribe_speakers, `${lang} speaker labels`);
  }
});

test('live: real-time voice languages match the source of truth', { skip: !live && 'set ADDIS_DRIFT=1' }, async () => {
  const data = await capabilities('/realtime');
  assert.deepEqual([...data.languages].sort(), [...realtimeLanguages].sort());
});
