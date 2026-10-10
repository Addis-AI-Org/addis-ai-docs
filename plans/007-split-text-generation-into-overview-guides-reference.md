# Plan 007: Text Generation becomes a short overview + four task guides + one API reference page (pilot for every capability)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff eaf808b..HEAD -- content/docs/capabilities/text-generation.mdx`
> The only expected change is plan 002's `\\` → `\` fix on 9 cURL lines. Any
> other change to that file is a STOP condition. Locate sections by **heading
> text**, never by line number.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED. A URL and anchors change, so inbound links and redirects must be updated in the same change.
- **Depends on**:
  - `plans/004-turn-preservation-tests-into-invariants.md`
  - `plans/006-restructure-sidebar-navigation.md`
  - Plan 001 is recommended (it owns the `api-reference` redirects).
- **Category**: docs (information architecture)
- **Planned at**: commit `eaf808b`, 2026-10-10

## Why this matters

`content/docs/capabilities/text-generation.mdx` (576 lines) does seven jobs on one page: overview, quickstart, four how-to recipes, full API reference, a token concept, and best-practice cards. Readers who want one parameter scroll past 300 lines of tutorial, and readers learning function calling hit reference tables mid-flow.

Every benchmark separates these jobs. ElevenLabs keeps capability overviews apart from one-page-per-endpoint API reference. The AI SDK keeps guides apart from `reference/`.

Text Generation is the pilot because it is the most-used capability and the cleanest to split. The same recipe then applies to Speech-to-Text, Text-to-Speech, Multimodal, Translation and Realtime (split map in `plans/REVIEW.md` §6).

The split also fixes two links that are broken today. `content/docs/announcements.mdx:83-84` link to `#system-instructions-and-personas` and `#function-calling`, but the real headings are numbered ("### 3. System Instructions and Personas …"), so their slugs start with `3-` and `4-` and the anchors never match.

## Current state

The repo already uses the target pattern for Text-to-Speech:
- `content/docs/capabilities/text-to-speech/index.mdx` is the overview.
- `content/docs/capabilities/text-to-speech/streaming.mdx` is a child page.
- `content/docs/capabilities/text-to-speech/meta.json` is:
  ```json
  { "title": "Text-to-Speech", "icon": "AudioLines", "defaultOpen": true, "pages": ["streaming"] }
  ```

Mirror it exactly.

Sections of `content/docs/capabilities/text-generation.mdx`, in order. Line numbers are as of `eaf808b`, for orientation only:

| Heading (exact text) | Lines | Destination |
|---|---|---|
| frontmatter + imports + intro paragraphs | 1-17 | `text-generation/index.mdx` |
| `## Usage Guide` + its one sentence | 15-17 | drop the heading, keep the sentence in index |
| `### 1. Basic Request` … `</Tabs>` | 19-72 | index, as `## Basic request` |
| `### 2. Multi-Turn Chat (Context)` … `</Tabs>` | 74-121 | `text-generation/multi-turn.mdx` |
| `---` | 123 | drop |
| `### 3. System Instructions and Personas <NewBadge className="ml-2 align-middle" />` … `</Tabs>` | 125-163 | `text-generation/system-instructions.mdx` |
| `### 4. Function Calling <NewBadge className="ml-2 align-middle" />` … closing `</Callout>` ("Treat tool calls as untrusted input") | 165-358 | `text-generation/function-calling.mdx` |
| `### 5. Streaming and Attachments` … `</Tabs>` | 360-388 | `text-generation/streaming.mdx` |
| `## API Reference` … `</Callout>` ("Token Counting") | 392-498 | `content/docs/api-reference/chat-generate.mdx` |
| `## Best Practices` … end of file | 503-576 | index (unchanged) |

Imports at the top of the current file:
```mdx
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Callout } from 'fumadocs-ui/components/callout';
import { NewBadge } from '@/components/docs';
```
Lucide icons used in Best Practices (e.g. `<Thermometer …/>`) are available globally through `mdx-components.tsx`, so no import is needed.

Inbound links that must change in the same commit:
- `content/docs/capabilities/streaming.mdx:15`: `(/docs/capabilities/text-generation#5-streaming-and-attachments)`
- `content/docs/integration/streaming-voice-agent.mdx:10`: same anchor
- `content/docs/announcements.mdx:83`: `(/docs/capabilities/text-generation#system-instructions-and-personas)`
- `content/docs/announcements.mdx:84`: `(/docs/capabilities/text-generation#function-calling)`
- `next.config.mjs`: plan 001 may have added `source: '/docs/api-reference/chat-endpoint'` and `source: '/docs/api-reference/schemas'` with destination `/docs/capabilities/text-generation`.

Tests that read this file by path (`tests/documentation-preservation.test.mjs`; find them by the strings shown):
- `['content/docs/capabilities/text-generation.mdx', ['## API Reference', '## Best Practices']]` in `preserves capability depth and best-practice guidance`
- `const textGeneration = read('content/docs/capabilities/text-generation.mdx');` in `applies the second-round Introduction…` and in `corrects capability page descriptions…`
- `'content/docs/capabilities/text-generation.mdx',` in the path lists of `keeps SDK examples primary…` and `keeps raw endpoint panels only…`
- `const text = read('content/docs/capabilities/text-generation.mdx');` in `keeps SDK examples primary…` (asserts `addis.chat.runTools`, `addis.chat.run_tools`, `tool_call_id`, `Tool calling is currently non-streaming`)

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Tests | `node --test tests/documentation-preservation.test.mjs tests/docs-invariants.test.mjs` | `# fail 0` |
| Build | `pnpm install && pnpm build` | exit 0 |
| Content conservation | see Step 7 | every code block preserved |

## Scope

**In scope**:
- `content/docs/capabilities/text-generation.mdx` → moved to `content/docs/capabilities/text-generation/index.mdx` (with `git mv`)
- create `content/docs/capabilities/text-generation/{meta.json,multi-turn.mdx,system-instructions.mdx,function-calling.mdx,streaming.mdx}`
- create `content/docs/api-reference/meta.json` and `content/docs/api-reference/chat-generate.mdx`
- `content/docs/meta.json` (add the API reference group)
- `content/docs/capabilities/streaming.mdx`, `content/docs/integration/streaming-voice-agent.mdx`, `content/docs/announcements.mdx` (the 4 links only)
- `next.config.mjs` (redirect destinations only)
- `tests/documentation-preservation.test.mjs` (path updates as described)

**Out of scope**:
- Rewording any moved prose or code. Allowed edits: heading text and level, removing the `<NewBadge …/>` from headings, and adding client-setup lines (Step 4).
- Reconciling the chat response envelope with `multimodal.mdx`. That needs decision D4 first; record it as a follow-up.
- Splitting any other capability page.
- `lib/source.ts` `newDocUrls`.

## Git workflow

- Branch: `advisor/007-split-text-generation`. Base it on the branch of the previous plan in `plans/README.md` order (stacked branches), or on `main` once that plan has merged. Plans 001-003 each append a test to the same file, so unstacked branches conflict.
- One commit: `Split Text Generation into overview, guides, and API reference`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Turn the page into a folder

```bash
mkdir -p content/docs/capabilities/text-generation
git mv content/docs/capabilities/text-generation.mdx content/docs/capabilities/text-generation/index.mdx
```

Create `content/docs/capabilities/text-generation/meta.json`:
```json
{ "title": "Text Generation", "icon": "MessageSquareText", "defaultOpen": true, "pages": ["multi-turn", "system-instructions", "function-calling", "streaming"] }
```

The URL `/docs/capabilities/text-generation` keeps working, because `index.mdx` serves the folder URL, as it does for text-to-speech.

**Verify**: `test -f content/docs/capabilities/text-generation/index.mdx && test ! -f content/docs/capabilities/text-generation.mdx` → exit 0.

### Step 2: Create the four guide pages (cut from index)

For each row below, **cut** the section from `index.mdx`, from its heading up to, but not including, the next line that is exactly `---` or matches `^### [0-9]` (a numbered section heading; `#### Let the SDK run the tool loop` does **not** end a section) and paste it into the new file under the given frontmatter. Then apply these changes:
- Delete the section's original heading line. The page title replaces it.
- Promote `####` sub-headings to `##` (function calling only: "Let the SDK run the tool loop", "Or orchestrate each round yourself").
- Add only the imports the moved content uses, chosen from the four import lines in "Current state". `NewBadge` is no longer needed.

| File | Frontmatter |
|---|---|
| `multi-turn.mdx` | `title: Multi-turn chat`<br>`description: Keep conversation context by sending prior turns with every request.` |
| `system-instructions.mdx` | `title: System instructions and personas`<br>`description: Set the assistant's identity and behavior with persona and system fields.`<br>`isNew: true` |
| `function-calling.mdx` | `title: Function calling`<br>`description: Let the model request actions your application runs, safely.`<br>`isNew: true` |
| `streaming.mdx` | `title: Stream chat responses`<br>`description: Show a chat reply as it is generated.` |

`isNew: true` keeps the "New" signal that the removed heading badges carried. The frontmatter field is defined in `source.config.ts` and rendered next to the page title by `app/docs/[[...slug]]/page.tsx`.

**Verify**: `ls content/docs/capabilities/text-generation/` → `function-calling.mdx index.mdx meta.json multi-turn.mdx streaming.mdx system-instructions.mdx`. `grep -c "^### [2-5]\." content/docs/capabilities/text-generation/index.mdx` → `0`.

### Step 3: Create the API reference page (cut from index)

Create `content/docs/api-reference/meta.json`:
```json
{ "title": "API reference", "icon": "Braces", "pages": ["chat-generate"] }
```

Create `content/docs/api-reference/chat-generate.mdx`:
```mdx
---
title: POST /api/v1/chat_generate
description: Request parameters, generation config, and response schema for chat and text generation.
---

import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Callout } from 'fumadocs-ui/components/callout';
```
Then cut everything from `## API Reference` up to and including the `</Callout>` of "Token Counting" out of `index.mdx` and paste it here. Delete the `## API Reference` heading line, and rename the remaining headings:
- `### Request Parameters` → `## Request parameters`
- `### Generation Config` → `## Generation config`
- `### Response Schema` → `## Response`

Add this as the first body line, before `## Request parameters`:
```mdx
Use this endpoint for chat, summarization, extraction, RAG, structured output, and function calling. The SDKs wrap it as `addis.chat.completions.create`; see the [Text Generation guides](/docs/capabilities/text-generation).
```

In `content/docs/meta.json`, insert these two lines immediately before `"--- Platform ---"`. The `...` prefix places the folder's pages directly under the separator (fumadocs-core `resolveFolderItem`), so the label doesn't appear twice:
```json
    "--- API reference ---",
    "...api-reference",
```

**Verify**: `grep -c "^## " content/docs/api-reference/chat-generate.mdx` → `3`. `grep -c "## API Reference" content/docs/capabilities/text-generation/index.mdx` → `0`.

### Step 4: Shape the overview and make guides self-contained

In `index.mdx`:
1. Change `### 1. Basic Request` to `## Basic request`.
2. Delete the `## Usage Guide` heading line. Keep the sentence under it.
3. Delete all three remaining standalone `---` lines (originally lines 123, 390 and 500). Remove the `NewBadge`, `TypeTable` and `Callout` imports; index no longer uses them (verify: `grep -c "<Callout\|<TypeTable" content/docs/capabilities/text-generation/index.mdx` → `0`).
4. Insert this block directly before `## Best Practices`:

```mdx
## Guides

<Cards>
  <Card href="/docs/capabilities/text-generation/multi-turn" title="Multi-turn chat">Keep context across turns.</Card>
  <Card href="/docs/capabilities/text-generation/system-instructions" title="System instructions and personas">Control identity and behavior.</Card>
  <Card href="/docs/capabilities/text-generation/function-calling" title="Function calling">Let the model request your actions.</Card>
  <Card href="/docs/capabilities/text-generation/streaming" title="Stream chat responses">Show replies as they are written.</Card>
</Cards>

## API reference

Every request field, generation setting, and response field is documented in [POST /api/v1/chat_generate](/docs/api-reference/chat-generate).
```

In each guide page, the first Node.js snippet and the first Python snippet currently use `addis` without creating it. Prepend the client setup to those two snippets only (cURL snippets are already self-contained):
- Node.js: `import AddisAI from "addisai";` + blank line + `const addis = new AddisAI();` + blank line
- Python: `from addisai import AddisAI` + blank line + `addis = AddisAI()` + blank line

Skip a snippet that already contains `new AddisAI(` / `AddisAI()`.

**Verify**: `for f in multi-turn system-instructions function-calling streaming; do grep -c "new AddisAI()" content/docs/capabilities/text-generation/$f.mdx; done` → each at least `1`. `wc -l < content/docs/capabilities/text-generation/index.mdx` → under `200`.

### Step 5: Fix inbound links and redirects

- `content/docs/capabilities/streaming.mdx:15` and `content/docs/integration/streaming-voice-agent.mdx:10`: `/docs/capabilities/text-generation#5-streaming-and-attachments` → `/docs/capabilities/text-generation/streaming`
- `content/docs/announcements.mdx:83`: `/docs/capabilities/text-generation#system-instructions-and-personas` → `/docs/capabilities/text-generation/system-instructions`
- `content/docs/announcements.mdx:84`: `/docs/capabilities/text-generation#function-calling` → `/docs/capabilities/text-generation/function-calling`
- `next.config.mjs`: if a redirect has `source: '/docs/api-reference/chat-endpoint'` or `source: '/docs/api-reference/schemas'`, set its `destination` to `'/docs/api-reference/chat-generate'`.

**Verify**: `grep -rn "text-generation#" content` → no output.

### Step 6: Update test paths (facts stay locked, just at their new homes)

In `tests/documentation-preservation.test.mjs`, add this helper right after the `read` helper near the top of the file:

```js
const textGenerationDocs = () =>
  [
    'content/docs/capabilities/text-generation/index.mdx',
    'content/docs/capabilities/text-generation/multi-turn.mdx',
    'content/docs/capabilities/text-generation/system-instructions.mdx',
    'content/docs/capabilities/text-generation/function-calling.mdx',
    'content/docs/capabilities/text-generation/streaming.mdx',
    'content/docs/api-reference/chat-generate.mdx',
  ].map(read).join('\n');
```

Then:
- Replace every `read('content/docs/capabilities/text-generation.mdx')` with `textGenerationDocs()`. There are 3 occurrences: the `textGeneration` constants and `const text`.
- In the two path lists (`keeps SDK examples primary…` and `keeps raw endpoint panels only…`), change `'content/docs/capabilities/text-generation.mdx'` to `'content/docs/capabilities/text-generation/index.mdx'`.
- In `preserves capability depth…`, change the entry to `['content/docs/capabilities/text-generation/index.mdx', ['## API reference', '## Best Practices']]`.

**Verify**: `grep -c "capabilities/text-generation.mdx" tests/documentation-preservation.test.mjs` → `0`. `node --test tests/documentation-preservation.test.mjs tests/docs-invariants.test.mjs` → `# fail 0`.

### Step 7: Prove nothing was lost

Every fenced code block from the original page must exist in exactly one new file. Run:

```bash
git show eaf808b:content/docs/capabilities/text-generation.mdx | grep -c '^\s*```' 
cat content/docs/capabilities/text-generation/*.mdx content/docs/api-reference/chat-generate.mdx | grep -c '^\s*```'
```

**Verify**: the two numbers are equal. Also run `git show eaf808b:content/docs/capabilities/text-generation.mdx | grep -c "TypeTable"` and the same grep over the new files; those numbers must be equal too.

### Step 8: Build

**Verify**: `pnpm install && pnpm build` → exit 0. If `Braces` is not a valid lucide icon in the installed version, use `Code` and note it in the report.

## Test plan

- Existing assertions keep every Text Generation fact locked: the `persona`/`system` TypeTable, `runTools`/`run_tools`, `tool_call_id`, the non-streaming warning, the description and the token sentence. They now read across the split files.
- `docs-invariants` (plan 004) checks that all 6 new pages have descriptions and that every new link resolves. That includes the announcement links, which were broken before this change.
- Step 7 is the conservation check.

## Done criteria

- [ ] `node --test tests/documentation-preservation.test.mjs tests/docs-invariants.test.mjs` → `# fail 0`
- [ ] `wc -l < content/docs/capabilities/text-generation/index.mdx` → under `200`
- [ ] Step 7 counts match
- [ ] `grep -rn "text-generation#" content` → no output
- [ ] `pnpm build` exits 0 (or the report says deps could not be installed)
- [ ] `plans/README.md` status row for 007 updated

## STOP conditions

- `text-generation.mdx` changed beyond plan 002's backslash fix.
- A section boundary doesn't match the heading table (e.g. a new section was added between them).
- Step 7 counts differ. Find the missing block before continuing; never re-create code from memory.
- `docs-invariants` reports a broken link you didn't introduce. Report it; don't fix unrelated pages.

## Maintenance notes

- **Recipe for the next capabilities** (one plan each, in this order): Speech-to-Text (also move `/api/v2/stt` to a Legacy page; needs D11), Multimodal (merge its form-data reference into `api-reference/chat-generate.mdx`; needs D4), Text-to-Speech, Translation, Realtime (move the 160-line standalone HTML to a GitHub examples repo and the roadmap to the changelog). The per-page split map is in `plans/REVIEW.md` §6.
- Once D4 is answered, `api-reference/chat-generate.mdx` must carry the one true response envelope and the `finish_reason` enum. `multimodal.mdx` currently shows a different envelope.
- When the API reference grows past a few pages, make `content/docs/api-reference` a Fumadocs root folder (`"root": true` in its `meta.json`) for a "Docs | API reference" sidebar tab switcher.
