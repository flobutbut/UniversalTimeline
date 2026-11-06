<template>
  <div v-if="period" class="story-period-detail">
    <div class="story-period-detail__layout" :class="{ 'story-period-detail__layout--with-metadata': hasMetadata }">
      <div class="story-period-detail__main">
        <header class="story-period-detail__header">
          <div class="story-period-detail__heading">
            <h3>{{ label(period) }}</h3>
            <p class="story-period-detail__dates">{{ dateRange }}</p>
          </div>
          <div class="story-period-detail__actions">
            <template v-if="inStory">
              <Button variant="tertiary" size="sm" :disabled="busy" @click="emit('edit', period.id)">Modifier la période</Button>
              <Button v-if="canCreateStory" variant="tertiary" size="sm" :disabled="busy" @click="emit('create-story', period.id)">{{ promote ? 'Promouvoir en sous-frise' : 'Créer une frise' }}</Button>
              <Button variant="tertiary" size="sm" :disabled="busy || children.length > 0" :title="children.length > 0 ? 'Déplacez d’abord ses sous-périodes.' : undefined" @click="emit('convert', period.id)">Convertir en événement</Button>
            </template>
            <Button v-else variant="secondary" size="sm" :disabled="busy || !canAdd" :title="!canAdd ? 'Ajoutez d’abord la période parente à la frise.' : undefined" @click="emit('add', period.id)">{{ period.id.startsWith('wikidata:') ? 'Importer cette période' : 'Ajouter à la frise' }}</Button>
          </div>
          <p v-if="description" class="story-period-detail__description" aria-label="Description de la période">{{ description }}</p>
          <p v-else class="story-period-detail__empty story-period-detail__description">Aucune description renseignée.</p>
          <WikipediaLink :titles="period.wikipedia" :subject="period.label.fr || period.label.en" class="story-period-detail__wikipedia" />
        </header>
        <section aria-label="Catégories de la période">
          <h4>Catégories</h4>
          <ul v-if="period.categories.length" class="story-period-detail__categories"><li v-for="category in period.categories" :key="category.id"><Tag :label="category.label.fr?.trim() || category.label.en?.trim() || category.id" /></li></ul>
          <p v-else class="story-period-detail__empty">Aucune catégorie renseignée.</p>
        </section>
        <div v-if="inStory" class="story-period-detail__context" aria-label="Organisation dans cette frise">
          <section>
            <h4>Sous-périodes <span>{{ children.length }}</span></h4>
            <ul v-if="children.length" class="story-period-detail__children"><li v-for="child in children" :key="child.id"><button type="button" @click="emit('select', child.id)"><span>{{ label(child) }}</span><Icon icon="mdi:arrow-right" aria-hidden="true" /></button></li></ul>
            <p v-else class="story-period-detail__empty">Aucune sous-période dans cette frise.</p>
            <Button variant="tertiary" size="sm" :disabled="busy" @click="emit('add-child', period.id)">Ajouter une sous-période</Button>
          </section>
          <section class="story-period-detail__stories" aria-label="Frises associées à cette période">
            <h4>Frises associées <span>{{ stories.length }}</span></h4>
            <p class="story-period-detail__hint">Des frises à explorer depuis cette période dans la timeline.</p>
            <AnchoredStoryRow v-for="childStory in stories" :key="childStory.id" :story="childStory" :summary="summaries.find(summary => summary.id === childStory.id)" :disabled="busy" @remove="emit('remove-story', childStory.id, period.id)" />
            <p v-if="!stories.length" class="story-period-detail__empty">Aucune frise associée à cette période.</p>
            <Button variant="tertiary" size="sm" :disabled="busy" @click="emit('associate-story', period.id)">Associer une frise</Button>
          </section>
        </div>
        <div v-else class="story-period-detail__context"><p class="story-period-detail__empty">Cette période n’appartient pas encore à la frise. Ajoutez-la pour y organiser des sous-périodes et associer des frises.</p></div>
        <EntityDangerZone v-if="inStory" class="story-period-detail__danger" description="Cette période sera retirée de cette frise. Elle restera disponible dans le catalogue." :busy="busy" @remove="emit('remove', period.id)" />
      </div>
      <aside v-if="hasMetadata" class="story-period-detail__metadata" aria-label="Métadonnées de la période">
        <section v-if="wikidataId" aria-label="Référence Wikidata">
          <h4>Référence Wikidata</h4>
          <a :href="`https://www.wikidata.org/wiki/${wikidataId}`" target="_blank" rel="noopener noreferrer" :aria-label="`Voir ${wikidataId} sur Wikidata (nouvel onglet)`" class="story-period-detail__reference">{{ wikidataId }}<Icon icon="mdi:open-in-new" aria-hidden="true" /></a>
        </section>
        <dl v-if="recordDate(period.createdAt) || recordDate(period.updatedAt)" class="story-period-detail__record">
          <div v-if="recordDate(period.createdAt)"><dt>Créée le</dt><dd>{{ recordDate(period.createdAt) }}</dd></div>
          <div v-if="recordDate(period.updatedAt)"><dt>Mise à jour le</dt><dd>{{ recordDate(period.updatedAt) }}</dd></div>
        </dl>
      </aside>
    </div>
  </div>
  <div v-else class="story-period-detail__placeholder"><Icon icon="mdi:file-document-outline" aria-hidden="true" /><p>Sélectionnez une période pour consulter ses détails.</p><span>Les chevrons permettent de parcourir les sous-périodes.</span></div>
</template>

<script setup lang="ts">
import EntityDangerZone from './EntityDangerZone.vue';
import WikipediaLink from '@/components/WikipediaLink.vue';
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { ListPeriod, ChildStorySummary, StorySummary } from '@/types/database';
import Button from '@/components/base/Button.vue';
import Tag from '@/components/base/Tag.vue';
import AnchoredStoryRow from './AnchoredStoryRow.vue';
import { DateService } from '@/services/DateService';
import { formatRecordDate } from '@/lib/storyListDates';

const props = withDefaults(defineProps<{
  period: ListPeriod | null; inStory: boolean; children: ListPeriod[];
  stories: ChildStorySummary[]; summaries: StorySummary[]; busy?: boolean; canAdd?: boolean; canCreateStory?: boolean;
  /** Règle 3 : la période devrait devenir une sous-frise. */ promote?: boolean;
}>(), { busy: false, canAdd: true, canCreateStory: true, promote: false });
const emit = defineEmits<{
  select: [id: string]; edit: [id: string]; move: [id: string]; remove: [id: string]; 'create-story': [id: string]; convert: [id: string];
  add: [id: string]; 'add-child': [id: string]; 'associate-story': [id: string]; 'remove-story': [storyId: string, periodId: string];
}>();
const label = (period: ListPeriod) => period.label.fr?.trim() || period.label.en?.trim() || 'Période sans titre';
const description = computed(() => props.period?.description?.fr?.trim() || props.period?.description?.en?.trim() || '');
const wikidataId = computed(() => /^Q[1-9]\d*$/.test(props.period?.wikidata_id ?? '') ? props.period!.wikidata_id : null);
const dateRange = computed(() => {
  const period = props.period;
  if (!period) return '';
  const display = (raw: string, years?: number) => raw?.trim() ? DateService.formatBound(DateService.parse(raw))
    : Number.isFinite(years) ? DateService.formatGeologicalBound(years!) : null;
  const from = display(period.startDate, period.startYearsBP), to = display(period.endDate, period.endYearsBP);
  return from && to ? `de ${from} à ${to}` : from ? `à partir de ${from}` : to ? `jusqu’à ${to}` : 'Dates non déterminées';
});
const recordDate = (date?: Date) => date && Number.isFinite(date.getTime()) ? formatRecordDate(date) : '';
const hasMetadata = computed(() => !!(wikidataId.value || recordDate(props.period?.createdAt) || recordDate(props.period?.updatedAt)));
</script>

<style scoped>
.story-period-detail { display: flex; flex-direction: column; gap: var(--spacing-xl); padding: var(--spacing-xl); }
.story-period-detail__header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--spacing-sm) var(--spacing-lg); padding-bottom: var(--spacing-lg); border-bottom: 1px solid var(--color-border-default); }
.story-period-detail__heading { flex: 1 1 200px; min-width: 0; }
.story-period-detail h3 { margin: 0; color: var(--color-text-primary); font-size: var(--font-size-2xl); line-height: var(--line-height-loose); overflow-wrap: anywhere; }
.story-period-detail__dates { margin: 0; color: var(--color-text-secondary); font: var(--type-body); }
.story-period-detail__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-xs); }
.story-period-detail__layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--spacing-xl); }
.story-period-detail__main, .story-period-detail__context { display: flex; flex-direction: column; gap: var(--spacing-xl); min-width: 0; }
.story-period-detail section { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-sm); min-width: 0; }
.story-period-detail h4 { display: flex; align-items: center; gap: var(--spacing-sm); margin: 0; font: var(--type-label); color: var(--color-text-primary); }
.story-period-detail h4 span { color: var(--color-text-secondary); font: var(--type-meta); }
.story-period-detail__description { flex: 0 0 100%; margin: 0; font: var(--type-body); color: var(--color-text-primary); white-space: pre-wrap; overflow-wrap: anywhere; }
.story-period-detail__wikipedia.wikipedia-link { font: var(--type-body); }
.story-period-detail__empty { margin: 0; font: var(--type-body); color: var(--color-text-secondary); }
.story-period-detail__hint { margin: 0; font: var(--type-meta); color: var(--color-text-secondary); }
.story-period-detail__categories { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); list-style: none; padding: 0; margin: 0; }
.story-period-detail__categories li { min-width: 0; max-width: 100%; }
.story-period-detail__categories :deep(.ui-tag__label) { white-space: normal; overflow-wrap: anywhere; }
.story-period-detail__reference { display: inline-flex; align-items: center; gap: var(--spacing-sm); color: var(--color-text-link); font: var(--type-body); text-decoration: none; }
.story-period-detail__reference:hover { text-decoration: underline; }
.story-period-detail__record { display: flex; flex-direction: column; gap: var(--spacing-md) var(--spacing-xl); margin: 0; padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-default); font: var(--type-meta); color: var(--color-text-secondary); }
.story-period-detail__record dt { margin-bottom: var(--spacing-xs); }.story-period-detail__record dd { margin: 0; }
.story-period-detail__context { padding-top: var(--spacing-xl); border-top: 1px solid var(--color-border-default); }
.story-period-detail__context section { align-items: stretch; }.story-period-detail__context .base-button { align-self: flex-start; }
.story-period-detail__children { display: grid; gap: var(--spacing-sm); list-style: none; padding: 0; margin: 0; }
.story-period-detail__children button { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm); width: 100%; min-height: var(--field-height-md); padding: var(--spacing-xs) var(--spacing-sm); border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); background: var(--color-surface-raised); color: var(--color-text-link); font: var(--type-compact); text-align: left; cursor: pointer; transition: background-color var(--transition-fast), border-color var(--transition-fast); }
.story-period-detail__children button:hover, .story-period-detail__children button:focus-visible { background: var(--color-surface-raised-hover); border-color: var(--color-border-focus); }
.story-period-detail__children button span { min-width: 0; overflow-wrap: anywhere; }.story-period-detail__children svg { flex-shrink: 0; }
.story-period-detail__stories { border-top: 1px solid var(--color-border-default); padding-top: var(--spacing-lg); }
.story-period-detail__placeholder { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-sm); padding: var(--spacing-2xl); text-align: center; color: var(--color-text-secondary); font: var(--type-body); }
.story-period-detail__placeholder > svg { font-size: var(--font-size-3xl); }.story-period-detail__placeholder p { margin: 0; }.story-period-detail__placeholder > span { font: var(--type-meta); }
.story-period-detail a:focus-visible, .story-period-detail__children button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 3px; }
.story-period-detail__metadata { display: flex; flex-direction: column; align-self: start; gap: var(--spacing-xl); min-width: 0; padding-top: var(--spacing-xl); border-top: 1px solid var(--color-border-default); color: var(--color-text-secondary); font: var(--type-meta); }
.story-period-detail__metadata h4 { color: var(--color-text-secondary); font: var(--type-label); }
.story-period-detail__metadata .story-period-detail__reference { font: var(--type-meta); }
.story-period-detail__metadata .story-period-detail__record { border: 0; padding: 0; }
.story-period-detail__context :deep(.anchored-story-row:hover), .story-period-detail__context :deep(.anchored-story-row:focus-within) { outline: 1px solid var(--color-border-focus); outline-offset: -1px; }
@container (min-width: 720px) {
  .story-period-detail__layout--with-metadata { grid-template-columns: minmax(0, 1fr) 200px; gap: var(--spacing-2xl); }
  .story-period-detail__metadata { padding: 0 0 0 var(--spacing-xl); border-top: 0; border-left: 1px solid var(--color-border-default); }
}
@media (max-width: 600px) { .story-period-detail { padding: var(--spacing-lg); } }
</style>
