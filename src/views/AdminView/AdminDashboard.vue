<template>
  <section class="admin-dashboard" aria-labelledby="admin-dashboard-title">
    <header class="admin-dashboard__header">
      <h2 id="admin-dashboard-title">{{ uiText("Tableau de bord") }}</h2>
      <p v-if="data" class="admin-dashboard__meta">{{ uiText("Données du") }} {{ formatAdminDate(data.generatedAt, true) }}{{ uiText(", frises privées comprises.") }} <Button variant="tertiary" size="sm" :disabled="loading" @click="load">{{ uiText("Actualiser") }}</Button></p>
    </header>
    <FeedbackState v-if="loading && !data" kind="loading" layout="inline" />
    <FeedbackState v-else-if="error && !data" kind="error" layout="inline" :message="uiText(error)" retryable @retry="load" />
    <template v-else-if="data">
      <section v-for="group in groups" :key="group.title" class="admin-dashboard__group" :aria-labelledby="`admin-group-${group.id}`">
        <h3 :id="`admin-group-${group.id}`">{{ uiText(group.title) }}</h3>
        <dl class="admin-dashboard__tiles">
          <div v-for="tile in group.tiles" :key="tile.label" class="admin-dashboard__tile">
            <dt>{{ uiText(tile.label) }}</dt>
            <dd class="admin-dashboard__value">{{ formatCount(tile.value) }}</dd>
            <dd v-if="tile.detail" class="admin-dashboard__detail">{{ uiText(tile.detail) }}</dd>
          </div>
        </dl>
      </section>

      <div class="admin-dashboard__lists">
        <section class="admin-dashboard__card" aria-labelledby="admin-top-stories">
          <h3 id="admin-top-stories">{{ uiText("Frises les plus fournies") }}</h3>
          <ol v-if="data.topStories.length" class="admin-dashboard__list">
            <li v-for="story in data.topStories" :key="story.id">
              <RouterLink v-if="story.isPublic" :to="storyTimelineLocation(String(story.id))">{{ story.title }}</RouterLink>
              <span v-else>{{ story.title }} <Tag :label="uiText('Privée')" /></span>
              <span class="admin-dashboard__muted">{{ story.author }} · {{ formatCount(story.periods) }} {{ uiText("périodes ·") }} {{ formatCount(story.events) }} {{ uiText("événements") }}</span>
            </li>
          </ol>
          <p v-else class="admin-dashboard__muted">{{ uiText("Aucune frise.") }}</p>
        </section>
        <section class="admin-dashboard__card" aria-labelledby="admin-recent-users">
          <h3 id="admin-recent-users">{{ uiText("Dernières inscriptions") }}</h3>
          <ul v-if="data.recentUsers.length" class="admin-dashboard__list">
            <li v-for="user in data.recentUsers" :key="user.id">
              <RouterLink :to="{ name: 'admin', query: { section: 'users', user: user.id } }">{{ uiText(user.username ?? 'Sans nom d’utilisateur') }}</RouterLink>
              <span class="admin-dashboard__muted">{{ formatAdminDate(user.createdAt) }}{{ uiText(user.confirmed ? '' : ' · adresse non confirmée') }}</span>
            </li>
          </ul>
          <p v-else class="admin-dashboard__muted">{{ uiText("Aucun compte.") }}</p>
        </section>
        <section class="admin-dashboard__card" aria-labelledby="admin-recent-actions">
          <h3 id="admin-recent-actions">{{ uiText("Dernières actions d’administration") }}</h3>
          <ul v-if="data.recentActions.length" class="admin-dashboard__list">
            <li v-for="action in data.recentActions" :key="`${action.targetId}-${action.createdAt}-${action.action}`">
              <span>{{ adminActionLabels[action.action] }} : {{ uiText(action.targetUsername ?? 'compte sans nom') }}</span>
              <span class="admin-dashboard__muted">{{ formatAdminDate(action.createdAt, true) }}{{ uiText(action.actorUsername ? ` · par ${action.actorUsername}` : '') }}</span>
            </li>
          </ul>
          <p v-else class="admin-dashboard__muted">{{ uiText("Aucune action enregistrée.") }}</p>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { uiFormat, uiText } from '@/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from '@/components/base/Button.vue';
import FeedbackState from '@/components/base/FeedbackState.vue';
import Tag from '@/components/base/Tag.vue';
import { adminActionLabels, adminApi, type AdminDashboard } from '@/services/AdminApiService';
import { storyTimelineLocation } from '@/router/storyTarget';
import { mutationErrorMessage } from '@/lib/mutationErrorMessage';
import { formatAdminDate, formatCount, formatShare } from './adminFormat';

interface Tile { label: string; value: number; detail?: string }
const data = ref<AdminDashboard | null>(null); const loading = ref(false); const error = ref('');
let request = 0;
onBeforeUnmount(() => { request++; });
async function load() {
  const current = ++request; loading.value = true; error.value = '';
  try { const next = await adminApi.dashboard(); if (current === request) data.value = next; }
  catch (cause) { if (current === request) error.value = mutationErrorMessage(cause, 'Lecture du tableau de bord impossible.'); }
  finally { if (current === request) loading.value = false; }
}
onMounted(load);

const groups = computed<{ id: string; title: string; tiles: Tile[] }[]>(() => {
  const d = data.value; if (!d) return [];
  return [
    { id: 'users', title: 'Utilisateurs', tiles: [
      { label: 'Comptes', value: d.users.total, detail: uiFormat`${formatCount(d.users.confirmed)} confirmés` },
      { label: 'Nouveaux sur 30 jours', value: d.users.new30d, detail: uiFormat`${formatCount(d.users.new7d)} sur 7 jours` },
      { label: 'Actifs sur 30 jours', value: d.users.active30d, detail: uiFormat`${formatShare(d.users.active30d, d.users.total)} des comptes` },
      { label: 'Créateurs de frises', value: d.users.creators, detail: uiFormat`${formatShare(d.users.creators, d.users.total)} des comptes` },
      { label: 'Sans nom d’utilisateur', value: d.users.total - d.users.withProfile, detail: 'ne peuvent pas créer de frise' },
      { label: 'Administrateurs', value: d.users.admins, detail: `${formatCount(d.users.suspended)} compte(s) suspendu(s)` },
    ] },
    { id: 'stories', title: 'Frises', tiles: [
      { label: 'Frises', value: d.stories.total, detail: uiFormat`${formatCount(d.stories.public)} publiques · ${formatCount(d.stories.private)} privées` },
      { label: 'Frises racines', value: d.stories.roots, detail: uiFormat`${formatCount(d.stories.children)} sous-frises` },
      { label: 'Créées sur 30 jours', value: d.stories.created30d, detail: uiFormat`${formatCount(d.stories.updated30d)} modifiées sur 30 jours` },
      { label: 'Frises vides', value: d.stories.empty, detail: 'sans période ni événement' },
    ] },
    { id: 'catalogue', title: 'Catalogue partagé', tiles: [
      { label: 'Périodes', value: d.catalogue.periods, detail: uiFormat`${formatShare(d.catalogue.periodsWithQid, d.catalogue.periods)} liées à Wikidata` },
      { label: 'Événements', value: d.catalogue.events, detail: uiFormat`${formatShare(d.catalogue.eventsWithQid, d.catalogue.events)} liés à Wikidata` },
      { label: 'Périodes inutilisées', value: d.catalogue.periodsUnused, detail: 'dans aucune frise' },
      { label: 'Événements inutilisés', value: d.catalogue.eventsUnused, detail: 'dans aucune frise' },
      { label: 'Catégories', value: d.catalogue.categories },
    ] },
    { id: 'relations', title: 'Relations', tiles: [
      { label: 'Périodes placées', value: d.relations.storyPeriods, detail: 'liens frise → période' },
      { label: 'Événements placés', value: d.relations.storyEvents, detail: 'liens frise → événement' },
      { label: 'Sous-frises', value: d.relations.childStories, detail: `${formatCount(d.relations.anchors)} ancres` },
      { label: 'Points d’entrée', value: d.relations.entryPoints, detail: 'vers d’autres frises' },
      { label: 'Présentations', value: d.relations.presentations, detail: 'période vue dans une autre frise' },
      { label: 'Catégorisations', value: d.relations.categoryLinks, detail: 'frises, périodes et événements' },
    ] },
  ];
});
</script>

<style scoped>
.admin-dashboard { display: flex; flex-direction: column; gap: var(--spacing-xl); }
.admin-dashboard h2 { margin: 0; font-size: var(--font-size-2xl); }
.admin-dashboard h3 { margin: 0 0 var(--spacing-sm); font-size: var(--font-size-base); }
.admin-dashboard__header { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.admin-dashboard__meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.admin-dashboard__tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--spacing-md); margin: 0; }
.admin-dashboard__tile {
  display: flex; flex-direction: column; gap: var(--spacing-xs); padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default);
}
.admin-dashboard__tile dt { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.admin-dashboard__tile dd { margin: 0; }
.admin-dashboard__value { color: var(--color-text-primary); font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); font-variant-numeric: tabular-nums; }
.admin-dashboard__detail, .admin-dashboard__muted { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.admin-dashboard__lists { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-md); }
.admin-dashboard__card { padding: var(--spacing-lg); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default); }
.admin-dashboard__list { display: flex; flex-direction: column; gap: var(--spacing-sm); margin: 0; padding-left: var(--spacing-lg); }
.admin-dashboard__list li { display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; }
ul.admin-dashboard__list { padding-left: 0; list-style: none; }
</style>
