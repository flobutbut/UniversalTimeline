import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, shallowRef, type EffectScope } from 'vue';
import { useTimelineComparisonLinks } from '@/composables/useTimelineComparisonLinks';
import type { ListEvent } from '@/types/database';

let scope: EffectScope;
beforeEach(() => {
  scope = effectScope();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { scope.stop(); document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const event = (id: string) => ({ id } as ListEvent);
function grid(y: number, ids: string[]) {
  const element = document.createElement('div');
  for (const id of ids) {
    const card = document.createElement('div'); card.dataset.eventId = id;
    const dot = document.createElement('button'); dot.className = 'event-dot'; card.append(dot); element.append(card);
    vi.spyOn(dot, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, y, 8, 8));
  }
  return element;
}

it('connects successive visible occurrences across several frises, including nonadjacent ones and arbitrary IDs', async () => {
  const id = 'shared["catalogue"]';
  const host = document.createElement('div'); document.body.append(host);
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 800, 1000));
  const a = grid(100, [id, 'skip-middle', 'only-a']);
  const b = grid(300, [id]);
  const c = grid(500, [id, 'skip-middle']);
  host.append(a, b, c);
  const grids = shallowRef([a, b, c]);
  const rows = shallowRef([[event(id), event('skip-middle'), event('only-a')], [event(id)], [event(id), event('skip-middle')]]);
  const controller = scope.run(() => useTimelineComparisonLinks(ref(host), () => grids.value, () => rows.value, [grids]))!;
  controller.schedule();
  expect(controller.links.value).toEqual([
    { key: `1:${id}`, id, x: 94, y1: 88, y2: 280 },
    { key: `2:${id}`, id, x: 94, y1: 288, y2: 480 },
    { key: '2:skip-middle', id: 'skip-middle', x: 94, y1: 88, y2: 480 },
  ]);
  // Le panneau médian replié ne participe plus aux liens.
  grids.value = [a, c]; rows.value = [rows.value[0], rows.value[2]];
  await nextTick(); await nextTick();
  expect(controller.links.value.filter(link => link.id === id)).toEqual([{ key: `1:${id}`, id, x: 94, y1: 88, y2: 480 }]);
  controller.track({ target: c.querySelector('button') } as unknown as Event);
  expect(controller.activeEventId.value).toBe(id);
  controller.clear(); expect(controller.activeEventId.value).toBeNull();
  grids.value = [a]; rows.value = [rows.value[0]];
  await nextTick(); await nextTick();
  expect(controller.links.value).toEqual([]);
});

it('uses the new geometry and panel order after a reorder, and drops links without visible dots', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const a = grid(100, ['same']), b = grid(300, ['same']), c = grid(500, ['same']); host.append(a, b, c);
  const grids = shallowRef([a, b, c]);
  const controller = scope.run(() => useTimelineComparisonLinks(ref(host), () => grids.value, () => grids.value.map(() => [event('same')]), [grids]))!;
  controller.schedule();
  vi.spyOn(c.querySelector('button')!, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 8, 8));
  grids.value = [c, a, b]; await nextTick(); await nextTick();
  expect(controller.links.value.map(link => [link.y1, link.y2])).toEqual([[58, 100], [108, 300]]);
  vi.spyOn(a.querySelector('button')!, 'getBoundingClientRect').mockReturnValue(new DOMRect());
  controller.schedule();
  expect(controller.links.value.map(link => [link.y1, link.y2])).toEqual([[58, 300]]);
});
