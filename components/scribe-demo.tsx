'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DemoNavigation } from '@/components/demo-navigation';
import { Captions, Check, Copy, Download, FileAudio, Loader2, Mic, Square, Zap } from 'lucide-react';
import { SCRIBE_API, authHeaders, pcm16, readJson, readTranscriptStream, segmentAt, toSrt, toVtt, validateSocketUrl, wordsBySegment, wrapCaption, type Backend, type ScribeResult, type ScribeWord } from '@/lib/scribe-client';

type Phase = 'idle' | 'connecting' | 'recording' | 'processing';
type Runtime = { socket?: WebSocket; context?: AudioContext; stream?: MediaStream; source?: MediaStreamAudioSourceNode; node?: AudioWorkletNode; mute?: GainNode; timer?: ReturnType<typeof setTimeout>; deadline?: ReturnType<typeof setTimeout>; cancelled: boolean; flushed?: () => void };
const control = 'w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary disabled:opacity-50';
const button = 'inline-flex items-center justify-center gap-2 rounded-md border border-fd-border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary disabled:cursor-not-allowed disabled:opacity-50';

export function ScribeDemo({ fullPage = false }: { fullPage?: boolean }) {
  const [credential, setCredential] = useState('');
  const [backend, setBackend] = useState<Backend>('standard');
  const [file, setFile] = useState<File | null>(null);
  const [uploadStream, setUploadStream] = useState(false);
  const [timestamps, setTimestamps] = useState(true);
  const [captionFile, setCaptionFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('Record Amharic speech or upload audio.');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScribeResult | null>(null);
  const [requestId, setRequestId] = useState('');
  const [pricing, setPricing] = useState<{ balance: number; pricing: { price_per_1000_characters: number } } | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const runtime = useRef<Runtime>({ cancelled: false });
  const mounted = useRef(true);
  const busy = phase !== 'idle';

  const stopAudio = (rt: Runtime) => {
    clearTimeout(rt.timer);
    rt.node?.disconnect(); rt.source?.disconnect(); rt.mute?.disconnect();
    rt.stream?.getTracks().forEach(track => track.stop());
    if (rt.context) void rt.context.close().catch(() => {});
    rt.node = undefined; rt.source = undefined; rt.mute = undefined; rt.stream = undefined; rt.context = undefined;
  };
  const cleanup = (rt: Runtime) => {
    rt.cancelled = true; stopAudio(rt); clearTimeout(rt.deadline);
    if (rt.socket) { rt.socket.onmessage = null; rt.socket.onclose = null; rt.socket.onerror = null; rt.socket.close(); }
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cleanup(runtime.current); };
    // Cleanup owns the current audio graph and transport through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const complete = (data: ScribeResult) => {
    if (!data.usage?.settled) throw new Error('Billing has not been confirmed. Recover this request.');
    setText(data.text); setResult(data); setPhase('idle');
    setStatus(data.idempotent_replay ? 'Recovered the completed transcript. No additional charge.' : 'Transcription complete. Wallet charge confirmed.');
    setPricing(prev => prev ? { ...prev, balance: data.usage.credits_remaining } : prev);
  };
  const checkWallet = async () => {
    setChecking(true); setError('');
    try { setPricing(await readJson(await fetch(`${SCRIBE_API}/usage`, { headers: authHeaders(credential), cache: 'no-store' }))); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not check your account.'); }
    finally { setChecking(false); }
  };
  const startRequest = () => {
    const headers = authHeaders(credential);
    const id = `docs_${crypto.randomUUID().replaceAll('-', '')}`;
    setRequestId(id); setText(''); setResult(null); setError(''); setCopied(false); setCaptionFile(null);
    return { headers, id };
  };
  const recover = async () => {
    if (!requestId) return;
    setError(''); setPhase('processing'); setStatus('Recovering transcript…');
    try { complete(await readJson(await fetch(`${SCRIBE_API}/requests/${requestId}`, { headers: authHeaders(credential), cache: 'no-store' }))); }
    catch (e) { setError(e instanceof Error ? e.message : 'Recovery failed.'); setPhase('idle'); }
  };
  const upload = async () => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setError('Choose a file no larger than 25 MB.'); return; }
    try {
      const { headers, id } = startRequest();
      // Timestamps are only available for completed uploads, so they never combine with stream=true.
      const streamUpdates = uploadStream && !timestamps;
      if (timestamps) setCaptionFile(file);
      setPhase('processing'); setStatus(streamUpdates ? 'Uploading audio, then streaming transcript updates…' : timestamps ? 'Uploading and transcribing audio with word timestamps…' : 'Uploading and transcribing audio…');
      const body = new FormData(); body.set('audio', file);
      const query = new URLSearchParams({ backend, chunk: '1120ms', stream: String(streamUpdates), request_id: id });
      if (timestamps) query.set('timestamps', 'word');
      const response = await fetch(`${SCRIBE_API}/transcribe?${query}`, { method: 'POST', headers, body, cache: 'no-store' });
      const data = await readTranscriptStream(response, partial => { if (mounted.current) setText(partial); });
      if (mounted.current) complete(data);
    } catch (e) { if (mounted.current) { setError(e instanceof Error ? e.message : 'Transcription failed.'); setPhase('idle'); setStatus('Use Recover request if the connection ended during transcription.'); } }
  };
  const finishRecording = async () => {
    const rt = runtime.current;
    setPhase('processing');
    if (rt.node) {
      await new Promise<void>(resolve => { rt.flushed = resolve; rt.node!.port.postMessage({ flush: true }); setTimeout(resolve, 250); });
    }
    stopAudio(rt);
    if (rt.socket?.readyState === WebSocket.OPEN) {
      rt.socket.send(JSON.stringify({ type: 'audio.finish' }));
      setPhase('processing'); setStatus('Finishing the transcript and confirming the charge…');
    }
  };
  const record = async () => {
    let rt = runtime.current;
    try {
      const { headers, id } = startRequest();
      cleanup(rt); rt = { cancelled: false }; runtime.current = rt;
      setPhase('connecting'); setStatus('Opening your microphone and creating a scoped session…');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS and a supported browser.');
      // Ask permission before ticket issuance so its 60-second window is usable.
      rt.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
      if (rt.cancelled || !mounted.current) { stopAudio(rt); return; }
      rt.context = new AudioContext({ sampleRate: 16000 });
      if (rt.context.sampleRate !== 16000) throw new Error('This browser cannot capture at 16 kHz. Upload an audio file instead.');
      await rt.context.audioWorklet.addModule('/scribe-pcm-worklet.js');
      await rt.context.resume();
      const ticket = await readJson(await fetch(`${SCRIBE_API}/sessions`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ backend, chunk: '320ms', request_id: id }), cache: 'no-store' }));
      if (rt.cancelled || !mounted.current) { stopAudio(rt); return; }
      const socket = new WebSocket(validateSocketUrl(ticket.websocket_url)); rt.socket = socket;
      rt.deadline = setTimeout(() => {
        if (!rt.cancelled && mounted.current) { cleanup(rt); setPhase('idle'); setError('The connection timed out. Recover this request before starting again.'); }
      }, 10 * 60 * 1000);
      const fail = (message: string) => {
        if (rt.cancelled || !mounted.current) return;
        cleanup(rt); setPhase('idle'); setError(message); setStatus('Recover this request if audio was already sent.');
      };
      socket.onopen = () => socket.send(JSON.stringify({ type: 'session.authenticate', token: ticket.token }));
      socket.onerror = () => fail('The live connection failed. Recover this request if audio was already sent.');
      socket.onclose = () => fail('Connection ended before the transcript and charge were confirmed.');
      socket.onmessage = event => {
        if (rt.cancelled || !mounted.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'error') { fail(data.error?.message ?? 'Transcription failed.'); return; }
          if (data.type === 'transcript.partial') { setText(data.text); return; }
          if (data.type === 'transcript.completed') { complete(data.data); cleanup(rt); return; }
          if (data.type !== 'session.created') return;
          if (!rt.context || !rt.stream) throw new Error('Microphone was closed.');
          rt.source = rt.context.createMediaStreamSource(rt.stream);
          rt.node = new AudioWorkletNode(rt.context, 'scribe-pcm');
          rt.mute = rt.context.createGain(); rt.mute.gain.value = 0;
          rt.node.port.onmessage = (message: MessageEvent<Float32Array | null>) => {
            if (!message.data) { rt.flushed?.(); return; }
            if (rt.cancelled || socket.readyState !== WebSocket.OPEN) return;
            if (socket.bufferedAmount > 256000) { fail('The connection cannot keep up with microphone audio. Recover this request.'); return; }
            socket.send(pcm16(message.data));
          };
          rt.source.connect(rt.node); rt.node.connect(rt.mute); rt.mute.connect(rt.context.destination);
          setPhase('recording'); setStatus('Listening in Amharic. Partial text may change as you speak.');
          rt.timer = setTimeout(finishRecording, 175000);
        } catch (e) { fail(e instanceof Error ? e.message : 'Invalid streaming response.'); }
      };
    } catch (e) { cleanup(rt); if (mounted.current) { setPhase('idle'); setError(e instanceof Error ? e.message : 'Could not start recording.'); } }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { setError('Copy is unavailable. Select the transcript and copy it manually.'); }
  };
  return (
    <section className={`not-prose addis-offset-shell ${fullPage ? 'my-0 min-h-[calc(100dvh-10rem)]' : 'my-10'} border border-fd-border bg-fd-background`} aria-labelledby="scribe-demo-title">
      <div className="border-b border-fd-border p-5 sm:p-6">
        <DemoNavigation fullPage={fullPage} href="/docs/playground/speech-to-text" docsHref="/docs/capabilities/speech-to-text" />
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-fd-primary">Addis Scribe · Live API</p>
        <h3 id="scribe-demo-title" className="text-xl font-semibold tracking-tight">Try Amharic transcription</h3>
        <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">Record live or upload audio. Standard transcription rates apply.</p>
      </div>
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-5 border-b border-fd-border p-5 sm:p-6 md:border-b-0 md:border-r">
          <fieldset disabled={busy || checking} className="space-y-3">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">Your account</legend>
            <label className="block text-sm font-medium" htmlFor="scribe-credential">API key</label>
            <input id="scribe-credential" type="password" autoComplete="off" spellCheck={false} value={credential} onChange={e => { setCredential(e.target.value); setPricing(null); }} placeholder="Paste your API key" className={control} />
            <p className="text-xs leading-5 text-fd-muted-foreground">Your API key is not saved. <a href="https://addisassistant.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline decoration-fd-foreground/30 underline-offset-4 hover:decoration-fd-primary">Get an API key</a>.</p>
            <button type="button" disabled={!credential.trim() || checking} className={`${button} w-full`} onClick={checkWallet}>{checking && <Loader2 className="size-4 animate-spin" />}Check balance and rate</button>
            {pricing && <p className="text-sm tabular-nums">Balance <strong>{pricing.balance.toFixed(4)} ETB</strong><br /><span className="text-fd-muted-foreground">{pricing.pricing.price_per_1000_characters} ETB / 1,000 transcribed characters</span></p>}
          </fieldset>
          <fieldset disabled={busy}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">Speed</legend>
            <div className="grid grid-cols-2 items-start gap-2">
              {(['standard', 'turbo'] as const).map(value => (
                <div key={value}>
                  <button type="button" aria-pressed={backend === value} aria-describedby={value === 'turbo' ? 'scribe-turbo-speed' : undefined} onClick={() => setBackend(value)} className={`${button} w-full whitespace-nowrap ${backend === value ? 'border-fd-primary bg-fd-primary/10 text-fd-primary' : ''}`}>
                    {value === 'turbo' && <Zap aria-hidden="true" className="size-4" />}
                    {value === 'standard' ? 'Standard' : 'Turbo'}
                  </button>
                  {value === 'turbo' && <p id="scribe-turbo-speed" className="mt-1.5 text-center text-xs text-fd-muted-foreground">3× speed</p>}
                </div>
              ))}
            </div>
          </fieldset>
          <div className="space-y-3">
            <button type="button" className={`${button} w-full bg-fd-primary text-fd-primary-foreground`} disabled={(busy && phase !== 'recording') || !credential.trim()} onClick={phase === 'recording' ? finishRecording : record}>{phase === 'recording' ? <><Square className="size-4" />Finish recording</> : <><Mic className="size-4" />Record live</>}</button>
            <p className="text-xs text-fd-muted-foreground">Up to 3 minutes.</p>
          </div>
          <div className="space-y-3 border-t border-fd-border pt-5">
            <label htmlFor="scribe-file" className="flex items-center gap-2 text-sm font-medium"><FileAudio className="size-4" />Upload audio</label>
            <input id="scribe-file" type="file" accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setCaptionFile(null); }} className={`${control} file:mr-3 file:rounded file:border-0 file:bg-fd-secondary file:px-2 file:py-1 file:text-fd-foreground`} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={timestamps} disabled={busy} aria-describedby="scribe-timestamps-hint" onChange={e => { setTimestamps(e.target.checked); if (e.target.checked) setUploadStream(false); }} />Word timestamps and captions</label>
            <label className={`flex items-center gap-2 text-sm ${timestamps ? 'text-fd-muted-foreground' : ''}`}><input type="checkbox" checked={uploadStream && !timestamps} disabled={busy || timestamps} aria-describedby="scribe-timestamps-hint" onChange={e => setUploadStream(e.target.checked)} />Show partial text after upload</label>
            <p id="scribe-timestamps-hint" className="text-xs leading-5 text-fd-muted-foreground">{timestamps ? 'Timestamps return the full result at once, so partial text is off. Turn timestamps off to see partial text.' : 'Turn on timestamps to play the file with synced captions and download SRT or VTT.'} Live recording returns text only.</p>
            <button type="button" className={`${button} w-full`} disabled={busy || !file || !credential.trim()} onClick={upload}>{phase === 'processing' && <Loader2 className="size-4 animate-spin" />}Transcribe file</button>
            <p className="text-xs text-fd-muted-foreground">WAV, MP3, M4A, WebM, OGG or FLAC · 25 MB · 3 minutes</p>
          </div>
        </div>
        <div className="flex min-h-96 flex-col p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">Transcript</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${button} px-3 py-1.5`} disabled={!text} onClick={copy}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy'}</button>
              {result?.segments && <>
                <button type="button" className={`${button} px-3 py-1.5`} onClick={() => downloadCaptions(toSrt(result), 'application/x-subrip;charset=utf-8', `${captionName(captionFile)}.srt`)}><Download aria-hidden="true" className="size-3.5" />Download SRT</button>
                <button type="button" className={`${button} px-3 py-1.5`} onClick={() => downloadCaptions(toVtt(result), 'text/vtt;charset=utf-8', `${captionName(captionFile)}.vtt`)}><Download aria-hidden="true" className="size-3.5" />Download VTT</button>
              </>}
            </div>
          </div>
          <p role="status" className="mb-4 flex items-center gap-2 text-xs leading-5 text-fd-muted-foreground">{busy && <Loader2 className="size-3.5 shrink-0 animate-spin" />}{status}</p>
          {error && <p role="alert" className="mb-4 rounded border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div lang="am" aria-live="polite" aria-atomic="true" className="min-h-40 flex-1 whitespace-pre-wrap break-words text-lg leading-9">{text || <span className="text-fd-muted-foreground/60">የእርስዎ ጽሑፍ እዚህ ይታያል።</span>}</div>
          {result?.segments && captionFile && <CaptionPlayer key={`${result.request_id}-${captionFile.name}-${captionFile.lastModified}`} file={captionFile} result={result} />}
          {result && <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-fd-border pt-4 text-sm tabular-nums"><div><dt className="text-xs text-fd-muted-foreground">Charged</dt><dd className="mt-1 font-semibold">{result.usage.credits_used.toFixed(4)} {result.usage.currency}</dd></div><div><dt className="text-xs text-fd-muted-foreground">Characters</dt><dd className="mt-1 font-semibold">{result.usage.characters}</dd></div><div><dt className="text-xs text-fd-muted-foreground">Audio duration</dt><dd className="mt-1">{result.seconds.toFixed(2)} s</dd></div><div><dt className="text-xs text-fd-muted-foreground">Model compute</dt><dd className="mt-1">{(result.compute_ms / 1000).toFixed(2)} s · {result.backend === 'standard' ? 'Standard' : 'Turbo'}</dd></div></dl>}
          {requestId && <div className="mt-5 border-t border-fd-border pt-4"><p className="break-all font-mono text-[10px] text-fd-muted-foreground">Request: {requestId}</p><button type="button" disabled={busy} onClick={recover} className={`${button} mt-3`}>Recover request</button></div>}
          <p className="mt-5 text-xs leading-5 text-fd-muted-foreground">Disconnected? Recover your transcript with no duplicate charge.</p>
        </div>
      </div>
    </section>
  );
}

function captionName(file: File | null) {
  return file?.name.replace(/\.[^.]+$/, '').trim() || 'captions';
}

function downloadCaptions(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function clock(seconds: number) {
  const whole = Math.max(0, seconds);
  return `${Math.floor(whole / 60)}:${(whole % 60).toFixed(1).padStart(4, '0')}`;
}

/** Splits the cue's words into the same two lines the SRT/VTT files use. */
function captionLines(text: string, words: ScribeWord[]): { text: string; words: ScribeWord[] }[] {
  const lines = wrapCaption(words.length ? words.map(word => word.text).join(' ') : text);
  if (!words.length) return lines.map(line => ({ text: line, words: [] }));
  let offset = 0;
  return lines.map(line => {
    const count = line.split(' ').length;
    return { text: line, words: words.slice(offset, (offset += count)) };
  });
}

function CaptionPlayer({ file, result }: { file: File; result: ScribeResult }) {
  const segments = useMemo(() => result.segments ?? [], [result]);
  const groups = useMemo(() => wordsBySegment(result), [result]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const list = useRef<HTMLOListElement | null>(null);
  const frame = useRef(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const active = segmentAt(segments, time);

  // The object URL lives exactly as long as this audio element shows this file.
  const attachAudio = useCallback((element: HTMLAudioElement | null) => {
    audio.current = element;
    if (!element) return;
    const url = URL.createObjectURL(file);
    element.src = url;
    return () => { element.pause(); element.removeAttribute('src'); element.load(); URL.revokeObjectURL(url); };
  }, [file]);

  useEffect(() => {
    if (!playing) return;
    const tick = () => { if (audio.current) setTime(audio.current.currentTime); frame.current = requestAnimationFrame(tick); };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing]);

  useEffect(() => {
    const container = list.current, item = active >= 0 ? container?.children[active] as HTMLElement | undefined : undefined;
    if (!playing || !container || !item) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({ top: Math.max(0, item.offsetTop - 8), behavior: reduce ? 'auto' : 'smooth' });
  }, [active, playing]);

  const seek = (start: number) => {
    if (!audio.current) return;
    audio.current.currentTime = start + 0.01;
    setTime(start + 0.01);
  };
  const sync = () => { if (audio.current) setTime(audio.current.currentTime); };
  const cue = active >= 0 ? segments[active] : undefined;
  const words = active >= 0 ? groups[active] ?? [] : [];
  const spoken = words.filter(word => time >= word.start).length;

  return (
    <section aria-labelledby="scribe-captions-title" className="mt-6 space-y-4 border-t border-fd-border pt-4">
      <h4 id="scribe-captions-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground"><Captions aria-hidden="true" className="size-4" />Captions · {segments.length} cues · {result.words?.length ?? 0} words</h4>
      <audio ref={attachAudio} controls preload="metadata" className="w-full" aria-label={`Play ${file.name} with captions`} onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); sync(); }} onEnded={() => { setPlaying(false); sync(); }} onSeeked={sync} onTimeUpdate={() => { if (!playing) sync(); }} />
      <div aria-label="Caption preview" role="region" className="flex min-h-28 flex-col items-center justify-center rounded-md border border-fd-border bg-fd-secondary/40 px-4 py-5 text-center">
        {cue ? (
          <p lang="am" className="text-lg leading-8">
            {captionLines(cue.text, words).map((line, lineIndex, lines) => {
              const before = lines.slice(0, lineIndex).reduce((sum, previous) => sum + previous.words.length, 0);
              return (
                <span key={lineIndex} className="block">
                  {line.words.length ? line.words.map((word, i) => {
                    const index = before + i;
                    return <span key={i}>{i > 0 && ' '}<span className={`rounded px-0.5 motion-safe:transition-colors ${index < spoken ? 'text-fd-foreground' : 'text-fd-muted-foreground/70'} ${index === spoken - 1 ? 'bg-fd-primary/15 text-fd-primary' : ''}`}>{word.text}</span></span>;
                  }) : line.text}
                </span>
              );
            })}
          </p>
        ) : <p className="text-sm text-fd-muted-foreground">{time > 0 ? '…' : 'Press play to see captions in sync with the audio.'}</p>}
        <p className="mt-2 font-mono text-[10px] tabular-nums text-fd-muted-foreground">{clock(time)}</p>
      </div>
      <ol ref={list} aria-label="Caption cues. Select a cue to play from it." className="relative max-h-64 space-y-1 overflow-y-auto pr-1">
        {segments.map((segment, i) => (
          <li key={`${segment.start}-${i}`}>
            <button type="button" aria-current={i === active ? 'true' : undefined} onClick={() => seek(segment.start)} className={`grid w-full grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-md border px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary ${i === active ? 'border-fd-primary bg-fd-primary/10' : 'border-transparent hover:border-fd-border'}`}>
              <span className="font-mono text-[11px] leading-5 tabular-nums text-fd-muted-foreground">{clock(segment.start)}<br />{clock(segment.end)}</span>
              <span lang="am" className="leading-6">{wrapCaption(segment.text).map((line, j) => <span key={j} className="block">{line}</span>)}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="text-xs leading-5 text-fd-muted-foreground">Captions break at pauses because Scribe adds no punctuation. They usually appear about 0.15 s after speech starts and clear about 0.4 s before the speaker finishes.</p>
    </section>
  );
}
