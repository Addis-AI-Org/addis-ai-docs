import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { read, walk } from './support.mjs';

// Published pages, demos and data never name training-data sources, model families used
// as provenance, benchmark systems other than the approved comparisons, or infrastructure
// providers. vendor-neutrality.test.mjs separately bans third-party model vendors.
//
// The names are stored only as SHA-256 prefixes of their normalized form (lowercase, no
// spaces), because this repository is public and some of them must never be named in
// public. To add a term: node -e "console.log(require('crypto').createHash('sha256')
//   .update('term').digest('hex').slice(0, 16))"

const BANNED = new Set([
  '7a4f4ede16423bc4', '3e4bae8b498e3226', '687da461f14e63ed', // training-data sources
  'fc62ccabad679c5e', '75f828791805ab68', 'd6458c53707e0e7e', 'ba7955598f2007bc', // systems never named in comparisons
  '371970a5698e73b2', '263c75f8a90b0e13',
  '3fb22a5597fb91ee', '751a16d8cb41ea83', '0075870f97c892ba', '567ceef6f2456c83', // model families as provenance
  '4d7594e57f7d03f3', '6c296fde55b85278', '137ecaef71a6a4a4', '738e22f0acab814c', // infrastructure providers
]);

const hash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);

/** Every word, every hyphenated word and its parts, and every pair of adjacent words joined, normalized. */
export function candidates(line) {
  const words = line.toLowerCase().match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
  const out = [];
  words.forEach((word, i) => {
    out.push(word, ...word.split('-'));
    if (i + 1 < words.length) out.push(word + words[i + 1]);
  });
  return out;
}

const bannedIn = (line) => candidates(line).find((word) => BANNED.has(hash(word)));

const published = [
  ...walk('content'),
  ...walk('data'),
  ...walk('public'),
  ...walk('components'),
  ...walk('app'),
].filter((path) => /\.(mdx?|json|tsx?|mjs|js|html|css|txt|xml|svg)$/.test(path));

test('published content names no training-data source, unapproved system or provider', () => {
  assert.ok(published.length > 50, 'expected to scan the published files');
  for (const path of published) {
    read(path)
      .split('\n')
      .forEach((line, index) => {
        const word = bannedIn(line);
        assert.equal(word, undefined, `${path}:${index + 1} uses a banned name (hash ${word && hash(word)})`);
      });
  }
});

test('published pages never link a supabase.co storage URL', () => {
  for (const path of published) {
    assert.doesNotMatch(read(path), /https?:\/\/[a-z0-9.-]*supabase\.co/i, `${path} links a supabase.co URL`);
  }
});

test('the banned-name check matches whole words in any case, including split and hyphenated forms', () => {
  for (const sample of ['MMS baseline', 'Built with nemo', 'WHISPER large', 'waxal-benchmarking/x', 'Buzz ASR results', 'whisper-small-x']) {
    assert.ok(bannedIn(sample), sample);
  }
  for (const sample of ['Hohenheim', 'mmsi', 'nemorphic', 'whispered', 'Addis Scribe']) {
    assert.equal(bannedIn(sample), undefined, sample);
  }
});
