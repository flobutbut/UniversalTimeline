import { ref, watch } from 'vue';

const STORAGE_KEY = 'frises:open-tabs';

function readStoredIds(): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Frises ouvertes en onglets. La liste survit à un aller-retour vers une autre page dans le même
 * onglet du navigateur ; elle ne contient que des IDs, filtrés contre les frises accessibles chargées.
 */
export function useStoryTabs() {
  const openIds = ref<string[]>(readStoredIds());
  watch(openIds, ids => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* stockage indisponible : onglets en mémoire seulement */ }
  });

  function open(id: string) {
    if (!openIds.value.includes(id)) openIds.value = [...openIds.value, id];
  }

  function reorder(id: string, targetId: string, position: 'before' | 'after') {
    if (id === targetId || !openIds.value.includes(id) || !openIds.value.includes(targetId)) return;
    const next = openIds.value.filter(openId => openId !== id);
    next.splice(next.indexOf(targetId) + (position === 'after' ? 1 : 0), 0, id);
    openIds.value = next;
  }

  /** Ferme un onglet et renvoie la frise à afficher ensuite : inchangée, sa voisine de droite, de gauche, ou la liste (null). */
  function close(id: string, activeId: string | null): string | null {
    const index = openIds.value.indexOf(id);
    if (index < 0) return activeId;
    const next = openIds.value.filter(openId => openId !== id);
    openIds.value = next;
    if (id !== activeId) return activeId;
    return next[index] ?? next[index - 1] ?? null;
  }

  /** Retire les onglets de frises qui ne sont plus accessibles (suppression, changement de compte). */
  function retain(accessibleIds: ReadonlySet<string>) {
    if (openIds.value.some(id => !accessibleIds.has(id))) openIds.value = openIds.value.filter(id => accessibleIds.has(id));
  }

  return { openIds, open, close, retain, reorder };
}
