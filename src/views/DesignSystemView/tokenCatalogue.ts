import usages from '@/styles/variables.css?raw';
import primitives from '@/styles/primitives.css?raw';

type TokenRow = { name: string; kind: 'color' | 'other' };
export type TokenSection = { id: 'tokens-colors' | 'tokens-typography' | 'tokens-layout'; sectionTitle: string; groups: { title: string; rows: TokenRow[] }[] };
const names = (css: string) => [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]))];
const tokens = names(usages);
const rows = (values: string[], kind: TokenRow['kind']): TokenRow[] => values.map(name => ({ name, kind }));
export const tokenSections: TokenSection[] = [
  { id: 'tokens-colors', sectionTitle: 'Couleurs', groups: [
    { title: 'Rôles d’usage — clair / sombre', rows: rows(tokens.filter(name => name.startsWith('--color-') || name.startsWith('--overlay-')), 'color') },
    { title: 'Primitives — valeurs immuables', rows: rows(names(primitives), 'color') },
  ] },
  { id: 'tokens-typography', sectionTitle: 'Typographie', groups: [
    { title: 'Styles par rôle — famille, taille, interligne et graisse', rows: rows(tokens.filter(name => name.startsWith('--type-')), 'other') },
    { title: 'Échelle typographique', rows: rows(tokens.filter(name => /^--(?:font-|line-height-)/.test(name)), 'other') },
  ] },
  { id: 'tokens-layout', sectionTitle: 'Espacements & effets', groups: [
    { title: 'Dimensions et espacements', rows: rows(tokens.filter(name => /^--(?:spacing-|control-|field-|textarea-|list-row-)/.test(name)), 'other') },
    { title: 'Rayons, ombres, transitions et couches', rows: rows(tokens.filter(name => /^--(?:radius-|shadow-|transition-|z-index-)/.test(name)), 'other') },
  ] },
];
