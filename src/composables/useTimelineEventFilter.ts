import { computed, ref, watch } from 'vue';
import type { ListEvent } from '@/types/database';
import { ALL_EVENTS, defaultEventTagIds, ESSENTIAL_EVENTS, isEventOfSubject, isEventShown, timelineSubjectOptions, TIMELINE_FILTER_MIN_EVENTS, type FilterableStory } from '@/lib/timelineEventFilter';

/** Sujet affiché sur une frise. Le choix vaut pour cette frise et revient à l'état de départ quand elle change. */
export function useTimelineEventFilter(source: () => (FilterableStory & { id: string }) | null) {
  const chosen = ref<string | null>(null);
  watch(() => source()?.id, () => { chosen.value = null; }, { flush: 'sync' });

  const events = computed<readonly ListEvent[]>(() => source()?.events ?? []);
  const dense = computed(() => events.value.length >= TIMELINE_FILTER_MIN_EVENTS);
  const defaults = computed(() => { const story = source(); return story ? defaultEventTagIds(story) : null; });
  const options = computed(() => timelineSubjectOptions(events.value));
  const subject = computed(() => chosen.value ?? (dense.value ? ESSENTIAL_EVENTS : ALL_EVENTS));
  // Il faut au moins deux sujets réels pour qu'il y ait quelque chose à choisir.
  const available = computed(() => options.value.filter(option => option.value !== ALL_EVENTS && option.value !== ESSENTIAL_EVENTS).length > 1);

  /** `keep` : événement demandé explicitement, affiché quel que soit le sujet choisi. */
  function apply(rows: ListEvent[], keep?: string | null) {
    if (!available.value || subject.value === ALL_EVENTS) return rows;
    if (subject.value === ESSENTIAL_EVENTS) return rows.filter(event => event.id === keep || isEventShown(event, defaults.value));
    return rows.filter(event => event.id === keep || isEventOfSubject(event, subject.value));
  }
  function select(value: unknown) { if (typeof value === 'string') chosen.value = value; }

  return { subject, options, available, apply, select };
}
