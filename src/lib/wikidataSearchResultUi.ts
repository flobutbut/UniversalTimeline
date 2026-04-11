const WIKIDATA_WIKI_BASE = 'https://www.wikidata.org/wiki';

export function wikidataEntityWikiUrl(entityId: string): string {
  return `${WIKIDATA_WIKI_BASE}/${entityId}`;
}

export function searchResultSelectionToastMessage(label: string): string {
  return `Sélection de ${label}`;
}

export function searchResultSavedToastMessage(label: string): string {
  return `${label} sauvegardé`;
}

export function searchResultWikidataOpenedToastMessage(): string {
  return 'Ouverture de Wikidata dans un nouvel onglet';
}
