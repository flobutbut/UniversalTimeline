/** Clic sur le fond overlay (pas le contenu de la modale). */
export function isModalOverlayDirectClick(e: MouseEvent): boolean {
  return e.target === e.currentTarget;
}

/** Fermeture SelectShell sur Escape lorsque le panneau est ouvert. */
export function shouldDismissOpenSelectOnKeydown(isOpen: boolean, e: KeyboardEvent): boolean {
  return isOpen && e.key === 'Escape';
}
