import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { usePeriodFlip } from '@/composables/usePeriodFlip';
import type { ListPeriod } from '@/types/database';

let scope: EffectScope;
beforeEach(() => { vi.useFakeTimers(); scope = effectScope(); });
afterEach(() => { scope.stop(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const period = (id: string, hasChildren = true): ListPeriod => ({
  id, label: { fr: id, en: '' }, startDate: 'M65', endDate: 'NOW', hasChildren, categories: [],
});
async function settled() { await nextTick(); await nextTick(); }
function setup() {
  const id = ref<string | undefined>('root');
  const loading = ref(false);
  const parent = document.createElement('div');
  const source = document.createElement('div');
  vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 600, 52));
  vi.spyOn(source, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 120, 52));
  const flip = scope.run(() => usePeriodFlip(() => id.value, () => loading.value, () => parent))!;
  const navigate = async (target: string) => {
    loading.value = true; await settled();
    id.value = target; loading.value = false; await settled();
  };
  return { id, loading, parent, source, flip, navigate };
}

it('does not animate the current parent when a leaf only loads story suggestions', async () => {
  const { flip, source, parent, navigate } = setup();
  flip.prepare(period('leaf', false), source);
  await navigate('root');
  expect(parent.style.transform).toBe(''); expect(vi.getTimerCount()).toBe(0);
});

it('animates a committed destination and restores the original styles after both phases', async () => {
  const { flip, source, parent, navigate } = setup();
  parent.style.transformOrigin = 'center';
  flip.prepare(period('child'), source); await navigate('child');
  expect(parent.style.transform).toContain('scale(0.2, 1)');
  await vi.advanceTimersByTimeAsync(260);
  expect(parent.style.transform).toBe('none');
  await vi.advanceTimersByTimeAsync(360);
  expect(parent.style.transform).toBe(''); expect(parent.style.transformOrigin).toBe('center');
  expect(vi.getTimerCount()).toBe(0);
});

it('discards a failed or superseded destination rather than animating the old parent', async () => {
  const { flip, source, parent, navigate, id } = setup();
  flip.prepare(period('child'), source); await navigate('root');
  expect(parent.style.transform).toBe('');
  id.value = 'child'; await settled();
  expect(parent.style.transform).toBe(''); expect(vi.getTimerCount()).toBe(0);
});

it('cancels a pending transition when the user goes back before the destination renders', async () => {
  const { flip, source, parent, id } = setup();
  flip.prepare(period('child'), source);
  id.value = 'child'; flip.cancel(); await settled();
  expect(parent.style.transform).toBe(''); expect(vi.getTimerCount()).toBe(0);
});

it('does not let the first animation timers reset a second, faster navigation', async () => {
  const { flip, source, parent, navigate } = setup();
  flip.prepare(period('first'), source); await navigate('first');
  await vi.advanceTimersByTimeAsync(100);
  flip.prepare(period('second'), source); await navigate('second');
  await vi.advanceTimersByTimeAsync(520);
  expect(parent.style.transition).toContain('340ms');
  await vi.advanceTimersByTimeAsync(100);
  expect(parent.style.transform).toBe(''); expect(vi.getTimerCount()).toBe(0);
});

it.each(['back', 'dispose'] as const)('cleans an active animation and its timers on %s', async action => {
  const { flip, source, parent, navigate, id } = setup();
  flip.prepare(period('child'), source); await navigate('child');
  if (action === 'back') { id.value = 'root'; await settled(); } else scope.stop();
  expect(parent.style.transform).toBe(''); expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(1000);
  expect(parent.style.transform).toBe(''); expect(parent.style.transition).toBe('');
});

it('respects reduced motion without keeping pending timers or styles', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  const { flip, source, parent, navigate } = setup();
  flip.prepare(period('child'), source); await navigate('child');
  expect(parent.style.transform).toBe(''); expect(vi.getTimerCount()).toBe(0);
});

it('moves keyboard focus to the new back control after the activated card is removed', async () => {
  const { flip, source, parent, navigate } = setup();
  source.tabIndex = 0; parent.tabIndex = 0;
  document.body.append(source, parent);
  try {
    source.focus(); flip.prepare(period('child'), source); source.remove();
    await navigate('child');
    expect(document.activeElement).toBe(parent);
  } finally { source.remove(); parent.remove(); }
});

it('does not steal focus when the user moves to another control while loading', async () => {
  const { flip, source, parent, navigate } = setup();
  const other = document.createElement('button');
  source.tabIndex = 0; parent.tabIndex = 0;
  document.body.append(source, parent, other);
  try {
    source.focus(); flip.prepare(period('child'), source); source.remove(); other.focus();
    await navigate('child');
    expect(document.activeElement).toBe(other);
  } finally { source.remove(); parent.remove(); other.remove(); }
});
