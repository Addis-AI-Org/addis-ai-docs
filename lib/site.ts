// Production builds fall back to the public docs domain so absolute URLs
// (og:image, sitemap, canonical) never point at localhost.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://docs.addisassistant.com'
    : 'http://localhost:3000')
).replace(/\/$/, '');

/**
 * The company entity shared with addisai.ch and addisassistant.com. Search
 * engines and AI assistants merge what they read into one "Addis AI" only
 * when every site declares the same @id, sentence and profiles.
 */
export const ORGANIZATION_ID = 'https://addisai.ch/#organization';

export const ORGANIZATION_DEFINITION =
  'Addis AI builds Amharic and Afaan Oromo speech-to-text, text-to-speech and language models for developers and enterprises.';
