import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { icons } from "lucide-react";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const docsRoot = path.join(workspaceRoot, "content", "docs");

async function readDocsTree(directory = docsRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readDocsTree(entryPath);
    return entry.name.endsWith(".mdx") ? [entryPath] : [];
  }));
  return files.flat();
}

async function readTextTree(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readTextTree(entryPath, extensions);
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [entryPath] : [];
  }));
  return files.flat();
}

test("navigation stays compact, familiar, and icon-led", async () => {
  const meta = JSON.parse(await readFile(path.join(docsRoot, "meta.json"), "utf8"));
  const navigation = meta.pages.join("\n");

  for (const section of ["Get Started", "Capabilities", "Platform"]) {
    assert.match(navigation.toLowerCase(), new RegExp(section.toLowerCase()));
  }

  const pageSlugs = meta.pages.filter((entry) => !entry.startsWith("---"));
  assert.ok(pageSlugs.length <= 16, `sidebar has ${pageSlugs.length} pages`);
  assert.equal(pageSlugs[0], "announcements");
  assert.deepEqual(pageSlugs.filter((slug) => slug.startsWith("capabilities/")), [
    "capabilities/text-generation",
    "capabilities/text-to-speech",
    "capabilities/text-to-speech-legacy",
    "capabilities/speech-to-text",
    "capabilities/multimodal",
    "capabilities/realtime",
    "capabilities/translation",
  ]);
  for (const slug of pageSlugs) {
    const content = await readFile(path.join(docsRoot, `${slug}.mdx`), "utf8");
    if (slug !== "announcements") {
      const match = content.match(/^---[\s\S]*\nicon: (\S+)/);
      assert.ok(match, `${slug} is missing a sidebar icon`);
      assert.ok(icons[match[1]], `${slug} uses unknown Lucide icon ${match[1]}`);
    }
  }
});

test("canonical content uses am-hamen and keeps raw REST secondary", async () => {
  const docs = await readDocsTree();
  const content = (await Promise.all(docs.map((file) => readFile(file, "utf8")))).join("\n");

  assert.doesNotMatch(content, /am-hiwot/);
  assert.match(content, /am-hamen/);
  assert.match(content, /npm install addisai/);
  assert.match(content, /pip install addisai/);
});

test("announcements appear once, New badges are cyan, and SDK links are compact", async () => {
  const meta = JSON.parse(await readFile(path.join(docsRoot, "meta.json"), "utf8"));
  assert.equal(meta.pages.filter((entry) => entry === "announcements").length, 1);

  const announcements = await readFile(path.join(docsRoot, "announcements.mdx"), "utf8");
  for (const announcement of ["Addis Voice 2 is available", "Official Node.js and Python SDKs", "New chat controls"]) {
    assert.match(announcements, new RegExp(announcement.replaceAll(".", "\\.")));
  }

  const source = await readFile(path.join(workspaceRoot, "lib", "source.ts"), "utf8");
  assert.match(source, /node\.url === '\/docs\/announcements'/);
  assert.match(source, /createElement\('strong'/);
  assert.match(source, /newDocUrls/);
  assert.match(source, /border-fd-primary\/35/);
  assert.doesNotMatch(source, /emerald[^\n]+New documentation/);

  const components = await readFile(path.join(workspaceRoot, "components", "docs.tsx"), "utf8");
  assert.match(components, /function NewBadge/);
  assert.match(components, /text-fd-primary/);
  assert.doesNotMatch(announcements, /<StatusBadge>New<\/StatusBadge>/);

  const layout = await readFile(path.join(workspaceRoot, "lib", "layout.shared.tsx"), "utf8");
  for (const resource of ["API keys", "Node.js on npm", "Python on PyPI", "Node.js on GitHub", "Python on GitHub"]) {
    assert.match(layout, new RegExp(resource.replaceAll(".", "\\.")));
  }
  assert.equal((layout.match(/text: 'SDK resources'/g) ?? []).length, 1);
});

test("HTTP capability guides use direct Node.js, Python, and cURL tabs", async () => {
  for (const slug of ["text-generation", "text-to-speech", "text-to-speech-legacy", "speech-to-text", "translation", "multimodal"]) {
    const content = await readFile(path.join(docsRoot, "capabilities", `${slug}.mdx`), "utf8");
    assert.match(content, /items=\{\['Node\.js', 'Python', 'cURL'\]\}/);
    assert.match(content, /groupId="integration-language"/);
    assert.doesNotMatch(content, /<RestDisclosure>/);
  }
});

test("every capability restores a visible Best Practices section", async () => {
  const capabilityFiles = (await readDocsTree(path.join(docsRoot, "capabilities"))).sort();
  assert.equal(capabilityFiles.length, 7);
  for (const file of capabilityFiles) {
    const content = await readFile(file, "utf8");
    assert.match(content, /^## Best Practices$/m, file);
  }
});

test("introduction and quick start preserve the visual onboarding flow", async () => {
  const introduction = await readFile(path.join(docsRoot, "get-started", "introduction.mdx"), "utf8");
  for (const section of ["Why Addis AI?", "The core engines", "Documentation roadmap", "Community and support"]) {
    assert.match(introduction, new RegExp(section.replace("?", "\\?")));
  }
  assert.match(introduction, /Open Playground/);
  assert.match(introduction, /Start coding/);

  const quickstart = await readFile(path.join(docsRoot, "get-started", "quickstart.mdx"), "utf8");
  for (const image of ["playgroundchat.png", "api_page.png", "api_name.png", "secretkey.png"]) {
    assert.match(quickstart, new RegExp(image.replace(".", "\\.")));
    await assert.doesNotReject(readFile(path.join(workspaceRoot, "public", "images", image)));
  }
  assert.match(quickstart, /You will not be able to view the full key again/);
  assert.match(quickstart, /voiceId: "am-hamen"/);
});

test("MDX pages rely on the layout title instead of repeating a visible H1", async () => {
  const docs = await readDocsTree();
  for (const file of docs) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /^# /m, file);
  }
});

test("legacy Voice 1 endpoint appears only in migration material", async () => {
  const docs = await readDocsTree();
  for (const file of docs) {
    const content = await readFile(file, "utf8");
    if (/\/api\/v1\/audio/.test(content)) {
      assert.match(file, /(platform\/deprecations|capabilities\/text-to-speech-legacy)\.mdx$/);
    }
  }
});

test("machine-readable API reference is present", async () => {
  const openapi = JSON.parse(await readFile(path.join(workspaceRoot, "public", "openapi.json"), "utf8"));
  assert.equal(openapi.openapi, "3.1.0");
  assert.ok(openapi.paths["/v1/chat/completions"]);
  assert.ok(openapi.paths["/api/v1/voice/generations"]);
  const generation = openapi.paths["/api/v1/voice/generations"].post;
  assert.ok(generation.responses["201"]);
  assert.equal(
    generation.responses["201"].content["application/json"].schema.$ref,
    "#/components/schemas/VoiceClipEnvelope",
  );
});

test("Voice 2 raw request documents required fields and signed URL download", async () => {
  const content = await readFile(path.join(docsRoot, "capabilities", "text-to-speech.mdx"), "utf8");
  for (const field of ["language", "voice_id", "client_request_id"]) {
    assert.match(content, new RegExp(`"${field}"`));
  }
  assert.match(content, /\.data\.audio_url/);
  assert.match(content, /curl --location "\$\(jq -r '\.data\.audio_url' voice\.json\)"/);
});

test("SDK examples use the published parameter and response shapes", async () => {
  const docs = await readDocsTree();
  const content = (await Promise.all(docs.map((file) => readFile(file, "utf8")))).join("\n");
  for (const invalid of [
    /\bfiles:\s*\[/,
    /speech\.transcribe\(file=/,
    /sourceLanguage:/,
    /targetLanguage:/,
    /\.translation\b/,
    /preview\.toFile/,
    /preview\.to_file/,
    /estimate\.can_generate/,
    /maxRounds:/,
    /max_rounds=/,
  ]) {
    assert.doesNotMatch(content, invalid);
  }
  assert.match(content, /attachments: \[\{ file:/);
  assert.match(content, /speech\.transcribe\(\{[\s\S]{0,120}audio:/);
  assert.match(content, /from: "om"/);
  assert.match(content, /source="om"/);
});

test("OpenAPI matches multipart, preview, estimate, and clip download contracts", async () => {
  const openapi = JSON.parse(await readFile(path.join(workspaceRoot, "public", "openapi.json"), "utf8"));
  const multipartChat = openapi.paths["/api/v1/chat_generate"].post.requestBody.content["multipart/form-data"].schema;
  assert.deepEqual(multipartChat.required, ["request_data"]);
  const stt = openapi.paths["/api/v2/stt"].post.requestBody.content["multipart/form-data"].schema;
  assert.deepEqual(stt.required, ["audio", "request_data"]);
  assert.equal(
    openapi.paths["/api/v1/voice/voices/{voice_id}/preview"].get.responses["200"].content["application/json"].schema.$ref,
    "#/components/schemas/VoicePreviewEnvelope",
  );
  assert.ok(openapi.paths["/api/v1/voice/clips/{clip_id}/file"]);
  assert.equal(openapi.components.schemas.VoiceEstimate.properties.estimated_billable_seconds.type, "number");
  assert.ok(openapi.paths["/api/v1/chat_generate"].post.requestBody.content["application/json"]);
  const nativeChatRequest = openapi.components.schemas.NativeChatRequest;
  assert.equal(nativeChatRequest.required, undefined);
  for (const field of ["prompt", "messages", "model", "metadata"]) {
    assert.ok(nativeChatRequest.properties[field], `NativeChatRequest is missing ${field}`);
  }
  assert.ok(openapi.components.schemas.Voice.properties.preview_audio_url);
  assert.equal(openapi.components.schemas.Voice.properties.preview_url, undefined);
  assert.equal(
    openapi.paths["/api/v2/stt"].post.responses["200"].content["application/json"].schema.$ref,
    "#/components/schemas/TranscriptionEnvelope",
  );
});

test("versioned pricing uses native minute-based Voice 2 billing", async () => {
  const pricing = JSON.parse(await readFile(path.join(workspaceRoot, "data", "pricing.v1.json"), "utf8"));
  assert.equal(pricing.native_currency, "ETB");
  const voice = pricing.models.find((model) => model.id === "addis-voice");
  assert.deepEqual(voice.lines[0], {
    amount: 5,
    currency: "ETB",
    unit: "/ min",
    sub: "generated audio",
  });
  assert.match(pricing.signup_credit.eligibility, /eligible new accounts/i);
  for (const model of pricing.models) {
    for (const field of ["id", "name", "modality", "blurb", "languages", "status", "lines"]) {
      assert.ok(Object.hasOwn(model, field), `${model.id} is missing canonical field ${field}`);
    }
  }
});

test("pricing data is build-time only and is not published as JSON", async () => {
  await assert.rejects(readFile(path.join(workspaceRoot, "public", "pricing", "v1.json"), "utf8"));
  const component = await readFile(path.join(workspaceRoot, "components", "pricing-table.tsx"), "utf8");
  assert.match(component, /@\/data\/pricing\.v1\.json/);
  assert.doesNotMatch(component, /fetch\(|ADDIS_PRICING_URL|api\/public\/pricing/);
});

test("public assets cannot reintroduce browser API keys or stale voices", async () => {
  const files = await readTextTree(path.join(workspaceRoot, "public"), [".html", ".js", ".json", ".txt", ".xml"]);
  const content = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(content, /am-hiwot/);
  assert.doesNotMatch(content, /apiKey=YOUR_API_KEY|dangerouslyAllowBrowser\s*:\s*true/i);
  assert.doesNotMatch(content, /localStorage[\s\S]{0,160}(api.?key|ADDIS_API_KEY)/i);
});

test("every Python documentation block compiles and the mocked SDK flow executes", async () => {
  const docs = await readDocsTree();
  const blocks = [];
  for (const file of docs) {
    const content = await readFile(file, "utf8");
    for (const match of content.matchAll(/```python\n([\s\S]*?)```/g)) blocks.push({ file, code: match[1] });
  }
  assert.ok(blocks.length > 0);
  for (const block of blocks) {
    const result = spawnSync("python3", ["-c", "import sys; compile(sys.stdin.read(), '<docs>', 'exec')"], {
      input: block.code,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `${block.file}: ${result.stderr}`);
  }

  const smoke = spawnSync("uv", [
    "run",
    "--with",
    "addisai==0.1.1",
    path.join(workspaceRoot, "tests", "python-sdk-smoke.py"),
  ], {
    encoding: "utf8",
  });
  assert.equal(smoke.status, 0, smoke.stderr);
});

test("canonical capability routes are pages and only renamed routes redirect", async () => {
  const config = await readFile(path.join(workspaceRoot, "next.config.mjs"), "utf8");
  for (const route of [
    "/docs",
    "/docs/get-started/quick-start",
    "/docs/guides/voice",
    "/docs/core-concepts/function-calling",
    "/docs/integration/server",
    "/docs/api-reference/chat-endpoint",
  ]) {
    assert.match(config, new RegExp(`source: '${route.replaceAll("/", "\\/")}'[^\n]+permanent: true`));
  }
  for (const canonical of [
    "/docs/capabilities/text-generation",
    "/docs/capabilities/text-to-speech",
    "/docs/capabilities/speech-to-text",
    "/docs/capabilities/multimodal",
    "/docs/capabilities/realtime",
    "/docs/capabilities/translation",
  ]) {
    assert.doesNotMatch(config, new RegExp(`source: '${canonical.replaceAll("/", "\\/")}'`));
  }
});

test("interactive audio tools are restored without permanent browser credentials", async () => {
  const legacy = await readFile(path.join(docsRoot, "capabilities", "text-to-speech-legacy.mdx"), "utf8");
  assert.match(legacy, /<Base64Player \/>/);

  const realtime = await readFile(path.join(docsRoot, "capabilities", "realtime.mdx"), "utf8");
  assert.match(realtime, /<RealtimeVoiceDemo \/>/);
  assert.match(realtime, /\/realtime-demo\.html/);

  const demoFiles = [
    await readFile(path.join(workspaceRoot, "components", "realtime-voice-demo.tsx"), "utf8"),
    await readFile(path.join(workspaceRoot, "public", "realtime-demo.html"), "utf8"),
  ].join("\n");
  assert.match(demoFiles, /short-lived user JWT/i);
  assert.match(demoFiles, /setupComplete/);
  assert.match(demoFiles, /interrupted/);
  assert.doesNotMatch(demoFiles, /apiKey|ADDIS_API_KEY|sk_/);
});
