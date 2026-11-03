import { comparableYearsBeforePresent } from '@temporal';
import { getStoryPeriodParentId } from '@/lib/storyPeriodParent';
import type { ListEvent, ListPeriod, Story } from '@/types/database';

/** Règles d’architecture des frises (Documentation/CREATION-DE-FRISES.md, section 2), appliquées par l’interface. */

/** Au-delà, un niveau se lit mal : regrouper ou découper (3 à 10 éléments par niveau). */
export const MAX_LEVEL_SIZE = 10;
/** Règle 3 : signes qu’une période doit devenir une sous-frise. */
export const PROMOTION_SUB_PERIODS = 10;
export const PROMOTION_LEVELS = 2;
export const PROMOTION_EVENTS = 10;

export interface YearsRange { start: number; end: number }
type DatedPeriod = Pick<ListPeriod, 'id' | 'startDate' | 'endDate' | 'startYearsBP' | 'endYearsBP' | 'storyParentId'> & Partial<Pick<ListPeriod, 'label'>>;
type DatedEvent = Pick<ListEvent, 'id' | 'date' | 'dateYearsBP'>;
type StoryTreeNode = { id: string; parentStoryId?: string | null; title?: { fr: string; en: string } };

const label = (item: { id: string; label?: { fr: string; en: string }; title?: { fr: string; en: string } }) =>
  item.label?.fr || item.label?.en || item.title?.fr || item.title?.en || item.id;
/** Mélanger une date calendaire et une date géologique crée un petit écart : tolérer 1e-5 de l’âge. */
const tolerance = (range: YearsRange) => Math.max(Math.abs(range.start) * 1e-5, 1e-6);

export function periodRange(period: DatedPeriod, now: number): YearsRange | null {
  const start = comparableYearsBeforePresent(period.startDate, period.startYearsBP, now);
  const end = comparableYearsBeforePresent(period.endDate, period.endYearsBP, now);
  return start !== null && end !== null && start >= end ? { start, end } : null;
}
/** Dates saisies du sujet ; une seule borne connue vaut un instant. */
export function subjectRange(start: string, end: string, now: number): YearsRange | null {
  const a = start.trim() ? comparableYearsBeforePresent(start, null, now) : null;
  const b = end.trim() ? comparableYearsBeforePresent(end, null, now) : null;
  if (a === null && b === null) return null;
  const first = a ?? b!, last = b ?? a!;
  return first >= last ? { start: first, end: last } : null;
}
/** Bornes du contenu d’une frise : sa plus ancienne et sa plus récente date. */
export function contentRange(periods: readonly DatedPeriod[], events: readonly DatedEvent[], now: number): YearsRange | null {
  let start = -Infinity, end = Infinity;
  for (const period of periods) {
    const range = periodRange(period, now);
    if (range) { start = Math.max(start, range.start); end = Math.min(end, range.end); }
  }
  for (const event of events) {
    const bp = comparableYearsBeforePresent(event.date, event.dateYearsBP, now);
    if (bp !== null) { start = Math.max(start, bp); end = Math.min(end, bp); }
  }
  return Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null;
}
const contains = (outer: YearsRange, inner: YearsRange) => {
  const margin = tolerance(outer);
  return outer.start + margin >= inner.start && outer.end - margin <= inner.end;
};

function periodTree(periods: readonly DatedPeriod[]) {
  const ids = new Set(periods.map(period => period.id));
  const parent = new Map<string, string | null>();
  const children = new Map<string | null, string[]>();
  for (const period of periods) {
    const raw = getStoryPeriodParentId(period);
    const id = raw && ids.has(raw) && raw !== period.id ? raw : null;
    parent.set(period.id, id);
    children.set(id, [...(children.get(id) ?? []), period.id]);
  }
  const depth = (id: string) => { let level = 0, current = parent.get(id) ?? null; const seen = new Set([id]); while (current && !seen.has(current)) { seen.add(current); level++; current = parent.get(current) ?? null; } return level; };
  const descendants = (id: string) => {
    const out: string[] = [], seen = new Set([id]);
    for (let queue = [...(children.get(id) ?? [])]; queue.length;) {
      const next = queue.shift()!;
      if (seen.has(next)) continue;
      seen.add(next); out.push(next); queue.push(...(children.get(next) ?? []));
    }
    return out;
  };
  /** Nombre de niveaux sous la période (0 pour une feuille). */
  const levelsBelow = (id: string): number => {
    let levels = 0;
    for (let frontier = children.get(id) ?? [], seen = new Set([id]); frontier.length; levels++) {
      frontier.forEach(item => seen.add(item));
      frontier = frontier.flatMap(item => children.get(item) ?? []).filter(item => !seen.has(item));
    }
    return levels;
  };
  return { parent, children, depth, descendants, levelsBelow };
}

/** L’ancre proposée : la période la plus profonde de la frise parente qui contient les dates du sujet. */
export function suggestAnchorPeriod(periods: readonly DatedPeriod[], subject: YearsRange | null, now: number): string | null {
  if (!subject) return null;
  const tree = periodTree(periods);
  let best: { id: string; depth: number; span: number } | null = null;
  for (const period of periods) {
    const range = periodRange(period, now);
    if (!range || !contains(range, subject)) continue;
    const candidate = { id: period.id, depth: tree.depth(period.id), span: range.start - range.end };
    if (!best || candidate.depth > best.depth || (candidate.depth === best.depth && candidate.span < best.span)) best = candidate;
  }
  return best?.id ?? null;
}

const parentMap = (stories: readonly StoryTreeNode[]) => new Map(stories.map(story => [story.id, story.parentStoryId ?? null]));
/** Distance de `descendant` à son ancêtre `ancestor` dans l’arbre des frises, ou null. */
function storyDistance(parents: Map<string, string | null>, descendant: string, ancestor: string): number | null {
  let distance = 0, current: string | null = descendant;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (current === ancestor) return distance;
    seen.add(current); distance++; current = parents.get(current) ?? null;
  }
  return null;
}
/** La racine (« Univers moderne ») : la frise sans parente qui a le plus de descendantes. */
export function isTreeRoot(storyId: string, stories: readonly StoryTreeNode[]): boolean {
  const parents = parentMap(stories);
  if (parents.get(storyId)) return false;
  const size = (rootId: string) => stories.filter(story => story.id !== rootId && storyDistance(parents, story.id, rootId) !== null).length;
  const own = size(storyId);
  return own > 0 && stories.every(story => story.id === storyId || parents.get(story.id) || size(story.id) <= own);
}

const anchoredPeriodIds = (story: Pick<Story, 'childStories'>) =>
  new Set((story.childStories ?? []).flatMap(child => child.anchors.filter(anchor => anchor.type === 'period').map(anchor => anchor.id)));

export type StoryWarningKind = 'crowded-level' | 'overflow' | 'duplicated-structure' | 'skipping-entry' | 'public-draft';
export interface StoryWarning { kind: StoryWarningKind; message: string; periodId?: string; storyId?: string }
type WarningStory = Pick<Story, 'id' | 'periods' | 'childStories' | 'parentStories' | 'relatedStories' | 'isPublic' | 'parentStoryId'>;

/** Avertissements non bloquants sur la structure d’une frise. */
export function storyStructureWarnings(story: WarningStory, stories: readonly StoryTreeNode[], now = Date.now()): StoryWarning[] {
  const warnings: StoryWarning[] = [];
  const periods = story.periods ?? [];
  const byId = new Map(periods.map(period => [period.id, period]));
  const tree = periodTree(periods);
  for (const [parentId, ids] of tree.children) {
    if (ids.length <= MAX_LEVEL_SIZE) continue;
    const parent = parentId ? byId.get(parentId) : undefined;
    warnings.push({ kind: 'crowded-level', ...(parentId ? { periodId: parentId } : {}), message: parent
      ? `« ${label(parent)} » regroupe ${ids.length} sous-périodes : regroupez les phases successives sous une période englobante, ou faites-en une sous-frise.`
      : `Le premier niveau compte ${ids.length} périodes : regroupez les phases successives sous des périodes englobantes, ou découpez la frise.` });
  }
  for (const period of periods) {
    const parentId = tree.parent.get(period.id);
    const parent = parentId ? byId.get(parentId) : undefined;
    const inner = periodRange(period, now), outer = parent && periodRange(parent, now);
    if (parent && inner && outer && !contains(outer, inner)) warnings.push({ kind: 'overflow', periodId: period.id,
      message: `« ${label(period)} » déborde des dates de « ${label(parent)} » : remontez-la d’un niveau ou élargissez le parent.` });
  }
  const parents = parentMap(stories);
  const subStories = (story.childStories ?? []).filter(child => !parents.size || parents.get(child.id) === story.id);
  for (const child of subStories) {
    const shared = new Set((story.relatedStories ?? []).find(related => related.id === child.id)?.periodIds ?? []);
    for (const anchor of child.anchors) {
      const period = anchor.type === 'period' ? byId.get(anchor.id) : undefined;
      const duplicated = period ? tree.descendants(period.id).filter(id => shared.has(id)) : [];
      if (period && duplicated.length) warnings.push({ kind: 'duplicated-structure', periodId: period.id, storyId: child.id,
        message: `${duplicated.length} sous-période${duplicated.length > 1 ? 's' : ''} de « ${label(period)} » existe${duplicated.length > 1 ? 'nt' : ''} aussi dans la sous-frise « ${label(child)} » : retirez-les d’ici, la période reste l’ancre.` });
    }
  }
  const titles = new Map(stories.map(item => [item.id, item]));
  const skips = (source: string, target: string) => (storyDistance(parents, target, source) ?? 0) > 1 || (storyDistance(parents, source, target) ?? 0) > 1;
  const via = (source: string, target: string) => {
    const down = storyDistance(parents, target, source) !== null;
    const step = titles.get(parents.get(down ? target : source) ?? '');
    return step ? ` : passez par « ${label(step)} »` : '';
  };
  for (const child of story.childStories ?? []) {
    if (parents.get(child.id) !== story.id && skips(story.id, child.id)) warnings.push({ kind: 'skipping-entry', storyId: child.id,
      message: `Le point d’entrée vers « ${label(child)} » saute des niveaux de l’arbre${via(story.id, child.id)}.` });
  }
  for (const source of story.parentStories ?? []) {
    if (source.id !== (story.parentStoryId ?? parents.get(story.id)) && skips(source.id, story.id)) warnings.push({ kind: 'skipping-entry', storyId: source.id,
      message: `Le point d’entrée depuis « ${label(source)} » saute des niveaux de l’arbre${via(source.id, story.id)}.` });
  }
  if (story.isPublic && !(story.parentStoryId ?? parents.get(story.id)) && !isTreeRoot(story.id, stories)) warnings.push({ kind: 'public-draft',
    message: 'Cette frise publique n’a pas de frise parente : rattachez-la à la frise qui contient son sujet.' });
  return warnings;
}

export interface PromotionCandidate { periodId: string; reasons: string[] }
/** Règle 3 : une période devient une sous-frise (plus de 10 sous-périodes, plus de deux niveaux, une dizaine d’événements). */
export function promotionCandidates(story: Pick<Story, 'periods' | 'events' | 'childStories'>, now = Date.now()): PromotionCandidate[] {
  const periods = story.periods ?? [];
  const tree = periodTree(periods);
  const roots = tree.children.get(null) ?? [];
  const anchored = anchoredPeriodIds(story);
  const eventYears = (story.events ?? []).map(event => comparableYearsBeforePresent(event.date, event.dateYearsBP, now)).filter((bp): bp is number => bp !== null);
  const out: PromotionCandidate[] = [];
  for (const period of periods) {
    // La seule racine est déjà le sujet de la frise ; une ancre ouvre déjà une sous-frise.
    if (anchored.has(period.id) || (roots.length === 1 && roots[0] === period.id)) continue;
    const reasons: string[] = [];
    const sub = tree.descendants(period.id).length, levels = tree.levelsBelow(period.id);
    if (sub > PROMOTION_SUB_PERIODS) reasons.push(`${sub} sous-périodes`);
    if (levels > PROMOTION_LEVELS) reasons.push(`${levels} niveaux de sous-périodes`);
    const range = periodRange(period, now);
    const events = range ? eventYears.filter(bp => bp <= range.start && bp >= range.end).length : 0;
    if (events >= PROMOTION_EVENTS) reasons.push(`${events} événements dans ses dates`);
    if (reasons.length) out.push({ periodId: period.id, reasons });
  }
  return out;
}

export type StoryRole = 'portail' | 'recit' | 'parcours';
export interface DeducedRole { role: StoryRole; label: string; description: string; openings: number; draft: boolean }
/** Le rôle se déduit de la structure : il n’a pas à être saisi. */
export function deduceStoryRole(story: Pick<Story, 'id' | 'periods' | 'childStories' | 'navigationContexts' | 'parentStoryId'>, stories: readonly StoryTreeNode[] = []): DeducedRole {
  const roots = periodTree(story.periods ?? []).children.get(null) ?? [];
  const anchored = anchoredPeriodIds(story);
  const openings = (story.periods ?? []).filter(period => anchored.has(period.id)).length;
  const draft = !(story.parentStoryId ?? parentMap(stories).get(story.id)) && !isTreeRoot(story.id, stories);
  const subFrises = `${openings} période${openings > 1 ? 's' : ''} ouvre${openings > 1 ? 'nt' : ''} sur une autre frise`;
  if ((story.navigationContexts ?? []).some(context => context.id === story.id && context.presentations.length > 0)) {
    return { role: 'parcours', label: 'Parcours', description: 'Une lecture qui traverse d’autres frises dans l’ordre de ses périodes, sans posséder leur contenu.', openings, draft };
  }
  const anchoredRoots = roots.filter(id => anchored.has(id)).length;
  if (roots.length && anchoredRoots * 2 >= roots.length) {
    return { role: 'portail', label: 'Portail', description: `Ses grandes périodes ouvrent sur des sous-frises (${subFrises}).`, openings, draft };
  }
  return { role: 'recit', label: 'Récit', description: openings ? `Un sujet raconté en détail ; ${subFrises}.` : 'Un sujet raconté en détail, par ses périodes et ses événements.', openings, draft };
}
