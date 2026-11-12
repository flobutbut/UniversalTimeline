<script setup lang="ts">
import Button from '@/components/base/Button.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Icon } from '@iconify/vue';
import LandingTimeDemo from '@/components/LandingTimeDemo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import Tabs from '@/components/base/Tabs.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { canUseWorkspace } from '@/router/access';
import { track } from '@/lib/analytics';

const auth = useAuthStore();
const page = ref<HTMLElement>();
/** Sections whose reading depth is measured, each reported once per visit. */
const MEASURED_SECTIONS = ['experience', 'comprendre', 'creer'];
let sectionObserver: IntersectionObserver | undefined;
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !page.value) return;
  const seen = new Set<string>();
  sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      // Half of the section, or half of the screen for a section taller than the screen.
      const visible = entry.intersectionRect.height;
      const needed = Math.min(entry.boundingClientRect.height, entry.rootBounds?.height ?? Infinity) / 2;
      const section = entry.target.id;
      if (!entry.isIntersecting || visible < needed || seen.has(section)) continue;
      seen.add(section); sectionObserver?.unobserve(entry.target);
      track('landing_section_viewed', { page: 'landing', section });
    }
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  for (const id of MEASURED_SECTIONS) {
    const section = page.value.querySelector(`#${id}`);
    if (section) sectionObserver.observe(section);
  }
});
onBeforeUnmount(() => sectionObserver?.disconnect());
const accountTarget = computed(() => canUseWorkspace(auth) ? { name: 'database' } : { name: 'login', query: { mode: 'signup', redirect: '/database' } });
const usageExamples = [
  { id: 'course', title: 'Donner des repères à un cours', audience: 'Enseignement et transmission', type: 'PÉRIODES', story: { id: '30', title: 'Révolution française' } },
  { id: 'research', title: 'Situer un travail de recherche', audience: 'Études et monde académique', type: 'CONTEXTE', story: { id: '22', title: 'Les cinq grandes extinctions' } },
  { id: 'project', title: 'Retracer l’histoire d’un projet', audience: 'Usages personnels et professionnels', type: 'ÉVÉNEMENTS', story: { id: '14', title: 'Conquête spatiale' } },
];
const visibility = ref<'public' | 'private'>('public');
const visibilityTabs = [{ value: 'public' as const, label: 'Publique' }, { value: 'private' as const, label: 'Privée' }];
const questions = [
  { title: 'Faut-il un compte pour explorer ?', answer: 'Non. L’exploration et la recherche de frises publiques sont accessibles sans inscription. Un compte vous permet de créer et de gérer vos propres frises.' },
  { title: 'Puis-je garder une frise pour moi ?', answer: 'Oui. Choisissez une frise privée pour un usage personnel, un travail de recherche ou un projet professionnel. Rendez-la publique si vous souhaitez la partager et enrichir les explorations accessibles à tous.' },
  { title: 'D’où viennent les repères de cette page ?', answer: 'Cette introduction utilise des dates arrondies et des sources consultables sous chaque repère. Elle est indépendante du catalogue chargé en direct. Pour la vie, la frise situe des traces fossiles largement reconnues ; sa date exacte d’apparition est inconnue. « Homo sapiens » désigne notre espèce, pas l’ensemble de l’histoire humaine.' },
  { title: 'Y a-t-il un abonnement ?', answer: 'Il n’y a actuellement aucun compte payant. L’exploration et la création de frises avec un compte sont gratuites. Des offres payantes pourront être proposées à l’avenir ; rien n’est annoncé à ce stade.' },
];
</script>

<template>
  <div ref="page" class="landing-page">
    <header class="landing-header">
      <div class="landing-container header-inner">
        <RouterLink to="/" class="landing-brand" aria-label="Universal Timeline — accueil">Universal Timeline</RouterLink>
        <nav class="landing-nav" aria-label="Navigation principale">
          <RouterLink to="/catalogue">Catalogue</RouterLink>
          <a href="#experience">L’expérience</a>
          <a href="#creer">Vos frises</a>
          <a href="#questions">Questions</a>
        </nav>
        <div class="landing-account">
          <RouterLink :to="canUseWorkspace(auth) ? '/timeline' : '/login'" data-attr="landing-cta-login">{{ canUseWorkspace(auth) ? 'Mon espace' : 'Se connecter' }}</RouterLink>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <section id="experience" class="hero landing-container" aria-labelledby="hero-title">
      <div class="section-index"><span>01</span> UNE QUESTION D’ÉCHELLE</div>
      <div class="hero-heading">
        <div>
          <h1 id="hero-title">13,8 milliards d’années.<br /><span>Et nous, tout au bout.</span></h1>
          <p class="hero-description">L’Univers, la Terre, la vie, notre espèce.<br />Commencez par tout le temps disponible, puis explorez-le.</p>
        </div>
        <div class="hero-actions">
          <Button to="/timeline" class="action-link" data-attr="landing-cta-explore">Explorer les frises</Button>
        </div>
      </div>
      <LandingTimeDemo />
      <div class="experience-footer">
        <span>Choisissez une échelle, puis examinez les repères.</span>
        <span>Une introduction à Universal Timeline.</span>
      </div>
    </section>

    <section id="comprendre" class="context-section landing-container" aria-labelledby="context-title">
      <div class="narrative-heading">
        <div class="section-index"><span>02</span> CE QUE LES DATES NE DISENT PAS</div>
        <h2 id="context-title">Une date se lit.<br />Une durée se regarde.</h2>
      </div>
      <div class="context-copy">
        <p>Nous savons situer des événements. Nous imaginons moins bien ce qui les sépare. En les plaçant sur une même échelle, les distances deviennent visibles et les perspectives changent.</p>
        <p>Universal Timeline permet de parcourir des frises, d’explorer leurs périodes et de découvrir les événements qui s’y rattachent. De l’Univers entier à l’histoire d’un sujet qui vous intéresse.</p>
        <div class="data-note">
          <span class="data-label">LE SAVOIR EN COMMUN</span>
          <p>La plateforme est connectée à <a href="https://www.wikidata.org/wiki/Wikidata:Main_Page" target="_blank" rel="noopener noreferrer">Wikidata<span class="sr-only"> (nouvel onglet)</span></a>. Les données de référence proviennent de cette base collaborative ; ses données structurées sont ouvertes et librement réutilisables sous <a href="https://www.wikidata.org/wiki/Wikidata:Licensing" target="_blank" rel="noopener noreferrer">licence CC0<span class="sr-only"> (nouvel onglet)</span></a>.</p>
        </div>
      </div>
    </section>

    <section id="creer" class="create-section landing-container" aria-labelledby="create-title">
      <div class="create-copy">
        <div class="section-index"><span>03</span> ET VOTRE HISTOIRE ?</div>
        <h2 id="create-title">Changez de sujet.<br />Gardez la perspective.</h2>
        <p>Un cours à préparer, une recherche à situer, une évolution à raconter. Réunissez des périodes et des événements pour composer vos propres frises.</p>
        <p>Partagez-les pour enrichir les frises publiques, ou conservez-les dans votre espace privé, pour un usage personnel ou professionnel.</p>
        <div class="create-bottom">
          <Button :to="accountTarget" class="action-link" data-attr="landing-cta-create">{{ canUseWorkspace(auth) ? 'Accéder à mes frises' : 'Créer ma première frise' }}</Button>
          <span>Compte gratuit actuellement.</span>
        </div>
      </div>
      <div class="workspace-example">
        <div class="example-header"><span>À CHAQUE SUJET, SA FRISE</span><span>Exemples d’usages</span></div>
        <!-- Visitors clicked these rows expecting to see an example, then left the sign-up form at once: each opens a public frise. -->
        <RouterLink v-for="example in usageExamples" :key="example.id" :to="{ path: '/timeline', query: { story: example.story.id } }" class="example-row" :data-attr="`landing-cta-example_${example.id}`">
          <span class="example-indicator" :class="`indicator-${example.id}`" />
          <div><strong>{{ example.title }}</strong><p>{{ example.audience }} · Voir « {{ example.story.title }} »</p></div>
          <span class="example-type">{{ example.type }}</span>
          <Icon icon="mdi:arrow-right" class="example-arrow" aria-hidden="true" />
          <span class="sr-only"> : ouvrir cet exemple</span>
        </RouterLink>
        <div class="visibility-example">
          <span>Votre frise, votre choix <small>Exemple de visibilité</small></span>
          <Tabs v-model="visibility" :tabs="visibilityTabs" aria-label="Exemple du choix de visibilité d’une frise" />
        </div>
        <p class="visibility-description" aria-live="polite">{{ visibility === 'public' ? 'Une frise publique rejoint les explorations accessibles à tous.' : 'Une frise privée reste dans votre espace, pour vos propres usages.' }}</p>
      </div>
    </section>

    <section id="questions" class="faq-section landing-container" aria-labelledby="faq-title">
      <div><div class="section-index"><span>04</span> QUELQUES REPÈRES</div><h2 id="faq-title">Avant de continuer.</h2></div>
      <div class="faq-list">
        <details v-for="question in questions" :key="question.title">
          <summary>{{ question.title }}<span aria-hidden="true">+</span></summary>
          <p>{{ question.answer }}</p>
        </details>
      </div>
    </section>

    <footer class="landing-footer landing-container">
      <RouterLink to="/" class="landing-brand">Universal Timeline</RouterLink>
      <span>Le temps, une question d’échelle.</span>
      <nav aria-label="Liens de pied de page"><RouterLink to="/timeline" data-attr="landing-cta-footer_explore">Explorer les frises</RouterLink><RouterLink :to="accountTarget" data-attr="landing-cta-footer_signup">{{ canUseWorkspace(auth) ? 'Mes frises' : 'Créer un compte' }}</RouterLink></nav>
      <nav class="landing-legal" aria-label="Informations légales"><RouterLink :to="{ name: 'legal', params: { page: 'mentions-legales' } }">Mentions légales</RouterLink><RouterLink :to="{ name: 'legal', params: { page: 'confidentialite' } }">Confidentialité</RouterLink><RouterLink :to="{ name: 'legal', params: { page: 'cookies' } }">Cookies</RouterLink><RouterLink :to="{ name: 'legal', params: { page: 'conditions' } }">Conditions d’utilisation</RouterLink><RouterLink :to="{ name: 'contact' }">Contact</RouterLink></nav>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  overflow-y: auto;
  overflow-x: clip;
  scroll-behavior: smooth;
  scroll-padding-top: var(--spacing-xl);
  background: var(--color-background-default);
  color: var(--color-text-primary);
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-body);
}
.landing-page section[id] { scroll-margin-top: var(--spacing-xl); }
.landing-container { width: min(1200px, calc(100% - var(--spacing-2xl) * 2)); margin-inline: auto; }
.landing-header { background: var(--color-surface-default); border-bottom: 1px solid var(--color-border-default); }
.header-inner { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-xl); min-height: 68px; }
.landing-brand { font-family: var(--font-family-heading); font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); white-space: nowrap; }
.landing-nav,.landing-account { display: flex; gap: var(--spacing-xl); align-items: center; font-size: var(--font-size-sm); }
.landing-nav a,.landing-account>a { color: var(--color-text-secondary); }.landing-nav a:hover,.landing-account>a:hover { color: var(--color-text-link); }
.hero { padding-top: calc(var(--spacing-2xl) * 2); }
.section-index { display: flex; align-items: center; gap: var(--spacing-md); color: var(--color-text-secondary); font-size: var(--font-size-xs); letter-spacing: .1em; }
.section-index>span { font-family: var(--font-family-mono); color: var(--color-text-link); letter-spacing: 0; }
.hero-heading { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-lg); padding: var(--spacing-xl) 0 calc(var(--spacing-2xl) + var(--spacing-lg)); }
.hero h1 { font-family: var(--font-family-heading); font-weight: var(--font-weight-normal); font-size: clamp(32px, 4.3vw, 56px); line-height: 1.18; letter-spacing: -.045em; margin: 0 0 var(--spacing-md); color: var(--color-text-heading); }
.hero h1>span { color: var(--color-text-secondary); }
.hero-description { font-size: var(--font-size-base); line-height: var(--line-height-relaxed); color: var(--color-text-secondary); margin: 0; }
.hero-actions { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-sm); }
.create-bottom>span { font-size: var(--font-size-xs); color: var(--color-text-secondary); }


.experience-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--spacing-sm); padding-top: var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.context-section,.create-section,.faq-section { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: calc(var(--spacing-2xl) * 2); padding-block: calc(var(--spacing-2xl) * 2); border-bottom: 1px solid var(--color-border-default); }
.context-section { margin-top: var(--spacing-2xl); }
.landing-page h2 { font-family: var(--font-family-heading); font-weight: var(--font-weight-normal); font-size: clamp(24px, 3vw, 34px); line-height: 1.3; letter-spacing: -.035em; margin: var(--spacing-xl) 0; }
.context-copy>p,.create-copy>p { margin: 0 0 var(--spacing-lg); color: var(--color-text-secondary); line-height: var(--line-height-relaxed); }
.context-copy { padding-top: var(--spacing-xs); }
.data-note { border-left: 2px solid var(--color-data-period-root); padding-left: var(--spacing-lg); margin-top: var(--spacing-xl); }
.data-label { color: var(--color-text-secondary); font-size: var(--font-size-xs); letter-spacing: .06em; }.data-note p { font-size: var(--font-size-sm); line-height: var(--line-height-body); color: var(--color-text-secondary); margin: var(--spacing-sm) 0 0; }.data-note a { text-decoration: underline; text-underline-offset: 3px; }
.create-bottom { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-md); margin-top: var(--spacing-xl); }
.workspace-example { align-self: center; border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); overflow: hidden; background: var(--color-surface-default); }
.example-header { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md) var(--spacing-lg); border-bottom: 1px solid var(--color-border-default); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.example-header>span:first-child { letter-spacing: .06em; }
.example-row { display: flex; gap: var(--spacing-md); align-items: center; padding: var(--spacing-lg); border-bottom: 1px solid var(--color-border-light); color: inherit; text-decoration: none; transition: background-color var(--transition-fast); }
.example-row:hover, .example-row:focus-visible { background: var(--color-surface-subtle); }
.example-row:focus-visible { outline-offset: -2px; }
.example-row:hover strong, .example-row:focus-visible strong { text-decoration: underline; text-underline-offset: 3px; }
.example-row > div { flex: 1; min-width: 0; }
.example-arrow { flex-shrink: 0; color: var(--color-text-secondary); }
.example-row:hover .example-arrow, .example-row:focus-visible .example-arrow { color: var(--color-text-link); }
@media (prefers-reduced-motion: reduce) { .example-row { transition: none; } }
.example-row strong { font-size: var(--font-size-base); font-weight: var(--font-weight-medium); }.example-row p { margin: var(--spacing-xs) 0 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }.example-indicator { width: 3px; height: 34px; flex-shrink: 0; border-radius: var(--radius-sm); }.indicator-course { background: var(--color-data-period); }.indicator-research { background: var(--color-data-frise); }.indicator-project { background: var(--color-data-event); }.example-type { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.visibility-example { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-sm); font-size: var(--font-size-sm); }.visibility-example small { display: block; margin-top: var(--spacing-xs); color: var(--color-text-secondary); font-size: var(--font-size-xs); }.visibility-description { font-size: var(--font-size-sm); color: var(--color-text-secondary); padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-lg); margin: 0; }
.faq-list { border-top: 1px solid var(--color-border-default); }.faq-list details { border-bottom: 1px solid var(--color-border-default); }.faq-list summary { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-lg); cursor: pointer; padding: var(--spacing-lg) 0; font-size: var(--font-size-base); list-style: none; }.faq-list summary::-webkit-details-marker { display: none; }.faq-list summary>span { color: var(--color-text-secondary); font-size: var(--font-size-lg); }.faq-list details[open] summary>span { transform: rotate(45deg); }.faq-list p { margin: 0; padding-bottom: var(--spacing-lg); color: var(--color-text-secondary); font-size: var(--font-size-sm); line-height: var(--line-height-body); }
.landing-footer { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-xl); padding-block: var(--spacing-xl); }.landing-footer .landing-brand { font-size: var(--font-size-base); }.landing-footer>span { font-size: var(--font-size-sm); color: var(--color-text-secondary); }.landing-footer nav { display: flex; flex-wrap: wrap; gap: var(--spacing-xl); margin-left: auto; font-size: var(--font-size-sm); }.landing-footer .landing-legal { flex-basis: 100%; margin-left: 0; gap: var(--spacing-lg); font-size: var(--font-size-sm); }
@media (max-width: 850px) {
  .landing-container { width: calc(100% - var(--spacing-xl) * 2); }.header-inner { gap: var(--spacing-lg); }.landing-nav { gap: var(--spacing-lg); }.landing-account { gap: var(--spacing-md); }.context-section,.create-section,.faq-section { gap: var(--spacing-2xl); }.example-type { display: none; }
}
@media (max-width: 640px) {
  .landing-container { width: calc(100% - var(--spacing-lg) * 2); }.header-inner { padding-block: var(--spacing-lg); flex-wrap: wrap; min-height: auto; }.landing-brand { font-size: var(--font-size-lg); }.landing-account { margin-left: auto; }.landing-nav { order: 3; width: 100%; justify-content: space-between; border-top: 1px solid var(--color-border-light); padding-top: var(--spacing-md); }.hero { padding-top: var(--spacing-2xl); }.hero h1 { font-size: clamp(29px, 7.3vw, 42px); }.hero-description { font-size: var(--font-size-sm); }.experience-footer>span:last-child { display: none; }.context-section,.create-section,.faq-section { grid-template-columns: minmax(0, 1fr); gap: var(--spacing-xl); padding-block: calc(var(--spacing-xl) * 2); }.context-section { margin-top: 0; }.landing-page h2 { margin: var(--spacing-lg) 0; }.visibility-example { flex-wrap: wrap; }.visibility-example :deep(.tabs) { width: auto; }.landing-footer { gap: var(--spacing-md); }.landing-footer nav { width: 100%; margin: var(--spacing-sm) 0 0; }
}
@media (prefers-reduced-motion: reduce) { .landing-page { scroll-behavior: auto; } }
</style>
