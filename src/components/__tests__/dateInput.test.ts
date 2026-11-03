import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DateInput from '@/components/base/DateInput.vue';

let view: ReturnType<typeof mount>;
function start(value = '') {
  view = mount(DateInput, { props: { modelValue: value, label: 'Date', 'onUpdate:modelValue': (next: string) => { void view.setProps({ modelValue: next }); } } });
  return view.get('input');
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => { view?.unmount(); vi.useRealTimers(); });

it('formats after 800 ms of inactivity and leaves imported values untouched until edited', async () => {
  const input = start('12 juillet 1790');
  await vi.advanceTimersByTimeAsync(1000); expect(input.element.value).toBe('12 juillet 1790');
  await input.setValue('14/07/1789');
  await vi.advanceTimersByTimeAsync(799); expect(input.element.value).toBe('14/07/1789');
  await vi.advanceTimersByTimeAsync(1); expect(input.element.value).toBe('1789-07-14');
});

it('restarts the delay on new input and never restores an earlier date after clearing', async () => {
  const input = start(); await input.setValue('14/07/1789');
  await vi.advanceTimersByTimeAsync(600); await input.setValue('15/07/1789');
  await vi.advanceTimersByTimeAsync(200); expect(input.element.value).toBe('15/07/1789');
  await vi.advanceTimersByTimeAsync(600); expect(input.element.value).toBe('1789-07-15');
  await input.setValue('16/07/1789'); await vi.advanceTimersByTimeAsync(600);
  await input.setValue(''); await vi.advanceTimersByTimeAsync(800); expect(input.element.value).toBe('');
});

it('normalizes on blur before forwarding the validation event', async () => {
  const input = start(); await input.setValue('12 juillet 1790'); await input.trigger('blur');
  expect(input.element.value).toBe('1790-07-12'); expect(view.emitted('blur')).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(800); expect(input.element.value).toBe('1790-07-12');
});

it('does not format incomplete or invalid input, or add precision to a year or month', async () => {
  const input = start();
  for (const value of ['14/07/17', '31/02/2024', 'vers 1789', '1789', '1789-07']) {
    await input.setValue(value); await vi.advanceTimersByTimeAsync(800); expect(input.element.value).toBe(value);
  }
});

it('cancels formatting when an external update replaces the draft', async () => {
  const input = start(); await input.setValue('14/07/1789');
  await view.setProps({ modelValue: '12 juillet 1790' });
  await vi.advanceTimersByTimeAsync(800); expect(input.element.value).toBe('12 juillet 1790');
});

it('cancels pending formatting on disable and disposal', async () => {
  const input = start(); await input.setValue('14/07/1789'); await view.setProps({ disabled: true });
  await vi.advanceTimersByTimeAsync(800); expect(input.element.value).toBe('14/07/1789');
  await view.setProps({ disabled: false }); await input.setValue('12 juillet 1790');
  const update = vi.fn(); await view.setProps({ 'onUpdate:modelValue': update });
  view.unmount(); await vi.advanceTimersByTimeAsync(800);
  expect(update).not.toHaveBeenCalled();
});

it('waits for text composition to finish before starting the delay', async () => {
  const input = start(); await input.trigger('compositionstart'); await input.setValue('12 juillet 1790');
  await vi.advanceTimersByTimeAsync(1000); expect(input.element.value).toBe('12 juillet 1790');
  await input.trigger('compositionend'); await vi.advanceTimersByTimeAsync(800);
  expect(input.element.value).toBe('1790-07-12');
});

it('keeps read-only imported dates copyable without normalizing them on blur', async () => {
  const input = start('12 juillet 1790'); await view.setProps({ readonly: true });
  expect(input.attributes('readonly')).toBeDefined();
  expect(input.attributes('disabled')).toBeUndefined();
  await input.trigger('focus'); await input.trigger('blur'); await vi.advanceTimersByTimeAsync(1000);
  expect(input.element.value).toBe('12 juillet 1790');
  expect(view.emitted('update:modelValue')).toBeUndefined();
});

it('cancels pending normalization when a field becomes read-only', async () => {
  const input = start(); await input.setValue('14/07/1789');
  await view.setProps({ readonly: true });
  await vi.advanceTimersByTimeAsync(1000); await input.trigger('blur');
  expect(input.element.value).toBe('14/07/1789');
  expect(view.emitted('update:modelValue')).toHaveLength(1);
});
