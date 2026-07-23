'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';

import { voiceCatalog } from '@/data/voice-catalog';

type Language = 'am' | 'om';

const languageOptions: Array<{ id: Language; label: string }> = [
  { id: 'am', label: 'Amharic' },
  { id: 'om', label: 'Afan Oromo' },
];

const INITIAL_VISIBLE_VOICES = 6;

export function VoiceCatalog() {
  const [language, setLanguage] = useState<Language>('am');
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const voices = voiceCatalog.filter((voice) => {
    if (voice.language !== language) return false;
    if (!normalizedQuery) return true;

    return [
      voice.id,
      voice.name,
      voice.descriptor,
      voice.style,
      voice.gender,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
  const canExpand = voices.length > INITIAL_VISIBLE_VOICES;
  const visibleVoices = isExpanded ? voices : voices.slice(0, INITIAL_VISIBLE_VOICES);
  const languageLabel = language === 'am' ? 'Amharic' : 'Afan Oromo';

  const selectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setIsExpanded(false);
  };

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    setIsExpanded(false);
  };

  return (
    <section
      className="not-prose my-7 overflow-hidden rounded-xl border border-fd-border bg-fd-card"
      aria-labelledby="voice-catalog-title"
    >
      <div className="border-b border-fd-border p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h3 id="voice-catalog-title" className="font-semibold">
              Current playable voices
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-fd-muted-foreground">
              Preview the current catalog and copy the exact ID into your request.
              Live availability still comes from <code>voices.list()</code>.
            </p>
          </div>
          <span className="w-fit rounded-full border border-fd-border bg-fd-secondary/40 px-2.5 py-1 text-xs text-fd-muted-foreground">
            {voiceCatalog.length} previews
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-fd-muted-foreground">
              Language
            </span>
            <div className="flex gap-2" role="group" aria-label="Filter voices by language">
              {languageOptions.map((option) => {
                const count = voiceCatalog.filter((voice) => voice.language === option.id).length;
                const selected = language === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectLanguage(option.id)}
                    className={
                      selected
                        ? 'rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground'
                        : 'rounded-md border border-fd-border px-3 py-2 text-sm font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground'
                    }
                  >
                    {option.label} <span aria-hidden="true">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <label
              htmlFor="voice-catalog-search"
              className="mb-1.5 block text-xs font-medium text-fd-muted-foreground"
            >
              Search voices
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fd-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="voice-catalog-search"
                type="search"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Name, ID, style, or gender"
                className="h-10 w-full rounded-md border border-fd-border bg-fd-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="mb-3 text-xs text-fd-muted-foreground" aria-live="polite">
          Showing {visibleVoices.length} of {voices.length} {languageLabel} voice{voices.length === 1 ? '' : 's'}
        </p>

        {voices.length > 0 ? (
          <>
            <ul id="voice-catalog-results" className="grid gap-3 lg:grid-cols-2">
              {visibleVoices.map((voice) => (
                <li
                  key={voice.id}
                  className="rounded-lg border border-fd-border bg-fd-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold">{voice.name}</h4>
                      <p className="mt-0.5 text-sm text-fd-muted-foreground">
                        {voice.descriptor}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-fd-border px-2 py-0.5 text-xs capitalize text-fd-muted-foreground">
                      {voice.gender}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <code className="rounded bg-fd-secondary px-2 py-1 font-mono text-fd-foreground">
                      {voice.id}
                    </code>
                    <span className="text-fd-muted-foreground">{voice.style}</span>
                  </div>

                  <audio
                    className="mt-3 h-9 w-full"
                    controls
                    preload="none"
                    src={voice.sample}
                    aria-label={`Preview ${voice.name}, voice ID ${voice.id}`}
                  >
                    Your browser does not support audio playback.
                  </audio>
                </li>
              ))}
            </ul>

            {canExpand ? (
              <div className="mt-4 border-t border-fd-border pt-4">
                <button
                  type="button"
                  aria-controls="voice-catalog-results"
                  aria-expanded={isExpanded}
                  onClick={() => setIsExpanded((expanded) => !expanded)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-fd-border bg-fd-background px-4 py-2.5 text-sm font-semibold text-fd-foreground transition-colors hover:border-fd-primary/40 hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
                >
                  {isExpanded
                    ? 'Show fewer voices'
                    : `Show all ${voices.length} ${languageLabel} voices`}
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-fd-border p-6 text-center text-sm text-fd-muted-foreground">
            No voices match this search.
          </div>
        )}
      </div>
    </section>
  );
}
