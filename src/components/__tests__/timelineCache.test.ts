import { expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import PeriodGrid from '@/views/HomeView/PeriodGrid.vue';
import { StoryApiService } from '@/services/StoryApiService';

it('closes teleported story suggestions when the timeline enters the page cache', async () => {
  const read = vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue({ childStories: [] } as never);
  const Host = defineComponent({
    components: { PeriodGrid },
    setup() {
      return {
        visible: ref(true),
        periods: [{ id: 'leaf', label: { fr: 'Feuille', en: '' }, startDate: 'M65', endDate: 'NOW', categories: [], hasChildren: false }],
        suggestions: [{ id: 'child', title: { fr: 'Frise enfant', en: '' }, parentStoryId: '1' }],
      };
    },
    template: `<button @click="visible = !visible">Changer de page</button><KeepAlive><PeriodGrid v-if="visible" :periods="periods" :events="[]" :loading="false" :parent-period="null" :current-period="null" :story-suggestions="suggestions" current-story-id="1" /></KeepAlive>`,
  });
  const view = mount(Host, { attachTo: document.body });
  try {
    await view.get('.period-card').trigger('click'); await flushPromises();
    expect(document.body.querySelector('.story-dropdown')).not.toBeNull();
    await view.get('button').trigger('click'); await flushPromises();
    expect(document.body.querySelector('.story-dropdown')).toBeNull();
    expect(document.body.querySelector('.story-dropdown-backdrop')).toBeNull();
    await view.get('button').trigger('click'); await flushPromises();
    expect(view.findComponent(PeriodGrid).exists()).toBe(true);
    expect(document.body.querySelector('.story-dropdown')).toBeNull();
  } finally { view.unmount(); read.mockRestore(); }
});
