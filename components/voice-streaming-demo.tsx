'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Play, RotateCcw, VolumeX } from 'lucide-react';
import { VOICE_API, authHeaders, readJson, readVoiceStream, validateSocketUrl, validateAudioUrl, availableVoices, selectVoice, type StreamingVoice, type VoiceLanguage, type VoiceCompletion } from '@/lib/voice-stream-client';

import { streamingVoiceCatalog } from '@/data/streaming-voice-catalog';
type Wallet = { balance: number; pricing: { price_per_minute: number; currency: string } };
type Submission = { id: string; text: string; voice: string; language: VoiceLanguage; transport: 'websocket' | 'http'; maxAudio: number };
type Runtime = { socket?: WebSocket; controller?: AbortController; context?: AudioContext; gain?: GainNode; next: number; decode: Promise<void>; muted: boolean; parts: Uint8Array[]; total: number; started: number; deadline?: ReturnType<typeof setTimeout>; heartbeat?: ReturnType<typeof setInterval>; finished: boolean };
const fresh = (): Runtime => ({ next: 0, decode: Promise.resolve(), muted: false, parts: [], total: 0, started: performance.now(), finished: false });
const examples = {
  am: { name: 'Amharic', voice: 'am-hamen', text: 'ሰላም፣ እንኳን ወደ አዲስ ኤአይ በደህና መጡ።' },
  om: { name: 'Afaan Oromo', voice: 'om-bikila', text: 'Nagaa, gara Addis AI baga nagaan dhuftan.' },
  ti: { name: 'Tigrinya', voice: 'ti-berhane', text: 'ሰላም፣ እንቋዕ ናብ ኣዲስ ኤኣይ ብደሓን መጻእኩም።' },
} as const;
const control = 'w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary disabled:opacity-50';
const button = 'inline-flex items-center justify-center gap-2 rounded-md border border-fd-border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary disabled:cursor-not-allowed disabled:opacity-50';

export function VoiceStreamingDemo() {
  const [credential, setCredential] = useState('');
  const [language, setLanguage] = useState<VoiceLanguage>('am');
  const [voice, setVoice] = useState<string>(examples.am.voice);
  const [voices, setVoices] = useState<StreamingVoice[]>(streamingVoiceCatalog);
  const [text, setText] = useState<string>(examples.am.text);
  const [transport, setTransport] = useState<'websocket' | 'http'>('websocket');
  const [maxAudio, setMaxAudio] = useState(60);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Check your account, choose a voice, then stream a sentence.');
  const [error, setError] = useState('');
  const [playbackError, setPlaybackError] = useState('');
  const [result, setResult] = useState<VoiceCompletion | null>(null);
  const [firstAudio, setFirstAudio] = useState<number | null>(null);
  const [bytes, setBytes] = useState(0);
  const [clipUrl, setClipUrl] = useState('');
  const [muted, setMuted] = useState(false);
  const request = useRef<Submission | null>(null);
  const runtime = useRef<Runtime | null>(null);
  const mounted = useRef(true);
  const clip = useRef('');
  const close = (rt: Runtime) => {
    clearTimeout(rt.deadline); clearInterval(rt.heartbeat); rt.finished = true;
    rt.controller?.abort(); rt.socket?.close();
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; const rt = runtime.current; if (rt) { close(rt); void rt.context?.close().catch(() => {}); } if (clip.current) URL.revokeObjectURL(clip.current); };
  }, []);
  const resetAccount = () => { setWallet(null); setResult(null); request.current = null; };
  const checkWallet = async () => {
    setChecking(true); setError('');
    try {
      const headers = authHeaders(credential);
      const account = await readJson<Wallet>(await fetch(`${VOICE_API}/voice/usage`, { headers, cache: 'no-store', credentials: 'omit' }));
      const catalog = await readJson<StreamingVoice[]>(await fetch(`${VOICE_API}/voice/voices`, { headers, cache: 'no-store', credentials: 'omit' }));
      const available = availableVoices(catalog);
      setWallet(account); setVoices(available); setVoice(previous => selectVoice(available, language, previous));
      setStatus('Account checked. New generations charge your wallet; recovery uses the original request ID.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Account check failed.'); }
    finally { setChecking(false); }
  };
  const receive = (rt: Runtime, data: Uint8Array) => {
    if (rt.finished || !mounted.current) return;
    rt.total += data.length;
    if (rt.total > 16 * 1024 * 1024) throw new Error('Audio response is too large. Recover this request.');
    rt.parts.push(data); setBytes(rt.total);
    setFirstAudio(previous => previous ?? performance.now() - rt.started);
    setStatus('Receiving speech. Waiting for the saved clip and confirmed charge…');
    rt.decode = rt.decode.then(async () => {
      if (rt.finished && runtime.current !== rt || rt.muted || !rt.context || rt.context.state === 'closed') return;
      try {
        const buffer = await rt.context.decodeAudioData(data.slice().buffer as ArrayBuffer);
        if (rt.muted || !mounted.current || runtime.current !== rt) return;
        const source = rt.context.createBufferSource(); source.buffer = buffer; source.connect(rt.gain!);
        const start = Math.max(rt.context.currentTime + 0.03, rt.next); source.start(start); rt.next = start + buffer.duration;
      } catch { if (mounted.current) setPlaybackError('Live playback is unavailable for this audio chunk. Use the saved clip below after completion.'); }
    });
  };
  const complete = (rt: Runtime, data: VoiceCompletion) => {
    if (!data.usage || data.usage.settled === false || !Number.isFinite(data.usage.credits_used)) throw new Error('Billing has not been confirmed. Recover this request.');
    validateAudioUrl(data.audio_url);
    if (!mounted.current || runtime.current !== rt) return;
    setResult(data); setBusy(false);
    if (data.usage.credits_remaining !== null && data.usage.credits_remaining !== undefined) setWallet(prev => prev ? { ...prev, balance: data.usage.credits_remaining! } : prev);
    if (clip.current) URL.revokeObjectURL(clip.current);
    clip.current = rt.parts.length ? URL.createObjectURL(new Blob(rt.parts.map(p => p.slice().buffer as ArrayBuffer), { type: 'audio/mpeg' })) : data.audio_url;
    setClipUrl(clip.current);
    setStatus(data.idempotent_replay ? 'Recovered the original clip. No additional charge.' : data.finish_reason === 'audio_limit' ? 'Audio ceiling reached. Partial speech saved and its charge confirmed.' : 'Speech complete. Saved clip and wallet charge confirmed.');
    close(rt);
  };
  const run = async (replay = false) => {
    if (busy) return;
    let rt: Runtime | undefined;
    try {
      const headers = authHeaders(credential);
      const submission = replay ? request.current : { id: `docs_${crypto.randomUUID().replaceAll('-', '')}`, text: text.trim(), voice, language, transport, maxAudio };
      if (!submission || !submission.text) throw new Error('Enter a sentence before starting.');
      request.current = submission;
      const previous = runtime.current; if (previous) { close(previous); void previous.context?.close().catch(() => {}); }
      rt = fresh(); runtime.current = rt;
      setBusy(true); setError(''); setPlaybackError(''); setResult(null); setFirstAudio(null); setBytes(0); setMuted(false); setClipUrl('');
      // Resume from the button gesture, before any network request.
      try { rt.context = new AudioContext(); rt.gain = rt.context.createGain(); rt.gain.connect(rt.context.destination); await rt.context.resume(); }
      catch { setPlaybackError('Use the saved audio player after completion.'); }
      const current = rt;
      const fail = (message: string) => {
        if (!mounted.current || runtime.current !== current || current.finished) return;
        close(current); setBusy(false); setError(message); setStatus('Keep this request ID and use Recover request before starting another generation.');
      };
      current.deadline = setTimeout(() => fail('The stream timed out before billing confirmation.'), 240000);
      setStatus(replay ? 'Recovering the same request…' : 'Creating your speech stream…');
      if (submission.transport === 'http') {
        current.controller = new AbortController();
        const response = await fetch(`${VOICE_API}/voice/generations/stream`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, credentials: 'omit', cache: 'no-store', signal: current.controller.signal,
          body: JSON.stringify({ text: submission.text, language: submission.language, voice_id: submission.voice, output_format: 'mp3_44100', client_request_id: submission.id }) });
        const data = await readVoiceStream(response, audio => receive(current, audio), current.controller.signal);
        complete(current, data);
        return;
      }
      const capability = await readJson<{ version: string }>(await fetch(`${VOICE_API}/realtime`, { cache: 'no-store', credentials: 'omit' }));
      const ticket = await readJson<{ token: string; websocket_url: string }>(await fetch(`${VOICE_API}/realtime/sessions`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, cache: 'no-store', credentials: 'omit',
        body: JSON.stringify({ voice_id: submission.voice, language: submission.language, audio_format: 'mp3', max_text_characters: Math.max(submission.text.length, 1), ...(capability.version === '2' ? { max_audio_seconds: submission.maxAudio } : {}) }) }));
      if (!mounted.current || current.finished) return;
      const socket = new WebSocket(validateSocketUrl(ticket.websocket_url)); current.socket = socket;
      socket.onopen = () => socket.send(JSON.stringify({ type: 'session.authenticate', token: ticket.token }));
      socket.onerror = () => fail('The live connection failed. Recover this request.');
      socket.onclose = () => { if (!current.finished) fail('Connection ended before the clip and charge were confirmed.'); };
      socket.onmessage = event => {
        if (current.finished || !mounted.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'session.created') {
            socket.send(JSON.stringify({ type: 'speech.create', text: submission.text, request_id: submission.id }));
            current.heartbeat = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })); }, 20000);
          } else if (data.type === 'audio.delta') {
            if (data.request_id !== submission.id || data.format !== 'mp3' || typeof data.audio !== 'string' || data.audio.length > 3 * 1024 * 1024) throw new Error('Invalid audio event.');
            receive(current, Uint8Array.from(atob(data.audio), c => c.charCodeAt(0)));
          } else if (data.type === 'speech.completed' || data.type === 'speech.cancelled') {
            if (data.request_id !== submission.id) throw new Error('Unexpected request completion.');
            complete(current, { ...data.data, idempotent_replay: data.idempotent_replay ?? data.data.idempotent_replay });
          } else if (data.type === 'error') fail(`${data.error?.code ?? 'VOICE_ERROR'}: ${data.error?.message ?? 'Recover this request.'}`);
        } catch (e) { fail(e instanceof Error ? e.message : 'Invalid streaming response.'); }
      };
    } catch (e) {
      if (rt) close(rt);
      if (mounted.current) { setBusy(false); setError(e instanceof Error ? e.message : 'Speech request failed.'); }
    }
  };
  const mute = () => { const rt = runtime.current; if (!rt) return; rt.muted = true; if (rt.gain) rt.gain.gain.value = 0; setMuted(true); };
  const available = voices.filter(v => v.language === language);
  return (
    <section className="not-prose addis-offset-shell my-10 border border-fd-border bg-fd-background" aria-labelledby="voice-demo-title">
      <div className="border-b border-fd-border p-5 sm:p-6">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-fd-primary">Addis Voices 2 · Live API</p>
        <h3 id="voice-demo-title" className="text-xl font-semibold tracking-tight">Try streaming speech</h3>
        <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">Hear speech as it arrives over a WebSocket or HTTP stream. New generations charge your Addis AI wallet at the current voice rate.</p>
      </div>
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-5 border-b border-fd-border p-5 sm:p-6 md:border-b-0 md:border-r">
          <fieldset disabled={busy || checking} className="space-y-3">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">Your account</legend>
            <label htmlFor="voice-stream-credential" className="block text-sm font-medium">Developer API key</label>
            <input id="voice-stream-credential" type="password" autoComplete="off" spellCheck={false} value={credential} onChange={e => { setCredential(e.target.value); resetAccount(); }} placeholder="Paste your API key" className={control} />
            <p className="text-xs leading-5 text-fd-muted-foreground">Your credential stays in this page’s memory and is sent only to the Addis AI API. <a href="https://addisassistant.com/apikeys" className="underline">Get an API key</a>.</p>
            <button type="button" className={`${button} w-full`} disabled={!credential.trim()} onClick={checkWallet}>{checking && <Loader2 className="size-4 animate-spin" />}Check balance and rate</button>
            {wallet && <p className="text-sm tabular-nums">Balance <strong>{wallet.balance.toFixed(4)} ETB</strong><br /><span className="text-fd-muted-foreground">{wallet.pricing.price_per_minute} ETB / minute of generated audio</span></p>}
          </fieldset>
          <fieldset disabled={busy} className="space-y-3">
            <label htmlFor="voice-stream-language" className="block text-sm font-medium">Language</label>
            <select id="voice-stream-language" className={control} value={language} onChange={e => { const lang = e.target.value as VoiceLanguage; setLanguage(lang); setVoice(selectVoice(voices, lang)); setText(examples[lang].text); }}>{Object.entries(examples).map(([code, entry]) => <option key={code} value={code}>{entry.name}</option>)}</select>
            <label htmlFor="voice-stream-voice" className="block text-sm font-medium">Voice</label>
            <select id="voice-stream-voice" className={control} disabled={!available.length} value={voice} onChange={e => setVoice(e.target.value)}>{available.length ? available.map(v => <option key={v.id} value={v.id}>{v.name}</option>) : <option value="">No available voices</option>}</select>
            <label htmlFor="voice-stream-transport" className="block text-sm font-medium">Transport</label>
            <select id="voice-stream-transport" className={control} value={transport} onChange={e => setTransport(e.target.value as 'websocket' | 'http')}><option value="websocket">Persistent WebSocket</option><option value="http">HTTP stream</option></select>
            {transport === 'websocket' && <><label htmlFor="voice-stream-ceiling" className="block text-sm font-medium">Maximum audio per turn</label><select id="voice-stream-ceiling" className={control} value={maxAudio} onChange={e => setMaxAudio(Number(e.target.value))}>{[30, 60, 120].map(s => <option key={s} value={s}>{s} seconds</option>)}</select><p className="text-xs leading-5 text-fd-muted-foreground">The upgraded gateway reserves this allowance before generation, charges actual duration, and releases unused credit. The current gateway may not expose this limit yet.</p></>}
          </fieldset>
        </div>
        <div className="flex min-h-96 flex-col p-5 sm:p-6">
          <label htmlFor="voice-stream-text" className="mb-3 text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">Your sentence</label>
          <textarea id="voice-stream-text" lang={language} rows={5} maxLength={1000} disabled={busy} className={`${control} text-base leading-8`} value={text} onChange={e => setText(e.target.value)} />
          <p className="mt-2 text-right text-xs tabular-nums text-fd-muted-foreground">{text.length} / 1,000 characters</p>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy || !credential.trim() || !voice || !text.trim() || checking} onClick={() => void run()} className={`${button} bg-fd-primary text-fd-primary-foreground`}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}Stream speech · bill my wallet</button><button type="button" disabled={!busy || muted} className={button} onClick={mute}><VolumeX className="size-4" />Mute playback</button></div>
          <p role="status" className="mt-5 text-xs leading-5 text-fd-muted-foreground">{status}</p>
          {error && <p role="alert" className="mt-3 rounded border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {playbackError && <p className="mt-3 text-xs text-fd-muted-foreground">{playbackError}</p>}
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-fd-border pt-4 text-sm tabular-nums"><div><dt className="text-xs text-fd-muted-foreground">First audio received</dt><dd className="mt-1">{firstAudio === null ? '—' : `${(firstAudio / 1000).toFixed(2)} s`}</dd></div><div><dt className="text-xs text-fd-muted-foreground">Audio received</dt><dd className="mt-1">{(bytes / 1024).toFixed(1)} KB</dd></div>{result && <><div><dt className="text-xs text-fd-muted-foreground">{result.idempotent_replay ? 'Additional charge' : 'Confirmed charge'}</dt><dd className="mt-1 font-semibold">{(result.idempotent_replay ? 0 : result.usage.credits_used).toFixed(4)} {result.usage.currency}</dd></div><div><dt className="text-xs text-fd-muted-foreground">Generated duration</dt><dd className="mt-1">{result.duration_seconds.toFixed(3)} s</dd></div><div><dt className="text-xs text-fd-muted-foreground">Balance at settlement</dt><dd className="mt-1">{result.usage.credits_remaining == null ? 'Check account balance' : `${result.usage.credits_remaining.toFixed(4)} ETB`}</dd></div><div><dt className="text-xs text-fd-muted-foreground">Billing</dt><dd className="mt-1">{result.idempotent_replay ? 'Original charge recovered' : 'Settled once'}</dd></div></>}</dl>
          {clipUrl && <div className="mt-5 space-y-3"><audio controls src={clipUrl} className="w-full" /><a href={clipUrl} download="addis-voice.mp3" className={button}><Download className="size-4" />Download speech</a></div>}
          {request.current && <div className="mt-5 border-t border-fd-border pt-4"><p className="break-all font-mono text-[10px] text-fd-muted-foreground">Request: {request.current.id}</p><button type="button" className={`${button} mt-3`} disabled={busy || checking || !credential.trim()} onClick={() => void run(true)}><RotateCcw className="size-4" />Recover request</button></div>}
          <p className="mt-5 text-xs leading-5 text-fd-muted-foreground">Muting only stops playback. Started speech continues to generate and bill. Recovering keeps the original text, voice, and request ID; a new generation uses a new ID.</p>
        </div>
      </div>
    </section>
  );
}
