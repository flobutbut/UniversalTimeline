/**
 * Identifiant court pour attributs HTML `id` (liaison label / contrôle).
 * Préfixe lisible au débogage ; segment aléatoire base36.
 */
export function generateDomUid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}
