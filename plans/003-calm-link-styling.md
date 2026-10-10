# Plan 003: Prose links render as a quiet hairline underline, not a thick brand-blue bar

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat eaf808b..HEAD -- app/global.css components/docs.tsx components/scribe-demo.tsx components/voice-streaming-demo.tsx content/docs/platform/faq.mdx content/docs/get-started/quickstart.mdx content/docs/get-started/introduction.mdx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2 (high visibility, low effort)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx (visual)
- **Planned at**: commit `eaf808b`, 2026-10-10

## Why this matters

The owner's top visual complaint is "underlines". The cause is precise. Fumadocs UI 16.3.0 styles every link inside `.prose` like this (verified in the published package, `fumadocs-ui@16.3.0/dist/style.css:764-772`):

```css
:where(a:not([data-card])):not(:where([class~="not-prose"],[class~="not-prose"] *)) {
  color: var(--tw-prose-links);          /* = var(--color-fd-foreground) */
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3.5px;
  text-decoration-color: var(--color-fd-primary);
  text-decoration-thickness: 1.5px;
}
```

Better Auth uses the same Fumadocs rule unchanged, but on a neutral (black/white) theme, so its underline is grey and quiet. Our `--color-fd-primary` is a saturated electric blue in light mode (`#245efe`) and cyan in dark mode (`#27cdfe`), so every link gets a thick brand-coloured bar. Many links are also wrapped in `**bold**`, and three components use their own underline styles.

We keep *an* underline, because link text is the same colour as body text and an underline is what distinguishes a link without relying on colour (WCAG 1.4.1). But it should be a 1px neutral hairline that turns brand-coloured on hover. That is the restrained look of Vercel and Better Auth.

## Current state

- `app/global.css` (103 lines) imports the theme and defines brand tokens. It has **no** link override:
  ```css
  @import 'tailwindcss';
  @import 'fumadocs-ui/css/neutral.css';
  @import 'fumadocs-ui/css/preset.css';

  :root {
    /* keep originals as reference */
    --color-fd-primary-original: #27cdfe;
    --color-fd-primary-light-original: #245efe;
    ...
  ```
  The rest of the file is a single `@layer components { … }` block with the `addis-*` utilities. The Fumadocs prose rule sits in Tailwind's `utilities` layer, so an **unlayered** rule placed after the imports wins regardless of specificity.
- Component link styles that diverge:
  - `components/docs.tsx:123` (AnnouncementItem body): `[&_a]:font-medium [&_a]:text-fd-foreground [&_a]:underline [&_a]:decoration-fd-primary/50 [&_a]:underline-offset-4 [&_a:hover]:text-fd-primary`
  - `components/scribe-demo.tsx:173` and `components/voice-streaming-demo.tsx:190`: `<a href="https://addisassistant.com/apikeys" … className="underline">Get an API key</a>`
- Bold-wrapped links (`**[text](url)**`), which add weight to the underline:
  - `content/docs/platform/faq.mdx:82`: `… in the **[Platform Dashboard](https://addisassistant.com)** …` (check the exact URL on the line)
  - `content/docs/get-started/quickstart.mdx:19`: `    **[Open the Addis AI Playground](https://addisassistant.com/playground)**.`
  - `content/docs/get-started/quickstart.mdx:41`: `    1.  Navigate to the **[API Keys Dashboard](https://addisassistant.com/apikeys)**.`
  - `content/docs/get-started/introduction.mdx:104-105,109-114,118-121,124-125`: 14 bullets of the form `*   **[Text Generation](https://docs.addisassistant.com/docs/capabilities/text-generation):** Build chat, …`
- **Test locks you must respect** (`tests/documentation-preservation.test.mjs`):
  - Line 376 requires the *bold* link in `integration/voice-interface.mdx:187` (`use the \*\*\[Realtime API\]…\*\* instead`). **Leave that line alone.**
  - Lines 133-141 require quickstart strings such as `Open the Addis AI Playground` and `https://addisassistant.com/apikeys`. Removing `**` keeps them matching.
  - Line 232 requires `[Playground Guide](https://docs.addisassistant.com/docs/get-started/quickstart)`, a substring that still matches after `**` is removed.
  - Lines 452-456 require `components/docs.tsx` to still contain `text-fd-primary`, `flex flex-wrap items-center gap-2`, `addis-offset-shell`. Those strings exist elsewhere in the file and are unaffected.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Content tests | `node --test tests/documentation-preservation.test.mjs` | `# fail 0` |
| Install deps | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Build | `pnpm build` | exit 0 |

Do **not** install a browser or Playwright. The repo's `AGENTS.md` forbids it. Visual QA happens in the PR preview deployment (see Done criteria).

## Scope

**In scope**:
- `app/global.css` (append one unlayered block)
- `components/docs.tsx` (line 123 class string only)
- `components/scribe-demo.tsx` (line 173 `className` only)
- `components/voice-streaming-demo.tsx` (line 190 `className` only)
- `content/docs/platform/faq.mdx` (line 82, remove `**` around the link)
- `content/docs/get-started/quickstart.mdx` (lines 19 and 41, remove `**` around the links)
- `content/docs/get-started/introduction.mdx` (lines 104-125, remove `**` around links only)

**Out of scope**:
- `content/docs/integration/voice-interface.mdx:187`: its bold link is locked by a test.
- Brand colour tokens (`--color-fd-primary*`): don't change the brand.
- Absolute `https://docs.addisassistant.com` URLs in introduction.mdx. They are locked by tests and made relative in plan 004.
- Emoji headings, card styling, code-block theme. These are separate findings (F32, F35, F38 in `plans/REVIEW.md`).

## Git workflow

- Branch: `advisor/003-calm-link-styling`. Base it on the branch of the previous plan in `plans/README.md` order (stacked branches), or on `main` once that plan has merged. Plans 001-003 each append a test to the same file, so unstacked branches conflict.
- Commit message, matching `git log` style: `Use a neutral hairline underline for documentation links`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the unlayered prose-link override

Append this to the **end** of `app/global.css`, outside the `@layer components { … }` block:

```css
/*
 * Prose links: quiet 1px neutral underline that turns brand-coloured on hover.
 * Unlayered on purpose so it overrides the Fumadocs typography rule, which
 * underlines every link 1.5px in --color-fd-primary.
 */
.prose a:not([data-card]):not(:where(.not-prose, .not-prose *)) {
  color: var(--color-fd-foreground);
  font-weight: 500;
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  text-decoration-color: color-mix(in oklab, var(--color-fd-foreground) 28%, transparent);
  transition:
    text-decoration-color 150ms ease,
    color 150ms ease;
}

.prose a:not([data-card]):not(:where(.not-prose, .not-prose *)):hover {
  opacity: 1;
  text-decoration-color: var(--color-fd-primary);
}
```

**Verify**: `grep -c "text-decoration-thickness: 1px" app/global.css` → `1`. `node --test tests/documentation-preservation.test.mjs` → `# fail 0`. That suite's "uses one reversible visual system" test still finds all `addis-*` utilities.

### Step 2: Align the three component link styles

1. `components/docs.tsx:123`: in the class string, replace `[&_a]:decoration-fd-primary/50` with `[&_a]:decoration-fd-foreground/30`, and replace `[&_a:hover]:text-fd-primary` with `[&_a:hover]:decoration-fd-primary`. Leave every other class untouched.
2. `components/scribe-demo.tsx:173` and `components/voice-streaming-demo.tsx:190`: change `className="underline"` on the "Get an API key" anchor to `className="underline decoration-fd-foreground/30 underline-offset-4 hover:decoration-fd-primary"`.

**Verify**: `grep -rn 'className="underline"' components | wc -l` → `0`. `grep -c "decoration-fd-primary/50" components/docs.tsx` → `0`. `node --test tests/documentation-preservation.test.mjs` → `# fail 0`.

### Step 3: Unbold links in content

Remove the `**` wrapping from links, keeping the link and any trailing colon:

- `faq.mdx:82`: `**[Platform Dashboard](URL)**` → `[Platform Dashboard](URL)`
- `quickstart.mdx:19`: `    **[Open the Addis AI Playground](https://addisassistant.com/playground)**.` → `    [Open the Addis AI Playground](https://addisassistant.com/playground).`
- `quickstart.mdx:41`: `**[API Keys Dashboard](https://addisassistant.com/apikeys)**` → `[API Keys Dashboard](https://addisassistant.com/apikeys)`
- `introduction.mdx` bullets: `*   **[Label](url):** description` → `*   [Label](url): description`

You can do the introduction bullets in one pass: `sed -i -E 's/^\*   \*\*(\[[^]]+\]\([^)]+\)):\*\*/*   \1:/' content/docs/get-started/introduction.mdx`

**Verify**: `grep -rn "\*\*\[" content/docs | grep -v "integration/voice-interface.mdx" | grep -v "get-started/quick-start.mdx" | wc -l` → `0`. (`quick-start.mdx` is the Fumadocs template that plan 001 deletes, so ignore it.) `node --test tests/documentation-preservation.test.mjs` → `# fail 0`.

### Step 4: Build

**Verify**: `pnpm install && pnpm build && pnpm typecheck` → all exit 0. If you cannot install dependencies, say so in your report and rely on Steps 1-3.

### Step 5: Visual QA handoff (human)

Do not install a browser. In your report, list these pages for the reviewer to check in the PR preview, in **light and dark** mode:
- `/docs/get-started/introduction`: the link list at "Documentation Roadmap"
- `/docs/capabilities/streaming`: the table with links
- `/docs/announcements`: links inside announcement cards
- `/docs/capabilities/text-generation`: Cards at the end must **not** be underlined. They carry `data-card`, which the selector excludes.

Expected: links are body-coloured with a thin grey underline, the underline turns brand blue/cyan on hover, and nothing is bold except headings and UI labels.

## Test plan

No new automated test. Styling is not unit-testable here without a browser, which `AGENTS.md` forbids. Optionally append this guard to `tests/documentation-preservation.test.mjs`:

```js
test('keeps documentation links unbolded and quietly underlined', () => {
  assert.match(read('app/global.css'), /\.prose a:not\(\[data-card\]\)/);
  const offenders = walk('content/docs')
    .filter((path) => path.endsWith('.mdx') && !path.endsWith('integration/voice-interface.mdx'))
    .filter((path) => /\*\*\[[^\]]+\]\([^)]+\)/.test(readFileSync(path, 'utf8')));
  assert.deepEqual(offenders.map((path) => path.slice(root.length + 1)), []);
});
```

If plan 001 has not run yet, `quick-start.mdx` will trip this guard. In that case add `&& !path.endsWith('get-started/quick-start.mdx')` to the filter, and remove it again after 001 lands.

## Done criteria

- [ ] `grep -c "text-decoration-thickness: 1px" app/global.css` → `1`
- [ ] `grep -rn 'className="underline"' components | wc -l` → `0`
- [ ] Bold-link grep from Step 3 → `0`
- [ ] `node --test tests/documentation-preservation.test.mjs` → `# fail 0`
- [ ] `pnpm build` exits 0 (or the report states deps could not be installed)
- [ ] The report lists the Step 5 pages for preview QA
- [ ] `git status --short` lists only in-scope files (plus `plans/README.md`)
- [ ] `plans/README.md` status row for 003 updated

## STOP conditions

- `app/global.css` already contains a `.prose a` rule. Someone has started this; report it.
- After Step 1, any test in `documentation-preservation.test.mjs` fails.
- `pnpm build` fails with a CSS parse error on `color-mix(…)`. Report it; do not swap in a hex colour on your own.
- You find more `**[` links than listed. Report the extra locations rather than editing pages outside scope.

## Maintenance notes

- The selector excludes `[data-card]` (Fumadocs `<Card>`) and anything inside `.not-prose`, so custom hero blocks are unaffected.
- If the brand primary changes, nothing here needs updating: the hover colour follows `--color-fd-primary`.
- Follow-ups recorded in `plans/REVIEW.md`: F38 (switch the Catppuccin code theme to a neutral pair such as `github-light`/`github-dark`) and F32/F33 (replace hand-written card markup).
