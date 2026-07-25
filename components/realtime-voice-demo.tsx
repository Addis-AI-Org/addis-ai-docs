"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Radio, Square, Trash2 } from "lucide-react";

const CONFIG = {
  wsEndpoint: "wss://relay.addisassistant.com/ws",
  inputSampleRate: 16000,
  outputSampleRate: 24000,
  processorSize: 2048,
};

const WS_CONNECTING = 0;
const WS_OPEN = 1;

type Tone = "ok" | "warn" | "err";

type RuntimeState = {
  ws: WebSocket | null;
  inputCtx: AudioContext | null;
  outputCtx: AudioContext | null;
  stream: MediaStream | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  processorNode: ScriptProcessorNode | null;
  muteNode: GainNode | null;
  nextPlaybackTime: number;
  canStreamAudio: boolean;
  starting: boolean;
  running: boolean;
  stopping: boolean;
  runId: number;
  userStopped: boolean;
};

function createRuntimeState(): RuntimeState {
  return {
    ws: null,
    inputCtx: null,
    outputCtx: null,
    stream: null,
    sourceNode: null,
    processorNode: null,
    muteNode: null,
    nextPlaybackTime: 0,
    canStreamAudio: false,
    starting: false,
    running: false,
    stopping: false,
    runId: 0,
    userStopped: false,
  };
}

function createAudioContext(sampleRate: number): AudioContext {
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    throw new Error("AudioContext is not supported in this browser.");
  }
  return new Ctx({ sampleRate });
}

function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return int16Array;
}

function arrayBufferToBase64(arrayBuffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function RealtimeVoiceDemo() {
  const runtimeRef = useRef<RuntimeState>(createRuntimeState());
  const logsViewRef = useRef<HTMLPreElement>(null);

  const [apiKey, setApiKey] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [statusTitle, setStatusTitle] = useState("Idle");
  const [statusDetail, setStatusDetail] = useState("Ready to connect.");
  const [statusTone, setStatusTone] = useState<Tone>("warn");
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = (line: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => {
      const next = [...prev, `[${timestamp}] ${line}`];
      if (next.length > 400) return next.slice(next.length - 400);
      return next;
    });
  };

  const setStatus = (title: string, detail: string, tone: Tone = "warn") => {
    setStatusTitle(title);
    setStatusDetail(detail);
    setStatusTone(tone);
  };

  const shouldAbort = (runId: number): boolean => {
    const rt = runtimeRef.current;
    return runId !== rt.runId || rt.stopping;
  };

  const assertNotAborted = (runId: number) => {
    if (shouldAbort(runId)) {
      throw new Error("START_ABORTED");
    }
  };

  const cleanupAudioGraph = () => {
    const rt = runtimeRef.current;
    try {
      rt.processorNode?.disconnect();
    } catch (_error) {}
    try {
      rt.sourceNode?.disconnect();
    } catch (_error) {}
    try {
      rt.muteNode?.disconnect();
    } catch (_error) {}

    if (rt.stream) {
      rt.stream.getTracks().forEach((track) => track.stop());
    }

    rt.processorNode = null;
    rt.sourceNode = null;
    rt.muteNode = null;
    rt.stream = null;
  };

  const closeAudioContexts = async () => {
    const rt = runtimeRef.current;
    if (rt.inputCtx) {
      await rt.inputCtx.close().catch(() => {});
    }
    if (rt.outputCtx) {
      await rt.outputCtx.close().catch(() => {});
    }
    rt.inputCtx = null;
    rt.outputCtx = null;
  };

  const resetTransport = async () => {
    const rt = runtimeRef.current;
    const ws = rt.ws;
    rt.ws = null;
    rt.canStreamAudio = false;

    if (ws && (ws.readyState === WS_OPEN || ws.readyState === WS_CONNECTING)) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close(1000, "client-stop");
      } catch (_error) {}
    }

    cleanupAudioGraph();
    await closeAudioContexts();
    rt.nextPlaybackTime = 0;
  };

  const playPcm16Chunk = async (arrayBuffer: ArrayBuffer) => {
    const rt = runtimeRef.current;
    if (!rt.outputCtx) return;

    const pcm16 = new Int16Array(arrayBuffer);
    if (pcm16.length === 0) return;

    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i += 1) {
      float32[i] = pcm16[i] / 32768;
    }

    const buffer = rt.outputCtx.createBuffer(1, float32.length, CONFIG.outputSampleRate);
    buffer.copyToChannel(float32, 0);

    const src = rt.outputCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(rt.outputCtx.destination);

    const startAt = Math.max(rt.outputCtx.currentTime, rt.nextPlaybackTime);
    src.start(startAt);
    rt.nextPlaybackTime = startAt + buffer.duration;
  };

  const setupAudioPipeline = async (runId: number) => {
    const rt = runtimeRef.current;

    rt.outputCtx = createAudioContext(CONFIG.outputSampleRate);
    await rt.outputCtx.resume();
    assertNotAborted(runId);
    rt.nextPlaybackTime = rt.outputCtx.currentTime;

    rt.inputCtx = createAudioContext(CONFIG.inputSampleRate);
    await rt.inputCtx.resume();
    assertNotAborted(runId);

    rt.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    assertNotAborted(runId);

    rt.sourceNode = rt.inputCtx.createMediaStreamSource(rt.stream);
    rt.processorNode = rt.inputCtx.createScriptProcessor(CONFIG.processorSize, 1, 1);
    rt.muteNode = rt.inputCtx.createGain();
    rt.muteNode.gain.value = 0;

    rt.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const curr = runtimeRef.current;
      if (!curr.running || !curr.canStreamAudio || !curr.ws || curr.ws.readyState !== WS_OPEN) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16Data = floatTo16BitPCM(inputData);

      curr.ws.send(
        JSON.stringify({
          data: arrayBufferToBase64(pcm16Data.buffer),
          mimeType: "audio/pcm;rate=16000",
        }),
      );
    };

    rt.sourceNode.connect(rt.processorNode);
    rt.processorNode.connect(rt.muteNode);
    rt.muteNode.connect(rt.inputCtx.destination);
  };

  const stopRealtime = async (
    title = "Stopped",
    detail = "Session stopped.",
    userInitiated = true,
  ) => {
    const rt = runtimeRef.current;
    if (rt.stopping) return;

    rt.stopping = true;
    rt.userStopped = userInitiated;
    rt.runId += 1;
    rt.starting = false;
    rt.running = false;
    setIsStarting(false);
    setIsRunning(false);

    setStatus("Stopping", "Closing microphone and socket...", "warn");
    await resetTransport();

    rt.stopping = false;
    setStatus(title, detail, title === "Disconnected" ? "err" : "warn");
  };

  const startRealtime = async () => {
    const rt = runtimeRef.current;
    if (rt.starting || rt.running) return;

    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setStatus("Missing API key", "Enter your API key before starting.", "err");
      appendLog("Missing API key.");
      return;
    }

    sessionStorage.setItem("addis_realtime_api_key", trimmedApiKey);

    const runId = rt.runId + 1;
    rt.runId = runId;
    rt.starting = true;
    rt.running = false;
    rt.stopping = false;
    rt.userStopped = false;
    rt.canStreamAudio = false;
    setIsStarting(true);
    setIsRunning(false);

    setStatus("Connecting", "Requesting microphone and opening WebSocket...", "warn");
    appendLog("Starting realtime session...");

    try {
      await resetTransport();
      assertNotAborted(runId);

      await setupAudioPipeline(runId);
      assertNotAborted(runId);

      const wsUrl = new URL(CONFIG.wsEndpoint);
      wsUrl.searchParams.set("apiKey", trimmedApiKey);
      rt.ws = new WebSocket(wsUrl.toString());

      rt.ws.onopen = () => {
        if (shouldAbort(runId)) return;
        const curr = runtimeRef.current;
        curr.starting = false;
        curr.running = true;
        setIsStarting(false);
        setIsRunning(true);

        setStatus("Connected", "Waiting for setupComplete...", "warn");
        appendLog("WebSocket connected. Waiting for setupComplete.");
      };

      rt.ws.onmessage = async (event) => {
        if (shouldAbort(runId)) return;

        if (typeof event.data !== "string") {
          appendLog("Received non-text websocket message.");
          return;
        }

        let message: any;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          appendLog(`JSON parse error: ${String(error)}`);
          return;
        }

        if (message?.setupComplete || (message?.type === "status" && /ready/i.test(message?.message || ""))) {
          runtimeRef.current.canStreamAudio = true;
          setStatus("Live", "Streaming microphone and AI audio.", "ok");
          appendLog("Setup complete. Streaming started.");
          return;
        }

        if (message?.type === "warning" && message?.message) {
          appendLog(`Warning: ${message.message}`);
        }

        const base64Audio = message?.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (typeof base64Audio === "string" && base64Audio.length > 0) {
          await playPcm16Chunk(base64ToArrayBuffer(base64Audio));
        }

        if (message?.error) {
          const errMessage = message.error?.message || JSON.stringify(message.error);
          setStatus("Server error", errMessage, "err");
          appendLog(`Server error: ${errMessage}`);
        }
      };

      rt.ws.onerror = () => {
        if (shouldAbort(runId)) return;
        setStatus("Connection error", "Transport error from websocket.", "err");
        appendLog("WebSocket error event.");
      };

      rt.ws.onclose = (event) => {
        const wasUserStop = runtimeRef.current.userStopped || shouldAbort(runId);
        appendLog(`Socket closed (code=${event.code}, reason=${event.reason || "n/a"}).`);

        if (!wasUserStop && event.code === 1006) {
          appendLog("Hint: 1006 usually means auth mismatch or protocol mismatch.");
        }

        void stopRealtime(
          wasUserStop ? "Stopped" : "Disconnected",
          wasUserStop ? "Session stopped by client." : "Connection closed unexpectedly.",
          wasUserStop,
        );
      };
    } catch (error) {
      if (error instanceof Error && error.message === "START_ABORTED") {
        appendLog("Start canceled.");
        return;
      }

      appendLog(`Start failed: ${String(error)}`);
      setStatus("Start failed", "Could not initialize realtime session.", "err");
      await stopRealtime("Disconnected", "Initialization failed.", false);
    } finally {
      const curr = runtimeRef.current;
      if (runId === curr.runId && !curr.running) {
        curr.starting = false;
        setIsStarting(false);
      }
    }
  };

  useEffect(() => {
    const savedApiKey = sessionStorage.getItem("addis_realtime_api_key") ?? "";
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    appendLog("Ready. Enter API key and click Start.");

    return () => {
      void stopRealtime("Stopped", "Component unmounted.", true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (logsViewRef.current) {
      logsViewRef.current.scrollTop = logsViewRef.current.scrollHeight;
    }
  }, [logs]);

  const busy = isStarting || isRunning;

  return (
    <div className="not-prose addis-offset-shell addis-panel my-10 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="border border-fd-border bg-fd-secondary/30 p-2 text-fd-foreground">
          <Radio className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-fd-foreground">Live Realtime Voice Demo</h3>
          <p className="text-xs text-fd-muted-foreground">Integrated browser demo with start/stop, playback, and logs.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="realtime-api-key" className="mb-1.5 block text-sm font-medium text-fd-foreground">
            API Key
          </label>
          <input
            id="realtime-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk_..."
            className="h-10 w-full border border-fd-border bg-fd-background px-3 text-sm outline-none ring-offset-background placeholder:text-fd-muted-foreground focus-visible:ring-1 focus-visible:ring-fd-primary"
          />
        </div>

        <div className="border border-fd-border bg-fd-secondary/20 p-3 text-xs text-fd-muted-foreground">
          <div className="mb-1 font-medium text-fd-foreground">Endpoint</div>
          <code className="text-[11px]">wss://relay.addisassistant.com/ws?apiKey=YOUR_API_KEY</code>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void startRealtime()}
            disabled={busy}
            className="inline-flex h-9 items-center justify-center gap-1.5 bg-fd-primary px-3 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90 disabled:opacity-50"
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {isStarting ? "Connecting..." : "Start"}
          </button>

          <button
            type="button"
            onClick={() => void stopRealtime("Stopped", "Session stopped by user.", true)}
            disabled={!busy}
            className="inline-flex h-9 items-center justify-center gap-1.5 bg-red-500 px-3 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>

          <button
            type="button"
            onClick={() => setLogs([])}
            className="inline-flex h-9 items-center justify-center gap-1.5 border border-fd-border bg-fd-background px-3 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent"
          >
            <Trash2 className="h-4 w-4" />
            Clear Logs
          </button>
        </div>

        <div className="border border-fd-border bg-fd-background px-3 py-2">
          <div className="flex items-start gap-2">
            <span
              className={[
                "mt-1 h-2.5 w-2.5 rounded-full",
                statusTone === "ok" ? "bg-emerald-500" : statusTone === "err" ? "bg-red-500" : "bg-amber-500",
              ].join(" ")}
            />
            <div>
              <div className="text-sm font-medium text-fd-foreground">{statusTitle}</div>
              <div className="text-xs text-fd-muted-foreground">{statusDetail}</div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border border-fd-border bg-fd-background">
          <div className="border-b border-fd-border bg-fd-secondary/30 px-3 py-2 text-xs font-medium uppercase tracking-wide text-fd-muted-foreground">
            Events / Logs
          </div>
          <pre ref={logsViewRef} className="max-h-72 min-h-40 overflow-auto p-3 text-xs text-fd-foreground">
            {logs.join("\n")}
          </pre>
        </div>

        <p className="text-xs text-fd-muted-foreground">
          Use on <code>localhost</code> or <code>https</code>. For production, issue short-lived auth from your backend.
        </p>
      </div>
    </div>
  );
}
