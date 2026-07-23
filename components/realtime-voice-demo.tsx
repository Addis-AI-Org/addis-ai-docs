'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Radio, Square, Trash2 } from 'lucide-react';

const REALTIME_ENDPOINT = 'wss://relay.addisassistant.com/ws';
const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const PROCESSOR_SIZE = 2_048;

type Tone = 'ok' | 'warn' | 'error';

type RealtimeEvent = {
  setupComplete?: boolean;
  type?: string;
  message?: string;
  error?: { message?: string } | string;
  usageMetadata?: unknown;
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    modelTurn?: {
      parts?: Array<{
        inlineData?: { data?: string };
      }>;
    };
  };
};

type Runtime = {
  socket: WebSocket | null;
  inputContext: AudioContext | null;
  outputContext: AudioContext | null;
  microphone: MediaStream | null;
  source: MediaStreamAudioSourceNode | null;
  processor: ScriptProcessorNode | null;
  mute: GainNode | null;
  scheduledSources: Set<AudioBufferSourceNode>;
  nextPlaybackTime: number;
  ready: boolean;
  runId: number;
};

function createRuntime(): Runtime {
  return {
    socket: null,
    inputContext: null,
    outputContext: null,
    microphone: null,
    source: null,
    processor: null,
    mute: null,
    scheduledSources: new Set(),
    nextPlaybackTime: 0,
    ready: false,
    runId: 0,
  };
}

function createAudioContext(sampleRate: number): AudioContext {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('AudioContext is not supported in this browser.');
  }

  return new AudioContextConstructor({ sampleRate });
}

function float32ToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function bytesToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToPcm16(value: string): Int16Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Int16Array(bytes.buffer);
}

export function RealtimeVoiceDemo() {
  const runtimeRef = useRef<Runtime>(createRuntime());
  const logViewRef = useRef<HTMLPreElement>(null);
  const [apiKey, setApiKey] = useState('');
  const [starting, setStarting] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState({
    title: 'Idle',
    detail: 'Paste an Addis API key to start.',
    tone: 'warn' as Tone,
  });
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = (line: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((current) => [...current, `[${timestamp}] ${line}`].slice(-200));
  };

  const stopPlayback = () => {
    const runtime = runtimeRef.current;
    for (const source of runtime.scheduledSources) {
      try {
        source.stop();
      } catch {
        // The source may already have completed.
      }
    }
    runtime.scheduledSources.clear();
    runtime.nextPlaybackTime = runtime.outputContext?.currentTime ?? 0;
  };

  const closeRuntime = async (closeSocket = true) => {
    const runtime = runtimeRef.current;
    runtime.ready = false;
    stopPlayback();

    if (closeSocket && runtime.socket) {
      runtime.socket.onopen = null;
      runtime.socket.onmessage = null;
      runtime.socket.onerror = null;
      runtime.socket.onclose = null;
      if (runtime.socket.readyState < WebSocket.CLOSING) {
        runtime.socket.close(1000, 'client-stop');
      }
    }
    runtime.socket = null;

    runtime.processor?.disconnect();
    runtime.source?.disconnect();
    runtime.mute?.disconnect();
    runtime.microphone?.getTracks().forEach((track) => track.stop());
    runtime.processor = null;
    runtime.source = null;
    runtime.mute = null;
    runtime.microphone = null;

    await runtime.inputContext?.close().catch(() => undefined);
    await runtime.outputContext?.close().catch(() => undefined);
    runtime.inputContext = null;
    runtime.outputContext = null;
  };

  const playAudio = (base64: string) => {
    const runtime = runtimeRef.current;
    if (!runtime.outputContext) return;

    const pcm16 = base64ToPcm16(base64);
    if (pcm16.length === 0) return;

    const samples = Float32Array.from(pcm16, (sample) => sample / 32768);
    const buffer = runtime.outputContext.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);

    const source = runtime.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(runtime.outputContext.destination);
    source.onended = () => runtime.scheduledSources.delete(source);

    const startAt = Math.max(runtime.outputContext.currentTime, runtime.nextPlaybackTime);
    runtime.scheduledSources.add(source);
    source.start(startAt);
    runtime.nextPlaybackTime = startAt + buffer.duration;
  };

  const setupAudio = async (runId: number) => {
    const runtime = runtimeRef.current;
    runtime.outputContext = createAudioContext(OUTPUT_SAMPLE_RATE);
    await runtime.outputContext.resume();
    runtime.nextPlaybackTime = runtime.outputContext.currentTime;

    runtime.inputContext = createAudioContext(INPUT_SAMPLE_RATE);
    await runtime.inputContext.resume();
    runtime.microphone = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    if (runId !== runtime.runId) throw new Error('SESSION_CANCELED');

    runtime.source = runtime.inputContext.createMediaStreamSource(runtime.microphone);
    runtime.processor = runtime.inputContext.createScriptProcessor(PROCESSOR_SIZE, 1, 1);
    runtime.mute = runtime.inputContext.createGain();
    runtime.mute.gain.value = 0;

    runtime.processor.onaudioprocess = (event) => {
      const current = runtimeRef.current;
      if (!current.ready || current.socket?.readyState !== WebSocket.OPEN) return;

      const pcm16 = float32ToPcm16(event.inputBuffer.getChannelData(0));
      current.socket.send(JSON.stringify({
        data: bytesToBase64(pcm16.buffer),
        mimeType: 'audio/pcm;rate=16000',
      }));
    };

    runtime.source.connect(runtime.processor);
    runtime.processor.connect(runtime.mute);
    runtime.mute.connect(runtime.inputContext.destination);
  };

  const stop = async (unexpected = false) => {
    const runtime = runtimeRef.current;
    runtime.runId += 1;
    setStarting(false);
    setRunning(false);
    await closeRuntime();
    setStatus({
      title: unexpected ? 'Disconnected' : 'Stopped',
      detail: unexpected ? 'The realtime connection closed.' : 'Microphone and connection closed.',
      tone: unexpected ? 'error' : 'warn',
    });
  };

  const start = async () => {
    const credential = apiKey.trim();
    if (!credential) {
      setStatus({ title: 'API key required', detail: 'Paste an Addis API key.', tone: 'error' });
      return;
    }

    const runtime = runtimeRef.current;
    const runId = runtime.runId + 1;
    runtime.runId = runId;
    setStarting(true);
    setStatus({ title: 'Connecting', detail: 'Requesting microphone permission.', tone: 'warn' });
    appendLog('Starting a Realtime API session.');

    try {
      await closeRuntime();
      await setupAudio(runId);
      if (runId !== runtime.runId) throw new Error('SESSION_CANCELED');

      const url = new URL(REALTIME_ENDPOINT);
      url.searchParams.set('apiKey', credential);
      const socket = new WebSocket(url);
      runtime.socket = socket;

      socket.onopen = () => {
        if (runId !== runtime.runId) return;
        setStarting(false);
        setRunning(true);
        setStatus({ title: 'Connected', detail: 'Waiting for setupComplete.', tone: 'warn' });
        appendLog('WebSocket connected; waiting for readiness.');
      };

      socket.onmessage = (message) => {
        if (runId !== runtime.runId || typeof message.data !== 'string') return;

        let event: RealtimeEvent;
        try {
          event = JSON.parse(message.data) as RealtimeEvent;
        } catch {
          appendLog('Ignored a malformed JSON event.');
          return;
        }

        if (event.setupComplete) {
          runtime.ready = true;
          setStatus({ title: 'Live', detail: 'Streaming microphone and model audio.', tone: 'ok' });
          appendLog('Setup complete.');
        }

        if (event.serverContent?.interrupted) {
          stopPlayback();
          appendLog('Playback interrupted by the server.');
        }

        const audio = event.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audio) playAudio(audio);
        if (event.serverContent?.turnComplete) appendLog('Turn complete.');
        if (event.usageMetadata) appendLog('Usage metadata received.');
        if (event.type === 'warning' && event.message) appendLog(`Warning: ${event.message}`);

        if (event.error) {
          const detail = typeof event.error === 'string' ? event.error : event.error.message;
          setStatus({ title: 'Server error', detail: detail ?? 'Unknown realtime error.', tone: 'error' });
          appendLog('The server returned an error.');
        }
      };

      socket.onerror = () => {
        if (runId !== runtime.runId) return;
        setStatus({ title: 'Connection error', detail: 'The WebSocket transport failed.', tone: 'error' });
        appendLog('WebSocket transport error.');
      };

      socket.onclose = (event) => {
        if (runId !== runtime.runId) return;
        appendLog(`Socket closed with code ${event.code}.`);
        void stop(true);
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'SESSION_CANCELED') return;
      appendLog('Could not start the session.');
      setStatus({
        title: 'Start failed',
        detail: error instanceof Error ? error.message : 'Could not initialize realtime audio.',
        tone: 'error',
      });
      setStarting(false);
      setRunning(false);
      await closeRuntime();
    }
  };

  useEffect(() => {
    const runtime = runtimeRef.current;
    return () => {
      runtime.runId += 1;
      void closeRuntime();
    };
    // The cleanup intentionally runs only when the demo unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (logViewRef.current) logViewRef.current.scrollTop = logViewRef.current.scrollHeight;
  }, [logs]);

  const busy = starting || running;
  const toneClass = status.tone === 'ok'
    ? 'bg-emerald-500'
    : status.tone === 'error'
      ? 'bg-red-500'
      : 'bg-amber-500';

  return (
    <section className="not-prose my-8 rounded-xl border border-fd-border bg-fd-card p-5 shadow-sm" aria-labelledby="realtime-demo-title">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-md border border-fd-border bg-fd-secondary/30 p-2">
          <Radio className="size-4" />
        </div>
        <div>
          <h3 id="realtime-demo-title" className="font-semibold">Realtime Audio demo</h3>
          <p className="text-xs text-fd-muted-foreground">Microphone capture, PCM conversion, playback, interruption, and event logs.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="realtime-api-key" className="mb-1.5 block text-sm font-medium">Addis API key</label>
          <input
            id="realtime-api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Paste your Addis API key"
            disabled={busy}
            className="h-10 w-full rounded-md border border-fd-border bg-fd-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:opacity-60"
          />
          <p className="mt-1 text-xs text-fd-muted-foreground">Testing only. The key stays in page memory, is never stored, and is sent only to the Addis Realtime relay.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void start()} disabled={busy || !apiKey.trim()} className="inline-flex h-9 items-center gap-2 rounded-md bg-fd-primary px-3 text-sm font-medium text-fd-primary-foreground disabled:opacity-50">
            {starting ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
            {starting ? 'Connecting…' : 'Start'}
          </button>
          <button type="button" onClick={() => void stop()} disabled={!busy} className="inline-flex h-9 items-center gap-2 rounded-md bg-red-500 px-3 text-sm font-medium text-white disabled:opacity-50">
            <Square className="size-4" /> Stop
          </button>
          <button type="button" onClick={() => setLogs([])} className="inline-flex h-9 items-center gap-2 rounded-md border border-fd-border px-3 text-sm font-medium">
            <Trash2 className="size-4" /> Clear logs
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-fd-border bg-fd-background p-3" role="status" aria-live="polite">
          <span className={`mt-1 size-2.5 rounded-full ${toneClass}`} aria-hidden="true" />
          <div>
            <div className="text-sm font-medium">{status.title}</div>
            <div className="text-xs text-fd-muted-foreground">{status.detail}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-fd-border bg-fd-background">
          <div className="border-b border-fd-border bg-fd-secondary/30 px-3 py-2 text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">Events</div>
          <pre ref={logViewRef} className="max-h-64 min-h-32 overflow-auto p-3 text-xs" aria-label="Realtime event log">{logs.join('\n')}</pre>
        </div>
      </div>
    </section>
  );
}
