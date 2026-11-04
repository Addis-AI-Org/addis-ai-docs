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
  'Addis AI builds speech and language AI for Ethiopian and African languages: voices and speech-to-text in Amharic, Afaan Oromo, Tigrinya, Swahili, Hausa, Sidama and Wolaytta.';

/**
 * Languages with Addis AI speech products (Scribe speech-to-text and Addis
 * Voices 2), as BCP 47 codes. Kept equal to data/addis-languages.json by
 * tests/language-drift.test.mjs.
 */
export const SPEECH_LANGUAGE_CODES = ['am', 'om', 'ti', 'sw', 'ha', 'sid', 'wal'];

/** Organization JSON-LD for every page (see app/layout.tsx). */
export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'Addis AI',
  url: 'https://addisai.ch',
  description: ORGANIZATION_DEFINITION,
  knowsLanguage: SPEECH_LANGUAGE_CODES,
};
