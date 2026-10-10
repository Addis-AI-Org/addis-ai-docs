# Plan 006: The sidebar reads as one clear path, with no duplicate labels, orphans or emoji

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat eaf808b..HEAD -- content/docs/meta.json content/docs/capabilities/streaming.mdx content/docs/capabilities/text-to-speech/streaming.mdx content/docs/get-started/introduction.mdx lib/source.ts tests/`
> Plans 001, 004 and 005 are expected to have touched some of these. Compare
> `content/docs/meta.json` against the "Current state" excerpt; any difference
> other than plan 005's two added pages is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: LOW (labels and ordering; no URL changes)
- **Depends on**:
  - `plans/001-remove-placeholder-and-dead-pages.md` (orphan test exists)
  - `plans/004-turn-preservation-tests-into-invariants.md` (Introduction copy locks removed)
  - Plan 005 is optional: if it ran, include its two pages as shown.
  - **Precondition:** decision **D9** (heading case) in `plans/README.md` is `APPROVED`. This plan assumes **sentence case**. If D9 chose Title Case, keep separator labels in Title Case and skip the case changes; everything else still applies.
- **Category**: docs (information architecture)
- **Planned at**: commit `eaf808b`, 2026-10-10

## Why this matters

The sidebar is the first thing a developer reads. Today it has these problems:
- It opens with **Announcements**, a release feed, above "Get Started". That also makes Announcements the "Previous" link on the Introduction page.
- Two items titled **"Streaming"** with the same icon sit one row apart: the streaming chooser, and the TTS streaming child page.
- Two items titled **"Speech-to-Text"**: the capability and its playground.
- **Playgrounds** sits between Capabilities and Integration.
- **Integration** mixes platform guides (web, mobile, server) with voice-agent use cases.
- **Rate Limits** is not in the sidebar at all; it is reachable only from one Introduction link.
- The Introduction's "documentation roadmap" uses emoji headings (🚀 ⚡ 🧩 ⚙️), which none of the benchmark sites (ElevenLabs, Vercel, Better Auth) use.

This plan fixes all of that without changing any URL.

## Current state

`content/docs/meta.json` at `eaf808b`:
```json
{
  "title": "Addis AI Documentation | APIs & SDKs for African Languages",
  "root": true,
  "pages": [
    "announcements",
    "--- Get Started ---",
    "get-started/introduction",
    "get-started/quickstart",
    "get-started/sdks",

    "--- Capabilities ---",
    "capabilities/text-generation",
    "capabilities/text-to-speech",
    "capabilities/speech-to-text",
    "capabilities/streaming",
    "capabilities/multimodal",
    "capabilities/realtime",
    "capabilities/translation",
    "--- Playgrounds ---",
    "[Speech-to-Text](/docs/playground/speech-to-text)",
    "[Text-to-Speech Streaming](/docs/playground/text-to-speech)",
    

    "--- Integration ---",
    "integration/web",
    "integration/mobile",
    "integration/server",
    "integration/voice-interface",
    "integration/streaming-voice-agent",

    "--- Platform ---",
    "platform/pricing",
    "platform/errors",
    "platform/status",
    "platform/faq"
  ]
}
```
Plan 005, if it ran, adds `"get-started/playground"` and `"get-started/api-overview"` after `"get-started/quickstart"`.

Page titles (frontmatter):
- `content/docs/capabilities/streaming.mdx:2`: `title: Streaming` (icon `Radio`). This page is the chooser between all streaming APIs.
- `content/docs/capabilities/text-to-speech/streaming.mdx:2`: `title: Streaming` (icon `Radio`). This page covers TTS streaming.
- `content/docs/integration/voice-interface.mdx:2`: `title: Voice Interface (VUI)`

`lib/source.ts:19-24` renders Announcements in bold:
```ts
      if (node.url === '/docs/announcements') {
        return {
          ...node,
          name: createElement('strong', null, node.name),
        };
      }
```

Introduction emoji headings (`content/docs/get-started/introduction.mdx`):
- line 103: `### 🚀 Get Started`
- line 107: `### ⚡ Capabilities`
- line 116: `### 🧩 Integration`
- line 123: `### ⚙️ Platform`

These are the only emoji headings in `content/docs` (verified with a `\p{Extended_Pictographic}` scan).

Tests that constrain this plan (`tests/documentation-preservation.test.mjs`):
- `keeps the original documentation tree…` requires 14 listed routes plus `announcements`, `get-started/sdks` and `platform/pricing` to be present, and requires `"platform/errors",\s*"platform/status",\s*"platform/faq"` to stay **adjacent and in that order**.
- `keeps streaming wayfinding…` requires the literal `--- Playgrounds ---` in meta.json.
- `adds a streaming overview page…` requires `"capabilities/streaming"` in meta.json.
- `publishes the streaming voice agent guide…` requires `"integration/streaming-voice-agent"`.
- Plan 001's `publishes no placeholder, template, or orphaned documentation pages` allow-lists `platform/limits` as hidden. Once limits is in the nav, that entry becomes redundant but harmless.
- Plan 004 already removed the emoji-heading assertions.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| JSON valid | `node -e "JSON.parse(require('fs').readFileSync('content/docs/meta.json','utf8'))"` | no output |
| Tests | `node --test tests/documentation-preservation.test.mjs tests/docs-invariants.test.mjs` | `# fail 0` |
| Build | `pnpm install && pnpm build` | exit 0 |

## Scope

**In scope**:
- `content/docs/meta.json`
- `content/docs/capabilities/streaming.mdx` (frontmatter `title` only)
- `content/docs/capabilities/text-to-speech/streaming.mdx` (frontmatter `title` only)
- `content/docs/integration/voice-interface.mdx` (frontmatter `title` only)
- `content/docs/get-started/introduction.mdx` (the 4 emoji headings only)
- `lib/source.ts` (remove the Announcements bold branch)
- `tests/docs-invariants.test.mjs` (add one test)

**Out of scope**:
- Renaming "Announcements" to "Changelog" or moving it out of the docs. That is a product call; see the follow-ups.
- The Introduction hero, claims and model names (decisions D6 and D10).
- Any URL or file move, and any redirect.
- The `nav.url` logo target in `lib/layout.shared.tsx` (decision D10).

## Git workflow

- Branch: `advisor/006-sidebar-structure`
- One commit: `Reorganize the docs sidebar and remove duplicate labels`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Rewrite `content/docs/meta.json` `pages`

Keep `"title"` and `"root"` exactly as they are. Set `"pages"` to the list below. Include the `"get-started/playground"` and `"get-started/api-overview"` lines only if plan 005 has created those files; otherwise omit both.

```json
  "pages": [
    "--- Get started ---",
    "get-started/introduction",
    "get-started/quickstart",
    "get-started/playground",
    "get-started/api-overview",
    "get-started/sdks",

    "--- Capabilities ---",
    "capabilities/text-generation",
    "capabilities/text-to-speech",
    "capabilities/speech-to-text",
    "capabilities/translation",
    "capabilities/multimodal",
    "capabilities/realtime",
    "capabilities/streaming",

    "--- Voice agents ---",
    "integration/voice-interface",
    "integration/streaming-voice-agent",

    "--- Integrate ---",
    "integration/web",
    "integration/mobile",
    "integration/server",

    "--- Playgrounds ---",
    "[Speech-to-text playground](/docs/playground/speech-to-text)",
    "[Text-to-speech playground](/docs/playground/text-to-speech)",

    "--- Platform ---",
    "platform/pricing",
    "platform/limits",
    "platform/errors",
    "platform/status",
    "platform/faq",
    "announcements"
  ]
```

What changed and why:
- Announcements moves to the end, so the first item is Introduction.
- The streaming chooser moves to the end of Capabilities.
- Voice-agent guides get their own group, separate from platform integrations.
- Playgrounds move below the guides, with labels that can't be confused with the capability pages.
- Rate limits joins Platform. It goes *before* errors, so `errors, status, faq` stay adjacent as the test requires.

**Verify**: the JSON-valid command → no output. `node --test tests/documentation-preservation.test.mjs` → `# fail 0`.

### Step 2: Remove the duplicate and jargon titles

- `content/docs/capabilities/streaming.mdx`: `title: Streaming` → `title: Choosing a streaming API`
- `content/docs/capabilities/text-to-speech/streaming.mdx`: `title: Streaming` → `title: Streaming speech`
- `content/docs/integration/voice-interface.mdx`: `title: Voice Interface (VUI)` → `title: Voice pipeline (STT → LLM → TTS)`

Change only the `title:` lines. Descriptions and bodies stay as they are.

**Verify**: `grep -rn "^title: Streaming$" content/docs | wc -l` → `0`. `node --test tests/documentation-preservation.test.mjs` → `# fail 0`.

### Step 3: Remove the emoji from the Introduction roadmap headings

In `content/docs/get-started/introduction.mdx`:
- `### 🚀 Get Started` → `### Get started`
- `### ⚡ Capabilities` → `### Capabilities`
- `### 🧩 Integration` → `### Integrate`
- `### ⚙️ Platform` → `### Platform`

**Verify**: the scan in Step 5 passes.

### Step 4: Stop bolding Announcements in the sidebar

In `lib/source.ts`, delete the whole `if (node.url === '/docs/announcements') { … }` block (lines 19-24, 6 lines). Keep the rest of `file(node)` unchanged.

**Verify**: `grep -c "announcements" lib/source.ts` → `0`. `pnpm typecheck` → exit 0, if dependencies are installed.

### Step 5: Lock the new invariants

Append to `tests/docs-invariants.test.mjs` (created by plan 004; `read`, `walk` and `pages` are already defined there):

```js
test('sidebar starts with Get started and has no duplicate labels or emoji headings', () => {
  const meta = JSON.parse(read('content/docs/meta.json'));
  const firstEntry = meta.pages.find((entry) => entry.trim() !== '');
  assert.match(firstEntry, /^--- Get started ---$/i, 'The sidebar must open with the Get started group');
  assert.ok(meta.pages.includes('platform/limits'), 'Rate limits must be reachable from the sidebar');

  const titles = pages.map((path) => read(path).match(/^title: (.+)$/m)?.[1]).filter(Boolean);
  const linkLabels = meta.pages.map((entry) => entry.match(/^\[([^\]]+)\]/)?.[1]).filter(Boolean);
  const labels = [...titles, ...linkLabels].map((label) => label.toLowerCase());
  const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
  assert.deepEqual(duplicates, [], `Duplicate sidebar labels: ${duplicates.join(', ')}`);

  for (const path of pages) {
    read(path).split('\n').forEach((line, index) => {
      if (/^#{1,6} /.test(line)) {
        assert.doesNotMatch(line, /\p{Extended_Pictographic}/u, `${path}:${index + 1} has an emoji in a heading`);
      }
    });
  }
});
```

The duplicate check covers every page title, including hidden ones such as Legacy Text-to-Speech. If it reports a duplicate that isn't in the sidebar, STOP and report it rather than renaming pages outside scope.

**Verify**: `node --test tests/docs-invariants.test.mjs` → `# fail 0`. Negative check: temporarily set `capabilities/streaming.mdx` back to `title: Streaming speech`, expect `Duplicate sidebar labels: streaming speech`, then revert.

### Step 6: Build and hand off visual QA

**Verify**: `pnpm install && pnpm build` → exit 0. In the report, ask the reviewer to open the PR preview and confirm:
1. The sidebar order matches Step 1.
2. Introduction's "Previous" footer link is gone, because it is now the first page.
3. The "New" badges from `lib/source.ts` still render on their 6 items.

## Test plan

- New test: `sidebar starts with Get started and has no duplicate labels or emoji headings`.
- Existing nav-membership, adjacency, Playgrounds and streaming tests must still pass unchanged.

## Done criteria

- [ ] `node --test tests/documentation-preservation.test.mjs tests/docs-invariants.test.mjs` → `# fail 0`
- [ ] `grep -c '"announcements"' content/docs/meta.json` → `1`, and it is the last entry of `pages`
- [ ] `grep -c '"platform/limits"' content/docs/meta.json` → `1`
- [ ] `grep -rn "^title: Streaming$" content/docs` → no output
- [ ] `pnpm build` exits 0 (or the report says deps could not be installed)
- [ ] `plans/README.md` status row for 006 updated

## STOP conditions

- D9 is not `APPROVED`.
- `meta.json` contains entries not listed in "Current state" (beyond plan 005's two). Someone added pages; report them instead of dropping them.
- The adjacency test for `errors, status, faq` fails.
- The duplicate-label check fails on a page outside this plan's scope.

## Maintenance notes

- Fumadocs supports sidebar tabs through `"root": true` sub-folders. When the API Reference section is built (plan 007 and its successors), it becomes a second root folder, giving a "Docs | API Reference" tab switcher like ElevenLabs.
- Follow-ups, owner decisions not made here:
  - Rename Announcements to "Changelog" and move it to a header link, as Vercel and Better Auth do.
  - Point the logo at `/docs` (D10).
  - Replace the Introduction's hand-maintained roadmap list with cards that mirror these sidebar groups.
- The duplicate-label test will catch the next "Streaming"/"Streaming" collision automatically.
