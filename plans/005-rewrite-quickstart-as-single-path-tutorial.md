# Plan 005: Quickstart takes a new developer from zero to one successful call in four steps

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat eaf808b..HEAD -- content/docs/get-started content/docs/meta.json next.config.mjs tests/`
> Plans 001-004 are expected to have changed some of these files. Compare the
> "Current state" excerpts of `content/docs/get-started/quickstart.mdx` against
> the live file. If the Quick Start itself was edited by anyone else, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW. Content moves; the only sections that leave Quick Start are snippets that already exist on capability pages, and D14 approves that.
- **Depends on**:
  - `plans/002-fix-copy-paste-breaking-code-samples.md` (fixed quoting)
  - `plans/004-turn-preservation-tests-into-invariants.md` (test approach)
  - **Preconditions:** decisions **D7** (canonical SDK install command) and **D14** (approve moving the STT/Translation/Multimodal tabs and the Voices 2 step out of Quick Start) in `plans/README.md` both read `APPROVED`.
- **Category**: docs
- **Planned at**: commit `eaf808b`, 2026-10-10

## Why this matters

ElevenLabs' quickstart is three steps: create a key, install the SDK, run a script. Vercel and the AI SDK reach a working call in about four steps and end with "Where to next?".

Ours (`content/docs/get-started/quickstart.mdx`, 394 lines) is described as "From Playground to Production in less than 5 minutes", but:
- Step 1 is a Playground UI tour.
- Step 3 lists three base URLs and a 6-row endpoint table before any code.
- Step 4 asks the reader to pick one of 4 capabilities × 3 languages (12 code blocks in nested tabs), then shows a raw REST JSON response that doesn't match the SDK output printed above it.
- Step 5's TTS snippet uses `addis` without creating it.
- There is no "Next steps".

This plan makes Quick Start one path (create key → install → one chat call → see output → next steps). Nothing is deleted. The Playground tour moves to its own page (`get-started/playground.mdx`). The base URLs, endpoint table and native REST responses move to a new `get-started/api-overview.mdx`. Every other capability snippet already exists on its capability page.

## Current state

`content/docs/get-started/quickstart.mdx` today. Section map with line numbers at `eaf808b`; plan 002 changed only lines 196 and 242 (quotes):
- 1-10: frontmatter + imports + intro sentence
- 12-33: `<Step>` "## Prototype in Playground": playground screenshot `/images/playgroundchat.png`, a 4-item list (model, language, temperature, tokens), and the sentence beginning `The **Voice Lab** experience…`
- 35-58: `<Step>` "## Get your API Key": the sentence `Authentication is handled via a secret \`x-api-key\` header.`, 3 screenshots (`/images/api_page.png`, `/images/api_name.png`, `/images/secretkey.png`) and the `<Callout title="Important" type="info">` about copying the `sk_...` key once
- 60-105: `<Step>` "## Configure Endpoints": base URL blocks, the TTS streaming sentence, install tabs (`npm install addisai` / `pip install addisai` + `export ADDIS_API_KEY="your_api_key"`), and the "### Available Capabilities" table
- 107-344: `<Step>` "## Quick Example": nested tabs for Text Generation / Speech-to-Text / Translation / Multimodal, a `<Cards>` with `<Card href="/docs/capabilities/realtime" icon={<Radio />} title="Realtime API">`, and "### The Response" with two native REST JSON blocks
- 346-393: `<Step>` "## Generate your first Addis Voices 2 clip"

Where the removed snippets already live (verified at `eaf808b`):
- `addis.speech.transcribe` → `capabilities/speech-to-text/index.mdx`
- `addis.translate.create` and `"source_language"` → `capabilities/translation.mdx`
- `fileFromPath("market.jpg"` and `attachment_0=@market.jpg` → `capabilities/multimodal.mdx`
- `addis.voice.generate` and `am-hamen` → `capabilities/text-to-speech/index.mdx`
- The Playground screenshot and the "Voice Lab" sentence exist **only** in quickstart. They must be moved, not dropped.

Tests that lock the current Quick Start (`tests/documentation-preservation.test.mjs`; find them by name):
- `preserves original onboarding screenshots and page structures`: reads `quickstart` and asserts the 4 images, `https://addisassistant.com/playground`, `Open the Addis AI Playground`, `https://addisassistant.com/apikeys`, `The \*\*Voice Lab\*\* experience`, no `Voice Labs`, and the 4 alt texts.
- `completes Quick Start capability coverage across REST and Realtime`: base-URL sentences, the 6 table rows, the 4-capability `<Tabs items=…>`, `addis.translate.create`, `source_language`, the multimodal snippet, the Realtime card.
- `keeps SDK examples primary without removing cURL interoperability`: `quickstart.mdx` must mention `Node.js`, then `Python`, then `cURL`, in that order.

Conventions:
- Steps use `import { Step, Steps } from 'fumadocs-ui/components/steps';` with `## ` headings inside each `<Step>`.
- Tabs use `<Tabs items={['Node.js', 'Python', 'cURL']}>` + `<Tab value="…">`.
- Callouts and Cards are global MDX components, so no import is needed.
- Sidebar order is in `content/docs/meta.json` → `"pages"`.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Tests | `node --test tests/*.test.mjs` | `# fail 0` (the two TS-client tests need `pnpm install`) |
| Build | `pnpm install && pnpm build` | exit 0 |

## Scope

**In scope**:
- `content/docs/get-started/quickstart.mdx` (rewrite)
- `content/docs/get-started/playground.mdx` (create, with moved content)
- `content/docs/get-started/api-overview.mdx` (create, with moved content)
- `content/docs/meta.json` (add the 2 pages)
- `content/docs/get-started/introduction.mdx` (only the "Playground Guide" link target)
- `next.config.mjs` (only the destination of the `/docs/get-started/playground-guide` redirect, if plan 001 added it)
- `tests/documentation-preservation.test.mjs` (replace the Quick Start locks as described in Step 6)

**Out of scope**:
- Capability pages. Their snippets stay where they are.
- `get-started/sdks.mdx`: its install-command drift is a follow-up of decision D7, not part of this plan.
- Any wording change to moved content. Move it verbatim, apart from heading levels.

## Git workflow

- Branch: `advisor/005-quickstart-tutorial`. Base it on the branch of the previous plan in `plans/README.md` order (stacked branches), or on `main` once that plan has merged. Plans 001-003 each append a test to the same file, so unstacked branches conflict.
- One commit: `Rewrite Quick Start as a single four-step tutorial`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Confirm D7 and read the install command

**Verify**: `grep -E '^\| D(7|14) ' plans/README.md` → both rows contain `APPROVED`, and D7 states the Node and Python install commands. Use those commands verbatim wherever this plan says `<NODE_INSTALL>` / `<PYTHON_INSTALL>`. If either is not approved, STOP.

### Step 2: Create `content/docs/get-started/playground.mdx` (moved content)

Frontmatter:
```mdx
---
title: Playground guide
description: Try prompts, languages, and settings in the Addis AI Playground before you write code.
icon: CirclePlay
---
```
Body: move **verbatim** from quickstart lines 16-32 (everything inside the first `<Step>` after its `## Prototype in Playground` heading): the "Before writing code…" sentence, the `### Test your Parameters` block with the screenshot, the 4-item list, the Voice Lab sentence, and the closing sentence. Change `### Test your Parameters` to `## Test your parameters`, and de-indent the moved lines by 4 spaces (they were inside `<Step>`). End the page with:

```mdx
## Next steps

When a prompt works the way you want, follow the [Quick Start](/docs/get-started/quickstart) to make the same request from code.
```

**Verify**: `grep -c "playgroundchat.png" content/docs/get-started/playground.mdx` → `1`. `grep -c "The \*\*Voice Lab\*\* experience" content/docs/get-started/playground.mdx` → `1`.

### Step 3: Create `content/docs/get-started/api-overview.mdx` (moved content)

Frontmatter:
```mdx
---
title: API overview
description: Base URLs, authentication, endpoints, and native REST response shapes for the Addis AI API.
icon: Network
---

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
```
Body, in this order, each block moved **verbatim** from quickstart and de-indented:
1. `## Authentication`, then the sentence `Authentication is handled via a secret \`x-api-key\` header.` (from line 38).
2. `## Base URLs`, then lines 63-75 (the REST base URL sentence + block, the Realtime sentence + block, the Addis Voices 2 streaming sentence).
3. `## Endpoints`, then the table from lines 96-103 (drop its old `### Available Capabilities` heading).
4. `## Native REST responses`, then lines 306-342 (the "The API structure depends on the endpoint." sentence and the `<Tabs items={['Text Generation', 'Speech-to-Text']}>` block).

**Verify**: `grep -c "wss://relay.addisassistant.com/ws" content/docs/get-started/api-overview.mdx` → at least `2`. `grep -c "| Translation | \`/api/v1/translate\` | \`POST\` |" content/docs/get-started/api-overview.mdx` → `1`.

### Step 4: Rewrite `content/docs/get-started/quickstart.mdx`

Replace the whole file with the content below. Substitute `<NODE_INSTALL>` / `<PYTHON_INSTALL>` from D7. The three screenshots, their alt texts and the Callout are moved verbatim from the current Step 2.

````mdx
---
title: Quick Start
description: Create an API key, install the SDK, and make your first request in four steps.
icon: Zap
---

import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

This guide takes you from a new account to your first Amharic response. Prefer to experiment without code first? Use the [Playground guide](/docs/get-started/playground).

<Steps>
  <Step>
    ## Create an API key

    1.  Open the [API Keys Dashboard](https://addisassistant.com/apikeys).
    2.  Click **Create API Key**.

    ![Addis AI API Keys page with the Create API Key button](/images/api_page.png)

    3.  **Name your key** (e.g., `Addis AI App`) in the popup window.

    ![Create API Key dialog with the key-name field](/images/api_name.png)

    <Callout title="Important" type="info">
      You will see a key starting with `sk_...`. **Copy this now.**

      You will not be able to see it again after closing the window.
    </Callout>

    ![New Addis AI API key confirmation with the one-time Copy action](/images/secretkey.png)
  </Step>

  <Step>
    ## Install the SDK and set your key

    Keep the key on your server. The SDK reads it from `ADDIS_API_KEY`.

    <Tabs items={['Node.js', 'Python', 'cURL']}>
      <Tab value="Node.js">
        ```bash
        <NODE_INSTALL>
        export ADDIS_API_KEY="your_api_key"
        ```
      </Tab>
      <Tab value="Python">
        ```bash
        <PYTHON_INSTALL>
        export ADDIS_API_KEY="your_api_key"
        ```
      </Tab>
      <Tab value="cURL">
        ```bash
        export ADDIS_API_KEY="your_api_key"
        ```
      </Tab>
    </Tabs>
  </Step>

  <Step>
    ## Make your first request

    <Tabs items={['Node.js', 'Python', 'cURL']}>
      <Tab value="Node.js">
        ```ts title="index.mjs"
        import AddisAI from "addisai";

        const addis = new AddisAI();
        const response = await addis.chat.completions.create({
          messages: [{
            role: "user",
            content: "ሰላም፣ ኢትዮጵያ ውስጥ ስንት ክልሎች አሉ?",
          }],
        });

        console.log(response.choices[0].message.content);
        ```

        ```bash
        node index.mjs
        ```
      </Tab>
      <Tab value="Python">
        ```python title="main.py"
        from addisai import AddisAI

        addis = AddisAI()
        response = addis.chat.completions.create(
            messages=[{
                "role": "user",
                "content": "ሰላም፣ ኢትዮጵያ ውስጥ ስንት ክልሎች አሉ?",
            }],
        )

        print(response["choices"][0]["message"]["content"])
        ```

        ```bash
        python main.py
        ```
      </Tab>
      <Tab value="cURL">
        ```bash
        curl https://api.addisassistant.com/api/v1/chat_generate \
          -H "Content-Type: application/json" \
          -H "x-api-key: $ADDIS_API_KEY" \
          -d '{
            "prompt": "ሰላም፣ ኢትዮጵያ ውስጥ ስንት ክልሎች አሉ?",
            "target_language": "am"
          }'
        ```
      </Tab>
    </Tabs>
  </Step>

  <Step>
    ## Check the response

    The SDK prints the model's answer. Wording varies between runs:

    ```text
    በአሁኑ ጊዜ በኢትዮጵያ ውስጥ 12 ክልሎች አሉ።...
    ```

    cURL returns the native JSON response, with the answer in `response_text`. See [API overview](/docs/get-started/api-overview#native-rest-responses) for every response shape.
  </Step>
</Steps>

## Next steps

<Cards>
  <Card href="/docs/capabilities/text-generation" title="Text Generation">
    Multi-turn chat, system instructions, function calling, and streaming.
  </Card>
  <Card href="/docs/capabilities/text-to-speech" title="Text-to-Speech">
    Generate your first Addis Voices 2 clip.
  </Card>
  <Card href="/docs/capabilities/speech-to-text" title="Speech-to-Text">
    Transcribe Amharic and Afaan Oromo audio.
  </Card>
  <Card href="/docs/capabilities/translation" title="Translation">
    Translate between Amharic, Afaan Oromo, and English.
  </Card>
  <Card href="/docs/capabilities/realtime" icon={<Radio />} title="Realtime API">
    Build low-latency, interruption-capable voice conversations over WebSockets.
  </Card>
  <Card href="/docs/get-started/sdks" title="SDKs">
    Configure the Node.js and Python SDKs.
  </Card>
</Cards>
````

The sample code, prompt and printed text are taken verbatim from the current quickstart: lines 120-158 for the code, and the `response_text` value at line 314 for the output. Do not invent other output.

**Verify**:
- `grep -c "<Step>" content/docs/get-started/quickstart.mdx` → `4`
- `grep -c '```' content/docs/get-started/quickstart.mdx` → `18` (9 fenced blocks)
- `grep -c "addis\." content/docs/get-started/quickstart.mdx` → `2` (Node and Python chat calls only)

### Step 5: Wire up navigation and links

1. In `content/docs/meta.json`, change `"get-started/quickstart",` to `"get-started/quickstart",` followed by `"get-started/playground",` and `"get-started/api-overview",` (two new lines, before `"get-started/sdks"`).
2. In `content/docs/get-started/introduction.mdx`, change the "Playground Guide" link target from `/docs/get-started/quickstart` (or the old absolute URL, if plan 004 has not run) to `/docs/get-started/playground`. Change only the URL.
3. If `next.config.mjs` contains a redirect with `source: '/docs/get-started/playground-guide'` (added by plan 001), change its `destination` to `/docs/get-started/playground`.

**Verify**: `node -e "const m=require('./content/docs/meta.json');console.log(m.pages.indexOf('get-started/playground')>m.pages.indexOf('get-started/quickstart'))"` → `true`.

### Step 6: Replace the Quick Start test locks

In `tests/documentation-preservation.test.mjs`:

1. In `preserves original onboarding screenshots and page structures`:
   - Add `const playground = read('content/docs/get-started/playground.mdx');` next to the `quickstart` read.
   - In the image loop, replace `quickstart.includes(image)` with `(quickstart + playground).includes(image)`, keeping the message.
   - Change the asserts for `https://addisassistant.com/playground`, `Open the Addis AI Playground`, `The \*\*Voice Lab\*\* experience`, `Voice Labs` (doesNotMatch) and `Current Addis AI Playground showing…` to run against `playground` instead of `quickstart`.
   - `Open the Addis AI Playground` was a bold link in quickstart line 19 and is now inside the moved block. If plan 003 unbolded it, the regex still matches.
2. In `completes Quick Start capability coverage across REST and Realtime`:
   - Add `const overview = read('content/docs/get-started/api-overview.mdx');`.
   - Point all five assertions above the row loop at `overview`: `REST API requests…`, `https:\/\/api\.addisassistant\.com`, `Realtime voice uses…`, `wss:\/\/relay…`, and the `doesNotMatch` for `All API requests…`. Point the 6-row loop at `overview` too. The new quickstart has no `wss://` URL.
   - Delete the `<Tabs items={['Text Generation', 'Speech-to-Text', 'Translation', 'Multimodal']}>` assert.
   - Replace the four `quickstart` asserts for `addis\.translate\.create`, `source_language`, the multimodal `attachments` line and `attachment_0=@market\.jpg` with the same regexes run against `read('content/docs/capabilities/translation.mdx')` and `read('content/docs/capabilities/multimodal.mdx')` respectively.
   - Keep the Realtime `<Card …>` assert on `quickstart`. The card is still there.
3. Append a new test:

```js
test('keeps Quick Start a four-step tutorial with one request and next steps', () => {
  const quickstart = read('content/docs/get-started/quickstart.mdx');
  assert.equal((quickstart.match(/<Step>/g) ?? []).length, 4);
  assert.match(quickstart, /## Next steps/);
  assert.match(quickstart, /ADDIS_API_KEY/);
  assert.doesNotMatch(quickstart, /<Tabs items=\{\['Text Generation'/);
  assert.ok((quickstart.match(/addis\.[a-z]+\.[a-z]+/g) ?? []).every((call) => call.startsWith('addis.chat')));
});
```

**Verify**: `node --test tests/*.test.mjs` → `# fail 0` for `documentation-preservation` and `docs-invariants`. The `docs-invariants` suite from plan 004 checks that both new pages have a description and that all new links resolve.

### Step 7: Build

**Verify**: `pnpm install && pnpm build` → exit 0. Sidebar icon names must be **canonical** lucide names. Aliases such as `PlayCircle` are listed in the `.d.ts` but are missing from the `icons` object the Fumadocs icon plugin reads, and an unknown name breaks rendering of every page in the sidebar without naming the icon. Before building, confirm both names: `grep -cE 'as (CirclePlay|Network) ' node_modules/lucide-react/dist/esm/icons/index.js` → `2`.

## Test plan

- New test: `keeps Quick Start a four-step tutorial with one request and next steps`.
- The updated locks keep every previously protected fact. Each now points at its new home (playground page, API overview, capability pages).
- `docs-invariants` (plan 004) covers frontmatter and links on the 2 new pages.

## Done criteria

- [ ] `grep -c "<Step>" content/docs/get-started/quickstart.mdx` → `4`
- [ ] `wc -l < content/docs/get-started/quickstart.mdx` → under `160`
- [ ] Both new pages exist and are listed in `content/docs/meta.json`
- [ ] Every image path from the old quickstart appears in quickstart or playground: `for i in playgroundchat api_page api_name secretkey; do grep -l "$i.png" content/docs/get-started/*.mdx; done` prints one file per image
- [ ] `node --test tests/documentation-preservation.test.mjs tests/docs-invariants.test.mjs` → `# fail 0`
- [ ] `pnpm build` exits 0 (or the report says deps could not be installed)
- [ ] `plans/README.md` status row for 005 updated

## STOP conditions

- D7 is not `APPROVED`, or the approved command differs between pages in a way the plan doesn't cover.
- The quickstart no longer matches the section map above (someone else edited it).
- Any snippet you are about to drop does **not** exist on the capability page listed under "Current state". Move it there instead and report.
- `docs-invariants` reports a broken link outside the files in scope.

## Maintenance notes

- `get-started/api-overview.mdx` is the seed of the API Reference "Overview" page in `plans/REVIEW.md` §4. When plan 007's API Reference tab exists, move this page there and add a redirect.
- The expected-output block must be refreshed if the sample prompt changes.
- Visual QA in the PR preview: the four step numbers render, tabs persist the selected language, and the "Next steps" cards have no underlines (plan 003).
