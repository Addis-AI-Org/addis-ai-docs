# Plan 002: Every cURL, Go and web-proxy sample works when copied verbatim

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat eaf808b..HEAD -- content/docs tests/documentation-preservation.test.mjs`
> If plan 001 already ran, its deletions and its new test appear in this diff;
> that is expected. For any other change, compare the "Current state" excerpts
> against the live files before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. It can run before or after plan 001. If plan 001 already deleted `content/docs/index.mdx`, skip the index.mdx lines below.
- **Category**: bug (docs correctness)
- **Planned at**: commit `eaf808b`, 2026-10-10

## Why this matters

Developers copy code samples first and read prose second. Four classes of sample on this site fail on first copy:

1. **33 cURL lines end with `\\`.** Inside an MDX code fence, text is literal, so the reader copies two backslashes. In bash, `\\` + newline is an escaped backslash followed by end of command, so every following `-H`/`-d` line runs as a separate (failing) command.
2. **Five cURL samples wrap `$ADDIS_API_KEY` in single quotes.** Single quotes stop shell expansion, so the literal text `$ADDIS_API_KEY` is sent and the API answers 401. Two of these are in the Quick Start.
3. **Three server samples read `ADDIS_AI_KEY`.** Everything else, including the SDK default, uses `ADDIS_API_KEY`.
4. **The Go sample does not compile** (`err` declared and not used), and the web proxy samples don't match the frontend samples on the same page (route name and error shape).

The fix is mechanical, plus a regression test so it cannot come back.

## Current state

**Class 1: `\\` at end of line inside fences.** `grep -rnE '\\\\[[:space:]]*$' content/docs --include=*.mdx | wc -l` prints `33` at the planned commit. Locations:
- `content/docs/capabilities/text-generation.mdx`: 59-61, 108-110, 152-154
- `content/docs/capabilities/multimodal.mdx`: 59-61, 104-106, 149-151
- `content/docs/capabilities/translation.mdx`: 83-85
- `content/docs/capabilities/speech-to-text/index.mdx`: 316-318
- `content/docs/capabilities/text-to-speech-legacy.mdx`: 57-59, 171-173
- `content/docs/index.mdx`: 103-105 (skip if plan 001 deleted the file)

Example, `text-generation.mdx:58-62` today:
```
    ```bash
    curl https://api.addisassistant.com/api/v1/chat_generate \\
      -H "Content-Type: application/json" \\
      -H "x-api-key: $ADDIS_API_KEY" \\
      -d '{
```
The correct form already exists elsewhere on the same page (`text-generation.mdx:332`) and in `get-started/quickstart.mdx:151-153`: a single ` \` at line end.

**Class 2: single-quoted key header** (`grep -rn "'[^']*\$ADDIS_API_KEY[^']*'" content/docs`):
- `content/docs/get-started/quickstart.mdx:196`: `              --header 'x-api-key: $ADDIS_API_KEY' \`
- `content/docs/get-started/quickstart.mdx:242`: `              --header 'x-api-key: $ADDIS_API_KEY' \`
- `content/docs/capabilities/speech-to-text/index.mdx:317`: `      --header 'x-api-key: $ADDIS_API_KEY' \\`
- `content/docs/capabilities/translation.mdx:85`: `      --header 'x-api-key: $ADDIS_API_KEY' \\`
- `content/docs/capabilities/multimodal.mdx:200`: `      --header 'X-API-Key: $ADDIS_API_KEY' \`

**Class 3: wrong env var** (`grep -rn ADDIS_AI_KEY content`):
- `content/docs/integration/server.mdx:147`: `    	apiKey := os.Getenv("ADDIS_AI_KEY")` (Go)
- `content/docs/integration/server.mdx:187`: `            'X-API-Key' => env('ADDIS_AI_KEY'),` (PHP)
- `content/docs/integration/web.mdx:116`: `            'X-API-Key' => env('ADDIS_AI_KEY'),` (PHP)

The canonical name is `ADDIS_API_KEY` (`get-started/quickstart.mdx:77,83`, `get-started/sdks.mdx`).

**Class 4a: Go does not compile.** `content/docs/integration/server.mdx:162-169`. The indentation is 4 spaces (MDX tab indent) followed by tab characters; preserve that byte-for-byte style:
```go
    		req, _ := http.NewRequest("POST", "https://api.addisassistant.com/api/v1/chat_generate", bytes.NewBuffer(jsonValue))
    		req.Header.Set("Content-Type", "application/json")
    		req.Header.Set("X-API-Key", apiKey)

    		client := &http.Client{}
    		resp, err := client.Do(req)
            // Error handling omitted for brevity
    		defer resp.Body.Close()
```
`err` is never read after `client.Do`, so `go build` fails with "declared and not used". If it compiled, a network error would nil-dereference `resp`.

**Class 4b: web proxy samples disagree with their frontends** (`content/docs/integration/web.mdx`):
- The Next.js route (line 48 `title="app/api/chat/route.ts"`) reads `{ message }` (good). On failure it returns `NextResponse.json({ error: "Internal Server Error" }, { status: 500 })` (line 68): a *string*.
- The Express proxy, lines 85-86 and 99:
  ```js
  app.post('/api/proxy', async (req, res) => {
    const { prompt } = req.body;
  ...
      res.status(500).json({ error: "Proxy Connection Failed" });
  ```
- Both frontends POST `{ message }` to `/api/chat` (lines 159-162 and 223-226) and read `data.error?.message` (lines 168 and 231). With a string `error`, users see "Something went wrong" or "Error: undefined".
- The page's own "JSON Error Response" section (lines 257-268) documents the API's error shape as `{ "status": "error", "error": { "code": …, "message": … } }`. The PHP proxy forwards the upstream body, so it already matches. Make the two JS proxies return the same `error.message` shape.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Count `\\` continuations | `grep -rnE '\\\\[[:space:]]*$' content/docs --include=*.mdx \| wc -l` | `0` after the fix |
| Count single-quoted keys | `grep -rn "'[^']*\$ADDIS_API_KEY[^']*'" content/docs \| wc -l` | `0` after the fix |
| Wrong env var | `grep -rn ADDIS_AI_KEY content \| wc -l` | `0` after the fix |
| Content tests | `node --test tests/documentation-preservation.test.mjs` | `# fail 0` |
| Optional Go check | `gofmt -l` / `go vet` on an extracted copy, if Go is installed | no errors |

## Scope

**In scope**:
- `content/docs/capabilities/text-generation.mdx`, `multimodal.mdx`, `translation.mdx`, `speech-to-text/index.mdx`, `text-to-speech-legacy.mdx`
- `content/docs/get-started/quickstart.mdx` (lines 196 and 242 only)
- `content/docs/integration/server.mdx` (lines 147, 162-169, 187 only)
- `content/docs/integration/web.mdx` (lines 68, 85-86, 99, 116 only)
- `content/docs/index.mdx` (lines 103-105, only if the file still exists)
- `tests/documentation-preservation.test.mjs` (append one test)

**Out of scope** (do NOT change, even though they look related):
- Header-name casing (`X-API-Key` vs `x-api-key`). It is functionally irrelevant, and casing is a style decision (D9).
- The `"model": "Addis-፩-አሌፍ"` field in Go/PHP/web samples. Whether it is a real parameter is decision D6.
- The response envelope shapes (`response_text` vs `data.response_text`). That is decision D4.
- `content/docs/capabilities/realtime.mdx` `?apiKey=` guidance. That is decision D3, a security/product question.
- Any prose, heading or non-code line.

## Git workflow

- Branch: `advisor/002-fix-code-samples`. Base it on the branch of the previous plan in `plans/README.md` order (stacked branches), or on `main` once that plan has merged. Plans 001-003 each append a test to the same file, so unstacked branches conflict.
- Commit message style (from `git log`): plain imperative sentence, e.g. `Fix copy-paste-breaking cURL, Go and web proxy samples`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix `\\` line continuations

In each in-scope `.mdx` file, replace a trailing ` \\` (space, two backslashes, end of line) with ` \` (space, one backslash). Only lines inside code fences are affected; all 33 matches are inside fences.

```bash
for f in content/docs/capabilities/text-generation.mdx content/docs/capabilities/multimodal.mdx \
         content/docs/capabilities/translation.mdx content/docs/capabilities/speech-to-text/index.mdx \
         content/docs/capabilities/text-to-speech-legacy.mdx content/docs/index.mdx; do
  if [ -f "$f" ]; then sed -i -E 's/ \\\\[[:space:]]*$/ \\/' "$f"; fi
done
```

Open one fixed block (`text-generation.mdx:58-62`) and confirm each line now ends with a single backslash.

**Verify**: `grep -rnE '\\\\[[:space:]]*$' content/docs --include=*.mdx | wc -l` → `0`. `git diff --stat` touches only the in-scope files.

### Step 2: Double-quote the key headers

Replace the single quotes with double quotes on exactly the 5 lines listed under Class 2. Keep everything else on the line, including any trailing ` \`. Example: `--header 'x-api-key: $ADDIS_API_KEY' \` → `--header "x-api-key: $ADDIS_API_KEY" \`.

**Verify**: `grep -rn "'[^']*\$ADDIS_API_KEY[^']*'" content/docs | wc -l` → `0`. `grep -rn '"x-api-key: \$ADDIS_API_KEY"\|"X-API-Key: \$ADDIS_API_KEY"' content/docs/get-started/quickstart.mdx | wc -l` → at least `2`.

### Step 3: Rename `ADDIS_AI_KEY` → `ADDIS_API_KEY`

Edit the three lines listed under Class 3.

**Verify**: `grep -rn ADDIS_AI_KEY content | wc -l` → `0`.

### Step 4: Make the Go sample compile and fail safely

In `content/docs/integration/server.mdx`, replace the block quoted under Class 4a with the version below. Keep the leading 4 spaces + tabs indentation used by neighbouring lines, and keep `X-API-Key` as-is (casing is out of scope):

```go
    		req, err := http.NewRequest("POST", "https://api.addisassistant.com/api/v1/chat_generate", bytes.NewBuffer(jsonValue))
    		if err != nil {
    			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "Could not build the request"}})
    			return
    		}
    		req.Header.Set("Content-Type", "application/json")
    		req.Header.Set("X-API-Key", apiKey)

    		client := &http.Client{}
    		resp, err := client.Do(req)
    		if err != nil {
    			c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "Could not reach Addis AI"}})
    			return
    		}
    		defer resp.Body.Close()
```

`net/http` and `github.com/gin-gonic/gin` are already imported in that sample (server.mdx:141-142). `gin.H` is part of gin.

**Verify**: `grep -n "Error handling omitted" content/docs/integration/server.mdx` → no output. `grep -c "if err != nil" content/docs/integration/server.mdx` → at least `2`. If Go is installed, extract the fenced block to a temp dir outside the repo and run `gofmt -e`. It must report no syntax errors (a full `go build` needs gin and is optional).

### Step 5: Align the web proxies with their frontends

In `content/docs/integration/web.mdx`:
1. Line 68: `{ error: "Internal Server Error" }` → `{ error: { message: "Internal Server Error" } }`.
2. Lines 85-86: `app.post('/api/proxy', async (req, res) => {` → `app.post('/api/chat', async (req, res) => {`, and `const { prompt } = req.body;` → `const { message } = req.body;`.
3. In the same Express handler, the SDK call uses `content: prompt`. Change it to `content: message`.
4. Line 99: `{ error: "Proxy Connection Failed" }` → `{ error: { message: "Proxy Connection Failed" } }`.

**Verify**: `grep -n "api/proxy\|{ prompt }\|content: prompt" content/docs/integration/web.mdx` → no output. `grep -c 'error: { message:' content/docs/integration/web.mdx` → `2`.

### Step 6: Add a regression test

Append to `tests/documentation-preservation.test.mjs` (style: `test(...)` + `assert`; `walk` and `root` already exist at the top of the file):

```js
test('keeps copied shell and server samples runnable', () => {
  const pages = walk('content/docs').filter((path) => path.endsWith('.mdx'));

  for (const absolute of pages) {
    const path = absolute.slice(root.length + 1);
    const lines = readFileSync(absolute, 'utf8').split('\n');
    let inFence = false;

    lines.forEach((line, index) => {
      if (/^\s*```/.test(line)) inFence = !inFence;
      else if (inFence) {
        assert.doesNotMatch(line, /\\\\\s*$/, `${path}:${index + 1} ends a code line with a double backslash`);
        assert.doesNotMatch(line, /'[^']*\$ADDIS_API_KEY[^']*'/, `${path}:${index + 1} single-quotes $ADDIS_API_KEY, so the shell never expands it`);
      }
    });

    assert.doesNotMatch(readFileSync(absolute, 'utf8'), /ADDIS_AI_KEY/, `${path} uses ADDIS_AI_KEY instead of ADDIS_API_KEY`);
  }
});
```

`readFileSync` is already imported at the top of the file.

**Verify**: `node --test tests/documentation-preservation.test.mjs` → `# fail 0`, and the new test name appears with `ok`.

### Step 7: Negative check

Temporarily change one fixed line back to ` \\` and re-run the test file. It must fail with `ends a code line with a double backslash`. Revert that one line by hand (or re-run the Step 1 `sed` on that file; do **not** use `git checkout`, which would discard all your fixes), then re-run → `# fail 0`.

## Test plan

- New test `keeps copied shell and server samples runnable` covers three cases: `\\` at the end of fenced lines, single-quoted `$ADDIS_API_KEY`, and the `ADDIS_AI_KEY` misspelling.
- The negative check in Step 7 proves it fails on regression.
- Pattern: existing tests in the same file.

## Done criteria

- [ ] `grep -rnE '\\\\[[:space:]]*$' content/docs --include=*.mdx | wc -l` → `0`
- [ ] `grep -rn "'[^']*\$ADDIS_API_KEY[^']*'" content/docs | wc -l` → `0`
- [ ] `grep -rn ADDIS_AI_KEY content | wc -l` → `0`
- [ ] `grep -n "Error handling omitted" content/docs/integration/server.mdx` → no output
- [ ] `grep -n "api/proxy" content/docs/integration/web.mdx` → no output
- [ ] `node --test tests/documentation-preservation.test.mjs` → `# fail 0`
- [ ] `git status --short` lists only in-scope files (plus `plans/README.md`)
- [ ] `plans/README.md` status row for 002 updated

## STOP conditions

- The Class 1 count is not 33 (or 30 with `index.mdx` already deleted) before you start. The content has drifted, so re-list the locations and report.
- Any `\\` at end of line is *outside* a code fence. It may be intentional MDX; report it and leave it.
- The Express handler at `web.mdx:85-101` no longer matches the excerpt (e.g. already renamed).
- A preservation test unrelated to the new one starts failing after Steps 1-5. Report which assertion; don't edit it.

## Maintenance notes

- The new test runs over every `.mdx` page, so future pages are covered automatically.
- Header casing (`x-api-key` everywhere) can be normalised later once D9 is decided. Extend the new test then.
- Related open issue, deliberately not fixed here: `content/docs/capabilities/realtime.mdx:28-34` instructs browser clients to put the API key in the WebSocket URL (decision D3).
