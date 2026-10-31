<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import LandingTimeDemo from '@/components/LandingTimeDemo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import Tabs from '@/components/base/Tabs.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { canUseWorkspace } from '@/router/access';

const auth = useAuthStore();
const accountTarget = computed(() => canUseWorkspace(auth) ? { name: 'database' } : { name: 'login', query: { mode: 'signup', redirect: '/database' } });
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
  <div class="landing-page">
    <header class="landing-header">
      <div class="landing-container header-inner">
        <RouterLink to="/" class="landing-brand" aria-label="Universal Timeline — accueil">Universal Timeline</RouterLink>
        <nav class="landing-nav" aria-label="Navigation principale">
          <a href="#experience">L’expérience</a>
          <a href="#creer">Vos frises</a>
          <a href="#questions">Questions</a>
        </nav>
        <div class="landing-account">
          <RouterLink :to="canUseWorkspace(auth) ? '/database' : '/login'">{{ canUseWorkspace(auth) ? 'Mon espace' : 'Se connecter' }}</RouterLink>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <section id="experience" class="hero landing-container" aria-labelledby="hero-title">
      <div class="section-index"><span>01</span> UNE QUESTION D’ÉCHELLE</div>
      <div class="hero-heading">
        <div>
          <h1 id="hero-title">4,54 milliards d’années.<br /><span>Et nous, tout au bout.</span></h1>
          <p class="hero-description">La Terre, la vie, les dinosaures, notre espèce.<br />Prenez un instant pour regarder la place de chacun.</p>
        </div>
        <div class="hero-actions">
          <RouterLink to="/timeline" class="action-link">Explorer les frises</RouterLink>
          <span>Sans compte. À votre rythme.</span>
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
        <p>Universal Timeline permet de parcourir des frises, d’explorer leurs périodes et de découvrir les événements qui s’y rattachent. Du temps de la Terre à l’histoire d’un sujet qui vous intéresse.</p>
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
          <RouterLink :to="accountTarget" class="action-link">{{ canUseWorkspace(auth) ? 'Accéder à mes frises' : 'Créer ma première frise' }}</RouterLink>
          <span>Compte gratuit actuellement.</span>
        </div>
      </div>
      <div class="workspace-example">
        <div class="example-header"><span>À CHAQUE SUJET, SA FRISE</span><span>Exemples d’usages</span></div>
        <div class="example-row"><span class="example-indicator indicator-course" /><div><strong>Donner des repères à un cours</strong><p>Enseignement et transmission</p></div><span class="example-type">PÉRIODES</span></div>
        <div class="example-row"><span class="example-indicator indicator-research" /><div><strong>Situer un travail de recherche</strong><p>Études et monde académique</p></div><span class="example-type">CONTEXTE</span></div>
        <div class="example-row"><span class="example-indicator indicator-project" /><div><strong>Retracer l’histoire d’un projet</strong><p>Usages personnels et professionnels</p></div><span class="example-type">ÉVÉNEMENTS</span></div>
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
      <nav aria-label="Liens de pied de page"><RouterLink to="/timeline">Explorer les frises</RouterLink><RouterLink :to="accountTarget">{{ canUseWorkspace(auth) ? 'Mes frises' : 'Créer un compte' }}</RouterLink></nav>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  overflow-y: auto;
  overflow-x: clip;
  scroll-behavior: smooth;
  scroll-padding-top: var(--spacing-xl);
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
}
.landing-page section[id] { scroll-margin-top: var(--spacing-xl); }
.landing-container { width: min(1200px, calc(100% - var(--spacing-2xl) * 2)); margin-inline: auto; }
.landing-header { background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.header-inner { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-xl); min-height: 68px; }
.landing-brand { font-family: var(--font-family-heading); font-size: var(--font-size-xl); font-weight: 600; color: var(--color-text); white-space: nowrap; }
.landing-nav,.landing-account { display: flex; gap: var(--spacing-xl); align-items: center; font-size: var(--font-size-sm); }
.landing-nav a,.landing-account>a { color: var(--color-text-light); }.landing-nav a:hover,.landing-account>a:hover { color: var(--color-primary); }
.hero { padding-top: calc(var(--spacing-2xl) * 2); }
.section-index { display: flex; align-items: center; gap: var(--spacing-md); color: var(--color-text-secondary); font-size: var(--font-size-xs); letter-spacing: .1em; }
.section-index>span { font-family: var(--font-family-mono); color: var(--color-primary); letter-spacing: 0; }
.hero-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--spacing-2xl); padding: var(--spacing-xl) 0 var(--spacing-2xl); }
.hero h1 { font-family: var(--font-family-heading); font-weight: 400; font-size: clamp(32px, 4.3vw, 56px); line-height: 1.18; letter-spacing: -.045em; margin: 0 0 var(--spacing-xl); color: var(--color-heading); }
.hero h1>span { color: var(--color-text-light); }
.hero-description { font-size: var(--font-size-base); line-height: var(--line-height-relaxed); color: var(--color-text-light); margin: 0; }
.hero-actions { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); padding-bottom: var(--spacing-xs); flex-shrink: 0; }
.hero-actions>span,.create-bottom>span { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.action-link { display: inline-flex; align-items: center; justify-content: center; min-height: var(--field-height-lg); padding: 0 var(--spacing-lg); background: var(--color-primary-button); color: var(--color-text-white); border-radius: var(--radius-md); font-size: var(--font-size-base); font-weight: 500; transition: background var(--transition-fast); text-decoration: none; }
.action-link:hover { background: var(--color-primary-button-hover); color: var(--color-text-white); }
.experience-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--spacing-sm); padding-top: var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.context-section,.create-section,.faq-section { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: calc(var(--spacing-2xl) * 2); padding-block: calc(var(--spacing-2xl) * 2); border-bottom: 1px solid var(--color-border); }
.context-section { margin-top: var(--spacing-2xl); }
.landing-page h2 { font-family: var(--font-family-heading); font-weight: 400; font-size: clamp(24px, 3vw, 34px); line-height: 1.3; letter-spacing: -.035em; margin: var(--spacing-xl) 0; }
.context-copy>p,.create-copy>p { margin: 0 0 var(--spacing-lg); color: var(--color-text-light); line-height: var(--line-height-relaxed); }
.context-copy { padding-top: var(--spacing-xs); }
.data-note { border-left: 2px solid var(--color-period-root); padding-left: var(--spacing-lg); margin-top: var(--spacing-xl); }
.data-label { color: var(--color-text-secondary); font-size: var(--font-size-xs); letter-spacing: .06em; }.data-note p { font-size: var(--font-size-sm); line-height: var(--line-height-normal); color: var(--color-text-light); margin: var(--spacing-sm) 0 0; }.data-note a { text-decoration: underline; text-underline-offset: 3px; }
.create-bottom { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-md); margin-top: var(--spacing-xl); }
.workspace-example { align-self: center; border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; background: var(--color-surface); }
.example-header { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md) var(--spacing-lg); border-bottom: 1px solid var(--color-border); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.example-header>span:first-child { letter-spacing: .06em; }
.example-row { display: flex; gap: var(--spacing-md); align-items: center; padding: var(--spacing-lg); border-bottom: 1px solid var(--color-border-light); }
.example-row strong { font-size: var(--font-size-base); font-weight: 500; }.example-row p { margin: var(--spacing-xs) 0 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }.example-indicator { width: 3px; height: 34px; flex-shrink: 0; border-radius: var(--radius-sm); }.indicator-course { background: var(--color-period); }.indicator-research { background: var(--color-story); }.indicator-project { background: var(--color-event); }.example-type { margin-left: auto; font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.visibility-example { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-sm); font-size: var(--font-size-sm); }.visibility-example small { display: block; margin-top: var(--spacing-xs); color: var(--color-text-secondary); font-size: var(--font-size-xs); }.visibility-description { font-size: var(--font-size-sm); color: var(--color-text-light); padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-lg); margin: 0; }
.faq-list { border-top: 1px solid var(--color-border); }.faq-list details { border-bottom: 1px solid var(--color-border); }.faq-list summary { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-lg); cursor: pointer; padding: var(--spacing-lg) 0; font-size: var(--font-size-base); list-style: none; }.faq-list summary::-webkit-details-marker { display: none; }.faq-list summary>span { color: var(--color-text-secondary); font-size: var(--font-size-lg); }.faq-list details[open] summary>span { transform: rotate(45deg); }.faq-list p { margin: 0; padding-bottom: var(--spacing-lg); color: var(--color-text-light); font-size: var(--font-size-sm); line-height: var(--line-height-normal); }
.landing-footer { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-xl); padding-block: var(--spacing-xl); }.landing-footer .landing-brand { font-size: var(--font-size-base); }.landing-footer>span { font-size: var(--font-size-xs); color: var(--color-text-secondary); }.landing-footer nav { display: flex; flex-wrap: wrap; gap: var(--spacing-xl); margin-left: auto; font-size: var(--font-size-sm); }
@media (max-width: 850px) {
  .landing-container { width: calc(100% - var(--spacing-xl) * 2); }.header-inner { gap: var(--spacing-lg); }.landing-nav { gap: var(--spacing-lg); }.landing-account { gap: var(--spacing-md); }.context-section,.create-section,.faq-section { gap: var(--spacing-2xl); }.hero-heading { align-items: flex-start; }.hero-actions { padding-top: var(--spacing-sm); }.example-type { display: none; }
}
@media (max-width: 640px) {
  .landing-container { width: calc(100% - var(--spacing-lg) * 2); }.header-inner { padding-block: var(--spacing-lg); flex-wrap: wrap; min-height: auto; }.landing-brand { font-size: var(--font-size-lg); }.landing-account { margin-left: auto; }.landing-nav { order: 3; width: 100%; justify-content: space-between; border-top: 1px solid var(--color-border-light); padding-top: var(--spacing-md); }.hero { padding-top: var(--spacing-2xl); }.hero-heading { flex-direction: column; gap: var(--spacing-xl); }.hero h1 { font-size: clamp(29px, 7.3vw, 42px); }.hero-actions { align-items: flex-start; padding: 0; }.hero-description { font-size: var(--font-size-sm); }.experience-footer>span:last-child { display: none; }.context-section,.create-section,.faq-section { grid-template-columns: minmax(0, 1fr); gap: var(--spacing-xl); padding-block: calc(var(--spacing-xl) * 2); }.context-section { margin-top: 0; }.landing-page h2 { margin: var(--spacing-lg) 0; }.visibility-example { flex-wrap: wrap; }.visibility-example :deep(.tabs) { width: auto; }.landing-footer { gap: var(--spacing-md); }.landing-footer nav { width: 100%; margin: var(--spacing-sm) 0 0; }
}
@media (prefers-reduced-motion: reduce) { .landing-page { scroll-behavior: auto; } }
</style>
