export const DOCUMENTATION_SITE_NAME = 'Addis AI Documentation';

export const DEFAULT_DOCUMENTATION_TITLE =
  'Addis AI Documentation | APIs & SDKs for African Languages';

export const DEFAULT_METADATA_DESCRIPTION =
  'Build with Addis AI APIs and official Node.js and Python SDKs for text generation, speech-to-text, Addis Voices 2, translation, multimodal reasoning, and realtime voice in Amharic and Afaan Oromo.';

export function formatDocumentationTitle(pageName: string) {
  return `${pageName} | ${DOCUMENTATION_SITE_NAME}`;
}
