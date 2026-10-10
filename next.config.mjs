import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const withMDX = createMDX();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/:path*',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/docs/capabilities/realtime-voice',
        destination: '/docs/capabilities/text-to-speech/streaming',
        permanent: true,
      },
      {
        source: '/docs/playground/realtime-voice',
        destination: '/docs/playground/text-to-speech',
        permanent: true,
      },
      {
        source: '/docs/get-started/quick-start',
        destination: '/docs/get-started/quickstart',
        permanent: true,
      },
      {
        source: '/docs/capabilities/realtime-api',
        destination: '/docs/capabilities/realtime',
        permanent: true,
      },
      {
        source: '/docs/integration-guides/web-applications',
        destination: '/docs/integration/web',
        permanent: true,
      },
      {
        source: '/docs/examples-and-tutorials/basic-chat',
        destination: '/docs/capabilities/text-generation',
        permanent: true,
      },
      {
        source: '/docs/technical-reference/error-codes',
        destination: '/docs/platform/errors',
        permanent: true,
      },
      {
        source: '/docs/faq',
        destination: '/docs/platform/faq',
        permanent: true,
      },
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
        destination: '/docs/api-reference/chat-generate',
        permanent: true,
      },
      {
        source: '/docs/api-reference/schemas',
        destination: '/docs/api-reference/chat-generate',
        permanent: true,
      },
      {
        source: '/docs/get-started/playground-guide',
        destination: '/docs/get-started/playground',
        permanent: true,
      },
    ];
  },
};

export default withMDX(config);
