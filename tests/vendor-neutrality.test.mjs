import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

// Customers buy Addis AI models. Rendered docs, demos and data must never name
// the third-party models, vendors or infrastructure underneath them.

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

const textFile = /\.(mdx?|json|tsx?|mjs|js|html|css|txt)$/;
// page-actions.tsx links readers to their own AI assistant ("Open in ChatGPT /
// Claude"); it says nothing about what runs underneath Addis AI.
const published = [
  ...walk('content'),
  ...walk('data'),
  ...walk('public'),
  ...walk('components').filter((path) => !path.endsWith('page-actions.tsx')),
].filter((path) => textFile.test(path));

const vendor =
  /\b(gemini|google|vertex|azure|microsoft|openai|open ai|whisper|chatgpt|gpt-?\d\w*|claude|anthropic|elevenlabs|eleven labs|indextts\d*|index-tts|pyannote|deepgram|assemblyai|speechmatics|cartesia)\b|\bflash(-lite)?\b|\w-preview(-\d|\b)(?!-card)/i;

test('published docs, demos and data name no third-party model or vendor', () => {
  assert.ok(published.length > 20, 'expected to scan the docs content');
  for (const path of published) {
    read(path)
      .split('\n')
      .forEach((line, index) => {
        assert.doesNotMatch(line, vendor, `${path}:${index + 1} names a third-party model or vendor`);
      });
  }
});

test('speech-to-text samples show the Addis response, not a vendor payload', () => {
  for (const path of ['content/docs/capabilities/speech-to-text/index.mdx', 'content/docs/get-started/api-overview.mdx']) {
    const source = read(path);
    assert.doesNotMatch(source, /totalBilledDuration|"requestId"/, `${path} shows vendor speech metadata`);
  }
  assert.match(read('content/docs/get-started/introduction.mdx'), /`አሌፍ-stt`/);
});

test('chat docs use the Addis chat contract', () => {
  const chatPages = walk('content/docs').filter((path) => path.endsWith('.mdx'));
  const allowed = new Set(['stop', 'length', 'content_filter', 'tool_calls', 'other']);
  for (const path of chatPages) {
    const source = read(path);
    for (const [, reason] of source.matchAll(/"finish_reason":\s*"([^"]+)"/g)) {
      assert.ok(allowed.has(reason), `${path} documents finish_reason "${reason}"`);
    }
    assert.doesNotMatch(source, /googleapis|generativelanguage/i, `${path} shows a vendor file URL`);
    assert.doesNotMatch(source, /prompt_tokens_details|candidates_tokens_details|serviceTier|promptTokenCount/, `${path} documents vendor usage fields`);
    // The `model` request field is ignored; examples must not imply a choice.
    assert.doesNotMatch(source, /["']model["']\s*(=>|:)\s*["']/, `${path} sends a model field in a request example`);
  }
  const reference = read('content/docs/api-reference/chat-generate.mdx');
  for (const reason of allowed) assert.match(reference, new RegExp(`"${reason}"`));
  assert.match(reference, /addis_tool_state, an opaque token/);
  assert.match(read('content/docs/capabilities/multimodal.mdx'), /addis:\/\/files\/YOUR_FILE_ID/);
  assert.match(read('content/docs/capabilities/realtime.mdx'), /Addis realtime protocol/);
});
