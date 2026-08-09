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
  async redirects() {
    return [
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
    ];
  },
};

export default withMDX(config);
