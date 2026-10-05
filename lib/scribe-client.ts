export const SCRIBE_API = 'https://api.addisassistant.com/api/v1/scribe';
export type Backend = 'cpu' | 'gpu';
export type ScribeResult = {
  text: string; request_id: string; backend: Backend; seconds: number; compute_ms: number;
  usage: { characters: number; credits_used: number; credits_remaining: number; currency: string; settled: boolean };
  idempotent_replay?: boolean;
};
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
