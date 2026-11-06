<template>
  <a
    v-if="article"
    class="wikipedia-link"
    :class="{ 'wikipedia-link--compact': compact }"
    :href="article.url"
    :hreflang="article.language"
    target="_blank"
    rel="noopener noreferrer"
    :title="compact ? accessibleName : undefined"
    @click.stop
    @keydown.enter.stop
    @keydown.space.stop
  >
    <Icon icon="mdi:wikipedia" class="wikipedia-link__icon" aria-hidden="true" />
    <span>{{ label }}</span><span class="sr-only"> : {{ subject }}{{ article.language === 'en' ? ', article en anglais' : '' }} (nouvel onglet)</span>
    <Icon icon="mdi:open-in-new" class="wikipedia-link__external" aria-hidden="true" />
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { preferredWikipediaArticle } from '@/lib/wikipedia';
import type { WikipediaTitles } from '@/types/database';

/** Lien vers l'article français, ou anglais à défaut ; rien sans article. Toujours dans un nouvel onglet. */
const props = withDefaults(defineProps<{
  titles?: WikipediaTitles | null;
  /** Nom de la période ou de l'événement, pour le nom accessible. */
  subject: string;
  /** Pour une barre étroite : texte et marges réduits. */
  compact?: boolean;
}>(), { titles: null, compact: false });

const article = computed(() => preferredWikipediaArticle(props.titles));
const label = computed(() => article.value?.language === 'en' ? 'Voir sur Wikipédia (en)' : 'Voir sur Wikipédia');
const accessibleName = computed(() => `${label.value} : ${props.subject} (nouvel onglet)`);
</script>

<style scoped>
.wikipedia-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  align-self: flex-start;
  color: var(--color-text-link);
  font: var(--type-meta);
  text-decoration: none;
  white-space: nowrap;
  border-radius: var(--radius-sm);
}
.wikipedia-link:hover { text-decoration: underline; }
.wikipedia-link:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.wikipedia-link__icon { flex-shrink: 0; font-size: 1.1em; }
.wikipedia-link__external { flex-shrink: 0; font-size: 0.9em; }
.wikipedia-link--compact { font-size: var(--font-size-sm); }
</style>
