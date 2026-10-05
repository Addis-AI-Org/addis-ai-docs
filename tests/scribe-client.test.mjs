import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/scribe-client.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { authHeaders, pcm16, validateSocketUrl, readTranscriptStream } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

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
