import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useHomeNavigation } from '@/composables/useHomeNavigation';
import { StoryApiService } from '@/services/StoryApiService';
import { storyFixture } from '@/testFixtures/story';

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
  });

  it('loadInitialData avec expandSingleRoot ouvre la racine unique + enfants', async () => {
    vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(storyFixture('1', [
      apiPeriod('r1', null, true),
      apiPeriod('c1', 'r1', false),
    ]));

    const nav = useHomeNavigation();
    await nav.loadInitialData(undefined, true);

    expect(nav.currentPeriod.value?.id).toBe('r1');
    expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['c1']);
  });

  it('loadInitialData sans expandSingleRoot garde la ligne des racines', async () => {
    vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(storyFixture('1', [
      apiPeriod('r1', null, true),
      apiPeriod('c1', 'r1', false),
    ]));

    const nav = useHomeNavigation();
    await nav.loadInitialData(undefined, false);

    expect(nav.currentPeriod.value).toBeNull();
    expect(nav.displayedPeriods.value.map(p => p.id)).toEqual(['r1']);
  });

  it('goBack garde la vue d’ensemble de la frise courante, sans confondre retour local et historique', async () => {
    vi.spyOn(StoryApiService.getInstance(), 'getStory').mockImplementation(async (storyId: string) => {
      if (storyId === '1') {
        return storyFixture(storyId, [apiPeriod('r1', null, false)]);
      }
      if (storyId === '2') {
        return storyFixture(storyId, [apiPeriod('s2r', null, false)]);
      }
      return storyFixture(storyId);
    });

    const nav = useHomeNavigation();
    await nav.loadInitialData(undefined, false);
    expect(nav.currentStoryId.value).toBe('1');

    await nav.selectStory('2');
    expect(nav.currentStoryId.value).toBe('2');

    await nav.goBack();
    expect(nav.currentStoryId.value).toBe('2');
    expect(nav.currentPeriod.value).toBeNull();
    expect(StoryApiService.getInstance().getStory).toHaveBeenCalledTimes(2);
  });

  it('includes exact calendar boundaries despite coordinates saved at different instants', async () => {
    vi.spyOn(StoryApiService.getInstance(), 'getStory').mockResolvedValue(storyFixture('1', [
      { id: 'root', start_date: '2000-01-01', end_date: '2001-01-01', start_years_bp: 999, end_years_bp: 800, has_children: true },
      { id: 'child', parent_id: 'root', start_date: '2000-02-01', end_date: '2000-03-01' },
    ], [
      { id: 'start', date: '2000-01-01', date_years_bp: 700 },
      { id: 'end', date: '2001-01-01', date_years_bp: 600 },
      { id: 'outside', date: '2002-01-01', date_years_bp: 900 },
    ]));
    const nav = useHomeNavigation(); await nav.loadInitialData(undefined, true);
    expect(nav.storyEvents.value.map(event => event.id)).toEqual(['start', 'end']);
  });
});
