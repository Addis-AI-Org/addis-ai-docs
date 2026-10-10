# Addis AI Docs — Senior DX & Information-Architecture Review

- **Audited at**: commit `eaf808b`, 2026-10-10
- **Method**: shadcn's [`improve`](https://github.com/shadcn/improve) advisor skill, `deep` effort, focused on docs DX and information architecture. Six read-only audit passes ran in parallel: IA/navigation, page scope and jargon, onboarding pages, visual system, code samples and API contract, and docs-platform features. Two research passes benchmarked ElevenLabs, Vercel/AI SDK and Better Auth. Every finding below was re-checked against the files before inclusion; subagent line numbers were corrected where they were wrong.
- **Companion files**: `plans/README.md` (execution order, decisions needed) and `plans/001-…008-*.md` (self-contained implementation plans).

---

## 1. Verdict

The writing *underneath* is often good. `capabilities/streaming.mdx` and `integration/streaming-voice-agent.mdx` are close to best-in-class. The site loses trust for five structural reasons, and none of them is about effort or volume:

1. **Placeholder and template pages are public.** The unmodified Fumadocs starter page (it contains a heading "Yo what's up") and five "Content for X goes here." pages are compiled. They are served by URL, returned by search, and shipped to every AI assistant through `/llms-full.txt`.
2. **Copy-paste is broken.** 33 cURL lines end in `\\`, and 5 samples single-quote `$ADDIS_API_KEY`, so the first request a new developer copies fails. Three server samples read a different env var (`ADDIS_AI_KEY`), the Go sample does not compile, and the web proxy samples don't match their own frontends.
3. **One page = many jobs.** Every capability page uses the template *Usage Guide → API Reference → Best Practices cards*, and several add marketing, a live demo, a roadmap and a standalone HTML file. `realtime.mdx` is 620 lines doing 8 jobs. There is no API Reference section, no Models page and no Concepts/Glossary, so every reference fact is restated per page and has already drifted (two response envelopes for one endpoint, three different upload limits).
4. **The front door is a marketing page.** Introduction is a 50-line raw-HTML hero with emoji roadmap headings, 8 absolute self-links, a mislabelled link, unsourced claims, and model names that are not API IDs. Quickstart is a catalogue (15 code samples in nested tabs, with the first call in step 4 of 5) rather than a 3-step tutorial.
5. **The visual system is hand-rolled per page.** It uses 229 lines of `<div className=…>`, 56 copy-pasted card blocks, 80 hard-coded rainbow colours, three corner-radius systems and 15 "New" badges. On top of that, the Fumadocs default prose-link underline (1.5px in the brand primary) sits on a saturated electric blue/cyan, with 19 links also wrapped in bold. That is the "underlines everywhere" look.

A repo-level brake makes all of this slow to fix. `tests/documentation-preservation.test.mjs` (672 lines, 241 asserts) pins exact marketing sentences, emoji, Tailwind class names and even the absolute self-links. 25 of the repo's 62 commits edit that test. It protects approved copy, but it also freezes the bugs above.

---

## 2. What the benchmarks do that we don't

Evidence notes:

- **Better Auth and AI SDK**: read from their docs source on GitHub. Better Auth runs on the **same stack as us** (Fumadocs 16 + Next 16).
- **Fumadocs default CSS**: read from the published `fumadocs-ui@16.3.0` tarball.
- **ElevenLabs and Vercel**: the egress proxy blocks both sites, so their rows come from indexed page content via search and are structural only. Their visual details are unverified.

| Practice | ElevenLabs | Vercel / AI SDK | Better Auth | Addis AI today |
|---|---|---|---|---|
| Separate API reference, one page per endpoint/function | Yes; verb-titled ("Create speech"), own tab | Yes; AI SDK `reference/` tree with Import / Signature / Params / Returns / Examples | Partial (`reference/`, plugin pages mix) | **No.** `api-reference/` holds two stubs; tables live inside guides |
| Concepts / Foundations layer | "Concepts", Models page | AI SDK "Foundations" | `concepts/` folder | **None.** No Models page, no glossary |
| Capability overview kept short; guides separate | Overview → cookbooks → how-to → reference | Overview → guides → limits/pricing child pages | Mixed | **No.** 450–620-line capability pages |
| Quickstart | 3 steps: key → install → run, Python + TS | ~4 steps, `.env`, "Where to next?" | `<Steps>` with H3s, `package-install` tabs | 5 steps; first call in step 4; 15 samples |
| Models table (ID, latency, languages, limits, status, deprecation) | Yes | Yes (providers/models) | n/a | **No.** Ge'ez-script IDs that are not API parameters |
| Changelog placement | Own tab, dated entries | Separate `/changelog` | Separate `/changelog` | **First item in the sidebar**, above "Get Started" |
| `/llms.txt` + per-page Markdown (`.md`) | Yes (+ per-endpoint) | Yes (`.md`, `Accept: text/markdown`) | Yes (`.md` rewrite + Accept negotiation) | **Only `llms-full.txt`, and it includes the stubs and template** |
| Copy page / Open in ChatGPT · Claude | Unverified | Yes | Yes ("Copy MD", "Open in ▾") | No |
| Ask AI | Yes (voice/chat agent) | Yes | Yes (⌘I) | No |
| Edit on GitHub / last updated / feedback | Unverified | Last updated + "Was this helpful?" | Edit on GitHub | None (a hand-typed `LastVerified`, already stale) |
| Heading style | Sentence case | AI SDK Title Case; Vercel mixed | Mixed | Mixed *within* pages; emoji in headings |
| Emoji in headings | No | No | No | **Yes** (`introduction.mdx:103,107,116,123`) |
| Custom raw-HTML layout inside MDX | Minimal | Components (`<IndexCards>`, `<Snippet>`) | Components (`<Features>`, `<APIMethod>`) | **229 `<div className>` lines in 18 files** |
| Link styling | Unverified | Unverified | Fumadocs default, but on a **neutral (black) theme**, so the underline is grey/white | Fumadocs default on **saturated `#245efe` / `#27cdfe`**, plus bold-wrapped links |

The last row is the precise root cause of the "underlines" complaint. Better Auth uses the *same* Fumadocs rule: `text-decoration: underline; text-decoration-thickness: 1.5px; text-decoration-color: var(--color-fd-primary)` (`fumadocs-ui@16.3.0` `dist/style.css:764-772`). It looks calm there because its primary colour is neutral. Ours is an electric brand blue, and `introduction.mdx:103-125` stacks 14 bold, underlined links in a row.

---

## 3. Findings

Severity: **P0** means correctness or trust, so fix now. **P1** means structure, the "one page doing many things" problem. **P2** means polish and platform. "Plan" points at the handoff plan that fixes the finding. **D#** means it needs an owner decision first (§5).

### P0 — Correctness & trust

| # | Finding | Evidence | Effort | Plan / Decision |
|---|---|---|---|---|
| F01 | The Fumadocs starter page and five "Content for X goes here." stubs are compiled, URL-reachable, searchable and in `llms-full.txt` | `get-started/quick-start.mdx:3` ("Getting Started with Fumadocs"), `:96` ("Yo what's up"); `capabilities/vision.mdx:7`, `conversation.mdx:7`, `api-reference/chat-endpoint.mdx:7`, `schemas.mdx:7`, `get-started/playground-guide.mdx:7`; `app/api/search/route.ts:4` and `app/llms-full.txt/route.ts:6` use every page in the source | S | 001, D1 |
| F02 | `content/docs/index.mdx` (151 lines, an older and conflicting landing page) can never render because `/docs` redirects first. It is still indexed, says "Oromiffa", gives a different API-key flow, and links to the Vision stub | `app/docs/[[...slug]]/page.tsx:25-27`; `index.mdx:116-118,130,148` | S | 001, D2 |
| F03 | 33 cURL lines end in `\\`. MDX code fences are literal, so the shell sees an escaped backslash and the command ends early | `text-generation.mdx:59-61,108-110,152-154`; `multimodal.mdx:59-61,104-106,149-151`; `translation.mdx:83-85`; `speech-to-text/index.mdx:316-318`; `text-to-speech-legacy.mdx:57-59,171-173`; `index.mdx:103-105` | S | 002 |
| F04 | 5 cURL samples wrap `$ADDIS_API_KEY` in single quotes, so the literal string is sent and the request returns 401. Two of them are in Quickstart | `quickstart.mdx:196,242`; `speech-to-text/index.mdx:317`; `translation.mdx:85`; `multimodal.mdx:200` | S | 002 |
| F05 | **Security contradiction.** Realtime tells browser and mobile clients to put the secret API key in the WebSocket URL, while 4 other pages say never to put keys in the client or in URLs | `realtime.mdx:28-34,97-98`; vs `integration/web.mdx:18-35`, `capabilities/streaming.mdx:40`, `speech-to-text/live.mdx:17`, `integration/streaming-voice-agent.mdx:31` | S docs / M product | D3 |
| F06 | The standalone realtime demo stores the API key in `localStorage` indefinitely, while the other demos say "Your API key is not saved" | `public/realtime-demo.html:379,601`; vs `components/realtime-voice-demo.tsx:288` (sessionStorage), `scribe-demo.tsx:173` | S | not planned (one-line fix: switch to `sessionStorage`) |
| F07 | One endpoint, two response envelopes. `chat_generate` returns a flat `response_text` on one page and `{status, data:{…}}` on another. `finish_reason` is `"stop"`, `"STOP"` and `"safety"` across pages. The `conversation_history` item is `{role, content}` on one page and `{role, parts[]}` (required) on another | `text-generation.mdx:463-473,114-117,571`; `multimodal.mdx:343-363,236-249` | S once known | D4 |
| F08 | The multimodal form-field reference lists `image`/`audio`/`document`, but every example sends `attachment_0` + `attachment_field_names` and `chat_audio_input`. A callout titled "Dedicated Endpoint" says to use the chat endpoint | `multimodal.mdx:292-315` vs `:61-62,106,151-152`; `:115-117` | S once known | D4 |
| F09 | Two STT products share one page. Quickstart teaches the older `/api/v2/stt`, while the STT page leads with Scribe. The page description promises Afaan Oromo, but Scribe is Amharic-only. Limits conflict: 10 MB / 60 s vs 25 MB / 180 s, and MB vs MiB | `quickstart.mdx:100,163-201`; `speech-to-text/index.mdx:3,24,42,148,334,432-436` | M | D11 |
| F10 | Integration samples fail on copy. `ADDIS_AI_KEY` is used where everything else uses `ADDIS_API_KEY`. The Go sample declares `err` and never uses it, so it does not compile, and it dereferences `resp` on failure. The Express proxy listens on `/api/proxy` and reads `prompt`, but the frontends POST `{message}` to `/api/chat`. The proxies return `{error: "string"}`, but the clients read `data.error?.message` | `server.mdx:147,167-169,187`; `web.mdx:85-86,68,99,116,159-168,223-231` | S | 002 |
| F11 | `web.mdx` says the API blocks browsers with CORS, but the docs' own in-page demos call the API from the browser. An undocumented `Authorization: Bearer` (JWT) mode exists in the demo client | `web.mdx:279`; `components/scribe-demo.tsx:58,86`; `lib/voice-stream-client.ts:22` | S | D3 |
| F12 | `status.addisassistant.com` serves a hand-edited docs page that says every service is "Operational". Its uptime table stops at 2026-08-09 | `proxy.ts:3-12`; `platform/status.mdx:9,13-19,51-60` | S–M | D10 |
| F13 | Rate Limits is orphaned: it is not in the sidebar and is linked only from Introduction. It describes Free/Pro/Team/Enterprise tiers that Pricing (pay-as-you-go ETB) never mentions. Its audio limits contradict the capability pages | `meta.json:31-35`; `introduction.mdx:124`; `limits.mdx:17-22,58-66`; `pricing.mdx:9-18`; `faq.mdx:78,88` | S once known | D5 |

### P1 — Structure ("one page trying to be a lot of things")

| # | Finding | Evidence | Effort | Plan / Decision |
|---|---|---|---|---|
| F14 | **No API Reference section.** Request/response tables are embedded in 6 capability pages, the chat endpoint is documented twice, and `api-reference/` contains only stubs | `meta.json:4-36`; `text-generation.mdx:392-498`; `multimodal.mdx:287-381`; `speech-to-text/index.mdx:326-387`; `translation.mdx:107-172`; `realtime.mdx:328-416` | L | 007 (pilot), §4 target IA |
| F15 | **Capability pages do 4–8 jobs each.** `realtime.mdx` (620 lines) holds endpoint + auth + marketing use-case cards + audio concept + a 230-line tutorial + protocol reference + live demo + a 160-line standalone HTML file + "Coming Soon" roadmap. `text-generation.mdx` (576) holds tutorial + 5 how-tos + full reference + concept + best-practice cards | outlines in §6 | L | 007 |
| F16 | **Quickstart is a catalogue, not a tutorial.** It has: a Playground UI tour; 3 key screenshots; 3 base URLs; an endpoint table; 4 capability tabs × 3 language tabs (nested tabs); a Realtime card mid-step; a JSON response that doesn't match the SDK output printed above it; a step-5 snippet with no client constructed; and no "Next steps" | `quickstart.mdx:12-58,60-105,112-296,298-302,304-342,353-375` | M | 005 |
| F17 | **The Introduction is a marketing page**, with a 50-line raw-HTML hero and emoji headings (🚀 ⚡ 🧩 ⚙️). It has 8 absolute `https://docs.addisassistant.com/...` self-links (previews jump to production). "Playground Guide" links to Quickstart. The roadmap omits half the sidebar. Claims ("&lt;300ms", "most natural sounding", "like Siri/Alexa") are unsourced, and model names (`አሌፍ-Audio-AM`, `addis-whisper`) appear in no API call | `introduction.mdx:9-59,14,67-69,86-95,99-125` | M | 006 |
| F18 | **Sidebar problems:** Announcements is the first item (so it becomes Introduction's "Previous"). Two "Streaming" entries sit one row apart with the same icon. Two "Speech-to-Text" entries (capability + playground). Playgrounds are wedged between Capabilities and Integration. Integration mixes platforms (web/mobile/server) with use-cases (voice agents). No Concepts group | `meta.json:5,13-15,19-21,24-29`; `text-to-speech/streaming.mdx:2-4`; `capabilities/streaming.mdx:2-4` | M | 006 |
| F19 | **No Models page, and three naming systems:** Ge'ez-script IDs (`Addis-፩-አሌፍ`, `አሌፍ-1.2-realtime-audio`), product brands (Addis Voices 2, Scribe) and codenames (`addis-whisper`), with nothing tying them together. Most of the IDs are never accepted as a parameter | `introduction.mdx:77-93`; `text-generation.mdx:12`; `realtime.mdx:15`; `server.mdx:156` | M | D6 |
| F20 | **Jargon arrives before definitions, and there is no glossary.** Examples: PCM16, little-endian, VAD, back-channeling, "relay", WER, nucleus sampling, "ledger record ID", `BILLING_PENDING`, Turbo/Standard backends, "Voice 1/Voice 2" | `realtime.mdx:15,25,76-85,602`; `speech-to-text/index.mdx:18,148-156,391`; `text-generation.mdx:448-455` | M | §4 Concepts |
| F21 | **Two different products are both called "realtime".** The docs need a callout to explain the clash: `/api/v1/realtime/*` + `addis.realtime.connect` are TTS streaming, while the "Realtime API" is the relay conversation product. Realtime is "Beta" on one page and unlabelled on its own page | `capabilities/streaming.mdx:20,33-35`; `realtime.mdx:2,17-18` | S docs | D13 |
| F22 | **Facts are copied, and the copies drift.** "5 ETB/minute" appears in 6 places, upload limits in 5, the token paragraph 3× (twice on one page), the PCM conversion code twice on one page, and the Legacy→Voices 2 migration twice | `text-generation.mdx:497,555`; `faq.mdx:37`; `realtime.mdx:200-246,477-514`; `text-to-speech/index.mdx:10,249,319,307-321`; `text-to-speech-legacy.mdx:388-390` | M | §4 single source |
| F23 | **Essential reference is hidden.** TTS streaming's only endpoint/event table and its auth section are collapsed inside a `<details>`, yet their H2s still appear in the TOC | `text-to-speech/streaming.mdx:142-255` | S | 007 pattern |
| F24 | **Demos sit at the top of docs pages**, even though a Playgrounds section exists: `<ScribeDemo/>` is the first H2 of the STT page, and `<VoiceStreamingDemo/>` comes before any text | `speech-to-text/index.mdx:16-20`; `text-to-speech/streaming.mdx:11`; `realtime.mdx:426-593` | S | 007 pattern |
| F25 | **Integration guides repeat each other and disagree.** The key-safety sermon appears 5×, and the Express and PHP proxies are near-duplicated. They contradict each other on timeouts (30 s vs "60s+") and latency (5–10 s vs 2–3 s). None opens with goal / prerequisites / result | `web.mdx:18-35,74-132,288`; `server.mdx:38-62,71,75-104,180-197,390`; `mobile.mdx:17-30,233` | M | §4 Platforms |
| F26 | **Five overlapping voice-agent surfaces and no "which one?" page** linked from Introduction or Quickstart | `integration/voice-interface.mdx`, `integration/streaming-voice-agent.mdx`, `capabilities/realtime.mdx`, `text-to-speech/streaming.mdx`, `capabilities/streaming.mdx` | M | §4 Guides |
| F27 | **Errors page is not reference-grade.** Error codes mix `invalid_api_key` and `LANGUAGE_CAPACITY_REACHED` casing. 409/422 are missing. WebSocket error shapes differ per socket. The request-ID header name is never given, although Status and Errors ask for it | `errors.mdx:23-31,58-67,184`; `text-to-speech/streaming.mdx:241,282`; `realtime.mdx:408-415`; `speech-to-text/index.mdx:156,272` | M | D4 |
| F28 | **SDK install drift.** `sdks.mdx` installs a GitHub tarball pinned to 0.4.0 while documenting 0.5.0 features. Quickstart uses the npm/PyPI registry, unpinned. There are no constructor options, error classes or supported runtimes | `sdks.mdx:23,30,76-77`; `quickstart.mdx:82,88`; `speech-to-text/index.mdx:212,234` | S–M | D7 |
| F29 | **Snippets are not self-contained.** `addis`/`ulid` are used without imports, and Python mixes dict and attribute access on the same SDK. A `with AddisAI()` block closes the client that the next snippet reuses | `speech-to-text/live.mdx:29-30,68`; `text-to-speech/index.mdx:22-27,159,230`; `quickstart.mdx:353-375`; `speech-to-text/index.mdx:79-88,118` | M | 005 (pattern) |
| F47 | **Broken deep links that no test catches.** Announcements links to `#system-instructions-and-personas` and `#function-calling`, but the target headings are numbered ("### 3. System Instructions and Personas …"), so their anchors start with `3-`/`4-`. Two pages also deep-link to `#5-streaming-and-attachments`, which breaks the moment a section is renumbered. The link test never checks anchors | `announcements.mdx:83-84`; `text-generation.mdx:125,165,360`; `capabilities/streaming.mdx:15`; `integration/streaming-voice-agent.mdx:10` | S | 007 |
| F30 | **Terminology and case drift.** "Oromiffa"/"Oromo" vs "Afaan Oromo"; "Voice 2" vs "Addis Voices 2"; `X-API-Key` vs `x-api-key`; Title Case and sentence case mixed *within* a page | `index.mdx:130`; `voice-interface.mdx:21`; `realtime.mdx:17`; `speech-to-text/index.mdx:16 vs 280` | S | D9 |

### P2 — Visual polish ("underlines", "doesn't look like a $2B company")

| # | Finding | Evidence | Effort | Plan / Decision |
|---|---|---|---|---|
| F31 | **Underlines.** The Fumadocs prose-link underline (1.5px, `--color-fd-primary`) renders in saturated `#245efe`/`#27cdfe`. 19 links are also bold-wrapped (`**[…](…)**`), and components use three more underline styles | `fumadocs-ui@16.3.0 dist/style.css:764-772`; `app/global.css:5-22` (no override); `introduction.mdx:103-125`; `components/docs.tsx:123`; `scribe-demo.tsx:173`; `voice-streaming-demo.tsx:190` | S | 003 |
| F32 | **Hand-rolled layout in MDX.** 229 `<div className=…>` lines in 18 files, 56 copy-pasted "feature cards", 54 raw `<h3>`/`<h4>` tags that never reach the TOC, and 80 hard-coded palette colours (`text-blue-500`, `text-yellow-500`, …) | e.g. `text-generation.mdx:507-576`; `pricing.mdx:32-52`; `realtime.mdx:42-69,598-618`; `web.mdx:23-35` | M | recommended next (after 004) |
| F33 | **Three corner-radius systems.** `border-radius: 0 !important` on the `addis-*` utilities, author-written `rounded-lg` that is silently overridden, and Fumadocs' own `rounded-xl` on callouts and code | `app/global.css:59,74,85`; `mobile.mdx:19` | S | with F32 |
| F34 | **15 "New" labels, from two sources.** Sidebar badges come from a hard-coded URL set, while the title badge uses `isNew` frontmatter. Some badges sit inside headings and end up in anchors/TOC. None ever expire | `lib/source.ts:7-14`; `text-generation.mdx:125,165`; `speech-to-text/index.mdx:158`; `source.config.ts:30` | S | with 004/006 |
| F35 | **Decoration noise.** Emoji headings, 47 `---` rules (6 on one page), heavy bold (26 spans on Introduction) | `introduction.mdx`; `realtime.mdx` | S | 003 / 006 |
| F36 | **Logo problems.** Two ~4000px PNGs (~140 KB) are both downloaded, with different aspect ratios, so the header width jumps on theme switch. A `pr-20` padding hack is used, and the logo links away to the marketing site | `lib/layout.shared.tsx:116-133`; `public/images/Addis-Ai-Logo-Dark.png` (4106×899), `addis_ai_full.png` (4073×661) | S | D10 |
| F37 | **Tiny text.** 10px uppercase mono labels (31 sites), plus 7–8px fake "npm"/"Py" icons | `app/global.css:96-103`; `lib/layout.shared.tsx:9,21` | S | with F32 |
| F38 | **Code blocks.** The pastel Catppuccin theme looks unlike the reference sites, and only 3 of ~180 fences have a `title=` | `source.config.ts:63-66` | S | 003 (theme optional) |

### P2 — Docs platform & AI-readiness

| # | Finding | Evidence | Effort | Plan / Decision |
|---|---|---|---|---|
| F39 | **AI-readiness gaps.** There is no `/llms.txt`, no per-page Markdown (`.mdx`/`.md`), and no "Copy page" / "Open in ChatGPT · Claude". `llms-full.txt` is polluted (F01) and sets no `charset`, even though the content is Ethiopic | `app/llms-full.txt/route.ts:6-9`; `app/docs/[[...slug]]/page.tsx:42-46`; `source.config.ts:36-38` (Markdown already generated) | S–M | 008 |
| F40 | **No freshness signals.** No `lastUpdate`, no Edit on GitHub, no feedback. The manual `LastVerified` is already wrong: the page is dated 2026-10-08 but says verified 2026-07-23. `fumadocs-ui@16.3.0`'s `DocsPage` supports `lastUpdate` and `editOnGithub` | `page.tsx:34-41`; `announcements.mdx:8,93`; `pricing.mdx:56` | S | 008 |
| F41 | **SEO and error-page gaps.** No `sitemap.xml`, `robots.txt` or canonical URLs, and the status host serves the whole docs site as a duplicate. There is no docs 404, so stale links land on Next's bare default | `app/` (absent); `proxy.ts:3-12`; `next.config.mjs:14-56` (8 legacy redirects prove links move) | S | 008 |
| F42 | **Search problems.** Search indexes stubs and dead pages (F01/F02) with an English tokenizer over Ethiopic content, and the playground pages are not indexed | `app/api/search/route.ts:4-7` | M | 001 + follow-up |

### Repo & authoring DX

| # | Finding | Evidence | Effort | Plan / Decision |
|---|---|---|---|---|
| F43 | **The preservation test locks copy, not invariants.** It pins emoji headings, "Join 1,500+ developers", Tailwind class strings, SVG `viewBox`es, the absolute self-links and the marketing-site logo URL. 25 of 62 commits edit it | `tests/documentation-preservation.test.mjs:112,117,200-208,222,230-241,476-500` | M | 004, D8 |
| F44 | **No CI and weak link checking.** There is no `.github/` at all, so `pnpm test`/`lint`/`typecheck` never run on PRs. MDX is unlinted. The link checker covers only nav pages and Markdown-syntax links: no JSX `href`s, no anchors, and absolute self-links are skipped | `tests/…:587-623` | S–M | 004 (+ CI recommended) |
| F45 | **README is the Create-Fumadocs boilerplate.** It says `npm run dev`, but the lockfile is pnpm. There is no writer guide, style guide, frontmatter reference or page template | `README.md:1-45`; `source.config.ts:28-34` | S | recommended |
| F46 | **Dead weight.** 7 unused components (~700 lines) that only import each other. Unused KaTeX, twoslash and auto-type-table plugins (and their deps). A `blog` collection with no directory. *Every* lucide icon is spread into MDX scope, which shadows `<Image>`, `<Link>`, … | `components/{tabs,tabs.unstyled,accordion,code-block,files}.tsx`, `components/ui/*`; `source.config.ts:8-11,47-54,73-75,117-122`; `mdx-components.tsx:14,18` | S | recommended |

---

## 4. Target information architecture (proposal)

This is modelled on ElevenLabs (separate API reference tab), the AI SDK (Foundations + per-function reference) and Better Auth (same Fumadocs stack: icons per section, Markdown routes, page actions). The shape is: **two sidebar tabs (Fumadocs root folders) plus a header link to the Changelog**.

```
Docs tab
├─ Get started
│   ├─ Introduction            (orientation: what it is, choose-your-path cards; no hero)
│   ├─ Quickstart              (install → key → one call → expected output → next steps)
│   ├─ Authentication & keys   (x-api-key, one-use tickets, never ship keys to clients)
│   └─ SDKs                    (install, configure, versions, errors, runtimes)
├─ Concepts
│   ├─ Models                  (ID · capability · languages · limits · status)
│   ├─ Languages               (am / om / en / ti per capability)
│   ├─ Tokens & usage
│   ├─ Audio formats           (PCM16, sample rates, frames, containers)
│   ├─ Streaming               (today's capabilities/streaming.mdx — already the right shape)
│   └─ Glossary
├─ Capabilities                (short overviews: what, when, limits link, next steps)
│   ├─ Text generation · Text-to-speech · Speech-to-text · Translation · Multimodal · Realtime voice (Beta)
├─ Guides                      (one task per page)
│   ├─ Multi-turn chat · System instructions · Function calling · Stream chat
│   ├─ Choose a voice · Estimate cost · Stream speech · Captions & timestamps · Live transcription
│   └─ Voice agents: Choose an approach → Request/response · Streaming · Realtime
├─ Platforms
│   ├─ Backend proxy (one page: the security rationale + Node/Python/Go/PHP)
│   ├─ Web apps · Mobile apps
├─ Playground                  (Speech-to-text playground · Text-to-speech playground)
├─ Platform
│   ├─ Pricing · Rate limits · Errors · FAQ · Status ↗ (external)
└─ Legacy
    ├─ Legacy text-to-speech (Voice 1) · Legacy speech-to-text (/v2/stt)

API Reference tab
├─ Overview (base URLs, auth, request IDs, error envelope, idempotency)
├─ Chat:        POST /api/v1/chat_generate  (JSON + multipart)
├─ Translation: POST /api/v1/translate
├─ Scribe:      POST /scribe/transcribe · POST /scribe/sessions · GET /scribe/requests/{id} · GET /scribe/usage · WS events
├─ Voices:      GET /voice/voices · GET /voice/voices/{id}/preview
├─ Speech:      POST /voice/estimate · POST /voice/generations · POST /voice/generations/stream · clips · usage
├─ Speech sessions: POST /realtime/sessions · WS /realtime/voice events
├─ Realtime voice (relay): WS events
└─ Legacy: POST /api/v1/audio · POST /api/v2/stt

Header: Changelog (dated entries; replaces "Announcements" as sidebar item #1)
```

Page-scope rules that should go into `AGENTS.md` and be enforced by tests:

- **One job per page.** A guide never contains a full parameter table; it links to the reference. A reference page has exactly these sections: *Request · Parameters · Response · Errors · Example*.
- **Every number has one home.** Prices live in Pricing, limits in Rate limits, model facts in Models. Other pages link; they don't restate.
- **Demos live in Playground.** Docs pages link with "Try it in the playground →".
- **Sentence-case headings**, no emoji, no badges inside headings, no `---` before a heading.
- **Prose links are plain.** No bold-wrapped links.
- **No raw `<div className>` in MDX.** Use registered components.

---

## 5. Decisions only the owner can make

`AGENTS.md` says to ask rather than assume on product, content, navigation, auth, pricing or API-contract questions, and not to delete content without explicit authorization. These decisions gate the plans:

| ID | Question | Recommended answer | Blocks |
|---|---|---|---|
| D1 | May we delete `get-started/quick-start.mdx` (Fumadocs template), the 5 "goes here" stubs and `content/docs/test.x`? | Yes, with redirects for the stub URLs | 001 |
| D2 | `content/docs/index.mdx` (unreachable landing page): delete it, or make it the real `/docs` landing? | Delete. Introduction stays the landing page (Better Auth does the same) | 001 |
| D3 | Does the Realtime relay (`wss://relay.addisassistant.com/ws`) support anything other than `?apiKey=`, such as one-use tickets like Scribe and TTS? And is the JWT/Bearer mode in `lib/voice-stream-client.ts` public? | If tickets exist: document them. If not: label `?apiKey=` "server-side / local testing only" and add a server-relay pattern | F05, F11 |
| D4 | What does `POST /api/v1/chat_generate` actually return (flat vs `{status,data}`), with what `finish_reason` casing, which multipart field names, and which `conversation_history` item shape? | Check against a live request, then document once in the API reference | F07, F08, F27, 007 |
| D5 | Are Free/Pro/Team/Enterprise tiers real, or is billing pay-as-you-go only? What are the true per-service limits? | Whatever is true goes on Pricing + Rate limits; the other page links | F13 |
| D6 | Which model identifiers are real API values? (`Addis-፩-አሌፍ`, `አሌፍ-Audio-AM/OM`, `addis-whisper`, `አሌፍ-1.2-realtime-audio`) | A Models page lists only accepted IDs, with Latin transliterations | F19 |
| D7 | Canonical SDK install: registry (`npm i addisai`) or GitHub tarball? Minimum version? | Registry, `>=0.5.0`, stated once on SDKs | F28, 005 |
| D8 | May the preservation test stop pinning exact sentences, emoji, CSS class names and absolute URLs, and assert structural invariants instead? | Yes. This is the single biggest unblocker | 004 → 005, 006, 007 |
| D9 | Heading convention: sentence case (ElevenLabs) or Title Case (AI SDK)? | Sentence case | F30 |
| D10 | Logo click target and the status host: docs home or marketing site? Live status provider or static page? | Logo → `/docs` (with the marketing site as a header link); status → hosted provider | F12, F36 |
| D11 | Is `/api/v2/stt` (`speech.transcribe`) legacy now that Scribe exists? Does Scribe support Afaan Oromo? | If legacy: move it to Legacy and point Quickstart at Scribe | F09 |
| D12 | Is Tigrinya (`ti`, `ti-berhane`) a supported TTS language? (FAQ calls it beta; the streaming page lists a production voice.) | State it once on the Languages page | F30 |
| D13 | Rename one of the two "realtime" surfaces (e.g. TTS sessions → "speech sessions", SDK `voice.connect`)? | At least rename it in the docs. The SDK namespace is a product call | F21 |
| D14 | May Quick Start drop its STT, Translation and Multimodal tabs and the Voices 2 step? They remain on the capability pages and are linked from "Next steps" | Yes | 005 |

---

## 6. Per-page split map (input for plan 007 and its successors)

| Page (lines) | Jobs found | Becomes |
|---|---|---|
| `capabilities/text-generation.mdx` (576) | overview, tutorial, 5 how-tos, full reference, token concept, best-practice cards | Overview · 4 guides (multi-turn, system instructions, function calling, streaming) · `POST /chat_generate` reference · Tokens concept |
| `capabilities/realtime.mdx` (620) | marketing, endpoint+auth, audio concept, 230-line tutorial, protocol reference, demo, 160-line HTML, roadmap | Overview · browser quickstart · Python guide · WS reference · Audio formats concept · Playground · (roadmap → Changelog) |
| `capabilities/speech-to-text/index.mdx` (455) | demo, Scribe API, SDK quickstart, captions guide, billing concept, **second product** (`/v2/stt`) guide + reference | Overview (Scribe vs legacy) · Transcribe a file · Stream progress · Captions · Scribe reference · Legacy STT page |
| `capabilities/multimodal.mdx` (454) | 4 how-tos, inline schema, form-data reference, response reference, limits | 4 short guides · merged into the single chat reference |
| `capabilities/text-to-speech/index.mdx` (323) | catalog/demo, 6 how-tos, reference fragments, errors, best practices, migration | Choose a voice · Estimate cost · Generate a clip · Manage clips · Voice/Speech reference · Migration guide |
| `capabilities/text-to-speech/streaming.mdx` (284) | demo, SDK how-to, raw protocol (hidden in `<details>`), reference, billing, limits | Stream speech (SDK) · Stream without SDK · Speech-sessions reference |
| `capabilities/translation.mdx` (221) | marketing cards, quickstart, mapping table, reference, best practices | Translate text guide · `POST /translate` reference |
| `get-started/quickstart.mdx` (394) | playground tour, key creation, endpoint reference, 4-capability catalogue, responses, TTS | 4-step tutorial · Playground guide · reference moves to API tab |
| `capabilities/streaming.mdx` (48) | decision page | **Keep as is.** This is the model to copy. Move it to Concepts |

---

## 7. Direction (options, not problems)

1. **Generate the API reference from OpenAPI.** `fumadocs-openapi` fits the stack, and `source.config.ts:31-34` already reserves a `method` frontmatter field "for API routes only". Its built-in playground could replace the bespoke demos. Effort: L, and it depends on whether a spec exists. *Spike first.*
2. **"Ask AI" powered by Addis AI's own model, answering in Amharic and Afaan Oromo.** Competitors can't copy this, and it dogfoods the RAG features the docs describe. Effort: M–L. It depends on clean content (plan 001) and server-side key handling.
3. **A structured changelog** (date, products, SDK versions, breaking change?) with RSS. It can drive the "New" badges, so they expire automatically. The `blog` collection in `source.config.ts:47-54` is already half of this.
4. **A live status page.** Point `status.addisassistant.com` at a hosted status provider rather than a static MDX page.

---

## 8. Considered and rejected

- **Shiki `langs` omits python/bash/json.** `lazy: true` loads bundled languages on demand. This is not a bug (verify once in a build).
- **Primary colour contrast.** `#245efe` on white is about 5.1:1 and `#27cdfe` on near-black about 10:1. Both pass.
- **Reduced motion.** All animated diagrams honour `prefers-reduced-motion`.
- **Double-suffixed `<title>`s.** None; the layout template adds the suffix once.
- **Lucide icons used without imports.** They work because of the spread in `mdx-components.tsx`. That spread is still a hazard (F46), but it is not a bug today.
- **`x-api-key` vs `X-API-Key`.** HTTP header names are case-insensitive, so this is cosmetic only (folded into F30).

## 9. What was not audited

- **Rendered pages in a browser** (desktop, mobile, dark mode). `node_modules` is not installed, the skill is read-only, and `AGENTS.md` forbids installing browser tooling. Visual QA must happen in a preview deploy.
- **`pnpm build`, `lint`, `typecheck`.** Not run, for the same reason. `node --test` ran: **29/31 pass**. The 2 failures are `ERR_MODULE_NOT_FOUND: typescript` (no deps installed), not content.
- **The live API and SDK source.** Which of two contradictory shapes is correct (D4, D7) was not verified.
- **ElevenLabs and Vercel rendered UI.** Blocked by the egress proxy; their findings are structural (from indexed content).
- **Code correctness of the demo components** beyond their auth and key handling.
