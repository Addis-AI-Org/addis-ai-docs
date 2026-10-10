import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/status-client.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const load = (env) => {
  const previous = process.env.NEXT_PUBLIC_STATUS_URL;
  if (env === undefined) delete process.env.NEXT_PUBLIC_STATUS_URL; else process.env.NEXT_PUBLIC_STATUS_URL = env;
  return import(`data:text/javascript;base64,${Buffer.from(js + `\n// ${env}`).toString('base64')}`).finally(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_STATUS_URL; else process.env.NEXT_PUBLIC_STATUS_URL = previous;
  });
};
const { STATUS_URL, STATUS_API, stateLabel, overallLabel, componentLabel, groupComponents, activeIncidents, parseStatus, fetchStatus } = await load(undefined);

test('the status base URL defaults to the public Worker and can be overridden', async () => {
  assert.equal(STATUS_URL, 'https://status.addisassistant.com');
  assert.equal(STATUS_API, 'https://status.addisassistant.com/api/status.json');
  const custom = await load('https://status.staging.example/');
  assert.equal(custom.STATUS_API, 'https://status.staging.example/api/status.json');
});
test('states map to the documented status labels', () => {
  assert.equal(stateLabel('operational'), 'Operational');
  assert.equal(stateLabel('degraded'), 'Degraded Performance');
  assert.equal(stateLabel('partial_outage'), 'Partial Outage');
  assert.equal(stateLabel('major_outage'), 'Major Outage');
  assert.equal(stateLabel('no_data'), 'No data');
  assert.equal(stateLabel('exploded'), 'No data');
  assert.equal(overallLabel('operational'), 'All systems operational');
  assert.equal(overallLabel('major_outage'), 'Major Outage');
  assert.equal(componentLabel({ state: 'operational', cold: true }), 'Operational · cold start');
  assert.equal(componentLabel({ state: 'degraded', cold: false }), 'Degraded Performance');
});
test('components are grouped in first-seen order', () => {
  const c = (id, group) => ({ id, group, name: id, stage: 'ga', state: 'operational', cold: false });
  assert.deepEqual(groupComponents([c('tts.am', 'Text to speech'), c('stt.am', 'Speech to text'), c('tts.om', 'Text to speech')]).map(g => [g.group, g.components.map(x => x.id)]), [
    ['Text to speech', ['tts.am', 'tts.om']],
    ['Speech to text', ['stt.am']],
  ]);
});
test('only unresolved incidents are active, newest first', () => {
  const incidents = [
    { id: 1, title: 'Old', severity: 'minor', status: 'resolved', started_at: 1, resolved_at: 2 },
    { id: 2, title: 'A', severity: 'major', status: 'investigating', started_at: 5, resolved_at: null },
    { id: 3, title: 'B', severity: 'minor', status: 'monitoring', started_at: 9, resolved_at: null },
  ];
  assert.deepEqual(activeIncidents(incidents).map(i => i.id), [3, 2]);
});
test('responses are validated and normalized', async () => {
  const body = { updated: 1760000000000, overall: 'degraded', components: [
    { id: 'tts.am', group: 'Text to speech', name: 'Amharic', stage: 'beta', state: 'weird', cold: true, p95: 420 },
    { name: 'missing id' },
  ], incidents: [{ id: 7, title: 'Latency', severity: 'minor', status: 'investigating', started_at: 1 }] };
  const parsed = parseStatus(body);
  assert.equal(parsed.overall, 'degraded');
  assert.deepEqual(parsed.components, [{ id: 'tts.am', group: 'Text to speech', name: 'Amharic', stage: 'beta', state: 'no_data', cold: true, p95: 420 }]);
  assert.equal(parsed.incidents[0].resolved_at, null);
  assert.throws(() => parseStatus(null), /not an object/);
  assert.throws(() => parseStatus({ overall: 'operational' }), /required fields/);

  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push([url, init.cache]); return new Response(JSON.stringify(body)); };
  try {
    assert.equal((await fetchStatus()).components.length, 1);
    assert.deepEqual(calls, [['https://status.addisassistant.com/api/status.json', 'no-store']]);
    globalThis.fetch = async () => new Response('oops', { status: 503 });
    await assert.rejects(fetchStatus(), /503/);
  } finally {
    globalThis.fetch = original;
  }
});
