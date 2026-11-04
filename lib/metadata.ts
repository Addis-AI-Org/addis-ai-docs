export const DOCUMENTATION_SITE_NAME = 'Addis AI Documentation';

export const DEFAULT_DOCUMENTATION_TITLE =
  'Addis AI Documentation | APIs & SDKs for African Languages';

export const DEFAULT_METADATA_DESCRIPTION =
  'Addis AI APIs and Node.js and Python SDKs for speech-to-text and Addis Voices 2 in Amharic, Afaan Oromo, Tigrinya, Swahili, Hausa, Sidama and Wolaytta.';

export function formatDocumentationTitle(pageName: string) {
  return `${pageName} | ${DOCUMENTATION_SITE_NAME}`;
}
