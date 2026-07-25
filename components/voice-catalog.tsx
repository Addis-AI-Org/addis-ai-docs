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
      className="not-prose addis-offset-shell my-10"
      aria-labelledby="voice-catalog-title"
    >
      <div className="relative bg-fd-background">
        <div className="grid border-x border-fd-border md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-fd-primary">
              <span className="h-px w-5 bg-fd-primary" />
              Voice catalog
            </div>
            <h3 id="voice-catalog-title" className="text-lg font-semibold tracking-tight">
              Current playable voices
            </h3>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-fd-muted-foreground">
              Preview the current catalog and copy the exact ID into your request.
              Live availability still comes from <code>voices.list()</code>.
            </p>
          </div>
          <div className="flex items-center border-t border-fd-border px-5 py-4 md:border-l md:border-t-0 md:px-6">
            <div>
              <span className="block font-mono text-2xl font-semibold tabular-nums text-fd-foreground">
                {voiceCatalog.length}
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-fd-muted-foreground">
                playable previews
              </span>
            </div>
          </div>
        </div>

        <div className="grid border border-fd-border md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="p-4 sm:p-5">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-fd-muted-foreground">
              Language
            </span>
            <div className="flex" role="group" aria-label="Filter voices by language">
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
                        ? 'border border-fd-primary bg-fd-primary px-3 py-2 text-sm font-semibold text-fd-primary-foreground'
                        : '-ml-px border border-fd-border px-3 py-2 text-sm font-medium text-fd-muted-foreground transition-colors first:ml-0 hover:z-10 hover:border-fd-primary/50 hover:text-fd-foreground'
                    }
                  >
                    {option.label} <span aria-hidden="true">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 border-t border-fd-border p-4 sm:p-5 md:border-l md:border-t-0">
            <label
              htmlFor="voice-catalog-search"
              className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-fd-muted-foreground"
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
                className="h-10 w-full border border-fd-border bg-fd-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-fd-muted-foreground/70 focus-visible:border-fd-primary focus-visible:ring-1 focus-visible:ring-fd-primary"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between border-x border-b border-fd-border px-4 py-3 sm:px-5">
            <p className="font-mono text-[11px] text-fd-muted-foreground" aria-live="polite">
              Showing {visibleVoices.length} of {voices.length} {languageLabel} voice{voices.length === 1 ? '' : 's'}
            </p>
            <span aria-hidden="true" className="font-mono text-[10px] uppercase tracking-[0.16em] text-fd-muted-foreground">
              ID · Style · Preview
            </span>
          </div>

          {voices.length > 0 ? (
            <>
              <ul id="voice-catalog-results" className="grid border-l border-fd-border lg:grid-cols-2">
                {visibleVoices.map((voice, index) => (
                  <li
                    key={voice.id}
                    className="group/cell relative border-b border-r border-fd-border bg-fd-background p-5 transition-colors hover:bg-fd-accent/25 sm:p-6"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute right-3 top-3 font-mono text-[10px] tabular-nums text-fd-muted-foreground/60"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-start justify-between gap-3 pr-7">
                      <div className="min-w-0">
                        <h4 className="font-semibold tracking-tight">{voice.name}</h4>
                        <p className="mt-1 text-sm text-fd-muted-foreground">
                          {voice.descriptor}
                        </p>
                      </div>
                      <span className="shrink-0 border-l border-fd-border pl-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-fd-muted-foreground">
                        {voice.gender}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <code className="border border-fd-border bg-fd-secondary/50 px-2 py-1 font-mono text-fd-foreground">
                        {voice.id}
                      </code>
                      <span className="text-fd-muted-foreground">{voice.style}</span>
                    </div>

                    <audio
                      className="mt-4 h-9 w-full opacity-90 transition-opacity group-hover/cell:opacity-100"
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
                <button
                  type="button"
                  aria-controls="voice-catalog-results"
                  aria-expanded={isExpanded}
                  onClick={() => setIsExpanded((expanded) => !expanded)}
                  className="group/toggle flex w-full items-center justify-between border-x border-b border-fd-border bg-fd-background px-5 py-4 text-left text-sm font-semibold text-fd-foreground transition-colors hover:bg-fd-accent/30 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fd-primary"
                >
                  <span>
                    {isExpanded
                      ? 'Show fewer voices'
                      : `Show all ${voices.length} ${languageLabel} voices`}
                  </span>
                  <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-fd-muted-foreground">
                    {isExpanded ? 'Collapse catalog' : `${voices.length - visibleVoices.length} more`}
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 text-fd-primary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>
              ) : null}
            </>
          ) : (
            <div className="border-x border-b border-dashed border-fd-border p-8 text-center text-sm text-fd-muted-foreground">
              No voices match this search.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
