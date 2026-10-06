export const VOICE_API = 'https://api.addisassistant.com/api/v1';
export type AuthMode = 'api-key' | 'jwt';
export type VoiceLanguage = 'am' | 'om' | 'ti';
export type StreamingVoice = {
  id: string; name: string; language: VoiceLanguage; is_available?: boolean; is_default?: boolean;
};
export function availableVoices(catalog: StreamingVoice[]): StreamingVoice[] {
  return catalog.filter(v => ['am', 'om', 'ti'].includes(v.language) && v.is_available !== false);
}
export function selectVoice(catalog: StreamingVoice[], language: VoiceLanguage, current = ''): string {
  const choices = availableVoices(catalog).filter(v => v.language === language);
  return choices.find(v => v.id === current)?.id ?? choices.find(v => v.is_default)?.id ?? choices[0]?.id ?? '';
}
export type VoiceCompletion = {
  id: string; audio_url: string; duration_seconds: number; finish_reason?: string;
  idempotent_replay?: boolean;
  usage: { credits_used: number; credits_remaining: number | null; currency: string; settled?: boolean };
};
export function authHeaders(value: string, mode: AuthMode = 'api-key'): Record<string, string> {
  const credential = value.trim();
  if (!credential) throw new Error(mode === 'jwt' ? 'Enter your account access token.' : 'Enter your developer API key.');
  return mode === 'jwt' ? { Authorization: `Bearer ${credential.replace(/^Bearer\s+/i, '')}` } : { 'x-api-key': credential };
}
export async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error?.message ?? `Request failed (${response.status}).`);
  return body.data;
}
export function validateSocketUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'wss:' || url.hostname !== 'api.addisassistant.com' || url.port || url.pathname !== '/api/v1/realtime/voice' || url.search || url.hash || url.username || url.password) {
    throw new Error('The API returned an unexpected streaming endpoint.');
  }
  return url.toString();
}
export function validateAudioUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !['cdn.addisassistant.com', 'api.addisassistant.com', 'vzootpcpzepaeirdnbvx.supabase.co'].includes(url.hostname)) {
    throw new Error('The API returned an unexpected audio endpoint.');
  }
  return url.toString();
}
function completion(value: VoiceCompletion): VoiceCompletion {
  if (!value?.id || !value.usage || value.usage.settled === false || !Number.isFinite(value.usage.credits_used) || !Number.isFinite(value.duration_seconds)) {
    throw new Error('Billing has not been confirmed. Recover the same request.');
  }
  validateAudioUrl(value.audio_url);
  return value;
}
export async function readVoiceStream(response: Response, onAudio: (bytes: Uint8Array) => void, signal?: AbortSignal): Promise<VoiceCompletion> {
  if (!response.ok) return readJson(response);
  if (response.headers.get('content-type')?.includes('application/json')) {
    const result = completion(await readJson<VoiceCompletion>(response));
    const audio = await fetch(validateAudioUrl(result.audio_url), { signal, credentials: 'omit' });
    if (!audio.ok) throw new Error('The saved clip could not be downloaded. Recover this request.');
    const bytes = new Uint8Array(await audio.arrayBuffer());
    if (bytes.length > 16 * 1024 * 1024) throw new Error('Audio response is too large.');
    onAudio(bytes);
    return { ...result, idempotent_replay: true };
  }
  // wav-mp3-frames-v1: the first phrase as WAV pieces while it is generated, later phrases as MP3.
  if (!['mp3-frames-v1', 'wav-mp3-frames-v1'].includes(response.headers.get('x-addis-audio-protocol') ?? '') || !response.body) throw new Error('Unexpected audio stream protocol.');
  const reader = response.body.getReader();
  let pending = new Uint8Array(0), terminal = false, total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (value) { const next = new Uint8Array(pending.length + value.length); next.set(pending); next.set(value, pending.length); pending = next; }
      if (pending.length > 2 * 1024 * 1024 + 4) throw new Error('Audio frame is too large.');
      while (!terminal && pending.length >= 4) {
        const size = new DataView(pending.buffer, pending.byteOffset, pending.byteLength).getUint32(0);
        if (size === 0) { pending = pending.slice(4); terminal = true; break; }
        if (size > 2 * 1024 * 1024) throw new Error('Audio frame is too large.');
        if (pending.length < size + 4) break;
        total += size;
        if (total > 16 * 1024 * 1024) throw new Error('Audio response is too large.');
        onAudio(pending.slice(4, size + 4)); pending = pending.slice(size + 4);
      }
      if (terminal && pending.length > 128 * 1024) throw new Error('Completion record is too large.');
      if (done) break;
    }
    if (!terminal) throw new Error('Connection ended before billing confirmation. Recover this request.');
    const body = JSON.parse(new TextDecoder().decode(pending));
    if (body.error) throw new Error(body.error.message ?? 'Speech failed. Recover this request.');
    return completion(body.data);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
