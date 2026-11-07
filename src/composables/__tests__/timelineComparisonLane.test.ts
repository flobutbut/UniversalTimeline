import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { useTimelineComparisonLane, type TimelineLaneKey } from '@/composables/useTimelineComparisonLane';
import type { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useDataStore } from '@/stores/useDataStore';
import type { ScaleFrame } from '@/lib/timelineComparison';
import type { ListPeriod, Period, Story } from '@/types/database';

const period = (id: string, startDate: string, endDate: string, storyParentId: string | null = null): Period =>
  ({ id, label: { fr: id, en: '' }, startDate, endDate, storyParentId, categories: [], children: [], temporalLocation: '' });
const usa: Story = { id: '50', title: { fr: 'Histoire des États-Unis', en: '' }, categories: [], author: '', isPublic: true,
  periods: [period('colonial', '1607', '1765'), period('revolution', '1765', '1783'), period('war', '1775', '1783', 'revolution')],
  events: [{ id: 'declaration', label: { fr: 'Déclaration', en: '' }, date: '1776-07-04', categories: [] }] };

/** Navigation de timeline réduite à ce que la frise lit : la comparaison ne touche qu’à ces champs. */
function fakeNav(storyId = '1') {
  const leaf: ListPeriod | null = null;
  return {
    currentStoryId: ref(storyId), displayedPeriods: ref([]), periodChildren: computed(() => []), childLinkedPeriods: computed(() => []),
    linkedPeriods: computed(() => []), storyEvents: ref([]), loading: ref(false), parentStack: ref([]), currentPeriod: ref(leaf),
    returnTitle: computed(() => ''), contextBar: computed(() => null), previousPeriod: computed(() => null), nextPeriod: computed(() => null),
    currentStoryBounds: ref(null), storyBreadcrumb: computed(() => [{ id: `story:${storyId}`, title: 'Frise', kind: 'story' }]), breadcrumb: computed(() => []),
    chooseNavigationTarget: vi.fn(), handlePeriodClick: vi.fn(), goBack: vi.fn(), navigateAdjacentPeriod: vi.fn(), selectStory: vi.fn(),
    navigateToStoryBreadcrumb: vi.fn(), navigateToBreadcrumb: vi.fn(),
  } as unknown as ReturnType<typeof useHomeNavigation>;
}

describe('frise de la comparaison', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.spyOn(useDataStore(), 'ensureStoryLoaded').mockResolvedValue(usa);
  });

  it('suit le cadre de l’autre frise, avec ses propres événements et sans borne de fin', async () => {
    const leader = ref<TimelineLaneKey>('primary');
    const frame = ref<ScaleFrame | null>({ startYearsBP: 2026 - 1775, endYearsBP: 2026 - 1781 });
    const lane = useTimelineComparisonLane({ key: 'secondary', nav: fakeNav(), leader, frame });
    lane.storyId.value = '50'; await flushPromises();
    expect(lane.ancestors.value.map(p => p.id)).toEqual(['revolution']);
    expect(lane.grid.value).toMatchObject({ scaleFrame: frame.value, hideEndBound: true, loading: false });
    expect(lane.grid.value.periods.map(p => p.id)).toEqual(['war']);
    expect(lane.grid.value.events.map(e => e.id)).toEqual(['declaration']);
    expect(lane.periodCrumbs.value.map(crumb => crumb.title)).toEqual(['revolution']);
  });

  it('prend la main sur place quand on agit sur elle, puis délègue à la timeline', async () => {
    const leader = ref<TimelineLaneKey>('primary');
    const nav = fakeNav('50');
    const lane = useTimelineComparisonLane({ key: 'secondary', nav, leader, frame: ref({ startYearsBP: 420, endYearsBP: 240 }) });
    lane.storyId.value = '50'; await flushPromises();
    lane.actions.periodClick(usa.periods[0]);
    expect(leader.value).toBe('secondary');
    expect(nav.chooseNavigationTarget).toHaveBeenCalledWith({ storyId: '50', periodId: 'colonial' });
    // En tête, ses actions sont celles de la timeline, et sa grille fixe elle-même son échelle.
    lane.actions.periodClick(usa.periods[1]);
    expect(nav.handlePeriodClick).toHaveBeenCalledWith(usa.periods[1]);
    expect(lane.grid.value).toMatchObject({ scaleFrame: null, hideEndBound: false });
  });

  it('remonte d’un niveau ou revient à la vue d’ensemble depuis son fil d’Ariane quand elle suit', async () => {
    const leader = ref<TimelineLaneKey>('primary');
    const nav = fakeNav('50');
    const lane = useTimelineComparisonLane({ key: 'secondary', nav, leader, frame: ref({ startYearsBP: 2026 - 1776, endYearsBP: 2026 - 1780 }) });
    lane.storyId.value = '50'; await flushPromises();
    lane.actions.goBack();
    expect(nav.chooseNavigationTarget).toHaveBeenLastCalledWith({ storyId: '50', view: 'overview' });
    leader.value = 'primary';
    lane.actions.periodCrumb(0);
    expect(nav.chooseNavigationTarget).toHaveBeenLastCalledWith({ storyId: '50', periodId: 'revolution' });
  });

  it('utilise les actions fournies par la vue quand elle mène', () => {
    const periodClick = vi.fn();
    const lane = useTimelineComparisonLane({ key: 'primary', nav: fakeNav(), leader: ref<TimelineLaneKey>('primary'), frame: ref(null), handlers: { periodClick } });
    lane.actions.periodClick(usa.periods[0]);
    expect(periodClick).toHaveBeenCalledWith(usa.periods[0]);
  });
});
