<template>
  <section class="catalogue-demo">
    <h1>Catalogues et espace des frises</h1>
    <p>Barre de recherche et filtres communs. Les tableaux exposent une densité compacte pour les données et confortable pour les frises.</p>
    <h2>CatalogueToolbar · CatalogueFilters · CatalogueTable</h2>
    <CatalogueToolbar v-model:search="search" placeholder="Rechercher dans la démonstration…">
      <template #filters><CatalogueFilters context="events" v-model:categories="categories" v-model:story-ids="storyIds" v-model:time-range="range" :category-options="categoryOptions" :story-options="storyOptions" /></template>
      <template #actions><Button size="sm" @click="notice('Ajouter un événement')">Ajouter un événement</Button></template>
    </CatalogueToolbar>
    <Tabs v-model="density" :tabs="[{ value: 'compact', label: 'Compacte' }, { value: 'comfortable', label: 'Confortable' }]" />
    <div class="table-example">
      <CatalogueTable label="Démonstration" :density="density" :columns="columns" :items="rows" empty-text="Aucun résultat" :sort-column="sort" :sort-dir="direction" @sort="sortRows">
        <template #row="{ item }"><span class="col-label" role="cell">{{ item.label }}</span><span class="col-date" role="cell">{{ item.date }}</span><span class="col-categories" role="cell"><Tag :label="item.category" variant="accent" /></span></template>
      </CatalogueTable>
    </div>
    <h2>StoryTabsBar · StoryGallery</h2>
    <Tabs v-model="galleryState" :tabs="[{ value: 'catalogue', label: 'Catalogue' }, { value: 'empty', label: 'Sans frise' }]" />
    <div class="gallery-example">
      <StoryTabsBar :tabs="tabs" :active-id="active" @select="active = $event" @close="closeTab" />
      <StoryGallery v-model:search="gallerySearch" v-model:visibility="visibility" v-model:time-range="galleryRange" v-model:period="period" v-model:categories="galleryCategories" :stories="visibleStories" :total-stories="sampleStories.length" :category-options="categoryOptions" @open="openStory" @create="notice('Créer une frise')" />
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from '@/components/base/Button.vue';
import Tabs from '@/components/base/Tabs.vue';
import Tag from '@/components/base/Tag.vue';
import CatalogueToolbar from '@/components/filters/CatalogueToolbar.vue';
import CatalogueFilters from '@/components/filters/CatalogueFilters.vue';
import CatalogueTable from '@/components/catalogue/CatalogueTable.vue';
import StoryGallery from '@/views/DatabaseView/StoryGallery.vue';
import StoryTabsBar from '@/views/DatabaseView/StoryTabsBar.vue';
import type { CatalogueColumn } from '@/components/catalogue/columns';
import type { PeriodFilter } from '@/components/filters/filterTypes';
import type { StoryTimeRange } from '@/lib/storyTimeFilter';
import type { StorySummary } from '@/types/database';
import { storyOverlapsRange } from '@/lib/storyTimeFilter';
import { useToast } from '@/composables/useToast';
const toast = useToast();
const notice = (label: string) => toast.show(`${label} — démonstration`, 'info');
const search = ref('');
const categories = ref<string[]>([]);
const storyIds = ref<string[]>([]);
const range = ref<StoryTimeRange | null>(null);
const density = ref<'compact' | 'comfortable'>('compact');
const sort = ref('label');
const direction = ref<'asc' | 'desc'>('asc');
const categoryOptions = [{ value: 'geology', label: 'Géologie' }, { value: 'history', label: 'Histoire' }];
const storyOptions = [{ value: 'demo-earth', label: 'Histoire de la Terre' }];
const columns: CatalogueColumn[] = [{ key: 'label', label: 'Nom', sortLabel: 'Trier par nom', minWidth: 180 }, { key: 'date', label: 'Date', width: 160 }, { key: 'category', label: 'Catégorie', minWidth: 120 }];
const rows = computed(() => [
  { id: 'earth', label: 'Formation de la Terre', date: '4,54 Ga', category: 'Géologie', categoryId: 'geology', storyId: 'demo-earth', yearsBP: 4.54e9 },
  { id: 'writing', label: 'Invention de l’écriture', date: '3 200 av. J.-C.', category: 'Histoire', categoryId: 'history', storyId: 'demo-history', yearsBP: 5200 },
].filter(row => row.label.toLocaleLowerCase('fr').includes(search.value.toLocaleLowerCase('fr')) && (!categories.value.length || categories.value.includes(row.categoryId)) && (!storyIds.value.length || storyIds.value.includes(row.storyId)) && (!range.value || (row.yearsBP <= range.value.oldBP && row.yearsBP >= range.value.recentBP)))
  .sort((a, b) => a.label.localeCompare(b.label, 'fr') * (direction.value === 'asc' ? 1 : -1)));
function sortRows(column: string) { sort.value = column; direction.value = direction.value === 'asc' ? 'desc' : 'asc'; }
const galleryState = ref('catalogue');
const gallerySearch = ref('');
const visibility = ref<'all' | 'public' | 'private'>('all');
const galleryRange = ref<StoryTimeRange | null>(null);
const period = ref<PeriodFilter | null>(null);
const galleryCategories = ref<string[]>([]);
const stories: StorySummary[] = [
  { id: 'demo-earth', title: { fr: 'Histoire de la Terre', en: '' }, categories: [{ id: 'geology', label: { fr: 'Géologie', en: '' } }], author: 'Démonstration', isPublic: true, startDate: 'G4.54', endDate: 'NOW', previewPeriods: [{ id: 'demo-period', label: { fr: 'Terre', en: '' }, startDate: 'G4.54', endDate: 'NOW', categories: [], hasParent: false, children: [], temporalLocation: '' }], previewEvents: [] },
  { id: 'demo-history', title: { fr: 'Les premières civilisations', en: '' }, categories: [{ id: 'history', label: { fr: 'Histoire', en: '' } }], author: 'Démonstration', isPublic: false, startDate: '-3200', endDate: '0476', previewPeriods: [], previewEvents: [] },
];
const sampleStories = computed(() => galleryState.value === 'empty' ? [] : stories);
const visibleStories = computed(() => sampleStories.value.filter(story => story.title.fr.toLocaleLowerCase('fr').includes(gallerySearch.value.toLocaleLowerCase('fr'))
  && (visibility.value === 'all' || story.isPublic === (visibility.value === 'public'))
  && (!galleryCategories.value.length || story.categories.some(category => galleryCategories.value.includes(category.id)))
  && [galleryRange.value, period.value?.range].every(value => !value || storyOverlapsRange(story, value))));
const tabs = ref<{ id: string; label: string }[]>([]);
const active = ref<string | null>(null);
function openStory(story: StorySummary) { if (!tabs.value.some(tab => tab.id === story.id)) tabs.value.push({ id: story.id, label: story.title.fr }); active.value = story.id; }
function closeTab(id: string) { tabs.value = tabs.value.filter(tab => tab.id !== id); if (active.value === id) active.value = null; }
</script>
<style scoped>
.catalogue-demo { max-width: 1100px; display: flex; flex-direction: column; gap: var(--spacing-md); }
.catalogue-demo h1, .catalogue-demo h2 { font: var(--type-panel-title); margin: var(--spacing-md) 0 0; }
.catalogue-demo p { color: var(--color-text-secondary); }
.table-example { display: flex; height: 230px; min-width: 0; }
.gallery-example { height: 540px; display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); overflow: hidden; }
.gallery-example > .story-gallery { flex: 1; }
</style>
