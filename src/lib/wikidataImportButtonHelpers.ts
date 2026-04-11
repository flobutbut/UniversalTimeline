export const WIKIDATA_IMPORT_QID_REQUIRED_MSG = "Q-id requis pour l'import";

const DEFAULT_IMPORT_ERR = "Erreur lors de l'import depuis Wikidata";

export function wikidataImportErrorMessage(error: unknown, fallback = DEFAULT_IMPORT_ERR): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}
