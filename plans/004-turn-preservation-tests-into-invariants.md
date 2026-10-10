# Plan 004: Tests guard structural invariants instead of freezing decoration and marketing copy

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat eaf808b..HEAD -- tests/ content/docs/get-started/introduction.mdx`
> Plans 001–003 may already have appended tests to `tests/documentation-preservation.test.mjs`,
> removed one list entry, and unbolded links in `introduction.mdx` (plan 003). That is expected. Any *other* change to the
> assertions quoted below is drift: compare them against the live file, and
> on a mismatch treat it as a STOP condition.

## Status

- **Priority**: P1. This unblocks plans 005, 006 and 007.
- **Effort**: M
- **Risk**: MED. It removes guard rails the team deliberately added, so it needs owner sign-off.
- **Depends on**: none technically. **Precondition:** decision **D8** in `plans/README.md` reads `APPROVED`.
- **Category**: tests / dx
- **Planned at**: commit `eaf808b`, 2026-10-10

## Why this matters

`tests/documentation-preservation.test.mjs` (672 lines, ~241 assertions) was written to stop regressions to approved copy. It also pins things that should be free to change:

- emoji headings
- the marketing number "Join 1,500+ developers"
- Tailwind class strings and SVG `viewBox`es
- the exact number of announcements (adding an 8th fails the build)
- badges inside headings
- the requirement that 17 pages contain the CSS class `addis-panel`
- absolute `https://docs.addisassistant.com` self-links, which send preview deployments to production

25 of the repo's 62 commits edit this file. Any docs-structure improvement fails CI until someone hand-edits regexes, and that is why the docs stopped improving structurally.

This plan does two things:
1. Remove only the assertions that pin **decoration, CSS internals or marketing copy**.
2. Add `tests/docs-invariants.test.mjs`, which asserts what actually matters on every page: titles and descriptions exist, every internal link resolves (including JSX `href`s and pages outside the sidebar), and no self-link points at the production host.

Page-specific content locks (e.g. Quick Start table rows) stay for now. Each later plan that rewrites a page replaces that page's locks itself.

## Current state

- Test runner: `node --test tests/*.test.mjs` (`package.json` `"test"` script). Style: `node:test` + `node:assert/strict`. Helpers at the top of `tests/documentation-preservation.test.mjs`:
  ```js
  const root = resolve(import.meta.dirname, '..');
  const read = (path) => readFileSync(join(root, path), 'utf8');
  function walk(path) { … returns absolute paths … }
  ```
- `content/docs/get-started/introduction.mdx` has **no `description`** in its frontmatter (lines 1-4: `title: Introduction` / `icon: House`). It has 8 absolute self-links:
  - line 14: `href="https://docs.addisassistant.com/docs/capabilities/text-to-speech"`
  - lines 104, 109-114: `](https://docs.addisassistant.com/docs/...)`
- The approved site description (`lib/metadata.ts`, and asserted by the test at line 83-86) is: `Build with Addis AI APIs and official Node.js and Python SDKs for text generation, speech-to-text, Addis Voices 2, translation, multimodal reasoning, and realtime voice in Amharic and Afaan Oromo.` Reuse it verbatim. Do not write new copy.
- The existing link checker (`test('resolves local documentation links and image assets', …)`, starting at line 587) checks only sidebar pages plus three named hidden pages, and only Markdown-syntax links. It misses JSX `href="/docs/…"` (25 occurrences in content; 20 once plan 001 deletes `index.mdx`) and absolute self-links.

### Assertions to delete (identify by text, not line number; numbers are as of `eaf808b`)

| Test name | Assertion(s) to delete | Why |
|---|---|---|
| `uses Addis AI documentation metadata for page titles and link previews` | `assert.match(meta, /Addis AI Documentation \| APIs & SDKs for African Languages/);` (line 91) | Pins an SEO string into the sidebar root title. The same string is still asserted in `lib/metadata.ts` (line 82) |
| `shows responsive social links beside the sidebar theme switcher` | the three lines asserting `fill="none"`, `stroke="currentColor"`, `viewBox="4\.5 2\.5 15 15"` (lines 112-114) | SVG internals |
| `preserves original onboarding screenshots and page structures` | `assert.match(introduction, /addis-offset-shell/);` (line 147) | CSS class |
| `documents Voice 2 while retaining the full hidden legacy workflow` | asserts on `INITIAL_VISIBLE_VOICES = 6`, `voices\.slice\(0, INITIAL_VISIBLE_VOICES\)`, `addis-offset-shell`, `grid border-l border-fd-border` (lines 203, 204, 207, 208) | Implementation details. **Keep** the 28-voice count, `am-loza`, `aria-expanded`, `Show fewer voices` and the `bg-gradient` ban |
| `applies the second-round Introduction and chat-control refinements` | every `assert.match(introduction, …)` *positive* assertion (lines 220-241, 22 lines), plus `/System Instructions and Personas <NewBadge/` and `/Function Calling <NewBadge/` (lines 248-249) | Exact marketing sentences, emoji headings, absolute URLs, a growth number, badges in headings. **Keep** the four `assert.doesNotMatch(introduction, …)` lines (216-219) and the text-generation `persona`/`system`/safeguards assertions (243-247, 250) |
| `renders announcements as a release feed with in-card cyan New labels` | `/<AnnouncementHero date="2026-10-08">/`, the `<AnnouncementItem` count `7`, and the `isNew` count `3` (lines 448-450) | Adding a release would fail CI |
| `uses the shared cyan New badge for page, section, and announcement titles` | `assert.match(components, /border-fd-primary\/35 bg-fd-primary\/10/);` (line 466) | CSS class |
| `uses one reversible visual system across custom documentation surfaces` | the whole loop `for (const path of [ … ]) { assert.match(read(path), /addis-(?:offset-shell\|panel\|grid)/, … ); }` (lines 480-500; its list started with `'content/docs/index.mdx'`, which plan 001 already removed, so it may now start with `'content/docs/get-started/introduction.mdx'`) | Forces raw CSS-class markup into 17 pages and blocks replacing it with components. **Keep** the utilities loop above it and the `bg-gradient` ban below it |
| `animates the voice pipeline as sequential nodes and connections` | everything **except** `aria-live="polite"` and `prefers-reduced-motion: reduce` (delete lines 513-517 and 520) | Keep the accessibility guarantees; drop class and step internals |
| `uses the same sequential motion system for server-side integration` | everything **except** `aria-live="polite"` and `prefers-reduced-motion: reduce` (delete lines 526-531) | Same |
| `resolves local documentation links and image assets` | **the whole test** (lines 587-623) | Superseded by the broader check in the new file |

Do **not** touch any other test. In particular, these encode product decisions that only their own plans may change:
- the Realtime `apiKey` test (`uses only the production Voice 2 example and API-key realtime auth`, decision D3)
- pricing values
- redirects
- the status page
- Quick Start rows (plan 005)
- nav membership (plan 006)
- capability `## API Reference` headings (plan 007)

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Old suite | `node --test tests/documentation-preservation.test.mjs` | `# fail 0` |
| New suite | `node --test tests/docs-invariants.test.mjs` | `# fail 0` |
| All tests (needs deps) | `pnpm install && pnpm test` | `# fail 0` |

## Scope

**In scope**:
- `tests/documentation-preservation.test.mjs` (delete the assertions in the table above, nothing else)
- `tests/docs-invariants.test.mjs` (create)
- `content/docs/get-started/introduction.mdx` (add `description`; make the 8 self-links relative, nothing else)

**Out of scope**:
- Rewording, de-emoji-ing or restructuring the Introduction. That is plan 006.
- Any other content file.
- `lib/layout.shared.tsx` `nav.url` and its assertion. That is decision D10.

## Git workflow

- Branch: `advisor/004-docs-invariant-tests`. Base it on the branch of the previous plan in `plans/README.md` order (stacked branches), or on `main` once that plan has merged. Plans 001-003 each append a test to the same file, so unstacked branches conflict.
- Two commits, plain imperative style as in `git log`:
  1. `Add documentation invariant tests and relative Introduction links`
  2. `Stop pinning decoration and marketing copy in preservation tests`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm D8

**Verify**: `grep -E '^\| D8 ' plans/README.md` → the row contains `APPROVED`. Otherwise STOP.

### Step 2: Create `tests/docs-invariants.test.mjs`

Create the file with exactly this content:

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function walk(path) {
  const absolute = join(root, path);
  return readdirSync(absolute).flatMap((name) => {
    const child = join(absolute, name);
    if (statSync(child).isDirectory()) return walk(child.slice(root.length + 1));
    return [child.slice(root.length + 1)];
  });
}

const pages = walk('content/docs').filter((path) => path.endsWith('.mdx'));

function frontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

test('every documentation page has a title and a description', () => {
  for (const path of pages) {
    const fields = frontmatter(read(path));
    assert.match(fields, /^title: \S/m, `${path} has no title`);
    assert.match(fields, /^description: \S/m, `${path} has no description`);
  }
});

test('documentation links are relative and resolve to a page, app route, or redirect', () => {
  const redirectSources = new Set(
    [...read('next.config.mjs').matchAll(/source: '([^']+)'/g)].map((match) => match[1]),
  );
  const resolves = (route) =>
    route === '/docs' ||
    existsSync(join(root, 'content', `${route}.mdx`)) ||
    existsSync(join(root, 'content', route, 'index.mdx')) ||
    existsSync(join(root, 'app', route, 'page.tsx')) ||
    redirectSources.has(route);

  const sources = [
    ...pages,
    ...walk('content/docs').filter((path) => path.endsWith('meta.json')),
  ];

  for (const path of sources) {
    const source = read(path);
    assert.doesNotMatch(
      source,
      /https:\/\/docs\.addisassistant\.com\/docs/,
      `${path} links to the production docs host; use a relative /docs/... link`,
    );

    const routes = [
      ...source.matchAll(/\]\((\/docs[^)#\s]*)/g),
      ...source.matchAll(/href=["'](\/docs[^"'#]*)/g),
    ].map((match) => match[1].replace(/\/$/, ''));

    for (const route of routes) {
      assert.ok(resolves(route), `${path} links to missing ${route}`);
    }

    for (const match of source.matchAll(/!\[[^\]]*]\((\/images\/[^)]+)\)/g)) {
      assert.ok(existsSync(join(root, 'public', match[1])), `${path} links to missing image ${match[1]}`);
    }
  }
});
```

**Verify**: `node --test tests/docs-invariants.test.mjs` → **fails**, with exactly these two messages and no others: `content/docs/get-started/introduction.mdx has no description` and `content/docs/get-started/introduction.mdx links to the production docs host`. If plan 001 has *not* run yet, the description test instead reports a stub (e.g. `api-reference/chat-endpoint.mdx has no description`), because a test stops at its first failed assertion. In that case STOP and run plan 001 first.

### Step 3: Fix the Introduction so the invariants pass

1. In `content/docs/get-started/introduction.mdx`, insert this line directly after `title: Introduction` in the frontmatter:
   `description: Build with Addis AI APIs and official Node.js and Python SDKs for text generation, speech-to-text, Addis Voices 2, translation, multimodal reasoning, and realtime voice in Amharic and Afaan Oromo.`
2. Make the self-links relative: `sed -i 's#https://docs\.addisassistant\.com/docs/#/docs/#g' content/docs/get-started/introduction.mdx`

**Verify**: `grep -c "docs.addisassistant.com" content/docs/get-started/introduction.mdx` → `0`. `node --test tests/docs-invariants.test.mjs` → `# fail 0`. `node --test tests/documentation-preservation.test.mjs` → `# fail 1`: the test `applies the second-round Introduction…` fails at its first absolute-URL assertion (line 222; a test stops at its first failed assertion). This is expected and fixed in Step 4.

Commit 1 now.

### Step 4: Delete the decoration/copy assertions

Delete exactly the assertions in the "Assertions to delete" table. Work one test at a time, and after each one run `node --test tests/documentation-preservation.test.mjs` to make sure you didn't break syntax. If a `const` becomes unused after deletion (e.g. `const meta` in the metadata test, `const voiceLoop`), leave it; unused locals are harmless in `.mjs` and the repo lint does not cover `tests/`.

**Verify**: `node --test tests/documentation-preservation.test.mjs` → `# fail 0`. Each of these returns no output:
- `grep -n "Join 1,500" tests/documentation-preservation.test.mjs`
- `grep -n "🚀\|⚡\|🧩\|⚙️" tests/documentation-preservation.test.mjs`
- `grep -n "INITIAL_VISIBLE_VOICES = 6" tests/documentation-preservation.test.mjs`
- `grep -n "resolves local documentation links" tests/documentation-preservation.test.mjs`
- `grep -n 'addisassistant\\.com\\/docs' tests/documentation-preservation.test.mjs` (the favicon test's `docs\.addisassistant\.com` metadataBase assertion is **kept**; this grep only targets the removed `/docs` self-link asserts)

These must still return a match:
- `grep -n "prefers-reduced-motion" tests/documentation-preservation.test.mjs` (2 matches)
- `grep -n "aria-live" tests/documentation-preservation.test.mjs` (2 matches)
- `grep -n "5 ETB" tests/documentation-preservation.test.mjs` (pricing still locked)

Commit 2.

### Step 5: Negative checks (prove the new tests bite)

1. Temporarily add `[x](/docs/does-not-exist)` to the end of `content/docs/platform/faq.mdx`, run the new suite, and expect `links to missing /docs/does-not-exist`. Revert.
2. Temporarily add `<a href="/docs/nope">x</a>` to the same file and expect the same failure for `/docs/nope`. Revert.
3. Temporarily delete the `description:` line from `content/docs/platform/faq.mdx` and expect `has no description`. Revert.

**Verify**: `git status --short` → only the in-scope files from Steps 2-4. Both suites → `# fail 0`.

## Test plan

- New: `tests/docs-invariants.test.mjs` with 2 tests (frontmatter completeness; link resolution across every page and `meta.json`, covering Markdown links, JSX `href`, images, and no production self-links).
- Step 5's negative checks prove each new assertion fails when violated.
- Pattern: `tests/documentation-preservation.test.mjs`.

## Done criteria

- [ ] `node --test tests/docs-invariants.test.mjs` → `# fail 0`, 2 tests
- [ ] `node --test tests/documentation-preservation.test.mjs` → `# fail 0`
- [ ] All greps in Step 4 return the stated results
- [ ] `grep -c "^description:" content/docs/get-started/introduction.mdx` → `1`
- [ ] `git diff --stat` touches only the 3 in-scope files (plus `plans/README.md`)
- [ ] `plans/README.md` status row for 004 updated

## STOP conditions

- D8 is not `APPROVED`.
- Step 2's failure list contains anything other than the two Introduction messages, plus stub-page messages if plan 001 hasn't run. Report the extra failures. They are real broken links or missing descriptions the team should see, so don't fix them silently.
- Deleting an assertion would leave a test with no assertions at all. Report it; don't delete the whole test.
- Any assertion you are about to delete is not word-for-word what the table describes.

## Maintenance notes

- From now on, a plan that rewrites a page also replaces that page's copy locks with invariants or docs-wide facts. Example: assert that `addis.chat.runTools` appears *somewhere* in `content/docs`, not on a specific page. Plans 005-007 follow this rule.
- Natural follow-ups for the invariants file, kept out of this plan to stay small:
  - check `#anchor` targets against generated heading slugs
  - ban emoji in Markdown headings (after plan 006 removes the existing ones)
  - ban raw palette colours (`text-blue-500` etc.) once the card components exist
- Add CI (`.github/workflows/ci.yml` running `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`). The repo has no CI today, so none of these tests run on PRs.
