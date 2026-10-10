# Plan 001: No placeholder, template or unreachable page is published, searchable or in llms-full.txt

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat eaf808b..HEAD -- content/docs next.config.mjs tests/documentation-preservation.test.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live files before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (ship first)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. **Precondition:** decisions **D1** and **D2** in `plans/README.md` must read `APPROVED` (D2 = "delete"). This repo's `AGENTS.md` forbids deleting content without explicit owner authorization.
- **Category**: docs
- **Planned at**: commit `eaf808b`, 2026-10-10

## Why this matters

The docs site (Fumadocs on Next.js) compiles every `.mdx` file under `content/docs/`, whether or not the sidebar lists it. Six files are not real documentation: the untouched Fumadocs starter page (with a heading "Yo what's up") and five 7-line stubs that say "Content for X goes here." They are reachable by URL, returned by site search, and concatenated into `/llms-full.txt`, the file AI assistants read to learn the product. A seventh file, `content/docs/index.mdx`, is an older landing page that can never render because `/docs` redirects first, but it is still indexed and contradicts the live docs. Removing them is the cheapest trust win available.

## Current state

- `content/docs/get-started/quick-start.mdx` (283 lines): the Fumadocs template. Frontmatter: `title: Quick Start` / `description: Getting Started with Fumadocs`. Line 96 is `## Yo what's up`. Its URL is already redirected by `next.config.mjs`:
  ```js
  {
    source: '/docs/get-started/quick-start',
    destination: '/docs/get-started/quickstart',
    permanent: true,
  },
  ```
  The real Quick Start is `content/docs/get-started/quickstart.mdx`. **Do not touch it.**
- Five stubs, each exactly 7 lines, like this one (`content/docs/capabilities/vision.mdx`):
  ```mdx
  ---
  title: Vision
  ---

  # Vision

  Content for Vision goes here.
  ```
  The other four are `content/docs/capabilities/conversation.mdx`, `content/docs/api-reference/chat-endpoint.mdx`, `content/docs/api-reference/schemas.mdx` and `content/docs/get-started/playground-guide.mdx`. Removing both api-reference files leaves `content/docs/api-reference/` empty. Delete the directory too.
- `content/docs/test.x` (79 lines): a leftover Fumadocs sample. It is probably not compiled (wrong extension), but it is clutter.
- `content/docs/index.mdx` (151 lines): never renders, because `app/docs/[[...slug]]/page.tsx:25-27` runs first:
  ```tsx
  if (!params.slug) {
    redirect(introductionUrl);
  }
  ```
  Its only outbound link to a stub is `index.mdx:148` (`/docs/capabilities/vision`). Deleting the file removes that link.
- `app/api/search/route.ts:4` (`createFromSource(source, …)`) and `app/llms-full.txt/route.ts:6` (`source.getPages()`) include every compiled page. Deleting the files is enough to remove them from both. No code change is needed.
- Tests: `tests/documentation-preservation.test.mjs` reads `content/docs/index.mdx` by path inside the test `'uses one reversible visual system across custom documentation surfaces'` (the list starting at line 480, entry at line 481: `'content/docs/index.mdx',`). If the file is deleted, `readFileSync` throws, so that one list entry must be removed. No other test references the deleted files. Line 416 checks only the `next.config.mjs` redirect for `quick-start`, which stays.
- Redirect convention: `next.config.mjs` has an `async redirects()` array of `{ source, destination, permanent: true }` objects. Match its 6-space indentation and single quotes.
- Test convention: `node:test` + `node:assert/strict`, helpers `read(path)` and `walk(path)` at the top of `tests/documentation-preservation.test.mjs`. New tests go at the end of that file in the same style:
  ```js
  test('removes the broken Models template page without redirecting old URLs', () => {
    const docsPage = read('app/docs/[[...slug]]/page.tsx');
    const files = walk('content/docs')
      .filter((file) => /\.(mdx?|tsx?|json)$/.test(file))
      .map((file) => read(file.slice(root.length + 1)))
      .join('\n');
    ...
  ```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Content tests | `node --test tests/documentation-preservation.test.mjs` | `# fail 0` |
| All tests (needs deps) | `pnpm install && pnpm test` | `# fail 0` |
| Build (needs deps) | `pnpm build` | exits 0 |

`tests/scribe-client.test.mjs` and `tests/voice-stream-client.test.mjs` need `typescript` from `node_modules`. Without `pnpm install` they fail with `ERR_MODULE_NOT_FOUND`, which is unrelated to this plan.

## Scope

**In scope** (the only files you should modify or delete):
- delete `content/docs/get-started/quick-start.mdx`
- delete `content/docs/get-started/playground-guide.mdx`
- delete `content/docs/capabilities/vision.mdx`
- delete `content/docs/capabilities/conversation.mdx`
- delete `content/docs/api-reference/chat-endpoint.mdx`, `content/docs/api-reference/schemas.mdx`, then the empty `content/docs/api-reference/` directory
- delete `content/docs/test.x`
- delete `content/docs/index.mdx`
- `next.config.mjs` (add 5 redirects)
- `tests/documentation-preservation.test.mjs` (remove one list entry; add one test)

**Out of scope** (do NOT touch):
- `content/docs/get-started/quickstart.mdx`: the real Quick Start.
- `content/docs/capabilities/text-to-speech-legacy.mdx` and `content/docs/platform/limits.mdx`: they are not in the sidebar, but they are real, intentionally hidden pages.
- `app/docs/[[...slug]]/page.tsx`: keep the `/docs` → introduction redirect.
- `content/docs/meta.json`: none of the deleted files is listed there.

## Git workflow

- Branch: `advisor/001-remove-placeholder-pages`
- One commit. Message style matches `git log` (plain imperative sentence, no prefix), e.g. `Remove placeholder, template and unreachable docs pages`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the precondition

Open `plans/README.md` and find the "Decisions" table. D1 and D2 must both say `APPROVED`, and D2 must mean "delete index.mdx".

**Verify**: `grep -E '^\| D[12] ' plans/README.md` → both rows contain `APPROVED`. Otherwise STOP.

### Step 2: Delete the seven files and the empty directory

```bash
git rm content/docs/get-started/quick-start.mdx \
  content/docs/get-started/playground-guide.mdx \
  content/docs/capabilities/vision.mdx \
  content/docs/capabilities/conversation.mdx \
  content/docs/api-reference/chat-endpoint.mdx \
  content/docs/api-reference/schemas.mdx \
  content/docs/test.x \
  content/docs/index.mdx
```

**Verify**: `ls content/docs/api-reference 2>&1` → "No such file or directory". `grep -rn "goes here" content/` → no output. `grep -rln "Fumadocs" content/` → no output.

### Step 3: Redirect the stub URLs

Search engines may have indexed the stub URLs. Append these five objects to the end of the array returned by `redirects()` in `next.config.mjs`, keeping the existing formatting:

```js
      {
        source: '/docs/capabilities/vision',
        destination: '/docs/capabilities/multimodal',
        permanent: true,
      },
      {
        source: '/docs/capabilities/conversation',
        destination: '/docs/capabilities/text-generation',
        permanent: true,
      },
      {
        source: '/docs/api-reference/chat-endpoint',
        destination: '/docs/capabilities/text-generation',
        permanent: true,
      },
      {
        source: '/docs/api-reference/schemas',
        destination: '/docs/capabilities/text-generation',
        permanent: true,
      },
      {
        source: '/docs/get-started/playground-guide',
        destination: '/docs/get-started/quickstart',
        permanent: true,
      },
```

If plan 007 (API reference) has already landed and `content/docs/api-reference/chat-endpoint.mdx` exists again as a real page, STOP. The redirect would shadow it.

**Verify**: `node -e "import('./next.config.mjs').then(async m => console.log((await m.default.redirects()).length))"` → `13`. If this fails because `fumadocs-mdx/next` is not installed, run `grep -c "source: '/docs" next.config.mjs` → `13` instead.

### Step 4: Update the preservation test

1. In `tests/documentation-preservation.test.mjs`, in the path list of the test `'uses one reversible visual system across custom documentation surfaces'`, delete the line `    'content/docs/index.mdx',`. Delete nothing else in that test.
2. Append this test at the end of the file:

```js
test('publishes no placeholder, template, or orphaned documentation pages', () => {
  const docs = walk('content/docs').map((file) => file.slice(root.length + 1));

  for (const path of docs) {
    assert.match(path, /\.(mdx|json)$/, `${path} is not a documentation source file`);
  }

  for (const path of docs.filter((file) => file.endsWith('.mdx'))) {
    const source = read(path);
    assert.doesNotMatch(source, /goes here\./i, `${path} is a placeholder page`);
    assert.doesNotMatch(source, /\bFumadocs\b/, `${path} contains framework template text`);
  }

  const listed = new Set();
  const collect = (dir, prefix) => {
    const meta = JSON.parse(read(join('content/docs', dir, 'meta.json')));
    for (const entry of meta.pages ?? []) {
      if (entry.startsWith('---') || entry.startsWith('[')) continue;
      listed.add(prefix + entry);
    }
  };
  collect('', '');
  for (const path of docs.filter((file) => file.endsWith('/meta.json') && file !== 'content/docs/meta.json')) {
    const dir = path.slice('content/docs/'.length, -'/meta.json'.length);
    listed.add(dir);
    collect(dir, `${dir}/`);
  }

  const intentionallyHidden = new Set(['capabilities/text-to-speech-legacy', 'platform/limits']);
  for (const path of docs.filter((file) => file.endsWith('.mdx'))) {
    const slug = path.slice('content/docs/'.length).replace(/(\/index)?\.mdx$/, '');
    assert.ok(
      listed.has(slug) || intentionallyHidden.has(slug),
      `${path} is not in the sidebar; add it to a meta.json or to intentionallyHidden`,
    );
  }
});
```

`join` is already imported at the top of the file (`import { join, resolve } from 'node:path';`).

**Verify**: `node --test tests/documentation-preservation.test.mjs` → `# fail 0`, and the output lists the new test name with `ok`.

### Step 5: Negative check (prove the new test bites)

Temporarily create `content/docs/tmp-check.mdx` containing `---\ntitle: X\n---\n\nContent for X goes here.` and re-run the test.

**Verify**: `node --test tests/documentation-preservation.test.mjs` → fails with `content/docs/tmp-check.mdx is a placeholder page`. Then `rm content/docs/tmp-check.mdx` and re-run → `# fail 0`.

### Step 6: Build check (if dependencies can be installed)

**Verify**: `pnpm install && pnpm build` → exits 0. If the build reports a missing import of a deleted page, STOP.

## Test plan

- New test `publishes no placeholder, template, or orphaned documentation pages` covers three cases: no "goes here" text, no Fumadocs template text, and every `.mdx` page is either in a `meta.json` or explicitly allow-listed as hidden.
- The negative check in Step 5 proves the test fails on a reintroduced stub.
- Pattern: the existing tests in the same file.

## Done criteria

- [ ] `node --test tests/documentation-preservation.test.mjs` → `# fail 0`
- [ ] `find content/docs -name '*.mdx' | xargs grep -l "goes here"` → no output
- [ ] `test ! -e content/docs/index.mdx && test ! -e content/docs/get-started/quick-start.mdx && test ! -d content/docs/api-reference` → exit 0
- [ ] `grep -c "source: '/docs" next.config.mjs` → `13`
- [ ] `git status --short` shows only the in-scope paths
- [ ] `plans/README.md` status row for 001 updated

## STOP conditions

- D1 or D2 is not `APPROVED`, or D2 says to keep `index.mdx` as a landing page (that is a different plan).
- Any file listed for deletion has content different from the description above (e.g. a stub now contains real documentation).
- Any page other than the deleted ones links to `/docs/capabilities/vision`, `/docs/capabilities/conversation`, `/docs/api-reference/…` or `/docs/get-started/playground-guide` (`grep -rn` for each). If so, report the file and line; do not edit it.
- The new orphan check fails for a page not named in this plan. Report it; do not add it to `intentionallyHidden` on your own.

## Maintenance notes

- When the API reference section is built (plan 007), the `api-reference/*` redirects added here must be removed in the same change, or they will shadow the new pages.
- `intentionallyHidden` is the deliberate escape hatch for hidden-but-real pages. Each addition should be justified in review.
- Follow-up (not in this plan): the search index uses `language: 'english'` over Ethiopic content. Evaluate search quality for Amharic queries separately.
