export const DOCUMENTATION_SITE_NAME = 'Addis AI Documentation';

export const DEFAULT_DOCUMENTATION_TITLE =
  'Addis AI Documentation | APIs & SDKs for African Languages';

export const DEFAULT_METADATA_DESCRIPTION =
  'Addis AI APIs and SDKs: speech-to-text in Amharic, Afaan Oromo, Tigrinya, Swahili, Hausa, Sidama, Wolaytta and English; Addis Voices 2 in all but English.';

export function formatDocumentationTitle(pageName: string) {
  return `${pageName} | ${DOCUMENTATION_SITE_NAME}`;
}
