// Shared helpers for the node --test suites. Not a test file itself.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

export const root = resolve(import.meta.dirname, '..');
export const read = (path) => readFileSync(join(root, path), 'utf8');
export const exists = (path) => existsSync(join(root, path));

export function walk(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    const child = join(absolute, name);
    if (statSync(child).isDirectory()) return walk(child.slice(root.length + 1));
    return [child.slice(root.length + 1)];
  });
}

/** Import a dependency-free TypeScript module (type-only imports are dropped). */
export async function loadTs(path) {
  const js = ts.transpileModule(read(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}#${path}`);
}

/** The source of truth copied from the GA brief (verified against the live API). */
export const facts = JSON.parse(read('data/addis-languages.json'));
export const codes = Object.keys(facts.languages);
export const voiceLanguages = codes.filter((code) => facts.languages[code].voice);
export const realtimeLanguages = codes.filter((code) => facts.languages[code].voice_realtime);
export const scribeLanguages = codes.filter((code) => facts.languages[code].scribe);
export const languageName = (code) => facts.languages[code].name;

/** Text of a Markdown section from its heading to the next heading of the same or higher level. */
export function section(source, heading) {
  const level = heading.match(/^#+/)[0].length;
  const start = source.indexOf(`${heading}\n`);
  if (start === -1) return null;
  const rest = source.slice(start + heading.length + 1);
  const next = rest.search(new RegExp(`^#{1,${level}} `, 'm'));
  return next === -1 ? rest : rest.slice(0, next);
}

/** Rows of the first Markdown table in `source`, as arrays of trimmed cells (header and divider skipped). */
export function tableRows(source) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.startsWith('|'));
  if (start === -1) return [];
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    rows.push(line.split('|').slice(1, -1).map((cell) => cell.trim()));
  }
  return rows;
}

/** Heading anchors as Fumadocs generates them (github-slugger rules, `[#custom-id]` overrides). */
export function headingAnchors(source) {
  const anchors = new Set();
  const seen = new Map();
  let fenced = false;
  for (const line of source.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const match = line.match(/^#{1,6} (.+?)\s*$/);
    if (match) {
      const custom = match[1].match(/\[#([^\]]+)\]$/);
      if (custom) {
        anchors.add(custom[1]);
        continue;
      }
      const text = match[1]
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/[`*]/g, '');
      const base = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      anchors.add(count ? `${base}-${count}` : base);
    }
    for (const id of line.matchAll(/\bid=["']([^"']+)["']/g)) anchors.add(id[1]);
  }
  return anchors;
}
