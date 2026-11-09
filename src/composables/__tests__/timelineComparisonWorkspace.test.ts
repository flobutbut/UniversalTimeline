import { expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import { useTimelineComparisonWorkspace } from '@/composables/useTimelineComparisonWorkspace';

it('cannot remove the last frise directly, including after the original frise was closed', () => {
  setActivePinia(createPinia());
  const scope = effectScope();
  const workspace = scope.run(() => useTimelineComparisonWorkspace({
    navigate: vi.fn(), handlers: {}, navigatePeriod: vi.fn(),
  }))!;
  try {
    const original = workspace.ensurePrimary('1');
    workspace.remove(original);
    expect(workspace.panels.value).toEqual([original]);
    expect(original.storyId.value).toBe('1');
    const second = workspace.add('2')!;
    workspace.remove(original);
    expect(workspace.panels.value).toEqual([second]);
    expect(workspace.primary.value).toBe(second);
    workspace.remove(second);
    expect(workspace.panels.value).toEqual([second]);
    expect(second.storyId.value).toBe('2');
  } finally { scope.stop(); }
  // Le garde de fermeture ne doit pas empêcher le nettoyage au démontage.
  expect(workspace.panels.value).toEqual([]);
});
