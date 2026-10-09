export const SCRIBE_API = 'https://api.addisassistant.com/api/v1/scribe';
export type Backend = 'standard' | 'turbo';
export type ScribeResult = {
  text: string; request_id: string; backend: Backend; seconds: number; compute_ms: number;
  usage: { characters: number; credits_used: number; credits_remaining: number; currency: string; settled: boolean };
  idempotent_replay?: boolean;
  /** Present when the request used `timestamps=word`. Times are seconds, already corrected by the server. */
  words?: ScribeWord[];
  segments?: ScribeSegment[];
  /** Present when the request used `speakers=true` (Turbo only): the number of distinct speakers. */
  speakers?: number;
};
/** `speaker` is 1-based, numbered by first appearance; `null` means the word or cue could not be attributed. */
export type ScribeWord = { text: string; start: number; end: number; speaker?: number | null };
export type ScribeSegment = { text: string; start: number; end: number; speaker?: number | null };

export const CAPTION_LINE_LENGTH = 42;

/** Greedy wrap at 42 characters per line, at most two lines (any overflow joins the second line). */
export function wrapCaption(text: string): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + 1 + word.length <= CAPTION_LINE_LENGTH) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines.length > 2 ? [lines[0], lines.slice(1).join(' ')] : lines;
}

function captionTime(seconds: number, separator: ',' | '.'): string {
  const total = Math.max(0, Math.round(seconds * 1000));
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  const h = Math.floor(total / 3600000), m = Math.floor(total / 60000) % 60, s = Math.floor(total / 1000) % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(total % 1000, 3)}`;
}

function requireSegments(result: { segments?: ScribeSegment[] }): ScribeSegment[] {
  if (!Array.isArray(result.segments)) throw new Error('This result has no caption segments. Transcribe with timestamps=word.');
  return result.segments;
}

function hasSpeaker(segment: ScribeSegment): segment is ScribeSegment & { speaker: number } {
  return typeof segment.speaker === 'number';
}

/** SubRip captions computed locally from the returned segments (no API call). A `Speaker N: ` prefix counts toward line wrapping. */
export function toSrt(result: { segments?: ScribeSegment[] }): string {
  return requireSegments(result)
    .map((segment, i) => {
      const text = hasSpeaker(segment) ? `Speaker ${segment.speaker}: ${segment.text}` : segment.text;
      return `${i + 1}\n${captionTime(segment.start, ',')} --> ${captionTime(segment.end, ',')}\n${wrapCaption(text).join('\n')}\n`;
    })
    .join('\n');
}

/** WebVTT captions computed locally from the returned segments (no API call). Speakers become a leading `<v Speaker N>` voice span. */
export function toVtt(result: { segments?: ScribeSegment[] }): string {
  const cues = requireSegments(result)
    .map(segment => {
      const voice = hasSpeaker(segment) ? `<v Speaker ${segment.speaker}>` : '';
      return `${captionTime(segment.start, '.')} --> ${captionTime(segment.end, '.')}\n${voice}${wrapCaption(segment.text).join('\n')}\n`;
    });
  return ['WEBVTT\n', ...cues].join('\n');
}

/** Groups words under each caption segment in order; falls back to time ranges when word counts disagree. */
export function wordsBySegment(result: { words?: ScribeWord[]; segments?: ScribeSegment[] }): ScribeWord[][] {
  const words = result.words ?? [], segments = result.segments ?? [];
  const counts = segments.map(segment => segment.text.split(/\s+/).filter(Boolean).length);
  if (counts.reduce((sum, count) => sum + count, 0) === words.length) {
    let offset = 0;
    return counts.map(count => words.slice(offset, (offset += count)));
  }
  return segments.map((segment, i) => {
    const until = segments[i + 1]?.start ?? Infinity;
    return words.filter(word => word.start >= segment.start && word.start < until);
  });
}

/** Index of the segment on screen at `time`, or -1 between cues. */
export function segmentAt(segments: ScribeSegment[], time: number): number {
  return segments.findIndex(segment => time >= segment.start && time < segment.end);
}
export function authHeaders(value: string): Record<string, string> {
  const credential = value.trim();
  if (!credential) throw new Error('Enter your developer API key.');
  return { 'x-api-key': credential };
}
export async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? `Request failed (${response.status}).`);
  return body.data;
}
export function pcm16(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  samples.forEach((sample, i) => view.setInt16(i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767)), true));
  return buffer;
}
export function validateSocketUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'wss:' || url.hostname !== 'api.addisassistant.com' || url.pathname !== '/api/v1/scribe/stream' || url.search || url.hash) {
    throw new Error('The API returned an unexpected streaming endpoint.');
  }
  return url.toString();
}
export async function readTranscriptStream(response: Response, onPartial: (text: string) => void): Promise<ScribeResult> {
  if (!response.ok || response.headers.get('content-type')?.includes('application/json')) return readJson(response);
  if (!response.body) throw new Error('Streaming responses are unavailable.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '', completed: ScribeResult | undefined;
  const parse = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'error') throw new Error(event.error?.message ?? 'Transcription failed.');
    if (event.type === 'transcript.partial') onPartial(event.text);
    if (event.type === 'transcript.completed' && event.data?.usage?.settled) completed = event.data;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      if (pending.length > 512 * 1024) throw new Error('Transcript response is too large.');
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      lines.forEach(parse);
      if (done) break;
    }
    parse(pending);
    if (!completed) throw new Error('Connection ended before billing confirmation. Recover this request before retrying.');
    return completed;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
