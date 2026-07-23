"use client";

import { useEffect, useState, useRef } from 'react';
import { Play, Download, Trash2, FileAudio, AlertCircle } from 'lucide-react';

export function Base64Player() {
  const [input, setInput] = useState('');
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleConvert = () => {
    setError(null);
    if (!input.trim()) return;

    try {
      // 1. Clean the input (remove potential headers if user pasted them)
      let cleanBase64 = input.trim();
      if (cleanBase64.startsWith('"') && cleanBase64.endsWith('"')) {
        cleanBase64 = cleanBase64.slice(1, -1);
      }
      cleanBase64 = cleanBase64.replace(/^data:audio\/[a-zA-Z0-9.+-]+;base64,/, '');
      cleanBase64 = cleanBase64.replace(/[\r\n\s]+/g, '');
      
      // 2. Check if valid base64 (rudimentary check)
      if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
        throw new Error('INVALID_BASE64');
      }

      // 3. Create Blob
      // Note: We use audio/wav because your API returns WAV. 
      // Browsers can usually play standard WAV/MP3 blobs interchangeably.
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      setAudioSrc((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      
      // Auto-play
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }, 100);

    } catch {
      setError("Invalid Base64 string. Please check your input.");
    }
  };

  const clear = () => {
    setAudioSrc((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setInput('');
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (audioSrc) URL.revokeObjectURL(audioSrc);
    };
  }, [audioSrc]);

  return (
    <div className="rounded-xl border border-fd-border bg-fd-card p-6 shadow-sm my-6 not-prose">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
          <FileAudio className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-lg">Base64 Audio Player</h3>
      </div>

      <div className="space-y-4">
        {!audioSrc ? (
          <>
            <p className="text-sm text-fd-muted-foreground">
              Paste the <code>audio</code> string from your API response here to verify it.
            </p>
            <textarea
              aria-label="Base64 audio value"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste Base64 string here (e.g. UklGRiQgAABXQVZF...)"
              className="w-full h-32 p-3 rounded-md border border-fd-border bg-fd-background font-mono text-xs focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
            />
            {error && (
              <div className="text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> {error}
              </div>
            )}
            <button
              onClick={handleConvert}
              disabled={!input}
              className="flex items-center justify-center gap-2 w-full py-2 bg-fd-primary text-fd-primary-foreground rounded-md text-sm font-medium hover:bg-fd-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Play className="w-4 h-4" /> Convert & Play
            </button>
          </>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center justify-center p-6 bg-fd-secondary/30 rounded-lg border border-fd-border border-dashed">
              <audio ref={audioRef} controls src={audioSrc} className="w-full mb-4">
                Your browser does not support audio playback.
              </audio>
              
              <div className="flex gap-3 w-full">
                <a 
                  href={audioSrc} 
                  download="addis-audio.wav"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-fd-secondary hover:bg-fd-secondary/80 rounded-md text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Download WAV
                </a>
                <button 
                  onClick={clear}
                  aria-label="Clear decoded audio"
                  className="px-4 py-2 hover:bg-red-500/10 text-red-500 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
