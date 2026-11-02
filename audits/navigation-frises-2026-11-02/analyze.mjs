// Analyse locale uniquement : aucune connexion ni écriture en base.
import { readFileSync, writeFileSync } from 'node:fs';
import { comparableYearsBeforePresent } from '../../server/src/shared/temporal.ts';

const snapshot = JSON.parse(readFileSync(new URL('./snapshot.json', import.meta.url), 'utf8'));
const now = Date.parse(snapshot.audited_at);
const periods = new Map(snapshot.periods.map(p => [p.id, {
  ...p,
  a: comparableYearsBeforePresent(p.start, p.startBP, now),
  b: comparableYearsBeforePresent(p.end, p.endBP, now),
}]));
const stories = new Map(snapshot.stories.map(s => [s.id, s]));
const placements = snapshot.placements.map(row => {
  const path = [];
  const visited = new Set();
  let step = row;
  while (step) {
    if (visited.has(step.period)) return { ...row, cycle: true, path };
    visited.add(step.period);
    path.unshift(step.period);
    step = snapshot.placements.find(p => p.story === row.story && p.period === step.parent);
  }
  return { ...row, path, depth: path.length - 1 };
});
const groups = Map.groupBy(placements, p => `${p.story}:${p.parent ?? ''}`);
const siblingOverlaps = [];
for (const group of groups.values()) {
  for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
    const left = periods.get(group[i].period), right = periods.get(group[j].period);
    if ([left.a, left.b, right.a, right.b].some(v => v === null)) continue;
    if (Math.min(left.a, right.a) - Math.max(left.b, right.b) > 1 / 365.25) {
      siblingOverlaps.push({ story: group[i].story, title: stories.get(group[i].story).title, left: left.label, right: right.label });
    }
  }
}
const anchors = snapshot.anchors.filter(a => a.type === 'period');
const rootMismatch = anchors.filter(a => !stories.get(a.target).roots.some(r => r.id === a.id));
const storyCycles = [];
for (const story of stories.values()) {
  const seen = new Set();
  let current = story;
  while (current) {
    if (seen.has(current.id)) { storyCycles.push(story.id); break; }
    seen.add(current.id);
    current = stories.get(current.parent);
  }
}
const rootCandidates = snapshot.stories.map(s => {
  const root = s.roots.length === 1 ? s.roots[0] : null;
  const matches = snapshot.periods.filter(p => p.label.trim().toLocaleLowerCase('fr') === s.title.trim().toLocaleLowerCase('fr') && snapshot.placements.some(sp => sp.story === s.id && sp.period === p.id));
  return { id: s.id, title: s.title, rootCount: s.roots.length,
    singleRoot: root?.label ?? null, titleMatches: matches.map(p => p.label) };
});
const historicIds = ['Q40244', 'Q12554', 'Q7432', 'Q11769'];
const historicPlacements = placements.filter(p => historicIds.includes(p.period)).map(p => ({ story: p.story, title: stories.get(p.story).title, period: periods.get(p.period).label, depth: p.depth, path: p.path.map(id => periods.get(id).label) }));
const sameDepthExamples = [11, 22, 23].map(storyId => {
  const current = placements.find(p => p.story === storyId && p.period === (storyId === 23 ? 'PER_QUATERNARY' : 'PER_CRETACEOUS'));
  const ordered = placements.filter(p => p.story === storyId && p.depth === current.depth && periods.get(p.period).a !== null)
    .sort((a,b) => periods.get(b.period).a - periods.get(a.period).a);
  const index = ordered.findIndex(p => p.period === current.period);
  return { story: storyId, title: stories.get(storyId).title, current: periods.get(current.period).label, depth: current.depth,
    previous: index > 0 ? periods.get(ordered[index - 1].period).label : null,
    next: index + 1 < ordered.length ? periods.get(ordered[index + 1].period).label : null,
    sameDepth: ordered.map(p => periods.get(p.period).label) };
});
const sharedPeriods = [...Map.groupBy(placements, p => p.period)].filter(([,rows]) => rows.length > 1);
const output = {
  auditedAt: snapshot.audited_at, counts: snapshot.counts,
  periodCycles: placements.filter(p => p.cycle).length, storyCycles,
  missingLocalParents: placements.filter(p => p.parent && !snapshot.placements.some(r => r.story === p.story && r.period === p.parent)).length,
  anchorsMissingFromSource: snapshot.anchors.filter(a => !a.in_source),
  undated: [...periods.values()].filter(p => p.a === null || p.b === null).map(p => ({ id: p.id, label: p.label, start: p.start, end: p.end })),
  reversed: [...periods.values()].filter(p => p.a !== null && p.b !== null && p.a < p.b).map(p => p.label),
  equalBounds: [...periods.values()].filter(p => p.a !== null && p.b !== null && p.a === p.b).map(p => ({ id: p.id, label: p.label, start: p.start, end: p.end, storedStart: p.startBP, storedEnd: p.endBP })),
  rootCandidates, singleRootCount: rootCandidates.filter(s => s.rootCount === 1).length,
  periodAnchorCount: anchors.length, rootMismatchCount: rootMismatch.length,
  rootMismatch: rootMismatch.map(a => ({ source: a.source, target: a.target, title: stories.get(a.target).title, entry: a.label, roots: stories.get(a.target).roots.map(r => r.label) })),
  sharedPeriodCount: sharedPeriods.length,
  sharedPeriodsWithDifferentDepths: sharedPeriods.filter(([,rows]) => new Set(rows.map(p => p.depth)).size > 1).map(([id,rows]) => ({ id, label: periods.get(id).label, placements: rows.map(p => ({ story: p.story, depth: p.depth })) })),
  historicPlacements, historicPeriodsShareStory: [...stories.keys()].filter(id => historicIds.every(pid => placements.some(p => p.story === id && p.period === pid))),
  siblingOverlapCount: siblingOverlaps.length, siblingOverlaps, sameDepthExamples,
};
writeFileSync(new URL('./analysis.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
