# Addis AI documentation

Canonical technical documentation for Addis AI, built with Next.js and Fumadocs. The official Node.js and Python SDKs are the primary integration path; raw REST is secondary.

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000/docs/get-started/introduction`.

## Quality gates

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm audit --prod
pnpm --package=@redocly/cli dlx redocly lint public/openapi.json
```

`pnpm test` uses [uv](https://docs.astral.sh/uv/) to execute the published `addisai==0.1.1` Python package against an in-memory HTTP transport.

Content lives in `content/docs`. The public OpenAPI contract is `public/openapi.json`; private build-time pricing data is stored in `data/pricing.v1.json`.

Before publishing, verify live API behavior, the production `am-hamen` voice, package examples, pricing, redirects, and external links. This repository does not publish the SDK packages or modify the API/developer-portal projects.

Release notes belong in both `content/docs/announcements.mdx` for developers and `content/docs/platform/changelog.mdx` for contract history. Keep the sidebar compact: detailed concept and reference pages should be linked from the relevant guide rather than added to the primary navigation by default.
