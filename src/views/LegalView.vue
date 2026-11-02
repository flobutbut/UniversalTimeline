<template>
  <SidebarLayout menu-label="Informations légales" :items="menu" :active="page">
    <article class="legal-view" :aria-labelledby="`legal-${page}-title`">
      <header>
        <h2 :id="`legal-${page}-title`">{{ document.title }}</h2>
        <p class="legal-view__meta">{{ document.summary }} Version du {{ document.updated }}.</p>
      </header>
      <section v-for="section in document.sections" :key="section.title" class="legal-view__section">
        <h3>{{ section.title }}</h3>
        <p v-for="paragraph in section.paragraphs" :key="paragraph" :class="{ 'legal-view__todo': paragraph.startsWith('[À compléter') }">{{ paragraph }}</p>
        <ul v-if="section.items?.length">
          <li v-for="item in section.items" :key="item">{{ item }}</li>
        </ul>
      </section>
      <div v-if="page === 'cookies'" class="legal-view__actions">
        <Button variant="secondary" size="sm" @click="consent.openPreferences">Gérer mes préférences</Button>
      </div>
    </article>
  </SidebarLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Button from '@/components/base/Button.vue';
import SidebarLayout, { type SidebarItem } from '@/components/base/SidebarLayout.vue';
import { LEGAL_PAGES, isLegalPage, legalDocuments, type LegalPage } from '@/lib/legalDocuments';
import { useConsentStore } from '@/stores/useConsentStore';

const route = useRoute(); const consent = useConsentStore();
const page = computed<LegalPage>(() => isLegalPage(route.params.page) ? route.params.page : 'mentions-legales');
const document = computed(() => legalDocuments[page.value]);
const menu: SidebarItem[] = LEGAL_PAGES.map(key => ({ key, label: legalDocuments[key].title, to: { name: 'legal', params: { page: key } } }));
</script>

<style scoped>
.legal-view { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.legal-view h2 { margin: 0; font-size: var(--font-size-xl); }
.legal-view h3 { margin: 0 0 var(--spacing-sm); font-size: var(--font-size-base); }
.legal-view p, .legal-view ul { margin: 0 0 var(--spacing-sm); max-width: 72ch; }
.legal-view ul { padding-left: var(--spacing-lg); }
.legal-view li + li { margin-top: var(--spacing-xs); }
.legal-view__meta { color: var(--color-text-secondary); }
/* Contenu à fournir par l’éditeur : bien visible, jamais présenté comme définitif. */
.legal-view__todo { padding: var(--spacing-sm) var(--spacing-md); border-left: 3px solid var(--color-status-warning-foreground); background: var(--color-status-warning-background); color: var(--color-text-secondary); font-style: italic; }
.legal-view__actions { display: flex; }
</style>
