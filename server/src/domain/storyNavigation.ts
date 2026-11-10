import type { StoryNavigationSnapshot, NavigationRows } from '../shared/storyNavigation.js';

export function buildNavigationSnapshots(rows: NavigationRows): StoryNavigationSnapshot[] {
  const titles = new Map(rows.stories.map(s => [String(s.id), { fr: s.title_fr || s.title_en || '', en: s.title_en || s.title_fr || '' }]));
  const nodes = new Map(rows.stories.map(s => [String(s.id), { id: String(s.id), parentStoryId: s.parent_story_id == null ? null : String(s.parent_story_id),
    periods: [], events: [], childStories: [], parentStories: [], relatedStories: [] } as StoryNavigationSnapshot]));
  const memberships = { period: new Map<string, Set<string>>(), event: new Map<string, Set<string>>() };
  for (const p of rows.periods) {
    const node = nodes.get(String(p.story_id)); if (!node) continue;
    node.periods.push({ id: p.period_id, storyParentId: p.parent_period_id });
    const bucket = memberships.period.get(p.period_id) ?? new Set<string>(); bucket.add(node.id); memberships.period.set(p.period_id, bucket);
  }
  for (const e of rows.events) {
    const node = nodes.get(String(e.story_id)); if (!node) continue;
    node.events.push({ id: e.event_id });
    const bucket = memberships.event.get(e.event_id) ?? new Set<string>(); bucket.add(node.id); memberships.event.set(e.event_id, bucket);
  }
  for (const l of rows.links) {
    const source = nodes.get(String(l.source)), target = nodes.get(String(l.target));
    if (!source || !target || source.id === target.id) continue;
    let link = source.childStories!.find(c => c.id === target.id);
    if (!link) { link = { id: target.id, title: titles.get(target.id)!, anchors: [], atRoot: false }; source.childStories!.push(link); }
    if (!l.kind || !l.anchor) link.atRoot = true;
    else if (!link.anchors.some(a => a.type === l.kind && a.id === l.anchor)) link.anchors.push({ type: l.kind, id: l.anchor });
    if (!target.parentStories!.some(p => p.id === source.id)) target.parentStories!.push({ id: source.id });
  }
  for (const [kind, entities] of Object.entries(memberships) as Array<['period' | 'event', Map<string, Set<string>>]>) {
    for (const [entity, ids] of entities) for (const sourceId of ids) for (const targetId of ids) {
      if (sourceId === targetId) continue;
      const source = nodes.get(sourceId)!;
      let related = source.relatedStories!.find(r => r.id === targetId);
      if (!related) { related = { id: targetId, title: titles.get(targetId)!, periodIds: [], eventIds: [] }; source.relatedStories!.push(related); }
      related[kind === 'period' ? 'periodIds' : 'eventIds'].push(entity);
    }
  }
  return [...nodes.values()];
}
