<template>
  <div class="home-view">
    <div ref="timelineViewport" class="home-view__viewport"
      :class="{ 'home-view__viewport--waiting': slidePhase === 'waiting', 'home-view__viewport--sliding': slidePhase !== 'idle', 'home-view__viewport--comparing': comparing }"
      :inert="slidePhase !== 'idle' || undefined" :aria-busy="slidePhase !== 'idle' || undefined"
      @scroll.capture="scheduleComparisonLinks" @transitionend="scheduleComparisonLinks" @animationend="scheduleComparisonLinks"
      @mouseover="trackComparisonLink" @focusin="trackComparisonLink" @mouseleave="clearComparisonLink">
      <div ref="timelineStack" class="home-view__stack">
        <section v-for="(lane, index) in panels" :key="lane.key" class="home-view__frise"
          :class="{ 'home-view__frise--collapsed': comparing && lane.collapsed.value, 'home-view__frise--active': comparing && lane.key === selectedLaneKey, 'home-view__frise--dragging': draggedLane === lane.key,
            'home-view__frise--drop-before': dropTarget?.key === lane.key && dropTarget.before, 'home-view__frise--drop-after': dropTarget?.key === lane.key && !dropTarget.before }"
          :data-lane-key="lane.key" :data-story-id="lane.storyId.value" :data-leading="lane.leads.value || undefined" :data-selected="lane.key === selectedLaneKey || undefined" :aria-label="`Frise : ${lane.title.value}`"
          :tabindex="comparing ? 0 : undefined" :aria-description="comparing ? (lane.key === selectedLaneKey ? 'Frise sélectionnée.' : 'Sélectionner cette frise avec Entrée ou Espace.') : undefined"
          @click="selectPanelBackground($event, lane)" @keydown.enter.self.prevent="selectPanel(lane)" @keydown.space.self.prevent="selectPanel(lane)"
          @dragover="onPanelDragOver($event, lane)" @drop="onPanelDrop($event, lane)">
          <div class="home-view__header">
            <Button v-if="comparing" class="home-view__drag" variant="ghost" size="xs" icon-only draggable="true"
              :aria-label="`Déplacer ${lane.title.value}`" title="Glisser pour déplacer · Alt + flèches haut/bas" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              @dragstart="onPanelDragStart($event, lane)" @dragend="clearDrag"
              @keydown.alt.up.prevent="movePanel(lane, -1)" @keydown.alt.down.prevent="movePanel(lane, 1)">
              <template #icon><Icon icon="mdi:drag-vertical" aria-hidden="true" /></template>
            </Button>
            <div class="home-view__breadcrumbs">
              <StoryBreadcrumb class="home-view__story-breadcrumb" :items="lane.storyCrumbs.value" :max-visible="3" label="Fil d’Ariane des frises"
                current-navigable :loading="lane.loading.value" @navigate="lane.actions.storyCrumb">
                <template v-if="lane.leads.value && lane.nav.headerStories.value.length" #current="{ item }">
                  <AssociatedStoriesBadge class="home-view__story-selector" :story-id="lane.nav.currentStoryId.value" period-id="" :period-label="item.title" :trigger-label="item.title"
                    overview-label="Vue d’ensemble de la frise" :stories="lane.nav.headerStories.value" :disabled="lane.loading.value" :comparison="storyComparison"
                    @overview="selectHeaderStory(lane, lane.nav.currentStoryId.value)" @select="id => selectHeaderStory(lane, id)" @compare="id => addComparedStory(id, lane)" />
                </template>
              </StoryBreadcrumb>
              <StoryBreadcrumb class="home-view__period-breadcrumb" :items="lane.periodCrumbs.value" :current-navigable="!lane.leads.value"
                :loading="lane.loading.value" @navigate="lane.actions.periodCrumb" />
            </div>
            <div class="home-view__header-actions">
              <template v-if="!lane.collapsed.value">
                <Select v-if="!routeError && lane.eventFilter.available.value" class="home-view__subject" compact :searchable="false" placeholder="Sujets des événements"
                  :model-value="lane.eventFilter.subject.value" :options="lane.eventFilter.options.value" @update:model-value="lane.eventFilter.select" />
                <Switch v-if="!comparing" v-model="showPeriodChildren" label="Étendre" label-first variant="sm" :disabled="lane.loading.value" />
                <Button v-if="auth.signedIn && !routeError && !lane.error.value" variant="tertiary" size="sm" :disabled="lane.loading.value"
                  :to="{ name: 'database', query: { story: lane.storyId.value } }">Détail de la frise</Button>
              </template>
              <template v-if="comparing">
                <Button variant="ghost" size="xs" icon-only :disabled="index === 0" :aria-label="`Monter ${lane.title.value}`" title="Monter la frise" @click="movePanel(lane, -1)">
                  <template #icon><Icon icon="mdi:arrow-up" aria-hidden="true" /></template>
                </Button>
                <Button variant="ghost" size="xs" icon-only :disabled="index === panels.length - 1" :aria-label="`Descendre ${lane.title.value}`" title="Descendre la frise" @click="movePanel(lane, 1)">
                  <template #icon><Icon icon="mdi:arrow-down" aria-hidden="true" /></template>
                </Button>
              </template>
              <Button v-if="comparing" variant="ghost" size="xs" icon-only data-panel-toggle :disabled="lane.leads.value && lane.loading.value" :aria-expanded="!lane.collapsed.value" :aria-controls="`timeline-panel-${lane.key}`"
                :aria-label="`${lane.collapsed.value ? 'Déplier' : 'Replier'} ${lane.title.value}`" :title="lane.collapsed.value ? 'Déplier la frise' : 'Replier la frise'" @click="togglePanel(lane)">
                <template #icon><Icon :icon="lane.collapsed.value ? 'mdi:chevron-down' : 'mdi:chevron-up'" aria-hidden="true" /></template>
              </Button>
              <Button v-if="comparing" variant="ghost" size="xs" icon-only :aria-label="`Retirer ${lane.title.value}`" title="Retirer la frise" @click="removeComparedStory(lane)">
                <template #icon><Icon icon="mdi:close" aria-hidden="true" /></template>
              </Button>
            </div>
          </div>
          <div :id="`timeline-panel-${lane.key}`" class="home-view__panel-content">
            <div v-if="(lane === primaryLane && routeError) || lane.error.value" class="home-view__error" role="alert">
              {{ lane === primaryLane && routeError || lane.error.value }}
              <Button v-if="lane !== primaryLane || !routeError" variant="tertiary" size="sm" :disabled="lane.loading.value" @click="lane === primaryLane && lane.leads.value ? retry() : lane.retry()">Réessayer</Button>
              <RouterLink v-else :to="{ name: 'timeline' }">Revenir à la timeline</RouterLink>
            </div>
            <Select v-if="!lane.collapsed.value && lane.leads.value && lane.nav.navigationContexts.value.length > 1" :model-value="lane.nav.contextId.value" label="Parcours chronologique" placeholder="Choisir un parcours"
              :options="lane.nav.navigationContexts.value.map(context => ({ value: context.id, label: context.title.fr || context.title.en }))"
              :disabled="lane.loading.value" @update:model-value="value => typeof value === 'string' && selectContext(lane, value)" />
            <PeriodGrid v-if="!(lane === primaryLane && routeError) && !lane.error.value"
              :ref="el => workspace.setGrid(lane.key, el)" :key="lane.grid.value.currentStoryId" class="home-view__timeline" v-bind="lane.grid.value"
              :show-children="!comparing && showPeriodChildren" :compact="comparing" :minimized="comparing && lane.collapsed.value" :axis-viewport="!comparing ? timelineViewport : null" :external-focus="sharedFocus"
              :load-story-details="dataStore.ensureStoryLoaded" period-tooltips natural-height
              @period-click="lane.actions.periodClick" @event-click="event => lane === primaryLane ? onEventClick(event) : lane.nav.handleEventClick(event)"
              @go-back="lane.actions.goBack" @navigate-period="lane.actions.navigatePeriod" @story-select="lane.actions.storySelect" :comparison="storyComparison" @story-compare="id => addComparedStory(id, lane)">
              <template v-if="lane.leads.value && lane.nav.contextBar.value" #overview-context="{ style, continuation }">
                <PeriodCard variant="parent" :compact="comparing" :period="lane.nav.contextBar.value" :style="style" :continues-before="continuation.before" :continues-after="continuation.after"
                  :is-selected="false" :loading="lane.loading.value" @back="lane.actions.goBack">
                  <template #title-actions>
                    <span v-if="!lane.nav.returnPath.value.length" class="home-view__context-label">Période de référence</span>
                    <AssociatedStoriesBadge :story-id="lane.nav.currentStoryId.value" :period-id="lane.nav.contextBar.value.id" :period-label="lane.nav.contextBar.value.label.fr"
                      :stories="lane.nav.contextStories.value" :disabled="lane.loading.value" :comparison="storyComparison" @compare="id => addComparedStory(id, lane)" @select="id => lane.actions.storySelect(id, contextAnchorFor(lane), lane.nav.contextStoryId.value)" />
                  </template>
                </PeriodCard>
              </template>
            </PeriodGrid>
          </div>
        </section>
        <FeedbackState v-if="!panels.length" :kind="emptyLoading ? 'loading' : emptyError ? 'error' : 'empty'"
          :message="emptyLoading ? 'Chargement des frises…' : emptyError || 'Aucune frise affichée. Ajoutez une frise pour commencer.'"
          :retryable="!!emptyError" @retry="loadEmptyCatalogue" />
        <svg v-if="comparing && slidePhase === 'idle'" class="home-view__links" aria-hidden="true">
          <line v-for="link in comparisonLinkLines" :key="link.key" :class="{ 'is-active': link.id === activeComparisonEventId }"
            :x1="link.x" :x2="link.x" :y1="link.y1" :y2="link.y2" />
        </svg>
      </div>
    </div>
    <div v-if="!routeError" ref="timelineAdd" class="home-view__add" :class="{ 'home-view__add--picking': pickingStory }">
      <div class="home-view__add-surface">
        <Button v-if="!pickingStory" variant="secondary" size="sm" :disabled="loading || slidePhase !== 'idle' || !comparisonOptions.length" @click="pickingStory = true">
          <template #icon><Icon icon="mdi:plus" aria-hidden="true" /></template>Ajouter une frise
        </Button>
        <template v-else>
          <Select class="home-view__story-picker" compact :disabled="loading || slidePhase !== 'idle'" :model-value="null" placeholder="Choisir la frise à comparer" :options="comparisonOptions"
            dropdown-class="base-select__dropdown--above" @update:model-value="value => typeof value === 'string' && addComparedStory(value)" />
          <Button variant="ghost" size="sm" @click="pickingStory = false">Annuler</Button>
        </template>
      </div>
    </div>
    <span class="sr-only" role="status" aria-live="polite">{{ panelAnnouncement }}</span>
    <Teleport to="body">
      <ModalShell v-if="leaderNav.navigationChoices.value.length" title="Choisir une frise pour cette période" height="auto" @close="closeNavigationChoices">
        <p>Plusieurs frises présentent cette période.</p>
        <div class="home-view__choices">
          <Button v-for="choice in leaderNav.navigationChoices.value" :key="choice.storyId" variant="tertiary" size="sm" @click="chooseLeaderTarget(choice)">{{ choice.title }}</Button>
        </div>
      </ModalShell>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import Select from '@/components/base/Select.vue';
import Switch from '@/components/base/Switch.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import { Icon } from '@iconify/vue';
import { computed, nextTick, onActivated, onDeactivated, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import StoryBreadcrumb from '@/components/StoryBreadcrumb.vue';
import { readStoryTarget, readTimelinePosition, readTimelineReturnPath, timelineLocation } from '@/router/storyTarget';
import PeriodCard from './HomeView/PeriodCard.vue';
import AssociatedStoriesBadge from './HomeView/AssociatedStoriesBadge.vue';

// KeepAlive includes this page by name; navigation and history stay in its instance.
defineOptions({ name: 'HomeView' });
import PeriodGrid from './HomeView/PeriodGrid.vue';
import type { useHomeNavigation } from '@/composables/useHomeNavigation';
import { useTimelineSlide } from '@/composables/useTimelineSlide';
import type { TimelineLaneKey } from '@/composables/useTimelineComparisonLane';
import { useTimelineComparisonWorkspace, type ComparisonPanel } from '@/composables/useTimelineComparisonWorkspace';
import { useTimelineComparisonLinks } from '@/composables/useTimelineComparisonLinks';
import type { TimelineTarget } from '@/lib/timelineNavigation';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { track, type TimelineVia } from '@/lib/analytics';
import { entryVia, eventProperties, periodProperties, positionShape, storyProperties, takeAnnouncedEntry, type StoryScope } from '@/lib/explorationAnalytics';
import type { ListEvent } from '@/types/database';

const dataStore = useDataStore();
const showPeriodChildren = ref(false);
const auth = useAuthStore();
const router = useRouter();
// Cause of the next in-page navigation: set by the action, handed to the route change it pushes.
let actionVia: TimelineVia | null = null;
let routeVia: TimelineVia | null = null;

/** Le rôle de la frise principale ne dépend pas de sa place dans la liste. */
function comparisonQuery(mainId = primaryLane.value?.storyId.value) {
  const visible = panels.value.filter(panel => panel === primaryLane.value || panel.storyId.value !== mainId);
  const compared = visible.filter(panel => panel !== primaryLane.value).map(panel => panel.storyId.value!).filter(Boolean);
  const order = visible.map(panel => panel === primaryLane.value ? mainId : panel.storyId.value).filter((id): id is string => !!id);
  return { ...(compared.length ? { compare: compared.length === 1 ? compared[0] : compared } : {}),
    ...(visible[0] !== primaryLane.value ? { order } : {}) };
}
function withComparison(location: RouteLocationRaw): RouteLocationRaw {
  if (typeof location !== 'object' || !('query' in location)) return location;
  return { ...location, query: { ...location.query, ...comparisonQuery(typeof location.query?.story === 'string' ? location.query.story : undefined) } };
}

type HomeNavigation = ReturnType<typeof useHomeNavigation>;
function navigateRoute(target: TimelineTarget) {
  routeVia = actionVia ?? 'app'; actionVia = null;
  void router.push(withComparison(timelineLocation(target))).then(failure => { if (failure) routeVia = null; });
}

// Le rôle lié à l’URL peut passer à une autre instance quand sa frise est fermée.
const workspace = useTimelineComparisonWorkspace({ navigate: navigateRoute, handlers: {
  periodClick: period => onPeriodClick(period), goBack: () => onGoBack(),
  storySelect: (...args) => onStorySelect(...args), storyCrumb: index => onStoryBreadcrumb(index), periodCrumb: index => onBreadcrumb(index),
}, navigatePeriod: slideToAdjacentPeriod });
const { panels, primary: primaryLane, leader, selected: selectedLaneKey, comparing, scaleFrame, focus: sharedFocus } = workspace;
const nav = workspace.navigation;
const emptyLoading = ref(false), emptyError = ref<string | null>(null);
const loading = computed(() => panels.value.length ? nav.value.loading.value : emptyLoading.value);
const error = computed(() => nav.value.error.value);
const parentStack = computed(() => nav.value.parentStack.value);
const currentPeriod = computed(() => nav.value.currentPeriod.value);
const previousPeriod = computed(() => nav.value.previousPeriod.value);
const nextPeriod = computed(() => nav.value.nextPeriod.value);
const contextId = computed(() => nav.value.contextId.value);
const currentStoryId = computed(() => nav.value.currentStoryId.value);
const displayedPeriods = computed(() => nav.value.displayedPeriods.value);
const storyEvents = computed(() => nav.value.storyEvents.value);
const currentStoryPeriods = computed(() => nav.value.currentStoryPeriods.value);
function as<A extends unknown[]>(via: TimelineVia, run: (...args: A) => unknown) {
  return (...args: A) => { actionVia = via; return run(...args); };
}
const onPeriodClick = as('period', (period: Parameters<HomeNavigation['handlePeriodClick']>[0]) => nav.value.handlePeriodClick(period));
const onGoBack = as('back', () => nav.value.goBack());
const onBreadcrumb = as('breadcrumb', (index: number) => nav.value.navigateToBreadcrumb(index));
const onStoryBreadcrumb = as('story_breadcrumb', (index: number) => nav.value.navigateToStoryBreadcrumb(index));
const onContext = as('context', (id: string) => nav.value.selectNavigationContext(id));
const onChoice = as('story_choice', (target: TimelineTarget) => nav.value.chooseNavigationTarget(target));
async function onStorySelect(...args: Parameters<HomeNavigation['selectStory']>) {
  actionVia = 'associated_story';
  await nav.value.selectStory(...args);
  if (actionVia === 'associated_story' && error.value) {
    actionVia = null;
    track('timeline_load_failed', { reason: 'story_unavailable', via: 'associated_story' });
  }
}
const primaryLeads = computed(() => primaryLane.value?.leads.value ?? false);
const leaderNav = computed(() => workspace.leading.value?.nav ?? nav.value);
let emptyRequest = 0;
async function loadEmptyCatalogue() {
  const token = ++emptyRequest;
  emptyLoading.value = true; emptyError.value = null;
  try { await dataStore.ensureStoriesLoaded(); }
  catch (cause) { if (token === emptyRequest) emptyError.value = cause instanceof Error ? cause.message : 'Impossible de charger les frises.'; }
  finally { if (token === emptyRequest) emptyLoading.value = false; }
}
const pickingStory = ref(false);
const comparisonOptions = computed(() => [...dataStore.stories].filter(story => !panels.value.some(panel => panel.storyId.value === story.id))
  .sort((a, b) => (a.title.fr || '').localeCompare(b.title.fr || '', 'fr')).map(story => ({ value: story.id, label: story.title.fr || story.title.en })));
const storyComparison = computed(() => ({ ids: new Set(comparisonOptions.value.map(option => option.value)), disabled: loading.value || slidePhase.value !== 'idle' || !!routeError.value }));
function replaceComparison() {
  if (route.name !== 'timeline') return;
  const primary = primaryLane.value;
  if (!primary) {
    if (route.query.empty !== '1') void router.replace({ name: 'timeline', query: { empty: '1' } });
    return;
  }
  const id = primary.storyId.value!;
  if (route.query.empty === '1' || (route.query.story ?? '1') !== id) {
    const target = primary.nav.currentStory.value?.id === id ? primary.nav.getPosition() : { storyId: id, view: 'overview' as const };
    void router.replace(withComparison(timelineLocation(target)));
    return;
  }
  const { compare: _compare, order: _order, ...query } = route.query;
  const updated = { ...query, ...comparisonQuery() };
  if (JSON.stringify(route.query.compare) === JSON.stringify(updated.compare) && JSON.stringify(route.query.order) === JSON.stringify(updated.order)) return;
  const returns = router.options.history.state?.timelineReturnPath;
  void router.replace({ name: 'timeline', query: updated,
    ...(Array.isArray(returns) ? { state: { timelineReturnPath: JSON.parse(JSON.stringify(returns)) } } : {}) });
}
async function addComparedStory(id: string, source?: ComparisonPanel) {
  const option = comparisonOptions.value.find(option => option.value === id);
  if (!option) return;
  const panel = workspace.add(id);
  // Depuis un lien, la frise vient juste sous celle d’origine ; le bouton général complète la pile.
  if (panel && source) workspace.move(panel.key, panels.value.indexOf(source) + 1);
  pickingStory.value = false;
  replaceComparison();
  if (!panel || !source) return;
  panelAnnouncement.value = `${option.label} ajoutée sous ${source.title.value}.`;
  await nextTick();
  focusPanel(panel.key);
}
async function removeComparedStory(panel: ComparisonPanel) {
  if (!comparing.value) return;
  slide.cancel();
  const index = panels.value.indexOf(panel);
  const title = panel.title.value;
  const wasLeading = panel.leads.value, wasPrimary = panel === primaryLane.value;
  workspace.remove(panel);
  if (!wasLeading || wasPrimary || !panels.value.length) replaceComparison();
  panelAnnouncement.value = `${title} retirée.`;
  await nextTick();
  const next = panels.value[index] ?? panels.value[index - 1];
  if (next) focusPanel(next.key);
  else timelineAdd.value?.querySelector<HTMLElement>('button, [role="combobox"]')?.focus();
}
function selectPanel(panel: ComparisonPanel) {
  if (!comparing.value || panel.key === selectedLaneKey.value) return;
  slide.cancel(); clearComparisonLink(); workspace.select(panel);
}
function selectPanelBackground(event: MouseEvent, panel: ComparisonPanel) {
  const target = event.target;
  if (!(target instanceof Element) || target.closest('button, a, input, select, textarea, [role="combobox"], [role="option"], [contenteditable], .period-card, .event-card')) return;
  selectPanel(panel);
}
function selectHeaderStory(panel: ComparisonPanel, id: string) {
  if (id === panel.nav.currentStoryId.value) panel.actions.storyCrumb(panel.storyCrumbs.value.length - 1);
  else {
    const story = panel.nav.headerStories.value.find(story => story.id === id);
    if (story) panel.actions.storySelect(id, story.anchor);
  }
}
function selectContext(panel: ComparisonPanel, id: string) {
  workspace.select(panel);
  if (panel === primaryLane.value) onContext(id);
  else void panel.nav.selectNavigationContext(id);
}
function contextAnchorFor(panel: ComparisonPanel) {
  const navigation = panel.nav;
  return navigation.referencePeriodId.value ? { type: 'period' as const, id: navigation.referencePeriodId.value }
    : navigation.returnPath.value.slice(-1)[0]?.anchor;
}
const panelAnnouncement = ref('');
const draggedLane = ref<TimelineLaneKey | null>(null);
const dropTarget = ref<{ key: TimelineLaneKey; before: boolean } | null>(null);
function focusPanel(key: TimelineLaneKey, selector = '[data-panel-toggle]') {
  const section = [...(timelineViewport.value?.querySelectorAll<HTMLElement>('[data-lane-key]') ?? [])].find(el => el.dataset.laneKey === key);
  (section?.querySelector<HTMLElement>(selector) ?? section?.querySelector<HTMLElement>('.home-view__story-breadcrumb :is(button, [role="combobox"])'))?.focus();
}
function togglePanel(panel: ComparisonPanel) {
  slide.cancel();
  clearComparisonLink();
  workspace.toggle(panel);
}
async function movePanel(panel: ComparisonPanel, direction: number) {
  const index = panels.value.indexOf(panel) + direction;
  if (!workspace.move(panel.key, index)) return;
  slide.cancel();
  replaceComparison();
  panelAnnouncement.value = `${panel.title.value} déplacée en position ${index + 1} sur ${panels.value.length}.`;
  await nextTick();
  focusPanel(panel.key, '.home-view__drag');
}
function clearDrag() { draggedLane.value = null; dropTarget.value = null; }
function onPanelDragStart(event: DragEvent, panel: ComparisonPanel) {
  slide.cancel();
  draggedLane.value = panel.key;
  if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', panel.key); }
}
function onPanelDragOver(event: DragEvent, panel: ComparisonPanel) {
  if (!draggedLane.value || draggedLane.value === panel.key) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  dropTarget.value = { key: panel.key, before: event.clientY < box.top + box.height / 2 };
  const viewport = timelineViewport.value;
  if (viewport) {
    const rect = viewport.getBoundingClientRect();
    if (event.clientY < rect.top + 48) viewport.scrollTop -= 20;
    else if (event.clientY > rect.bottom - 48) viewport.scrollTop += 20;
  }
}
function onPanelDrop(event: DragEvent, panel: ComparisonPanel) {
  if (!draggedLane.value || dropTarget.value?.key !== panel.key) { clearDrag(); return; }
  event.preventDefault();
  const source = panels.value.find(item => item.key === draggedLane.value);
  if (!source) { clearDrag(); return; }
  const others = panels.value.filter(item => item !== source);
  const index = others.indexOf(panel) + (dropTarget.value.before ? 0 : 1);
  void movePanel(source, index - panels.value.indexOf(source));
  clearDrag();
}

const storyScope = (): StoryScope => ({
  story: dataStore.stories.find(story => String(story.id) === currentStoryId.value),
  username: auth.profile?.username, signedIn: auth.signedIn,
});
const depth = () => parentStack.value.length + (currentPeriod.value ? 1 : 0);
function onEventClick(event: ListEvent) {
  const scope = storyScope();
  track('timeline_event_opened', { ...storyProperties(scope), ...eventProperties(scope, event), depth: depth() });
  return nav.value.handleEventClick(event);
}
/** One event per position actually displayed; a navigation replaced by a newer one reports nothing. */
let positionToken = 0;
watch(primaryLane, () => { positionToken++; }, { flush: 'sync' });
async function reportPosition(loaded: Promise<unknown>, via: TimelineVia) {
  const token = ++positionToken;
  await loaded;
  if (token !== positionToken) return;
  if (error.value) { track('timeline_load_failed', { reason: 'load_failed', via }); return; }
  const scope = storyScope();
  track('timeline_position_viewed', {
    ...storyProperties(scope), ...periodProperties(scope, currentPeriod.value),
    view: currentPeriod.value ? 'period' : 'overview', depth: depth(), via, has_context: !!contextId.value,
    ...positionShape({
      storyPeriods: currentStoryPeriods.value, displayedPeriods: displayedPeriods.value, events: storyEvents.value,
      hasPrevious: !!previousPeriod.value, hasNext: !!nextPeriod.value,
    }),
  });
}
function retry() { actionVia = 'retry'; void reportPosition(nav.value.retryLoad(), 'retry'); }


const route = useRoute();
const routeError = ref('');
const timelineViewport = ref<HTMLElement | null>(null);
const timelineStack = ref<HTMLElement | null>(null);
const timelineAdd = ref<HTMLElement | null>(null);
// Toutes les grilles, y compris réduites, partagent les animations et l’échelle.
const slide = useTimelineSlide(
  () => timelineStack.value,
  () => panels.value.flatMap(panel => workspace.grids.get(panel.key)?.getSlideLayers?.() ?? []),
  () => {
    const leading = leaderNav.value;
    return { storyId: leading.currentStoryId.value, periodId: leading.currentPeriod.value?.id ?? leading.referencePeriodId.value ?? undefined, contextId: leading.contextId.value };
  },
  () => leaderNav.value.loading.value,
  () => (primaryLeads.value && routeError.value) || leaderNav.value.error.value,
);
const { phase: slidePhase } = slide;
function slideToAdjacentPeriod(key: TimelineLaneKey, direction: 'previous' | 'next') {
  const leading = panels.value.find(panel => panel.key === key)!.nav;
  const destination = direction === 'previous' ? leading.previousPeriod.value : leading.nextPeriod.value;
  if (leading.loading.value || !destination) return;
  slide.prepare(direction, destination.id,
    'linkedStoryId' in destination && typeof destination.linkedStoryId === 'string' ? destination.linkedStoryId : undefined);
  if (key === primaryLane.value?.key) actionVia = 'slide';
  leading.navigateAdjacentPeriod(direction);
}
function closeNavigationChoices() { slide.cancel(); leaderNav.value.navigationChoices.value = []; }
function chooseLeaderTarget(choice: TimelineTarget) {
  if (primaryLeads.value) void onChoice(choice);
  else void leaderNav.value.chooseNavigationTarget(choice);
}

const {
  links: comparisonLinkLines, activeEventId: activeComparisonEventId,
  schedule: scheduleComparisonLinks, track: trackComparisonLink, clear: clearComparisonLink,
} = useTimelineComparisonLinks(
  timelineStack,
  () => panels.value.map(panel => workspace.grids.get(panel.key)?.$el ?? null),
  () => panels.value.map(panel => panel.grid.value.events),
  [scaleFrame, sharedFocus, leader, slidePhase, panels, showPeriodChildren, () => panels.value.map(panel => panel.collapsed.value)],
);

let initialized = false;
let consumedPosition = '';
let previousRouteName: unknown = null;
watch([() => route.query.story, () => route.query.period, () => route.query.context, () => route.query.reference, () => route.query.view, () => route.query.entry, () => route.query.event, () => route.query.empty, () => route.name], () => {
  const from = previousRouteName; previousRouteName = route.name;
  if (route.name !== 'timeline') return;
  // An in-page action, an announced search, the browser history inside the page, or an entry from elsewhere.
  const via = routeVia ?? takeAnnouncedEntry() ?? (initialized && from === 'timeline' ? 'history' : entryVia(window.history.state?.back));
  routeVia = null;
  routeError.value = '';
  try {
    if (route.query.empty === '1') {
      workspace.clear(); positionToken++; consumedPosition = 'empty'; initialized = true;
      void loadEmptyCatalogue(); return;
    }
    const storyId = readStoryTarget(route.query.story);
    const primary = workspace.ensurePrimary(storyId ?? '1');
    const state=router.options.history.state;
    const position = { ...readTimelinePosition(route.query), ...(Array.isArray(state?.timelineReturnPath)?{returnPath:readTimelineReturnPath(state)}:{}) };
    const key = JSON.stringify([primary.key, storyId, position]);
    if (initialized && key === consumedPosition) return;
    consumedPosition = key;
    initialized = true;
    // Le panneau lié à l’URL reprend la main, quelle que soit sa place visuelle.
    leader.value = primary.key;
    workspace.select(primary);
    if (!comparing.value) primary.collapsed.value = false;
    void reportPosition(primary.nav.openStory(storyId ?? '1', { storyId: storyId ?? '1', ...position }), via);
  } catch (cause) {
    routeError.value = cause instanceof Error ? cause.message : 'La frise demandée est invalide.';
    track('timeline_load_failed', { reason: 'invalid_link', via });
  }
}, { immediate: true });
function readStoryIds(value: unknown): string[] {
  return [...new Set((Array.isArray(value) ? value : [value]).flatMap(raw => {
    try { const id = readStoryTarget(raw); return id ? [id] : []; } catch { return []; }
  }))];
}
// Les anciens liens avec un seul compare restent valides. L’ordre peut placer la principale partout.
watch([() => route.name, () => route.query.compare, () => route.query.order, () => route.query.story, () => route.query.empty], () => {
  if (route.name !== 'timeline' || route.query.empty === '1' || !primaryLane.value) return;
  const primary = primaryLane.value;
  const ids = readStoryIds(route.query.compare).filter(id => id !== primary.storyId.value);
  const order = readStoryIds(route.query.order);
  workspace.sync(ids, order.length ? order : [primary.storyId.value!, ...ids]);
}, { immediate: true });
// Les navigations des panneaux supplémentaires restent locales, mais leur identité voyage dans le lien.
watch(() => panels.value.map(panel => panel.storyId.value), () => {
  if (route.name !== 'timeline') return;
  const seen = new Set([primaryLane.value?.storyId.value]);
  const priority = [...panels.value].sort((a, b) => Number(b.leads.value) - Number(a.leads.value));
  for (const panel of priority) {
    if (panel === primaryLane.value) continue;
    if (panel.storyId.value && seen.has(panel.storyId.value)) workspace.remove(panel);
    else seen.add(panel.storyId.value);
  }
  replaceComparison();
});

let activatedOnce = false;
onDeactivated(() => { closeNavigationChoices(); clearDrag(); });
onActivated(() => {
  if (!activatedOnce) { activatedOnce = true; return; }
  if (!primaryLane.value) { void loadEmptyCatalogue(); return; }
  if (loading.value || routeError.value) return;
  void nav.value.loadInitialData({ parentStackIds: parentStack.value.map(period => period.id), currentPeriodId: currentPeriod.value?.id ?? null }, true);
});
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  position: relative;
}

.home-view__choices { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-md); }
.home-view__header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: var(--spacing-xs); flex-shrink: 0; padding-inline: var(--spacing-sm); }
.home-view__breadcrumbs { grid-column: 2; min-width: 0; }
.home-view__drag { grid-column: 1; grid-row: 1; cursor: grab; margin-top: var(--spacing-sm); }
.home-view__drag:active { cursor: grabbing; }
/* Sujet des événements : un select discret, aligné à droite avec les actions de la frise. */
.home-view__subject { width: auto; min-width: 0; }
.home-view__subject :deep(.base-select__trigger) { min-height: 0; padding: var(--spacing-xs) var(--spacing-sm); border: 0; background: transparent; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.home-view__subject :deep(.base-select__trigger:hover) { background: var(--color-interaction-hover); }
.home-view__subject :deep(.base-select__value) { font: inherit; }
.home-view__subject :deep(.base-select__dropdown) { left: auto; right: 0; width: max-content; min-width: 100%; max-width: min(320px, 85vw); }
.home-view__header-actions { grid-column: 3; grid-row: 1; min-width: 0; display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: var(--spacing-xs); margin-block: var(--spacing-sm) var(--spacing-xs); }
@media (max-width: 768px) {
  .home-view__header { grid-template-columns: auto minmax(0, 1fr); }
  .home-view__header-actions { grid-column: 2; grid-row: 2; margin-top: 0; }
}
.home-view__breadcrumbs > .story-breadcrumb + .story-breadcrumb { padding-top: 0; }
.home-view__story-breadcrumb :deep(.story-breadcrumb__item) { padding-bottom: 0; }
.home-view__period-breadcrumb :deep(.story-breadcrumb__item) { padding-top: 0; }
/* La pile garde une hauteur lisible par frise ; elle défile quand l’espace manque. */
.home-view__viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: auto;
  display: flex;
  flex-direction: column;
  background: var(--color-surface-default);
}
.home-view__stack { flex: 1 0 auto; min-height: 100%; position: relative; display: flex; flex-direction: column; gap: var(--spacing-xs); }
.home-view__viewport:not(.home-view__viewport--comparing) .home-view__header { position: sticky; top: 0; z-index: var(--z-index-sticky); background: var(--color-background-default); }
.home-view__frise { flex: 1 0 auto; min-height: 240px; display: flex; flex-direction: column; position: relative; background: var(--timeline-panel-background, var(--color-background-default)); }
.home-view__viewport .home-view__frise--collapsed { flex: 0 0 auto; min-height: 0; }
.home-view__frise--active {
  --timeline-panel-background: color-mix(in srgb, var(--color-primary) 12%, var(--color-background-default));
}
.home-view__frise:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; }
@media (max-width: 768px) {
  .home-view__viewport .home-view__frise:not(.home-view__frise--collapsed) { min-height: 320px; }
}
.home-view__frise--dragging { opacity: 0.5; }
.home-view__frise--drop-before { box-shadow: inset 0 2px var(--color-border-focus); }
.home-view__frise--drop-after { box-shadow: inset 0 -2px var(--color-border-focus); }
.home-view__panel-content { display: flex; flex-direction: column; flex: 1 0 auto; }
.home-view__error { padding: var(--spacing-sm) var(--spacing-md); }
.home-view__timeline { flex: 1 0 auto; height: auto; }
/* Au-dessus des légendes au repos, sous les détails actifs ; les menus restent dans leur couche globale. */
.home-view__add { position: absolute; inset-inline: 0; bottom: var(--spacing-md); display: flex; justify-content: center; padding-inline: var(--spacing-md); pointer-events: none; z-index: var(--z-index-timeline-item); }
/* Le sélecteur actif et sa liste retrouvent la couche des menus. */
.home-view__add--picking { z-index: var(--z-index-dropdown); }
.home-view__add-surface { display: flex; align-items: center; gap: var(--spacing-sm); max-width: 100%; padding: var(--spacing-xs); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--color-surface-raised); box-shadow: var(--shadow-lg); pointer-events: auto; }
.home-view__story-picker { width: min(360px, 60vw); min-width: 0; }
.home-view__links { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
/* Traits discrets ; celui de l’événement survolé ressort. */
.home-view__links line { stroke: var(--color-data-event); stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.3; transition: opacity var(--transition-fast), stroke-width var(--transition-fast); }
.home-view__links line.is-active { opacity: 1; stroke-width: 2; }
.home-view__context-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-right: var(--spacing-sm); }
.home-view__viewport--waiting .home-view__timeline { visibility: hidden; }
.home-view__viewport--sliding :deep(.timeline-card),
.home-view__viewport :deep(.timeline-slide-snapshot *) {
  animation: none !important;
  transition: none !important;
}
</style>
