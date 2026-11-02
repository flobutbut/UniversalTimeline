// Lecture locale du snapshot public uniquement ; aucune écriture dans l'application ou en base.
import { readFileSync, writeFileSync } from 'node:fs';
import { comparableYearsBeforePresent } from '../../server/src/shared/temporal.ts';

const snapshot = JSON.parse(readFileSync(new URL('./public-api-snapshot.json', import.meta.url), 'utf8'));
const now = Date.parse(snapshot.capturedAt);
const periods = new Map();
const events = new Set();
const cycles = [], missingParents = [], outsideParents = [], sharedDepths = new Map();
const links = [];
for (const story of snapshot.stories) {
  const byId = new Map(story.periods.map(p => [p.id, p]));
  for (const period of story.periods) {
    periods.set(period.id, period);
    const path = new Set();
    let current = period;
    while (current) {
      if (path.has(current.id)) { cycles.push({ story: story.id, period: period.id }); break; }
      path.add(current.id);
      current = byId.get(current.storyParentId);
    }
    const depths = sharedDepths.get(period.id) ?? new Set();
    depths.add(path.size - 1);
    sharedDepths.set(period.id, depths);
    if (period.storyParentId && !byId.has(period.storyParentId)) missingParents.push({ story: story.id, period: period.id });
    const parent = byId.get(period.storyParentId);
    if (parent) {
      const a = comparableYearsBeforePresent(period.startDate, period.startYearsBP, now);
      const b = comparableYearsBeforePresent(period.endDate, period.endYearsBP, now);
      const pa = comparableYearsBeforePresent(parent.startDate, parent.startYearsBP, now);
      const pb = comparableYearsBeforePresent(parent.endDate, parent.endYearsBP, now);
      if ([a,b,pa,pb].every(v => v !== null) && (a > pa + 1 || b < pb - 1)) outsideParents.push({ story: story.id, period: period.label.fr, parent: parent.label.fr });
    }
  }
  for (const event of story.events) events.add(event.id);
  for (const child of story.childStories ?? []) {
    const target = snapshot.stories.find(s => String(s.id) === child.id);
    for (const anchor of child.anchors.filter(a => a.type === 'period')) links.push({
      source: story.id, target: child.id, anchor: anchor.id,
      anchorIsTargetRoot: !!target?.periods.some(p => p.id === anchor.id && !p.storyParentId),
    });
  }
}
const output = {
  capturedAt: snapshot.capturedAt,
  counts: {
    stories: snapshot.stories.length, periods: periods.size, events: events.size,
    placements: snapshot.stories.reduce((n,s) => n + s.periods.length, 0),
    storiesWithContext: snapshot.stories.filter(s => s.navigationContexts.length).length,
    contexts: [...new Set(snapshot.stories.flatMap(s => s.navigationContexts.map(c => c.id)))],
    sharedPeriodsAtDifferentDepths: [...sharedDepths.values()].filter(d => d.size > 1).length,
  },
  periodCycles: cycles, missingLocalParents: missingParents,
  periodsOutsideParentByMoreThanOneYear: outsideParents,
  equalBounds: [...periods.values()].filter(p => comparableYearsBeforePresent(p.startDate,p.startYearsBP,now) === comparableYearsBeforePresent(p.endDate,p.endYearsBP,now)).map(p => ({id:p.id,label:p.label.fr})),
  periodLinks: links.length,
  periodLinksWhoseAnchorIsNotTargetRoot: links.filter(l => !l.anchorIsTargetRoot).length,
  climateBounds: (() => {
    const story = snapshot.stories.find(s => s.id === 23);
    const values = [...story.periods.flatMap(p => [p.startYearsBP,p.endYearsBP]),...story.events.map(e => e.dateYearsBP)].filter(Number.isFinite);
    return { startYearsBP: Math.max(...values), endYearsBP: Math.min(...values), quaternaryNominalWidthAt1704px: 1704 * 2580000 / (Math.max(...values) - Math.min(...values)) };
  })(),
};
writeFileSync(new URL('./analysis.json', import.meta.url), JSON.stringify(output,null,2) + '\n');
console.log(JSON.stringify(output,null,2));
