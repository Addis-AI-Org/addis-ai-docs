"use client";

import { useState, useRef } from 'react';
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
      
      // 2. Check if valid base64 (rudimentary check)
      if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
        // It might be valid but have newlines, so we try to strip them
        cleanBase64 = cleanBase64.replace(/[\r\n]+/g, "");
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

      setAudioSrc(url);
      
      // Auto-play
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }, 100);

    } catch (err) {
      console.error(err);
      setError("Invalid Base64 string. Please check your input.");
    }
  };

  const clear = () => {
    setAudioSrc(null);
    setInput('');
    setError(null);
  };

  return (
    <div className="addis-offset-shell addis-panel p-6 my-10 not-prose">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 border border-fd-primary/30 bg-fd-primary/10 text-fd-primary">
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste Base64 string here (e.g. UklGRiQgAABXQVZF...)"
              className="w-full h-32 p-3 border border-fd-border bg-fd-background font-mono text-xs focus:ring-1 focus:ring-fd-primary outline-none resize-none"
            />
            {error && (
              <div className="text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> {error}
              </div>
            )}
            <button
              onClick={handleConvert}
              disabled={!input}
              className="flex items-center justify-center gap-2 w-full py-2 bg-fd-primary text-fd-primary-foreground text-sm font-medium hover:bg-fd-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" /> Convert & Play
            </button>
          </>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center justify-center p-6 bg-fd-secondary/30 border border-fd-border border-dashed">
              <audio ref={audioRef} controls src={audioSrc} className="w-full mb-4" />
              
              <div className="flex gap-3 w-full">
                <a 
                  href={audioSrc} 
                  download="addis-audio.wav"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-fd-secondary hover:bg-fd-secondary/80 text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Download WAV
                </a>
                <button 
                  onClick={clear}
                  className="px-4 py-2 border border-fd-border hover:bg-red-500/10 text-red-500 transition-colors"
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
