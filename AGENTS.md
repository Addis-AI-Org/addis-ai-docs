# Codex instructions for this documentation repository

- Never install Chrome, Chromium, Playwright, Puppeteer, or any browser/runtime dependency. If browser-based QA is unavailable, report that limitation and use the existing project checks.
- Do not run lint, typecheck, tests, or builds after each subtask. Finish the implementation first, then run the verification suite once.
- When requirements are ambiguous, ask the user instead of making a product, content, navigation, authentication, pricing, or API-contract assumption.
- Preserve existing human-authored documentation structure and content. Replace only the sections explicitly requested, and add new material without deleting existing sections unless the user explicitly authorizes removal.
- Only modify files in this `addis-ai-docs` repository unless the user explicitly authorizes a different repository.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
