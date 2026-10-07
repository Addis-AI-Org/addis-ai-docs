import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/scribe-client.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { authHeaders, pcm16, validateSocketUrl, readTranscriptStream, toSrt, toVtt, wrapCaption, wordsBySegment, segmentAt } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('API keys are header-only and absent credentials fail before network access', () => {
  assert.deepEqual(authHeaders('  customer-key  '), { 'x-api-key': 'customer-key' });
  assert.throws(() => authHeaders(' '), /API key/);
});
test('PCM frames are explicitly little-endian and clipped', () => {
  assert.deepEqual([...new Uint8Array(pcm16(new Float32Array([-2, 0, 2])))], [0, 128, 0, 0, 255, 127]);
});
test('tickets only connect to the live Addis API without credentials in the URL', () => {
  assert.equal(validateSocketUrl('wss://api.addisassistant.com/api/v1/scribe/stream'), 'wss://api.addisassistant.com/api/v1/scribe/stream');
  for (const url of ['wss://evil.example/api/v1/scribe/stream', 'wss://api.addisassistant.com/api/v1/scribe/stream?token=secret', 'https://api.addisassistant.com/api/v1/scribe/stream']) assert.throws(() => validateSocketUrl(url));
});
test('NDJSON handles split UTF-8 and requires confirmed settlement', async () => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(JSON.stringify({type:'transcript.partial', text:'ሰላም'}) + '\n' + JSON.stringify({type:'transcript.completed',data:{text:'ሰላም',usage:{settled:true}}})+'\n');
  const parts = [bytes.slice(0,38),bytes.slice(38,40),bytes.slice(40)];
  const response = new Response(new ReadableStream({start(c){parts.forEach(p=>c.enqueue(p));c.close();}}), {headers:{'content-type':'application/x-ndjson'}});
  const partials=[];
  assert.equal((await readTranscriptStream(response,text=>partials.push(text))).text,'ሰላም');
  assert.deepEqual(partials,['ሰላም']);
  await assert.rejects(readTranscriptStream(new Response('{"type":"transcript.partial","text":"x"}\n',{headers:{'content-type':'application/x-ndjson'}}),()=>{}), /billing confirmation/);
  await assert.rejects(readTranscriptStream(new Response('{"type":"error","error":{"message":"Refill"}}\n',{headers:{'content-type':'application/x-ndjson'}}),()=>{}), /Refill/);
});
test('the microphone worklet flushes the last short frame before completion', () => {
  let Processor; const sent=[];
  class AudioWorkletProcessor {constructor(){this.port={postMessage:data=>sent.push(data),onmessage:null};}}
  vm.runInNewContext(readFileSync(new URL('../public/scribe-pcm-worklet.js',import.meta.url),'utf8'),{AudioWorkletProcessor,Float32Array,registerProcessor:(_name,cls)=>{Processor=cls;}});
  const processor=new Processor();
  processor.process([[new Float32Array(1700).fill(.25)]]);
  processor.port.onmessage({data:{flush:true}});
  assert.equal(sent[0].length,1600);assert.equal(sent[1].length,100);assert.equal(sent[2],null);
});

const vector = [{ text: 'ሰላም ወዳጆቻችን እንዴት ከረማችሁ ዛሬ እንግዲህ እንግዳ አድርጌ ያቀረኩላችሁ', start: 18.8, end: 21.8 }];

test('captions match the server test vector exactly', () => {
  assert.equal(toSrt({ segments: vector }), '1\n00:00:18,800 --> 00:00:21,800\nሰላም ወዳጆቻችን እንዴት ከረማችሁ ዛሬ እንግዲህ እንግዳ አድርጌ\nያቀረኩላችሁ\n');
  assert.equal(toVtt({ segments: vector }), 'WEBVTT\n\n00:00:18.800 --> 00:00:21.800\nሰላም ወዳጆቻችን እንዴት ከረማችሁ ዛሬ እንግዲህ እንግዳ አድርጌ\nያቀረኩላችሁ\n');
});
test('multiple cues are separated by one blank line with hour, rounding and short-line handling', () => {
  const segments = [...vector, { text: 'ነው', start: 3725.0049, end: 3726.2 }];
  assert.equal(
    toSrt({ segments }),
    '1\n00:00:18,800 --> 00:00:21,800\nሰላም ወዳጆቻችን እንዴት ከረማችሁ ዛሬ እንግዲህ እንግዳ አድርጌ\nያቀረኩላችሁ\n\n2\n01:02:05,005 --> 01:02:06,200\nነው\n',
  );
  assert.equal(
    toVtt({ segments }),
    'WEBVTT\n\n00:00:18.800 --> 00:00:21.800\nሰላም ወዳጆቻችን እንዴት ከረማችሁ ዛሬ እንግዲህ እንግዳ አድርጌ\nያቀረኩላችሁ\n\n01:02:05.005 --> 01:02:06.200\nነው\n',
  );
  assert.equal(toSrt({ segments: [] }), '');
  assert.equal(toVtt({ segments: [] }), 'WEBVTT\n');
  assert.throws(() => toSrt({}), /timestamps=word/);
  assert.throws(() => toVtt({ text: 'x' }), /timestamps=word/);
});
test('caption lines wrap greedily at 42 characters and never exceed two lines', () => {
  assert.deepEqual(wrapCaption('ሰላም ወዳጆቻችን'), ['ሰላም ወዳጆቻችን']);
  assert.deepEqual(wrapCaption(`${'a'.repeat(42)} b`), ['a'.repeat(42), 'b']);
  assert.deepEqual(wrapCaption(`${'a'.repeat(20)} ${'b'.repeat(21)}`), [`${'a'.repeat(20)} ${'b'.repeat(21)}`]);
  assert.deepEqual(wrapCaption(`${'a'.repeat(40)} ${'b'.repeat(40)} ${'c'.repeat(40)}`), ['a'.repeat(40), `${'b'.repeat(40)} ${'c'.repeat(40)}`]);
});
test('words are grouped under their caption cue and the active cue follows playback time', () => {
  const words = [
    { text: 'ሰላም', start: 18.9, end: 19.52 }, { text: 'ወዳጆቻችን', start: 19.6, end: 20 },
    { text: 'ነው', start: 23.1, end: 23.3 },
  ];
  const segments = [{ text: 'ሰላም ወዳጆቻችን', start: 18.5, end: 20.6 }, { text: 'ነው', start: 22.7, end: 23.9 }];
  assert.deepEqual(wordsBySegment({ words, segments }).map(group => group.map(word => word.text)), [['ሰላም', 'ወዳጆቻችን'], ['ነው']]);
  assert.deepEqual(wordsBySegment({ words: words.slice(1), segments }).map(group => group.length), [1, 1]);
  assert.equal(segmentAt(segments, 18.4), -1);
  assert.equal(segmentAt(segments, 18.5), 0);
  assert.equal(segmentAt(segments, 21), -1);
  assert.equal(segmentAt(segments, 23.8), 1);
});
