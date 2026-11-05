import { afterEach, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import CatalogueTable from '@/components/catalogue/CatalogueTable.vue';

let view: ReturnType<typeof mount>;
afterEach(() => { view?.unmount(); vi.restoreAllMocks(); });
function render() {
  const selected = ref<string[]>([]);
  const items = ref([{ id: 'one' }, { id: 'two' }, { id: 'locked' }]);
  view = mount({ components: { CatalogueTable }, setup: () => ({ selected, items, columns: [{ key: 'name', label: 'Nom', width: 200 }, { key: 'date', label: 'Date', width: 160 }] }),
    template: `<CatalogueTable v-model:selected-ids="selected" label="Test" :columns="columns" :items="items" empty-text="Vide" selectable :can-select="item => item.id !== 'locked'"><template #row="{item}"><span role="cell">{{item.id}}</span><span role="cell">Date</span></template></CatalogueTable>` });
  return { selected, items };
}
it('selects only eligible displayed rows, exposes mixed selection and clears rows hidden by a filter', async () => {
  const { selected, items } = render();
  await view.get('[data-item-id="one"] input').setValue(true);
  const all = view.get('input[aria-label="Tout sélectionner dans les lignes affichées"]');
  expect((all.element as HTMLInputElement).indeterminate).toBe(true);
  await all.setValue(true); expect(selected.value).toEqual(['one', 'two']);
  expect(view.get('[data-item-id="locked"] input').attributes('disabled')).toBeDefined();
  items.value = [{ id: 'two' }, { id: 'locked' }]; await nextTick();
  expect(selected.value).toEqual(['two']);
  await all.setValue(false); expect(selected.value).toEqual([]);
});
it('resizes every data column with the keyboard within its bounds', async () => {
  render();
  const handle = view.get('[role="separator"][aria-label="Largeur de la colonne Date"]');
  await handle.trigger('keydown', { key: 'ArrowRight' }); expect(handle.attributes('aria-valuenow')).toBe('170');
  await handle.trigger('keydown', { key: 'Home' }); expect(handle.attributes('aria-valuenow')).toBe('100');
  await handle.trigger('keydown', { key: 'End' }); expect(handle.attributes('aria-valuenow')).toBe('720');
  expect(view.text()).not.toContain('Ajuster les colonnes');
});
it('adjusts one column to its contents on double click', async () => {
  render();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 240 } as DOMRect);
  const handle = view.get('[role="separator"][aria-label="Largeur de la colonne Nom"]');
  await handle.trigger('dblclick'); expect(handle.attributes('aria-valuenow')).toBe('272');
});
