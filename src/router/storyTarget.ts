import type { RouteLocationRaw } from 'vue-router';

export function readStoryTarget(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    throw new Error('La frise demandée est invalide.');
  }
  return value;
}

export function storyTimelineLocation(id: string): RouteLocationRaw {
  const story = readStoryTarget(id);
  return { name: 'timeline', query: { story } };
}
