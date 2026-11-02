import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { useTimelineSlide } from '@/composables/useTimelineSlide';

let scope: EffectScope;
const animations: Array<{ cancel: ReturnType<typeof vi.fn>; finish: () => void }> = [];
const animate = vi.fn();
beforeEach(() => {
  scope = effectScope(); animations.length = 0; animate.mockClear();
  animate.mockImplementation(() => {
    let finish!: () => void;
    const finished = new Promise<void>(resolve => { finish = resolve; });
    const animation = { cancel: vi.fn(finish), finish, finished };
    animations.push(animation); return animation;
  });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 500));
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
});
afterEach(() => {
  scope.stop(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
});
async function settled() { await nextTick(); await nextTick(); await nextTick(); }
function setup() {
  const position = ref<{ storyId: string; periodId?: string }>({ storyId: '1', periodId: 'old' });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const host = document.createElement('div');
  const controls = document.createElement('nav'); controls.innerHTML = '<button data-period-direction="next">Suivant</button>';
  const periods = document.createElement('div'); periods.innerHTML = '<span id="period-id">Ancienne période</span>';
  const line = document.createElement('div'); line.textContent = 'Ligne du temps';
  const events = document.createElement('div'); events.innerHTML = '<span id="event-id">Ancien événement</span>';
  host.append(controls, periods, line, events); document.body.append(host);
  const slide = scope.run(() => useTimelineSlide(() => host, () => [periods, line, events], () => position.value, () => loading.value, () => error.value))!;
  const commit = async (storyId = '1', periodId = 'new') => {
    loading.value = true; await settled();
    periods.innerHTML = '<div class="timeline-card">Nouvelle période</div>'; events.textContent = 'Nouvel événement';
    position.value = { storyId, periodId }; loading.value = false; await settled();
  };
  return { host, controls, periods, line, events, position, loading, error, slide, commit };
}

it('keeps a noninteractive snapshot of all timeline layers until the destination is ready', async () => {
  const { host, controls, loading, slide } = setup();
  slide.prepare('next', 'new'); loading.value = true; await settled();
  const snapshot = host.querySelector('.timeline-slide-snapshot')!;
  expect(snapshot.textContent).toContain('Ancienne période');
  expect(snapshot.textContent).toContain('Ancien événement');
  expect(snapshot.textContent).toContain('Ligne du temps');
  expect(snapshot.contains(controls)).toBe(false); expect(snapshot.querySelector('nav')).toBeNull();
  expect(snapshot.getAttribute('aria-hidden')).toBe('true'); expect(snapshot.hasAttribute('inert')).toBe(true);
  expect(snapshot.querySelector('[id]')).toBeNull();
  expect(slide.phase.value).toBe('waiting'); expect(animate).not.toHaveBeenCalled();
});

it.each([['next', 800], ['previous', -800]] as const)('slides the whole screen in the time direction for %s', async (direction, offset) => {
  const { host, slide, commit } = setup();
  slide.prepare(direction, 'new'); await commit();
  expect(slide.phase.value).toBe('sliding');
  expect(animate).toHaveBeenCalledTimes(4);
  expect(animate.mock.calls[0][0]).toEqual([{ transform: 'translateX(0)' }, { transform: `translateX(${-offset}px)` }]);
  for (const [frames] of animate.mock.calls.slice(1)) expect(frames).toEqual([
    { transform: `translateX(${offset}px)` }, { transform: 'translateX(0)' },
  ]);
  animations.forEach(animation => animation.finish()); await settled();
  expect(slide.phase.value).toBe('idle'); expect(host.querySelector('.timeline-slide-snapshot')).toBeNull();
  expect(animations.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
});

it('also animates when contextual previous/next replaces the frise', async () => {
  const { slide, commit } = setup(); slide.prepare('next', 'new'); await commit('2');
  expect(slide.phase.value).toBe('sliding'); expect(animate).toHaveBeenCalledTimes(4);
});

it('keeps incoming cards free of vertical entry animation after the horizontal slide finishes', async () => {
  const { slide, commit, periods } = setup(); slide.prepare('next', 'new'); await commit();
  const card = periods.querySelector<HTMLElement>('.timeline-card')!;
  expect(card.style.animation).toBe('none');
  animations.forEach(animation => animation.finish()); await settled();
  expect(slide.phase.value).toBe('idle'); expect(card.style.animation).toBe('none');
  // Une carte créée lors d'une descente normale conserve son animation d'entrée.
  const child = document.createElement('div'); child.className = 'timeline-card'; periods.replaceChildren(child);
  expect(child.style.animation).toBe('');
});

it.each(['error', 'other-position', 'dispose', 'cancel'] as const)('cleans a pending snapshot after %s', async reason => {
  const { host, slide, position, error } = setup(); slide.prepare('next', 'new');
  if (reason === 'error') error.value = 'Échec';
  if (reason === 'other-position') position.value = { storyId: '2', periodId: 'elsewhere' };
  if (reason === 'dispose') scope.stop();
  if (reason === 'cancel') slide.cancel();
  await settled();
  expect(host.querySelector('.timeline-slide-snapshot')).toBeNull(); expect(slide.phase.value).toBe('idle');
  expect(animate).not.toHaveBeenCalled();
});

it('cancels all active animations before taking another snapshot', async () => {
  const { slide, commit, host } = setup(); slide.prepare('next', 'new'); await commit();
  const firstAnimations = [...animations];
  slide.prepare('previous', 'old'); await settled();
  expect(firstAnimations.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
  expect(host.querySelectorAll('.timeline-slide-snapshot')).toHaveLength(1);
  expect(slide.phase.value).toBe('waiting');
});

it('skips motion when reduced motion is requested', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  const { slide, commit, host } = setup(); slide.prepare('next', 'new'); await commit();
  expect(slide.phase.value).toBe('idle'); expect(animate).not.toHaveBeenCalled();
  expect(host.querySelector('.timeline-slide-snapshot')).toBeNull();
});

it('returns keyboard focus to a direction control after the slide completes', async () => {
  const { slide, commit, controls } = setup(); const button = controls.querySelector('button')!;
  button.focus(); slide.prepare('next', 'new'); button.blur(); await commit();
  animations.forEach(animation => animation.finish()); await settled();
  expect(document.activeElement).toBe(button);
});

it('cleans an active slide when another navigation starts loading', async () => {
  const { slide, commit, host, loading } = setup(); slide.prepare('next', 'new'); await commit();
  loading.value = true; await settled();
  expect(slide.phase.value).toBe('idle'); expect(host.querySelector('.timeline-slide-snapshot')).toBeNull();
  expect(animations.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
});

it('does not steal focus from another control at the end of the animation', async () => {
  const { slide, commit, controls } = setup(); controls.querySelector('button')!.focus();
  slide.prepare('next', 'new'); await commit();
  const elsewhere = document.createElement('button'); document.body.append(elsewhere); elsewhere.focus();
  animations.forEach(animation => animation.finish()); await settled();
  expect(document.activeElement).toBe(elsewhere);
});
