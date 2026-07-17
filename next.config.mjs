import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const withMDX = createMDX();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/docs', destination: '/docs/overview', permanent: true },
      { source: '/docs/get-started/introduction', destination: '/docs/overview', permanent: true },
      { source: '/docs/get-started/quick-start', destination: '/docs/get-started/quickstart', permanent: true },
      { source: '/docs/get-started/playground-guide', destination: '/docs/get-started/quickstart', permanent: true },
      { source: '/docs/capabilities/text-generation', destination: '/docs/guides/chat', permanent: true },
      { source: '/docs/capabilities/text-to-speech', destination: '/docs/guides/voice', permanent: true },
      { source: '/docs/capabilities/speech-to-text', destination: '/docs/guides/speech-to-text', permanent: true },
      { source: '/docs/capabilities/translation', destination: '/docs/guides/translation', permanent: true },
      { source: '/docs/capabilities/multimodal', destination: '/docs/guides/multimodal', permanent: true },
      { source: '/docs/capabilities/realtime', destination: '/docs/guides/realtime', permanent: true },
      { source: '/docs/capabilities/realtime-api', destination: '/docs/guides/realtime', permanent: true },
      { source: '/docs/capabilities/:path*', destination: '/docs/overview', permanent: true },
      { source: '/docs/integration/server', destination: '/docs/build/backend', permanent: true },
      { source: '/docs/integration/web', destination: '/docs/build/web', permanent: true },
      { source: '/docs/integration/mobile', destination: '/docs/build/mobile', permanent: true },
      { source: '/docs/integration/voice-interface', destination: '/docs/build/voice-agents', permanent: true },
      { source: '/docs/api-reference/chat-endpoint', destination: '/docs/reference/rest', permanent: true },
      { source: '/docs/api-reference/schemas', destination: '/docs/reference/rest', permanent: true },
      { source: '/docs/technical-reference/api-endpoints', destination: '/docs/reference/rest', permanent: true },
      { source: '/docs/platform/faq', destination: '/docs/overview', permanent: true },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default withMDX(config);
