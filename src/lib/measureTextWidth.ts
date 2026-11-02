/** Largeur du texte complet, indépendamment de son ellipse et de la largeur du bloc. */
export function measureTextWidth(element: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  return typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect().width : element.scrollWidth;
}
