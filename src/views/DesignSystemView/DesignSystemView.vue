<template>
  <div class="design-system">
    <aside class="design-system__aside" aria-label="Navigation design system">
      <div class="design-system__aside-inner">
        <div class="finder-column finder-column--fill design-system__nav-column">
          <div class="finder-column-header">
            <h2>Tokens</h2>
          </div>
          <div class="finder-column-content">
            <Tabs v-model="selected" :tabs="tokenNavTabs" vertical />
          </div>
        </div>

        <div
          class="finder-column finder-column--fill design-system__nav-column design-system__nav-column--stacked"
        >
          <div class="finder-column-header">
            <h2>Composants</h2>
          </div>
          <div class="finder-column-content">
            <Tabs v-model="selected" :tabs="componentNavTabs" vertical />
          </div>
        </div>
      </div>
    </aside>

    <div class="design-system__main" ref="mainRef">
      <section v-if="currentTokenSection" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">{{ currentTokenSection.sectionTitle }}</h1>
          <p class="design-system__lead">
            Variables dans <code class="design-system__code-inline">src/styles/variables.css</code>
            (thème clair / sombre). Tailles de texte, interlignes et espacements : <strong>px entiers</strong> (références
            <code class="design-system__code-inline">--base-font-size</code> 13px,
            <code class="design-system__code-inline">--base-spacing</code> 8px). Depuis la refonte tokens : familles
            <code class="design-system__code-inline">--font-family-heading</code> /
            <code class="design-system__code-inline">--font-family-mono</code>, voiles
            <code class="design-system__code-inline">--overlay-scrim*</code>, assombrissements sur primaire
            <code class="design-system__code-inline">--color-on-primary-shade*</code>, z-index étendus
            (<code class="design-system__code-inline">--z-index-modal-nested</code>,
            <code class="design-system__code-inline">--z-index-search-layer</code>, timeline, etc.), assets logo Vue
            <code class="design-system__code-inline">--color-asset-vue-*</code>. Menu <strong>Tokens</strong> ci-contre.
          </p>
        </header>

        <div
          v-for="group in currentTokenSection.groups"
          :key="`${currentTokenSection.id}-${group.title}`"
          class="design-system__token-block"
        >
          <h2 class="design-system__h2 design-system__h2--token-group">{{ group.title }}</h2>
          <ul class="design-system__token-list">
            <li
              v-for="row in group.rows"
              :key="row.name"
              class="design-system__token-row"
            >
              <span class="design-system__token-name">{{ row.name }}</span>
              <span
                v-if="row.kind === 'color'"
                class="design-system__swatch"
                :style="{ background: `var(${row.name})` }"
                :title="row.name"
              />
              <span v-else class="design-system__token-placeholder" aria-hidden="true" />
              <code class="design-system__token-value">{{ tokenComputed(row.name) }}</code>
            </li>
          </ul>
        </div>
      </section>

      <section v-else-if="selected === 'button'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Button</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/Button.vue</code> — bouton avec variantes de style, taille et icône.
            Espacements et hauteurs min. alignés sur <code class="design-system__code-inline">--spacing-*</code>
            (ex. <code class="design-system__code-inline">gap</code>, <code class="design-system__code-inline">padding</code>,
            <code class="design-system__code-inline">min-height</code> en <code class="design-system__code-inline">calc</code> depuis la grille 8px).
          </p>
        </header>

        <h2 class="design-system__h2">Variantes</h2>
        <div class="design-system__demo-row design-system__demo-row--wrap">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="danger">Danger</Button>
        </div>

        <h2 class="design-system__h2">Tailles</h2>
        <div class="design-system__demo-row design-system__demo-row--wrap">
          <Button size="md">Medium</Button>
          <Button size="sm">Small</Button>
        </div>

        <h2 class="design-system__h2">Icône</h2>
        <div class="design-system__demo-row design-system__demo-row--wrap">
          <Button icon="mdi:plus">Avec icône</Button>
          <Button icon="mdi:close" icon-only aria-label="Fermer" />
        </div>

        <h2 class="design-system__h2">État désactivé</h2>
        <div class="design-system__demo-row">
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section v-else-if="selected === 'input'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Input</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/Input.vue</code> — champ texte, textarea, label, erreur et compact.
            Mode compact et textarea : <code class="design-system__code-inline">min-height</code> dérivés des tokens d’espacement.
          </p>
        </header>

        <div class="design-system__demo-stack">
          <Input v-model="demoText" label="Label" placeholder="Placeholder" />
          <Input v-model="demoText" type="textarea" label="Textarea" placeholder="Plusieurs lignes…" />
          <Input v-model="demoText" label="Erreur" error="Message d’erreur" />
          <Input v-model="demoText" label="Compact" compact placeholder="Filtre" />
        </div>
      </section>

      <section v-else-if="selected === 'select'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Select</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/Select.vue</code> — un seul composant :
            <code class="design-system__code-inline">mode="list"</code> (options plates, simple / multiple) ou
            <code class="design-system__code-inline">mode="period"</code> (même filtre que la vue Événements : niveaux, dates, chevron sous-périodes, bouton « Toutes les périodes »).
            Liste d’options : <code class="design-system__code-inline">max-height</code> et largeur de scrollbar basées sur les tokens
            (<code class="design-system__code-inline">Select.vue</code> / <code class="design-system__code-inline">SelectShell.vue</code>).
          </p>
        </header>

        <h2 class="design-system__h2">Mode liste</h2>
        <div class="design-system__demo-stack design-system__demo-stack--narrow">
          <Select
            v-model="selectSingle"
            mode="list"
            label="Simple"
            :options="selectOptions"
            placeholder="Choisir…"
          />
          <Select
            v-model="selectMulti"
            mode="list"
            label="Multiple"
            :options="selectOptions"
            multiple
            placeholder="Plusieurs…"
          />
          <Select
            v-model="selectSingle"
            mode="list"
            label="Compact"
            :options="selectOptions"
            compact
            placeholder="Compact"
          />
          <Select
            v-model="selectSingle"
            mode="list"
            label="Erreur"
            :options="selectOptions"
            error="Sélection invalide"
          />
        </div>

        <h2 class="design-system__h2">Mode période</h2>
        <div class="design-system__demo-stack design-system__demo-stack--narrow">
          <Select v-model="periodId" mode="period" />
          <Select v-model="periodId" mode="period" compact />
        </div>
      </section>

      <section v-else-if="selected === 'tabs'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Tabs</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/Tabs.vue</code> — trois variantes :
            <code class="design-system__code-inline">pill</code> (défaut, fond actif),
            <code class="design-system__code-inline">underline</code> (bordure basse, header de section),
            <code class="design-system__code-inline">vertical</code> (colonne Finder).
            Chaque entrée accepte <code class="design-system__code-inline">sublabel</code> et <code class="design-system__code-inline">count</code>.
            Badge de compteur : <code class="design-system__code-inline">border-radius: var(--radius-pill)</code> ; onglet vertical actif : texte sur primaire via
            <code class="design-system__code-inline">color-mix</code> sur <code class="design-system__code-inline">--color-text-white</code>.
          </p>
        </header>

        <h2 class="design-system__h2">Pill (défaut)</h2>
        <Tabs v-model="tabsDemo" :tabs="tabsItems" />

        <h2 class="design-system__h2">Pill avec sous-texte</h2>
        <Tabs v-model="tabsDemoSublabel" :tabs="tabsItemsWithSublabel" />

        <h2 class="design-system__h2">Underline</h2>
        <p class="design-system__lead design-system__lead--tight">
          Utilisé dans les headers de panneaux de détail (ex. Stories). Prop
          <code class="design-system__code-inline">variant="underline"</code>.
          Supporte <code class="design-system__code-inline">count</code> pour un badge numérique.
        </p>
        <div class="design-system__underline-demo">
          <Tabs v-model="tabsUnderline" :tabs="tabsItemsUnderline" variant="underline" />
        </div>
        <div class="design-system__underline-demo design-system__underline-demo--panel">
          <div class="design-system__fake-panel-header">
            <Tabs v-model="tabsUnderline" :tabs="tabsItemsUnderline" variant="underline" />
            <button class="design-system__fake-add-btn" type="button">Ajouter</button>
          </div>
          <div class="design-system__fake-panel-body">
            <span v-if="tabsUnderline === 'periods'">Liste des périodes…</span>
            <span v-else>Liste des événements…</span>
          </div>
        </div>

        <h2 class="design-system__h2">Vertical (style colonne Finder)</h2>
        <p class="design-system__lead design-system__lead--tight">
          Même gabarit que les listes Périodes / Stories : en-tête
          <code class="design-system__code-inline">finder-column-header</code>
          + onglets comme des lignes
          <code class="design-system__code-inline">FinderItem</code>.
        </p>
        <div class="finder-columns finder-columns--demo design-system__tabs-finder-demo">
          <div class="finder-column finder-column--fill">
            <div class="finder-column-header">
              <h2>Onglets</h2>
            </div>
            <div class="finder-column-content">
              <Tabs v-model="tabsDemo" :tabs="tabsItems" vertical />
            </div>
          </div>
        </div>

        <h2 class="design-system__h2">Vertical avec sous-texte</h2>
        <div class="finder-columns finder-columns--demo design-system__tabs-finder-demo">
          <div class="finder-column finder-column--fill">
            <div class="finder-column-header">
              <h2>Navigation</h2>
            </div>
            <div class="finder-column-content">
              <Tabs v-model="tabsDemoSublabel" :tabs="tabsItemsWithSublabel" vertical />
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="selected === 'switch'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Switch</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/Switch.vue</code> — interrupteur booléen.
            Piste et curseur dimensionnés avec <code class="design-system__code-inline">--spacing-*</code> et
            <code class="design-system__code-inline">--radius-*</code> ; ombre curseur <code class="design-system__code-inline">var(--shadow-sm)</code>.
          </p>
        </header>

        <div class="design-system__demo-row">
          <Switch v-model="switchOn" label="Notifications" />
          <Switch v-model="switchOff" />
        </div>
      </section>

      <section v-else-if="selected === 'modal-shell'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">ModalShell</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/ModalShell.vue</code> — fenêtre modale avec titre, corps et pied de page.
            Fond voile <code class="design-system__code-inline">var(--overlay-scrim)</code>, empilement
            <code class="design-system__code-inline">var(--z-index-modal)</code>, largeur modale en
            <code class="design-system__code-inline">calc</code> depuis <code class="design-system__code-inline">--spacing-xs</code>.
          </p>
        </header>

        <Button type="button" @click="modalOpen = true">Ouvrir la modale</Button>
        <ModalShell
          v-if="modalOpen"
          title="Exemple ModalShell"
          height="auto"
          @close="modalOpen = false"
        >
          <p class="design-system__modal-body-text">
            Contenu du corps. Clic sur le fond ou Échap pour fermer.
          </p>
          <template #footer-right>
            <Button type="button" @click="modalOpen = false">Valider</Button>
          </template>
        </ModalShell>
      </section>

      <section v-else-if="selected === 'search-input'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">SearchInput</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/SearchInput.vue</code> — champ de recherche réutilisable avec icône et bouton effacement.
            Hauteur, <code class="design-system__code-inline">gap</code> et taille d’icônes alignés sur les tokens ; démo ci-dessous en colonne via la classe
            <code class="design-system__code-inline">design-system__row--search-input-demo</code> (évite le style inline).
          </p>
        </header>
        <div class="design-system__row design-system__row--search-input-demo">
          <SearchInput v-model="searchDemo" placeholder="Rechercher une période…" />
          <SearchInput v-model="searchDemo" placeholder="Avec une valeur…" />
        </div>
      </section>

      <section v-else-if="selected === 'confirm-modal'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">ConfirmModal</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/ConfirmModal.vue</code> — confirmation via API impérative (<code class="design-system__code-inline">show</code>).
            Voile <code class="design-system__code-inline">var(--overlay-scrim-strong)</code>, z-index
            <code class="design-system__code-inline">var(--z-index-modal-nested)</code> au-dessus de la modale d’édition.
          </p>
        </header>

        <Button type="button" @click="openConfirmDemo">Ouvrir la confirmation</Button>
        <ConfirmModal ref="confirmRef" />
      </section>

      <section v-else-if="selected === 'finder'" class="design-system__section design-system__section--finder">
        <header class="design-system__header">
          <h1 class="design-system__h1">Finder (colonnes)</h1>
          <p class="design-system__lead">
            Ligne d’item : <code class="design-system__code-inline">src/views/GraphView/FinderItem.vue</code>.
            Gabarit colonnes : classes <code class="design-system__code-inline">finder-columns</code>,
            <code class="design-system__code-inline">finder-column</code>, etc. dans
            <code class="design-system__code-inline">src/styles/finder-column-layout.css</code>
            (vues Périodes, Stories / base de données). Ligne sélectionnée : libellés sur primaire en
            <code class="design-system__code-inline">color-mix</code> avec <code class="design-system__code-inline">--color-text-white</code> ;
            bordure gauche d’indentation en <code class="design-system__code-inline">calc(var(--radius-md) / 2)</code>.
          </p>
        </header>

        <h2 class="design-system__h2">Lignes et deux colonnes</h2>
        <p class="design-system__finder-hint">
          Clic sur une ligne de gauche pour mettre à jour la colonne de droite (démo).
        </p>
        <div class="finder-columns finder-columns--demo">
          <div class="finder-column">
            <div class="finder-column-header">
              <h2>Périodes racines</h2>
            </div>
            <div class="finder-column-content">
              <FinderItem
                :label="finderLabels.meso"
                :selected="finderDemoLeft === 'meso'"
                :has-children="true"
                item-id="ds-finder-meso"
                start-date="-252000000"
                end-date="-66000000"
                @click="finderDemoLeft = 'meso'"
              />
              <FinderItem
                :label="finderLabels.ceno"
                :selected="finderDemoLeft === 'ceno'"
                :has-children="true"
                item-id="ds-finder-ceno"
                start-date="-66000000"
                end-date="TODAY"
                @click="finderDemoLeft = 'ceno'"
              />
              <FinderItem
                :label="finderLabels.wd"
                :selected="finderDemoLeft === 'wd'"
                :has-children="true"
                :wikidata-only="true"
                item-id="wikidata:demo"
                @click="finderDemoLeft = 'wd'"
              />
            </div>
          </div>
          <div class="finder-column">
            <div class="finder-column-header">
              <h2>Sous-périodes</h2>
            </div>
            <div class="finder-column-content">
              <FinderItem
                v-if="finderDemoLeft === 'meso'"
                :label="finderLabels.jura"
                :selected="true"
                :has-children="false"
                item-id="ds-finder-jura"
                start-date="-201300000"
                end-date="-145000000"
              />
              <FinderItem
                v-else-if="finderDemoLeft === 'ceno'"
                :label="finderLabels.paleo"
                :selected="true"
                :has-children="false"
                item-id="ds-finder-paleo"
                start-date="-66000000"
                end-date="-2303000"
              />
              <div v-else class="finder-empty-column">Choisir « Mésozoïque » ou « Cénozoïque » à gauche.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import Select from '@/components/base/Select.vue';
import Tabs from '@/components/base/Tabs.vue';
import Switch from '@/components/base/Switch.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import ConfirmModal from '@/components/base/ConfirmModal.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import { useDataStore } from '@/stores/useDataStore';
import type { MultilingualText } from '@/types/database';
import type { Tab } from '@/types/global';

type TokenFamilyId = 'tokens-colors' | 'tokens-typography' | 'tokens-layout';

type SectionId =
  | TokenFamilyId
  | 'button'
  | 'input'
  | 'search-input'
  | 'select'
  | 'tabs'
  | 'switch'
  | 'modal-shell'
  | 'confirm-modal'
  | 'finder';

const mainRef = ref<HTMLElement | null>(null);
const selected = ref<SectionId>('tokens-colors');

watch(selected, () => {
  mainRef.value?.scrollTo({ top: 0, behavior: 'instant' });
});

const componentNav: { id: Exclude<SectionId, TokenFamilyId>; label: string }[] = [
  { id: 'button', label: 'Button' },
  { id: 'input', label: 'Input' },
  { id: 'search-input', label: 'SearchInput' },
  { id: 'select', label: 'Select' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'switch', label: 'Switch' },
  { id: 'modal-shell', label: 'ModalShell' },
  { id: 'confirm-modal', label: 'ConfirmModal' },
  { id: 'finder', label: 'Finder' },
];

const componentTabIcons: Record<Exclude<SectionId, TokenFamilyId>, string> = {
  button: 'mdi:gesture-tap-button',
  input: 'mdi:form-textbox',
  'search-input': 'mdi:magnify',
  select: 'mdi:form-dropdown',
  tabs: 'mdi:tab',
  switch: 'mdi:toggle-switch',
  'modal-shell': 'mdi:window-maximize',
  'confirm-modal': 'mdi:help-circle-outline',
  finder: 'mdi:file-tree-outline',
};

/** Une entrée de menu par famille de tokens (pas une seule page longue). */
const tokenNavTabs: Tab<SectionId>[] = [
  { label: 'Couleurs', value: 'tokens-colors', icon: 'mdi:palette-outline' },
  { label: 'Typographie', value: 'tokens-typography', icon: 'mdi:format-font' },
  { label: 'Espacements & effets', value: 'tokens-layout', icon: 'mdi:vector-arrange-below' },
];

const componentNavTabs: Tab<SectionId>[] = componentNav.map((c) => ({
  label: c.label,
  value: c.id,
  icon: componentTabIcons[c.id],
}));

const demoText = ref('');
const searchDemo = ref('');
const selectSingle = ref<string | number | null>('a');
const selectMulti = ref<(string | number)[]>(['a']);
const selectOptions = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

const tabsDemo = ref<'one' | 'two'>('one');
const tabsItems = [
  { label: 'Premier', value: 'one' as const, icon: 'mdi:numeric-1-circle-outline' },
  { label: 'Deuxième', value: 'two' as const, icon: 'mdi:numeric-2-circle-outline' },
];

const tabsUnderline = ref<'periods' | 'events'>('periods');
const tabsItemsUnderline = [
  { label: 'Périodes', value: 'periods' as const, count: 4 },
  { label: 'Événements', value: 'events' as const, count: 12 },
];

const tabsDemoSublabel = ref<'overview' | 'settings'>('overview');
const tabsItemsWithSublabel = [
  {
    label: 'Vue d’ensemble',
    value: 'overview' as const,
    icon: 'mdi:view-dashboard-outline',
    sublabel: 'Résumé et statistiques',
  },
  {
    label: 'Paramètres',
    value: 'settings' as const,
    icon: 'mdi:cog-outline',
    sublabel: 'Compte et préférences',
  },
];

const switchOn = ref(true);
const switchOff = ref(false);
const periodId = ref('');
const modalOpen = ref(false);
const confirmRef = ref<InstanceType<typeof ConfirmModal> | null>(null);

const finderDemoLeft = ref<'meso' | 'ceno' | 'wd'>('meso');

const finderLabels: Record<string, MultilingualText> = {
  meso: { fr: 'Mésozoïque', en: 'Mesozoic' },
  ceno: { fr: 'Cénozoïque', en: 'Cenozoic' },
  wd: { fr: 'Suggestion Wikidata (exemple)', en: 'Wikidata suggestion (demo)' },
  jura: { fr: 'Jurassique', en: 'Jurassic' },
  paleo: { fr: 'Paléogène', en: 'Paleogene' },
};

const openConfirmDemo = async () => {
  await confirmRef.value?.show('Confirmer ?', 'Ceci est un exemple de boîte de dialogue de confirmation.');
};

const dataStore = useDataStore();
onMounted(() => {
  dataStore.ensureRootsLoaded().catch(() => {});
});

type TokenRow = { name: string; kind: 'color' | 'other' };

type TokenGroup = { title: string; rows: TokenRow[] };

type TokenSectionConfig = { id: TokenFamilyId; sectionTitle: string; groups: TokenGroup[] };

const tokenSections: TokenSectionConfig[] = [
  {
    id: 'tokens-colors',
    sectionTitle: 'Couleurs',
    groups: [
      {
        title: 'Échelle neutre',
        rows: [
          '--color-neutral-0',
          '--color-neutral-50',
          '--color-neutral-100',
          '--color-neutral-200',
          '--color-neutral-300',
          '--color-neutral-400',
          '--color-neutral-500',
          '--color-neutral-600',
          '--color-neutral-700',
          '--color-neutral-800',
          '--color-neutral-900',
        ].map((name) => ({ name, kind: 'color' as const })),
      },
      {
        title: 'Marque, états et Wikidata',
        rows: [
          '--color-primary',
          '--color-primary-dark',
          '--color-primary-light',
          '--color-primary-button',
          '--color-primary-button-hover',
          '--color-success',
          '--color-success-light',
          '--color-error',
          '--color-error-light',
          '--color-error-dark',
          '--color-warning',
          '--color-warning-light',
          '--color-wikidata-label',
          '--color-wikidata-label-on-primary',
        ].map((name) => ({ name, kind: 'color' as const })),
      },
      {
        title: 'Fonds, surfaces, cartes et bordures',
        rows: [
          '--color-background',
          '--color-surface',
          '--color-surface-hover',
          '--color-card',
          '--color-card-hover',
          '--color-border',
          '--color-border-light',
          '--color-border-dark',
          '--color-border-darker',
          '--color-background-soft',
          '--color-background-mute',
          '--color-error-bg',
        ].map((name) => ({ name, kind: 'color' as const })),
      },
      {
        title: 'Accents entités (période, événement, story)',
        rows: ['--color-period', '--color-period-root', '--color-event', '--color-story'].map((name) => ({
          name,
          kind: 'color' as const,
        })),
      },
      {
        title: 'Overlays modaux & sur-couche sur primaire',
        rows: [
          '--overlay-scrim',
          '--overlay-scrim-strong',
          '--color-on-primary-shade',
          '--color-on-primary-shade-strong',
        ].map((name) => ({ name, kind: 'color' as const })),
      },
      {
        title: 'Assets tiers (logo Vue SVG)',
        rows: ['--color-asset-vue-green', '--color-asset-vue-blue'].map((name) => ({
          name,
          kind: 'color' as const,
        })),
      },
      {
        title: 'Texte et titres',
        rows: [
          '--color-text',
          '--color-text-light',
          '--color-text-secondary',
          '--color-text-white',
          '--color-heading',
        ].map((name) => ({ name, kind: 'color' as const })),
      },
    ],
  },
  {
    id: 'tokens-typography',
    sectionTitle: 'Typographie',
    groups: [
      {
        title: 'Repères (taille de base, interligne)',
        rows: ['--base-font-size', '--base-line-height'].map((name) => ({
          name,
          kind: 'other' as const,
        })),
      },
      {
        title: 'Familles et tailles de police',
        rows: [
          '--font-family-base',
          '--font-family-heading',
          '--font-family-mono',
          '--font-size-xs',
          '--font-size-sm',
          '--font-size-base',
          '--font-size-lg',
          '--font-size-xl',
          '--font-size-2xl',
          '--font-size-3xl',
        ].map((name) => ({ name, kind: 'other' as const })),
      },
      {
        title: 'Interlignes',
        rows: [
          '--line-height-tight',
          '--line-height-normal',
          '--line-height-relaxed',
          '--line-height-loose',
        ].map((name) => ({ name, kind: 'other' as const })),
      },
    ],
  },
  {
    id: 'tokens-layout',
    sectionTitle: 'Espacements, ombres et mise en page',
    groups: [
      {
        title: 'Ombres',
        rows: ['--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl'].map((name) => ({
          name,
          kind: 'other' as const,
        })),
      },
      {
        title: 'Espacements',
        rows: [
          '--base-spacing',
          '--spacing-xs',
          '--spacing-sm',
          '--spacing-md',
          '--spacing-lg',
          '--spacing-xl',
          '--spacing-2xl',
        ].map((name) => ({ name, kind: 'other' as const })),
      },
      {
        title: 'Rayons et transitions',
        rows: [
          '--radius-sm',
          '--radius-md',
          '--radius-lg',
          '--radius-xl',
          '--radius-pill',
          '--transition-fast',
          '--transition-normal',
          '--transition-slow',
        ].map((name) => ({ name, kind: 'other' as const })),
      },
      {
        title: 'Z-index',
        rows: [
          '--z-index-dropdown',
          '--z-index-sticky',
          '--z-index-fixed',
          '--z-index-modal',
          '--z-index-popover',
          '--z-index-tooltip',
          '--z-index-modal-nested',
          '--z-index-search-layer',
          '--z-index-timeline-item',
          '--z-index-period-row-band',
          '--z-index-local-bump',
        ].map((name) => ({ name, kind: 'other' as const })),
      },
      {
        title: 'Breakpoints',
        rows: [
          '--breakpoint-sm',
          '--breakpoint-md',
          '--breakpoint-lg',
          '--breakpoint-xl',
          '--breakpoint-2xl',
        ].map((name) => ({ name, kind: 'other' as const })),
      },
    ],
  },
];

const currentTokenSection = computed(
  () => tokenSections.find((s) => s.id === selected.value) ?? null
);

/** Valeurs lues sur `:root` (typos et espacements en px fixes dans `variables.css`). */
const tokenComputed = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || '—';
};
</script>

<style scoped>
.design-system {
  display: flex;
  min-height: 0;
  flex: 1;
  width: 100%;
  overflow: hidden;
  background: var(--color-background);
}

.design-system__aside {
  flex-shrink: 0;
  width: calc(var(--spacing-xs) * 55);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow-y: auto;
}

.design-system__aside-inner {
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.design-system__nav-column {
  flex: 0 0 auto;
}

.design-system__nav-column--stacked {
  border-top: 1px solid var(--color-border);
}

.design-system__lead--tight {
  margin-bottom: var(--spacing-md);
}

.design-system__tabs-finder-demo {
  max-width: calc(var(--spacing-xs) * 80);
}

.design-system__underline-demo {
  margin-bottom: var(--spacing-md);
}

.design-system__underline-demo--panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
  max-width: calc(var(--spacing-xs) * 105);
  margin-bottom: 0;
}

.design-system__fake-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.design-system__fake-add-btn {
  background: none;
  border: none;
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  cursor: pointer;
  padding: var(--spacing-xs) 0;
}

.design-system__fake-panel-body {
  padding: var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-style: italic;
  min-height: calc(var(--spacing-sm) * 10);
  display: flex;
  align-items: center;
}

.design-system__main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: var(--spacing-xl) var(--spacing-2xl);
}

.design-system__section {
  max-width: calc(var(--spacing-xs) * 220);
}

.design-system__section--finder {
  max-width: calc(var(--spacing-xs) * 240);
}

.design-system__finder-hint {
  margin: 0 0 var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.design-system__header {
  margin-bottom: var(--spacing-xl);
}

.design-system__h1 {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-heading);
  font-family: var(--font-family-base);
}

.design-system__h2 {
  margin: var(--spacing-xl) 0 var(--spacing-md);
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
}

.design-system__h2:first-of-type:not(.design-system__h2--token-group) {
  margin-top: var(--spacing-lg);
}

/** Sous-titres de listes à l’intérieur d’une famille de tokens (sous le h1 de la page). */
.design-system__h2--token-group {
  font-size: var(--font-size-base);
}

.design-system__token-block:first-child .design-system__h2--token-group {
  margin-top: var(--spacing-md);
}

.design-system__lead {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-light);
  line-height: var(--line-height-relaxed);
}

.design-system__code-inline {
  font-size: 0.92em;
  padding: 0.15em 0.4em;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  color: var(--color-text);
}

.design-system__token-block {
  margin-bottom: var(--spacing-xl);
}

.design-system__token-block:last-child {
  margin-bottom: 0;
}

.design-system__token-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface);
}

.design-system__token-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1.2fr);
  gap: var(--spacing-md);
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--font-size-sm);
}

.design-system__token-row:last-child {
  border-bottom: none;
}

.design-system__token-name {
  font-family: var(--font-family-mono);
  color: var(--color-text);
  word-break: break-all;
}

.design-system__swatch {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  justify-self: center;
}

.design-system__token-placeholder {
  width: 32px;
  height: 32px;
  justify-self: center;
}

.design-system__token-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  word-break: break-word;
}

.design-system__demo-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.design-system__demo-row--wrap {
  flex-wrap: wrap;
}

.design-system__demo-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  max-width: calc(var(--spacing-xs) * 105);
}

.design-system__demo-stack--narrow {
  max-width: calc(var(--spacing-xs) * 90);
}

.design-system__row--search-input-demo {
  display: flex;
  flex-direction: column;
  max-width: calc(var(--spacing-xs) * 90);
  gap: var(--spacing-md);
}

.design-system__modal-body-text {
  margin: 0;
  color: var(--color-text);
}

@media (max-width: 768px) {
  .design-system {
    flex-direction: column;
  }

  .design-system__aside {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    max-height: 40vh;
  }

  .design-system__token-row {
    grid-template-columns: 1fr;
    gap: var(--spacing-xs);
  }

  .design-system__swatch {
    justify-self: start;
  }
}
</style>
