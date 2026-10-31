import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { StoryApiService } from '@/services/StoryApiService';
import { EventApiService } from '@/services/EventApiService';

/** Payload minimal compatible avec `PeriodApiService.mapPeriod` (store). */
function apiPeriod(
  id: string,
  parentId: string | null,
  hasChildren: boolean,
) {
  return {
    id,
    label_fr: id,
    start_date: '',
    end_date: '',
    parent_id: parentId,
    start_years_bp: 1000,
    end_years_bp: 0,
    has_children: hasChildren,
  };
}

describe('useHomeNavigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    vi.spyOn(StoryApiService.getInstance(), 'getListStories').mockResolvedValue([]);
    vi.spyOn(EventApiService.getInstance(), 'getStoryListEvents').mockResolvedValue([]);
  });

  it('loadInitialData avec expandSingleRoot ouvre la racine unique + enfants', async () => {
    vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockResolvedValue([
      apiPeriod('r1', null, true),
      apiPeriod('c1', 'r1', false),
    ] as never[]);

    const nav = useHomeNavigation();
    await nav.loadInitialData(undefined, true);

    expect(nav.currentPeriod.value?.id).toBe('r1');
    expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['c1']);
  });

  it('loadInitialData sans expandSingleRoot garde la ligne des racines', async () => {
    vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockResolvedValue([
      apiPeriod('r1', null, true),
      apiPeriod('c1', 'r1', false),
    ] as never[]);

    const nav = useHomeNavigation();
    await nav.loadInitialData(undefined, false);

    expect(nav.currentPeriod.value).toBeNull();
    expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['r1']);
  });

  it('goBack à la racine périodes après selectStory recharge la story parente', async () => {
    vi.spyOn(StoryApiService.getInstance(), 'getStoryPeriods').mockImplementation(async (storyId: string) => {
      if (storyId === '1') {
        return [apiPeriod('r1', null, false)] as never[];
      }
      if (storyId === '2') {
        return [apiPeriod('s2r', null, false)] as never[];
      }
      return [];
    });

    const nav = useHomeNavigation();
    await nav.loadInitialData(undefined, false);
    expect(nav.currentStoryId.value).toBe('1');

    await nav.selectStory('2');
    expect(nav.currentStoryId.value).toBe('2');

    await nav.goBack();
    expect(nav.currentStoryId.value).toBe('1');
  });
});
