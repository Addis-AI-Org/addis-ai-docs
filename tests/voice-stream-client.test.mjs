import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/voice-stream-client.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { authHeaders, validateSocketUrl, validateAudioUrl, readVoiceStream } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const result = {id:'clip',audio_url:'https://cdn.addisassistant.com/audio/clips/clip.mp3?token=scoped',duration_seconds:1.008,usage:{credits_used:.084,credits_remaining:2,currency:'ETB',settled:true}};
function framed(audio,metadata=result) {
 const bytes=new Uint8Array(audio.length+8+new TextEncoder().encode(JSON.stringify({data:metadata})).length);
 new DataView(bytes.buffer).setUint32(0,audio.length);bytes.set(audio,4);bytes.set(new TextEncoder().encode(JSON.stringify({data:metadata})),audio.length+8);return bytes;
}
function response(bytes) {return new Response(new ReadableStream({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close();}}),{headers:{'x-addis-audio-protocol':'mp3-frames-v1','content-type':'text/event-stream'}});}
test('API keys and account JWTs use distinct headers without persistent credential storage',()=>{
 assert.deepEqual(authHeaders(' customer-key '),{'x-api-key':'customer-key'});
 assert.deepEqual(authHeaders(' Bearer signed-token ','jwt'),{Authorization:'Bearer signed-token'});
 assert.throws(()=>authHeaders(' '),/API key/);
 assert.throws(()=>authHeaders(' ','jwt'),/access token/);
});
test('socket and playback destinations are restricted to Addis endpoints',()=>{
 assert.equal(validateSocketUrl('wss://api.addisassistant.com/api/v1/realtime/voice'),'wss://api.addisassistant.com/api/v1/realtime/voice');
 for(const url of ['wss://evil.example/api/v1/realtime/voice','wss://api.addisassistant.com/api/v1/realtime/voice?token=x','wss://user:pass@api.addisassistant.com/api/v1/realtime/voice','wss://api.addisassistant.com:444/api/v1/realtime/voice'])assert.throws(()=>validateSocketUrl(url));
 assert.throws(()=>validateAudioUrl('https://evil.example/audio.mp3'));
});
test('HTTP frames survive split headers and multibyte completion JSON, excluding metadata from audio',async()=>{
 const parts=[];const metadata={...result,voice_name:'ብርሃነ'};
 assert.deepEqual(await readVoiceStream(response(framed(new Uint8Array([1,2,3]),metadata)),chunk=>parts.push(...chunk)),metadata);
 assert.deepEqual(parts,[1,2,3]);
});
test('incomplete or unsettled streams cannot display a confirmed charge',async()=>{
 await assert.rejects(readVoiceStream(response(new Uint8Array([0,0,0,1,42])),()=>{}),/billing confirmation/);
 await assert.rejects(readVoiceStream(response(framed(new Uint8Array([42]),{...result,usage:{...result.usage,settled:false}})),()=>{}),/Billing/);
 await assert.rejects(readVoiceStream(Response.json({error:{message:'Refill wallet'}},{status:402}),()=>{}),/Refill/);
});
test('legacy JSON replay downloads the paid clip without forwarding account credentials',async()=>{
 const original=globalThis.fetch;let count=0;
 globalThis.fetch=async(url,init)=>{count++;assert.equal(url,result.audio_url);assert.equal(init.headers,undefined);assert.equal(init.credentials,'omit');return new Response(new Uint8Array([7,8]));};
 try{const chunks=[];const data=await readVoiceStream(Response.json({data:result}),bytes=>chunks.push(...bytes));assert.equal(data.idempotent_replay,true);assert.deepEqual(chunks,[7,8]);assert.equal(count,1);}finally{globalThis.fetch=original;}
});
