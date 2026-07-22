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
      { source: '/docs', destination: '/docs/get-started/introduction', permanent: true },
      { source: '/docs/overview', destination: '/docs/get-started/introduction', permanent: true },
      { source: '/docs/get-started/quick-start', destination: '/docs/get-started/quickstart', permanent: true },
      { source: '/docs/get-started/playground-guide', destination: '/docs/get-started/quickstart', permanent: true },
      { source: '/docs/guides/chat', destination: '/docs/capabilities/text-generation', permanent: true },
      { source: '/docs/guides/voice', destination: '/docs/capabilities/text-to-speech', permanent: true },
      { source: '/docs/guides/speech-to-text', destination: '/docs/capabilities/speech-to-text', permanent: true },
      { source: '/docs/guides/translation', destination: '/docs/capabilities/translation', permanent: true },
      { source: '/docs/guides/multimodal', destination: '/docs/capabilities/multimodal', permanent: true },
      { source: '/docs/guides/realtime', destination: '/docs/capabilities/realtime', permanent: true },
      { source: '/docs/capabilities/realtime-api', destination: '/docs/capabilities/realtime', permanent: true },
      { source: '/docs/capabilities/conversation', destination: '/docs/capabilities/text-generation#messages-and-conversation-state', permanent: true },
      { source: '/docs/capabilities/vision', destination: '/docs/capabilities/multimodal', permanent: true },
      { source: '/docs/integration/server', destination: '/docs/get-started/sdks', permanent: true },
      { source: '/docs/integration/web', destination: '/docs/get-started/sdks', permanent: true },
      { source: '/docs/integration/mobile', destination: '/docs/get-started/sdks', permanent: true },
      { source: '/docs/integration/voice-interface', destination: '/docs/get-started/sdks#voice-agent-orchestration', permanent: true },
      { source: '/docs/core-concepts/messages', destination: '/docs/capabilities/text-generation#messages-and-conversation-state', permanent: true },
      { source: '/docs/core-concepts/system-instructions', destination: '/docs/capabilities/text-generation#system-instructions-and-personas', permanent: true },
      { source: '/docs/core-concepts/personas', destination: '/docs/capabilities/text-generation#system-instructions-and-personas', permanent: true },
      { source: '/docs/core-concepts/function-calling', destination: '/docs/capabilities/text-generation#function-calling', permanent: true },
      { source: '/docs/core-concepts/streaming', destination: '/docs/capabilities/text-generation#streaming', permanent: true },
      { source: '/docs/core-concepts/files', destination: '/docs/capabilities/text-generation#files-images-and-audio-input', permanent: true },
      { source: '/docs/api-reference/chat-endpoint', destination: '/docs/reference/rest', permanent: true },
      { source: '/docs/api-reference/schemas', destination: '/docs/reference/rest', permanent: true },
      { source: '/docs/technical-reference/api-endpoints', destination: '/docs/reference/rest', permanent: true },
      { source: '/docs/platform/limits', destination: '/docs/platform/errors#limits', permanent: true },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default withMDX(config);
