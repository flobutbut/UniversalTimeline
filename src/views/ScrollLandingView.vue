<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from '@/components/base/Button.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import ScrollTimeLens from '@/components/ScrollTimeLens.vue';
import { useScrollJourney } from '@/composables/useScrollJourney';
import { journeyChapters } from '@/lib/scrollJourney';
import { StoryApiService } from '@/services/StoryApiService';
import { storyTimelineLocation } from '@/router/storyTarget';
import { useAuthStore } from '@/stores/useAuthStore';
import { canUseWorkspace } from '@/router/access';
import type { StorySummary } from '@/types/database';

const { root, runway, stage, frame, reducedMotion, schedule, goTo } = useScrollJourney();
const chapter = computed(() => journeyChapters[frame.value.index]);
const publicStories = ref<StorySummary[]>([]);
const relatedStory = computed(() => chapter.value.stories.map(id => publicStories.value.find(story => story.id === id)).find(Boolean));
const auth = useAuthStore();
const accountTarget = computed(() => canUseWorkspace(auth) ? { name: 'database' } : { name: 'login', query: { mode: 'signup', redirect: '/database' } });
const transcriptOpen = ref(false);
let alive = true;
onMounted(async () => {
  try {
    const stories = await StoryApiService.getInstance().getListStories();
    if (alive) publicStories.value = stories.filter(story => story.isPublic);
  } catch {
    // The illustrative journey stays usable; links fall back to the public explorer.
  }
});
onBeforeUnmount(() => { alive = false; });
</script>

<template>
  <div ref="root" class="scroll-landing" :class="{ 'scroll-landing--reduced': reducedMotion }" tabindex="0" aria-label="Voyage du temps cosmique à une seconde" @scroll.passive="schedule">
    <header class="journey-header">
      <RouterLink to="/" class="journey-brand">Universal Timeline</RouterLink>
      <span class="concept-label">CONCEPT 02 / DU COSMOS À L’INSTANT</span>
      <nav aria-label="Navigation du concept">
        <RouterLink to="/">Version précédente</RouterLink>
        <a href="#lecture" @click="transcriptOpen = true">Lecture directe</a>
        <ThemeToggle />
      </nav>
    </header>

    <h1 class="sr-only">Du cosmos à l’instant : un voyage dans les échelles du temps</h1>
    <div ref="runway" class="journey-runway" :style="{ '--chapter-count': journeyChapters.length }">
      <div ref="stage" class="journey-stage" :data-chapter="chapter.id">
        <div class="journey-topline"><span>UN SEUL TEMPS. PLUSIEURS PROFONDEURS.</span><span>{{ String(frame.index + 1).padStart(2, '0') }} / {{ journeyChapters.length }}</span></div>
        <div class="stage-body">
          <div class="chapter-copy">
            <p class="chapter-kicker">{{ chapter.label }}</p>
            <h2>{{ chapter.title }}</h2>
            <p class="chapter-description">{{ chapter.description }}</p>
            <p class="chapter-date">{{ chapter.date }}</p>
            <a v-if="chapter.source" :href="chapter.source.url" target="_blank" rel="noopener noreferrer" class="chapter-source">Source : {{ chapter.source.name }}<span class="sr-only"> (nouvel onglet)</span></a>
            <div class="chapter-action">
              <Button v-if="relatedStory" :to="storyTimelineLocation(relatedStory.id)" class="journey-action" :aria-label="`Explorer la frise ${relatedStory.title.fr || relatedStory.title.en}`">Explorer cette frise</Button>
              <Button v-else-if="chapter.example" :to="accountTarget" class="journey-action">Raconter ma propre histoire</Button>
              <Button v-else to="/timeline" class="journey-action">Explorer les frises</Button>
              <span v-if="relatedStory" class="related-title">{{ relatedStory.title.fr || relatedStory.title.en }}</span>
              <span v-else-if="chapter.example" class="related-title">Frises publiques ou privées, à votre échelle.</span>
            </div>
          </div>
          <ScrollTimeLens :duration="frame.duration" :chapter-index="frame.index" />
        </div>
        <div class="stage-navigation">
          <span class="scroll-invitation">{{ frame.index === journeyChapters.length - 1 ? 'Vous êtes arrivé à une seconde.' : 'Faites défiler pour vous rapprocher.' }}</span>
          <div class="stage-controls">
            <Button size="sm" variant="tertiary" :disabled="frame.index === 0" @click="goTo(frame.index - 1)">Précédent</Button>
            <Button v-if="frame.index < journeyChapters.length - 1" size="sm" variant="tertiary" @click="goTo(frame.index + 1)">Suivant</Button>
            <a v-else href="#votre-histoire" class="finish-link">Et votre histoire ?</a>
          </div>
        </div>
        <nav class="chapter-navigation" aria-label="Étapes du voyage">
          <button v-for="(item, index) in journeyChapters" :key="item.id" type="button" :aria-label="`Étape ${index + 1} : ${item.label}`" :aria-current="frame.index === index ? 'step' : undefined" :title="item.label" @click="goTo(index)"><span>{{ String(index + 1).padStart(2, '0') }}</span></button>
        </nav>
        <div class="journey-progress" aria-hidden="true"><span :style="{ transform: `scaleX(${frame.progress})` }" /></div>
        <span class="sr-only" role="status" aria-live="polite">Étape {{ frame.index + 1 }} sur {{ journeyChapters.length }} : {{ chapter.label }}.</span>
      </div>
    </div>

    <section id="votre-histoire" class="journey-outro" aria-labelledby="outro-title">
      <span class="outro-kicker">DE L’IMMENSE AU FAMILIER</span>
      <h2 id="outro-title">À quelle échelle<br />commence votre histoire ?</h2>
      <p>Une époque, une recherche, une vie, un événement. Universal Timeline donne une place aux histoires qui vous intéressent. Explorez les frises publiques ou composez les vôtres, publiques ou privées.</p>
      <div class="outro-actions"><Button to="/timeline" class="journey-action">Explorer les frises</Button><RouterLink :to="accountTarget" class="outro-secondary">{{ canUseWorkspace(auth) ? 'Mes frises' : 'Créer ma première frise' }}</RouterLink></div>
      <span class="outro-note">Exploration sans compte. Aucun abonnement payant actuellement.</span>
      <div class="journey-data">Connecté à <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata<span class="sr-only"> (nouvel onglet)</span></a> · données structurées ouvertes sous CC0.</div>
    </section>

    <details id="lecture" class="journey-transcript" :open="transcriptOpen" @toggle="transcriptOpen = ($event.target as HTMLDetailsElement).open">
      <summary>Lire les {{ journeyChapters.length }} étapes sans animation</summary>
      <p class="transcript-note">Les repères sont arrondis et sourcés. Cette expérience est une illustration indépendante des données du catalogue. Les dernières étapes sont des durées choisies pour l’exemple, pas des événements historiques. L’axe de chaque cadre est linéaire ; le déplacement entre les cadres suit une progression logarithmique. Une année est approximée par 365,25 jours pour ces comparaisons.</p>
      <ol>
        <li v-for="item in journeyChapters" :key="item.id"><h3>{{ item.label }}</h3><p>{{ item.date }}</p><p>{{ item.description }}</p><a v-if="item.source" :href="item.source.url" target="_blank" rel="noopener noreferrer">Source : {{ item.source.name }}<span class="sr-only"> (nouvel onglet)</span></a></li>
      </ol>
    </details>
    <footer class="journey-footer"><RouterLink to="/">Revoir le premier concept</RouterLink><a href="#lecture" @click="transcriptOpen = true">Repères et sources</a><RouterLink to="/timeline">Entrer dans l’application</RouterLink><RouterLink :to="{ name: 'legal', params: { page: 'mentions-legales' } }">Mentions légales</RouterLink><RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }">Confidentialité</RouterLink><RouterLink :to="{ name: 'contact' }">Contact</RouterLink></footer>
  </div>
</template>

<style scoped>
.scroll-landing { --journey-header: 64px; overflow-y: auto; overflow-x: clip; position: relative; color: var(--color-text-primary); background: var(--color-background-default); font-family: var(--font-family-base); font-size: var(--font-size-base); line-height: var(--line-height-body); scroll-padding-top: calc(var(--journey-header) + var(--spacing-lg)); }
.scroll-landing:focus { outline: none; }
.journey-header { position: sticky; top: 0; z-index: var(--z-index-sticky); height: var(--journey-header); padding-inline: var(--spacing-2xl); display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-xl); background: var(--color-surface-default); border-bottom: 1px solid var(--color-border-default); }
.journey-brand { font-family: var(--font-family-heading); font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); white-space: nowrap; }.concept-label { color: var(--color-text-secondary); font-size: var(--font-size-xs); letter-spacing: .08em; }.journey-header nav { display: flex; align-items: center; gap: var(--spacing-lg); font-size: var(--font-size-sm); }.journey-header nav>a { color: var(--color-text-secondary); }
.journey-runway { height: calc(var(--chapter-count) * 90svh + 100svh - var(--journey-header)); position: relative; }
.journey-stage { position: sticky; top: var(--journey-header); height: calc(100dvh - var(--journey-header)); min-height: 550px; padding: var(--spacing-xl) var(--spacing-2xl) 0; display: flex; flex-direction: column; }
.journey-topline { display: flex; justify-content: space-between; gap: var(--spacing-xl); color: var(--color-text-secondary); font-size: var(--font-size-xs); letter-spacing: .08em; }.journey-topline>span:last-child { font-family: var(--font-family-mono); white-space: nowrap; }
.stage-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.3fr); align-items: center; gap: clamp(var(--spacing-2xl), 5vw, 90px); max-width: 1380px; width: 100%; margin-inline: auto; }
.chapter-copy { max-width: 430px; }.chapter-kicker { margin: 0 0 var(--spacing-lg); color: var(--color-text-link); font-size: var(--font-size-sm); }.chapter-copy h2 { font-family: var(--font-family-heading); font-size: clamp(28px, 3.3vw, 46px); font-weight: var(--font-weight-normal); line-height: 1.18; letter-spacing: -.04em; margin: 0 0 var(--spacing-xl); }.chapter-description { color: var(--color-text-secondary); margin: 0 0 var(--spacing-xl); line-height: var(--line-height-relaxed); max-width: 390px; }.chapter-date { color: var(--color-text-secondary); font-size: var(--font-size-xs); margin: 0; line-height: var(--line-height-control); }.chapter-source { font-size: var(--font-size-xs); color: var(--color-text-secondary); text-decoration: underline; text-underline-offset: 3px; }
.chapter-action { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-sm); margin-top: var(--spacing-xl); }.related-title { font-size: var(--font-size-xs); line-height: var(--line-height-control); color: var(--color-text-secondary); }
.stage-navigation { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-lg); border-top: 1px solid var(--color-border-default); padding-block: var(--spacing-lg); }.scroll-invitation { font-size: var(--font-size-sm); color: var(--color-text-secondary); }.stage-controls { display: flex; gap: var(--spacing-sm); align-items: center; }.finish-link { display: flex; align-items: center; min-height: var(--field-height-md); font-size: var(--font-size-sm); padding-inline: var(--spacing-sm); }
.chapter-navigation { display: flex; justify-content: space-between; max-width: 720px; width: 100%; margin-inline: auto; gap: var(--spacing-xs); padding-bottom: var(--spacing-md); }.chapter-navigation button { display: grid; place-items: center; min-width: 28px; height: 32px; border-radius: var(--radius-sm); font-family: var(--font-family-mono); font-size: var(--font-size-xs); color: var(--color-text-secondary); }.chapter-navigation button:hover { background: var(--color-interaction-hover); }.chapter-navigation button[aria-current='step'] { color: var(--color-text-link); background: var(--color-primary-light); }
.journey-progress { height: 2px; background: var(--color-border-light); margin-inline: calc(-1 * var(--spacing-2xl)); }.journey-progress>span { display: block; width: 100%; height: 100%; transform-origin: left center; background: var(--color-primary); }
.journey-outro { max-width: 760px; margin: 0 auto; padding: calc(var(--spacing-2xl) * 3) var(--spacing-xl); text-align: center; }.outro-kicker { font-size: var(--font-size-xs); color: var(--color-text-secondary); letter-spacing: .12em; }.journey-outro h2 { font-family: var(--font-family-heading); font-size: clamp(30px, 4vw, 48px); font-weight: var(--font-weight-normal); line-height: 1.2; letter-spacing: -.04em; margin: var(--spacing-xl) 0; }.journey-outro p { max-width: 550px; margin: 0 auto var(--spacing-xl); color: var(--color-text-secondary); line-height: var(--line-height-relaxed); }.outro-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--spacing-xl); margin-bottom: var(--spacing-md); }.outro-secondary { font-size: var(--font-size-base); }.outro-note,.journey-data { font-size: var(--font-size-xs); color: var(--color-text-secondary); }.journey-data { margin-top: var(--spacing-2xl); }
.journey-transcript { max-width: 960px; margin: 0 auto; padding: var(--spacing-xl); border-top: 1px solid var(--color-border-default); }.journey-transcript summary { cursor: pointer; color: var(--color-text-secondary); }.transcript-note { color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: var(--line-height-body); margin: var(--spacing-xl) 0; }.journey-transcript ol { padding-left: var(--spacing-xl); }.journey-transcript li { padding: var(--spacing-lg) 0; border-bottom: 1px solid var(--color-border-light); }.journey-transcript h3 { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); margin: 0 0 var(--spacing-sm); }.journey-transcript li p { color: var(--color-text-secondary); font-size: var(--font-size-sm); max-width: 650px; margin: 0 0 var(--spacing-sm); }.journey-transcript li a { font-size: var(--font-size-xs); }
.journey-footer { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--spacing-xl); padding: var(--spacing-xl) var(--spacing-lg); font-size: var(--font-size-sm); border-top: 1px solid var(--color-border-default); }
@media (max-width: 1000px) { .concept-label { display: none; }.stage-body { gap: var(--spacing-2xl); }.chapter-copy h2 { font-size: 32px; }.chapter-description { font-size: var(--font-size-sm); line-height: var(--line-height-body); } }
@media (max-width: 700px) {
  .scroll-landing { --journey-header: 56px; }.journey-header { padding-inline: var(--spacing-lg); gap: var(--spacing-sm); }.journey-brand { font-size: var(--font-size-base); }.journey-header nav { gap: var(--spacing-md); font-size: var(--font-size-xs); }.journey-header nav>a:first-child { display: none; }
  .journey-stage { padding: var(--spacing-lg) var(--spacing-lg) 0; min-height: 610px; }.journey-topline { font-size: var(--font-size-xs); letter-spacing: .01em; }.journey-topline>span:first-child { max-width: 230px; }.stage-body { grid-template-columns: minmax(0, 1fr); gap: var(--spacing-lg); align-content: center; }.chapter-copy { max-width: none; }.chapter-kicker { font-size: var(--font-size-xs); margin-bottom: var(--spacing-sm); }.chapter-copy h2 { font-size: clamp(24px, 6vw, 32px); line-height: 1.15; margin-bottom: var(--spacing-md); max-width: 430px; }.chapter-description { margin-bottom: var(--spacing-sm); line-height: var(--line-height-control); font-size: var(--font-size-sm); max-width: 480px; }.chapter-action { margin-top: var(--spacing-md); flex-direction: row; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); }.chapter-action .related-title { max-width: 170px; font-size: var(--font-size-xs); }.stage-body :deep(.time-lens) { max-width: 430px; width: 100%; margin-inline: auto; }.stage-body :deep(.lens-drawing) { max-height: 130px; }.chapter-date { font-size: var(--font-size-xs); }.chapter-source { font-size: var(--font-size-xs); }.stage-navigation { padding-block: var(--spacing-sm); }.scroll-invitation { font-size: var(--font-size-xs); max-width: 145px; line-height: var(--line-height-control); }.chapter-navigation { gap: 0; }.chapter-navigation button { min-width: 0; width: 100%; font-size: 9px; height: 28px; }.journey-progress { margin-inline: calc(-1 * var(--spacing-lg)); }.journey-outro { padding-block: calc(var(--spacing-2xl) * 2); }
}
@media (max-height: 740px) and (min-width: 701px) { .chapter-copy h2 { font-size: 30px; }.chapter-description { font-size: var(--font-size-sm); line-height: var(--line-height-control); margin-bottom: var(--spacing-md); }.stage-body :deep(.measure-value) { font-size: 70px; }.stage-body :deep(.lens-measure) { padding-block: var(--spacing-md); }.stage-body :deep(.lens-drawing) { max-height: 240px; } }
@media (max-height: 670px) and (max-width: 700px) {
  .journey-stage { min-height: 0; }.stage-body { gap: var(--spacing-sm); }.chapter-copy h2 { font-size: 21px; }.chapter-action .related-title { display: none; }.stage-body :deep(.lens-drawing),.stage-body :deep(.lens-footnote) { display: none; }.stage-body :deep(.measure-value) { font-size: 40px; }.stage-body :deep(.lens-measure) { padding-block: var(--spacing-xs); }.stage-body :deep(.measure-unit) { font-size: var(--font-size-lg); }.stage-navigation { padding-block: var(--spacing-xs); }
}
@media (prefers-reduced-motion: reduce) { .scroll-landing * { scroll-behavior: auto; } }
</style>
