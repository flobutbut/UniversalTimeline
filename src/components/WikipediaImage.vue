<template>
  <!-- Image décorative : le titre et la description portent le sens ; rien tant qu'elle n'est pas chargée. -->
  <div v-if="thumbnail" class="wikipedia-image" :class="{ 'is-loaded': loaded }">
    <img :src="thumbnail.src" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer"
      @load="loaded = true" @error="thumbnail = null" />
  </div>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { fetchWikipediaThumbnail, type WikipediaThumbnail } from '@/services/wikipediaImages';
import type { WikipediaTitles } from '@/types/database';

/**
 * Vignette 16:9 de l'article Wikipédia, lue seulement quand la bulle est affichée (`active`).
 * Sans article, sans image libre ou en cas de panne : rien, la bulle reste inchangée.
 */
const props = withDefaults(defineProps<{ titles?: WikipediaTitles | null; active?: boolean }>(), { titles: null, active: true });

const thumbnail = ref<WikipediaThumbnail | null>(null);
const loaded = ref(false);
let controller: AbortController | undefined;
let loadedKey = '';

function stop() { controller?.abort(); controller = undefined; }

watch(() => [props.active, props.titles?.fr ?? '', props.titles?.en ?? ''] as const, ([active, fr, en]) => {
  const key = `${fr}\u0000${en}`;
  if (key !== loadedKey) { stop(); thumbnail.value = null; loaded.value = false; loadedKey = ''; }
  if (!active || loadedKey === key || controller || (!fr && !en)) return;
  const current = new AbortController();
  controller = current;
  fetchWikipediaThumbnail({ fr: fr || null, en: en || null }, { signal: current.signal })
    .then(value => { if (controller === current) { thumbnail.value = value; loadedKey = key; } })
    .catch(() => { /* Enrichissement facultatif : la bulle reste lisible sans image. */ })
    .finally(() => { if (controller === current) controller = undefined; });
}, { immediate: true });

onScopeDispose(stop);
</script>

<style scoped>
.wikipedia-image {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  /* Dans une bulle en max-content, l'image impose une largeur lisible sans dépasser la bulle. */
  min-width: 200px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-surface-subtle);
  margin-bottom: var(--spacing-sm);
}
.wikipedia-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Recadrage 16:9 : on garde le haut-centre, où se trouvent le plus souvent les sujets. */
  object-fit: cover;
  object-position: 50% 30%;
  opacity: 0;
  transition: opacity var(--transition-normal);
}
.wikipedia-image.is-loaded img { opacity: 1; }
</style>
