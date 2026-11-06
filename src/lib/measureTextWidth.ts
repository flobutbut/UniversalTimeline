/** Largeur du texte complet, indépendamment de son ellipse et de la largeur du bloc. */
export function measureTextWidth(element: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  return typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect().width : element.scrollWidth;
}

/** Largeurs utiles d'une carte de période : nom (suivi de son lien Wikipédia si demandé), et dates. */
export function periodTextWidths(card: HTMLElement, withLink = true): number[] {
  const title = card.querySelector<HTMLElement>('.period-card__title-action');
  const link = withLink ? card.querySelector<HTMLElement>('.period-card__wikipedia') : null;
  const header = card.querySelector<HTMLElement>('.period-header');
  const gap = header ? parseFloat(getComputedStyle(header).columnGap) || 0 : 0;
  const titleWidth = title ? measureTextWidth(title) + (link ? link.offsetWidth + gap : 0) : 0;
  return [titleWidth, ...Array.from(card.querySelectorAll<HTMLElement>('.period-info'), measureTextWidth)];
}
