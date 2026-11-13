<template>
  <a
    v-if="article"
    class="wikipedia-link"
    :class="{ 'wikipedia-link--compact': compact, 'wikipedia-link--logo': display === 'logo' }"
    :href="article.url"
    :hreflang="article.language"
    target="_blank"
    rel="noopener noreferrer"
    :title="uiText(display === 'logo' ? label : undefined)"
    @click.stop
    @keydown.enter.stop
    @keydown.space.stop
  >
    <Icon v-if="display === 'logo'" icon="mdi:wikipedia" class="wikipedia-link__icon" aria-hidden="true" />
    <span v-else>{{ uiText(label) }}</span>
    <span class="sr-only">{{ uiText(display === 'logo' ? label : '') }} : {{ subject }}{{ uiText(article.language === 'en' ? ', article en anglais' : '') }} {{ uiText("(nouvel onglet)") }}</span>
  </a>
</template>

<script setup lang="ts">
import { language, uiText } from '@/i18n';

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
  /** `logo` : logo seul avec infobulle ; `text` : « Voir sur Wikipédia » en clair. */
  display?: 'logo' | 'text';
}>(), { titles: null, compact: false, display: 'logo' });

const article = computed(() => preferredWikipediaArticle(props.titles, language.value));
const label = computed(() => language.value === 'en'
  ? (article.value?.language === 'fr' ? 'View on Wikipedia (FR)' : 'View on Wikipedia')
  : (article.value?.language === 'en' ? 'Voir sur Wikipédia (en)' : 'Voir sur Wikipédia'));
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
.wikipedia-link__icon { display: block; width: 1.25em; height: 1.25em; }
/* Logo seul : boîte carrée centrée, sans ligne de base propre. */
.wikipedia-link--logo { line-height: 1; }
.wikipedia-link--compact { font-size: var(--font-size-sm); }
</style>
