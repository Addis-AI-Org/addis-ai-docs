// Absolute origin for metadata, sitemaps, and AI endpoints. Production falls
// back to the public docs domain so generated URLs never point at localhost.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://docs.addisassistant.com'
    : 'http://localhost:3000');
