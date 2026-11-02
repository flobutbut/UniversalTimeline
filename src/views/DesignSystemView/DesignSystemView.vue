<template>
  <div class="design-system">
    <aside class="design-system__aside" aria-label="Navigation design system">
      <div class="design-system__aside-inner">
        <div class="design-system__back">
          <Button variant="ghost" size="sm" to="/admin">
            <template #icon><Icon icon="mdi:arrow-left" width="18" height="18" aria-hidden="true" /></template>
            Administration
          </Button>
        </div>
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
            Les rôles de <code class="design-system__code-inline">variables.css</code> s’adaptent au thème.
            Les primitives sont immuables. Les styles <code class="design-system__code-inline">--type-*</code>
            associent famille, taille, interligne et graisse. Cette liste est générée depuis les définitions du code.
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

      <SharedPatternsDemo v-else-if="selected === 'patterns'" />
      <CatalogueDemo v-else-if="selected === 'catalogues'" />
      <section v-else-if="selected === 'button'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Button</h1>
          <p class="design-system__lead">
            Déclenche une action. Props :
            <code class="design-system__code-inline">variant</code>,
            <code class="design-system__code-inline">size</code>,
            <code class="design-system__code-inline">iconOnly</code>,
            <code class="design-system__code-inline">disabled</code>.
          </p>
        </header>

        <!-- Variantes -->
        <h2 class="design-system__h2">Variantes</h2>
        <div class="design-system__variant-grid">
          <div class="design-system__variant-row">
            <div class="design-system__variant-demo"><Button variant="primary">Label</Button></div>
            <code class="design-system__code-inline design-system__variant-name">primary</code>
            <span class="design-system__variant-desc">Fond couleur — action principale d'une page ou d'une modale. À utiliser avec parcimonie.</span>
          </div>
          <div class="design-system__variant-row">
            <div class="design-system__variant-demo"><Button variant="secondary">Label</Button></div>
            <code class="design-system__code-inline design-system__variant-name">secondary</code>
            <span class="design-system__variant-desc">Border couleur — action secondaire à mettre en avant, souvent en binôme avec primary.</span>
          </div>
          <div class="design-system__variant-row">
            <div class="design-system__variant-demo"><Button variant="tertiary">Label</Button></div>
            <code class="design-system__code-inline design-system__variant-name">tertiary</code>
            <span class="design-system__variant-desc">Border neutre — action inline discrète dans une barre ou un header de colonne.</span>
          </div>
          <div class="design-system__variant-row">
            <div class="design-system__variant-demo"><Button variant="ghost">Label</Button></div>
            <code class="design-system__code-inline design-system__variant-name">ghost</code>
            <span class="design-system__variant-desc">Sans fond ni border — action contextuelle légère, typiquement icône seule.</span>
          </div>
        </div>

        <!-- Tailles -->
        <h2 class="design-system__h2">Tailles</h2>
        <div class="design-system__demo-row">
          <div class="design-system__size-block">
            <Button size="md">Label</Button>
            <span class="design-system__size-label">md · 44 px</span>
          </div>
          <div class="design-system__size-block">
            <Button size="sm">Label</Button>
            <span class="design-system__size-label">sm · 36 px</span>
          </div>
          <div class="design-system__size-block">
            <Button size="xs">Label</Button>
            <span class="design-system__size-label">xs · 28 px</span>
          </div>
        </div>

        <!-- Avec icône -->
        <h2 class="design-system__h2">Avec icône</h2>
        <p class="design-system__lead design-system__lead--tight">
          Slot <code class="design-system__code-inline">#icon</code> — passer un composant Iconify (<code class="design-system__code-inline">&lt;Icon icon="mdi:..." /&gt;</code>).
        </p>
        <div class="design-system__demo-row">
          <Button variant="primary"><template #icon><Icon icon="mdi:plus" /></template>Ajouter</Button>
          <Button variant="secondary"><template #icon><Icon icon="mdi:download-outline" /></template>Exporter</Button>
          <Button variant="tertiary"><template #icon><Icon icon="mdi:pencil-outline" /></template>Modifier</Button>
          <Button variant="ghost"><template #icon><Icon icon="mdi:database" /></template>Base</Button>
        </div>

        <!-- Icône seule -->
        <h2 class="design-system__h2">Icône seule</h2>
        <p class="design-system__lead design-system__lead--tight">
          Prop <code class="design-system__code-inline">iconOnly</code> — supprime le texte et carré le padding. Toujours fournir <code class="design-system__code-inline">aria-label</code>.
        </p>
        <div class="design-system__icon-only-grid">
          <span class="design-system__icon-only-size-label">md</span>
          <Button iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="secondary" iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="tertiary" iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="ghost" iconOnly aria-label="Plus d'options"><template #icon><Icon icon="mdi:dots-vertical" /></template></Button>

          <span class="design-system__icon-only-size-label">sm</span>
          <Button size="sm" iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="secondary" size="sm" iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="tertiary" size="sm" iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="ghost" size="sm" iconOnly aria-label="Plus d'options"><template #icon><Icon icon="mdi:dots-vertical" /></template></Button>

          <span class="design-system__icon-only-size-label">xs</span>
          <Button size="xs" iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="secondary" size="xs" iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="tertiary" size="xs" iconOnly aria-label="Ajouter"><template #icon><Icon icon="mdi:plus" /></template></Button>
          <Button variant="ghost" size="xs" iconOnly aria-label="Plus d'options"><template #icon><Icon icon="mdi:dots-vertical" /></template></Button>
        </div>

        <!-- Danger -->
        <h2 class="design-system__h2">Sémantique — Danger</h2>
        <p class="design-system__lead design-system__lead--tight">
          À réserver aux actions destructives irréversibles (suppression). Disponible dans toutes les tailles.
        </p>
        <div class="design-system__demo-row">
          <Button variant="danger">Supprimer</Button>
          <Button variant="danger" size="sm">Supprimer</Button>
          <Button variant="danger" size="xs">Supprimer</Button>
          <Button variant="danger" iconOnly aria-label="Supprimer"><template #icon><Icon icon="mdi:delete-outline" /></template></Button>
          <Button variant="danger" size="sm" iconOnly aria-label="Supprimer"><template #icon><Icon icon="mdi:delete-outline" /></template></Button>
          <Button variant="danger" size="xs" iconOnly aria-label="Supprimer"><template #icon><Icon icon="mdi:delete-outline" /></template></Button>
        </div>

        <h2 class="design-system__h2">Activé · Toggled</h2>
        <p class="design-system__lead">État persistant, distinct du survol et du focus. Cliquez pour activer ou désactiver chaque bouton.</p>
        <div class="design-system__demo-row">
          <Button v-for="variant in buttonVariants" :key="variant" :variant="variant" size="sm" :pressed="toggledButtons.has(variant)" @click="toggleButton(variant)"><template #icon><Icon icon="mdi:plus" width="18" height="18" /></template>{{ variant }}</Button>
        </div>
        <!-- Désactivé -->
        <h2 class="design-system__h2">Désactivé</h2>
        <div class="design-system__demo-row">
          <Button disabled>Label</Button>
          <Button variant="secondary" disabled>Label</Button>
          <Button variant="tertiary" disabled>Label</Button>
          <Button variant="ghost" disabled iconOnly aria-label="Désactivé"><template #icon><Icon icon="mdi:dots-vertical" /></template></Button>
          <Button variant="danger" disabled>Label</Button>
        </div>
      </section>

      <section v-else-if="selected === 'input'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Input</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/Input.vue</code> — champ texte et textarea. Props :
            <code class="design-system__code-inline">label</code>, <code class="design-system__code-inline">placeholder</code>,
            <code class="design-system__code-inline">error</code>, <code class="design-system__code-inline">hint</code>,
            <code class="design-system__code-inline">size</code>, <code class="design-system__code-inline">type</code>,
            <code class="design-system__code-inline">disabled</code>.
          </p>
        </header>

        <!-- Tailles -->
        <h2 class="design-system__h2">Tailles</h2>
        <p class="design-system__lead design-system__lead--tight">
          <code class="design-system__code-inline">size="md"</code> (défaut) — formulaires standard, 44px (<code class="design-system__code-inline">--field-height-lg</code>).<br>
          <code class="design-system__code-inline">size="sm"</code> — barres de filtres et toolbars, 36px (<code class="design-system__code-inline">--field-height-md</code>).
        </p>
        <div class="design-system__demo-row">
          <div class="design-system__size-block">
            <Input v-model="demoText" placeholder="md — formulaire" style="width: 200px" />
            <span class="design-system__size-label">md (44px)</span>
          </div>
          <div class="design-system__size-block">
            <Input v-model="demoText" size="sm" placeholder="sm — toolbar" style="width: 200px" />
            <span class="design-system__size-label">sm (36px)</span>
          </div>
        </div>

        <!-- États -->
        <h2 class="design-system__h2">États</h2>
        <div class="design-system__demo-stack">
          <Input v-model="demoText" label="Label + hint" placeholder="Placeholder" hint="Texte d'aide sous le champ" />
          <Input v-model="demoText" label="Erreur" error="Message d'erreur" />
          <Input v-model="demoText" label="Désactivé" placeholder="Désactivé" disabled />
          <Input v-model="demoText" type="textarea" label="Textarea" placeholder="Plusieurs lignes…" />
        </div>

        <!-- Alignement inter-composants -->
        <h2 class="design-system__h2">Alignement sm — Input, Select, SearchInput, Button</h2>
        <p class="design-system__lead design-system__lead--tight">
          Tous les composants de formulaire en <code class="design-system__code-inline">size="sm"</code> partagent le token
          <code class="design-system__code-inline">--field-height-md</code> (36px) — ils s'alignent dans une même toolbar.
        </p>
        <div class="design-system__demo-row design-system__demo-row--align">
          <SearchInput v-model="searchDemo" placeholder="SearchInput sm" style="width: 160px" />
          <Input v-model="demoText" size="sm" placeholder="Input sm" style="width: 160px" />
          <Select v-model="selectSingle" :options="selectOptions" size="sm" placeholder="Select sm" style="width: 160px" />
          <Button size="sm">Button sm</Button>
        </div>
      </section>

      <section v-else-if="selected === 'select'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Select</h1>
          <p class="design-system__lead">
            Listes simples ou multiples, recherche et format compact. Le sélecteur de périodes
            permet de parcourir les niveaux et de revenir à toutes les périodes.
          </p>
        </header>

        <h2 class="design-system__h2">Listes</h2>
        <div class="design-system__demo-stack design-system__demo-stack--narrow">
          <Select
            v-model="selectSingle"
            label="Simple"
            :options="selectOptions"
            placeholder="Choisir…"
          />
          <Select
            v-model="selectMulti"
            label="Multiple"
            :options="selectOptions"
            multiple
            placeholder="Plusieurs…"
          />
          <Select
            v-model="selectSingle"
            label="Compact"
            :options="selectOptions"
            compact
            placeholder="Compact"
          />
          <Select
            v-model="selectSingle"
            label="Erreur"
            :options="selectOptions"
            error="Sélection invalide"
          />
        </div>

        <h2 class="design-system__h2">Périodes</h2>
        <div class="design-system__demo-stack design-system__demo-stack--narrow">
          <PeriodSelect v-model="periodId" />
          <PeriodSelect v-model="periodId" compact />
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
            Badge de compteur : <code class="design-system__code-inline">border-radius: var(--radius-pill)</code> ; onglet vertical actif : couple <code class="design-system__code-inline">--color-interaction-selected</code> / <code class="design-system__code-inline">--color-text-on-selected</code>.
          </p>
        </header>

        <h2 class="design-system__h2">Pill (défaut)</h2>
        <Tabs v-model="tabsDemo" :tabs="tabsItems" />

        <h2 class="design-system__h2">Pill avec sous-texte</h2>
        <Tabs v-model="tabsDemoSublabel" :tabs="tabsItemsWithSublabel" />

        <h2 class="design-system__h2">Underline</h2>
        <p class="design-system__lead design-system__lead--tight"> Utilisé dans les headers de panneaux de détail (ex. Frises). Prop <code class="design-system__code-inline">variant="underline"</code>.
          Supporte <code class="design-system__code-inline">count</code> pour un badge numérique.
        </p>
        <div class="design-system__underline-demo">
          <Tabs v-model="tabsUnderline" :tabs="tabsItemsUnderline" variant="underline" />
        </div>
        <div class="design-system__underline-demo design-system__underline-demo--panel">
          <div class="design-system__fake-panel-header">
            <Tabs v-model="tabsUnderline" :tabs="tabsItemsUnderline" variant="underline" />
            <Button variant="tertiary" size="xs">Ajouter</Button>
          </div>
          <div class="design-system__fake-panel-body">
            <span v-if="tabsUnderline === 'periods'">Liste des périodes…</span>
            <span v-else>Liste des événements…</span>
          </div>
        </div>

        <h2 class="design-system__h2">Vertical (style colonne Finder)</h2>
        <p class="design-system__lead design-system__lead--tight"> Même gabarit que les listes Périodes / Frises : en-tête <code class="design-system__code-inline">finder-column-header</code>
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
            <code class="design-system__code-inline">src/components/base/Switch.vue</code> — interrupteur booléen,
            <code class="design-system__code-inline">v-model</code> sur un <code class="design-system__code-inline">boolean</code>.
            Piste et curseur dimensionnés avec les tokens <code class="design-system__code-inline">--spacing-*</code> et
            <code class="design-system__code-inline">--radius-*</code>.
          </p>
        </header>

        <h2 class="design-system__h2">Taille normale</h2>
        <div class="design-system__demo-row">
          <Switch v-model="switchOn" label="Activé" />
          <Switch v-model="switchOff" label="Désactivé" />
          <Switch v-model="switchOn" aria-label="Option de démonstration sans texte visible" />
        </div>

        <h2 class="design-system__h2">Variante <code class="design-system__code-inline">sm</code></h2>
        <p class="design-system__lead design-system__lead--tight">
          Prop <code class="design-system__code-inline">variant="sm"</code> pour les contextes compacts.
          Prop <code class="design-system__code-inline">label-first</code> place le libellé avant l'interrupteur.
        </p>
        <div class="design-system__demo-row">
          <Switch v-model="switchSmDemo" variant="sm" label="Option" />
          <Switch v-model="switchSmDemo" variant="sm" label-first label="Label avant" />
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

        <h2 class="design-system__h2">Slot <code class="design-system__code-inline">header-right</code></h2>
        <p class="design-system__lead design-system__lead--tight">
          Même usage que la création période / événement dans
          <code class="design-system__code-inline">EditModal</code> (recherche Wikidata dans l'en-tête).
        </p>
        <Button type="button" variant="secondary" @click="modalSearchOpen = true">Ouvrir avec champ à droite</Button>
        <ModalShell
          v-if="modalSearchOpen"
          title="Modale + header-right"
          height="auto"
          @close="modalSearchOpen = false; modalHeaderSearch = ''"
        >
          <template #header-right>
            <SearchInput v-model="modalHeaderSearch" placeholder="Recherche…" />
          </template>
          <p class="design-system__modal-body-text">
            Le slot <code class="design-system__code-inline">header-right</code> reçoit typiquement un
            <code class="design-system__code-inline">SearchInput</code> ; le shell évite de rogner les listes déroulantes.
          </p>
          <template #footer-right>
            <Button type="button" @click="modalSearchOpen = false">Fermer</Button>
          </template>
        </ModalShell>
      </section>

      <section v-else-if="selected === 'search-input'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">SearchInput</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/SearchInput.vue</code> — champ de recherche avec icône loupe et bouton effacement.
            Props : <code class="design-system__code-inline">size="sm"</code> (défaut, 36px — barres de filtres)
            ou <code class="design-system__code-inline">size="xs"</code> (32px — espaces contraints).
            Border-radius <code class="design-system__code-inline">--radius-md</code>, aligné avec Input et Select.
          </p>
        </header>

        <!-- Tailles -->
        <h2 class="design-system__h2">Tailles</h2>
        <p class="design-system__lead design-system__lead--tight">
          <code class="design-system__code-inline">size="sm"</code> (défaut) — barres de filtres, 36px (<code class="design-system__code-inline">--field-height-md</code>).<br>
          <code class="design-system__code-inline">size="xs"</code> — espaces contraints, 32px (<code class="design-system__code-inline">--field-height-sm</code>).
        </p>
        <div class="design-system__demo-row">
          <div class="design-system__size-block">
            <SearchInput v-model="searchDemo" placeholder="Rechercher…" style="width: 200px" />
            <span class="design-system__size-label">sm (36px)</span>
          </div>
          <div class="design-system__size-block">
            <SearchInput v-model="searchDemo" size="xs" placeholder="Rechercher…" style="width: 200px" />
            <span class="design-system__size-label">xs (32px)</span>
          </div>
        </div>

        <!-- Avec valeur -->
        <h2 class="design-system__h2">Avec valeur et bouton effacement</h2>
        <div class="design-system__row design-system__row--search-input-demo">
          <SearchInput v-model="searchDemoFilled" placeholder="Rechercher…" />
        </div>

        <!-- Alignement inter-composants -->
        <h2 class="design-system__h2">Alignement sm — SearchInput, Input, Select, Button</h2>
        <p class="design-system__lead design-system__lead--tight">
          En <code class="design-system__code-inline">size="sm"</code> / sans size (SearchInput), tous partagent
          <code class="design-system__code-inline">--field-height-md</code> (36px) — ils s'alignent dans une même toolbar.
        </p>
        <div class="design-system__demo-row design-system__demo-row--align">
          <SearchInput v-model="searchDemo" placeholder="SearchInput sm" style="width: 160px" />
          <Input v-model="demoText" size="sm" placeholder="Input sm" style="width: 160px" />
          <Select v-model="selectSingle" :options="selectOptions" size="sm" placeholder="Select sm" style="width: 160px" />
          <Button size="sm">Button sm</Button>
        </div>
      </section>

      <section v-else-if="selected === 'filter-bar'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">FilterBar</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/FilterBar.vue</code> — barre de filtre avec
            champ de recherche, sélecteur de catégorie et bouton d'action. Partagée entre la vue
            <strong>Périodes</strong> et le détail frise. Props : <code class="design-system__code-inline">mode="periods" | "events"</code>,
            <code class="design-system__code-inline">suggestions</code>,
            <code class="design-system__code-inline">eventSuggestions</code> — autocomplétion en Teleport.
            Tous les champs utilisent <code class="design-system__code-inline">--field-height-md</code> (36px),
            bouton primaire aligné sur la même hauteur.
          </p>
        </header>

        <h2 class="design-system__h2">Mode périodes</h2>
        <p class="design-system__lead design-system__lead--tight">
          Au moins un caractère dans le champ : suggestion factice (sans appel API).
        </p>
        <div class="design-system__subheader-demo">
          <FilterBar
            hide-title
            v-model:search="dsPhSearch"
            v-model:category-id="dsPhCategory"
            :category-options="dsDemoCategoryOptions"
            :suggestions="dsPeriodSuggestions"
            :allow-wikidata-create="false"
            @add="onDsPhAdd"
            @pick-period="onDsPhPick"
          />
        </div>

        <h2 class="design-system__h2">Mode événements</h2>
        <p class="design-system__lead design-system__lead--tight">
          Autocomplétion branchée sur <code class="design-system__code-inline">event-suggestions</code>.
        </p>
        <div class="design-system__subheader-demo">
          <FilterBar
            mode="events"
            hide-title
            v-model:search="dsEvSearch"
            v-model:category-id="dsEvCategory"
            :category-options="dsDemoCategoryOptions"
            :event-suggestions="dsEventSuggestions"
            @add="onDsEvAdd"
            @pick-event="onDsEvPick"
          />
        </div>
      </section>

      <section v-else-if="selected === 'confirm-modal'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">ConfirmModal</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/base/ConfirmModal.vue</code> — confirmation via <code class="design-system__code-inline">useConfirm()</code>, avec file d’attente.
            Voile <code class="design-system__code-inline">var(--overlay-scrim-strong)</code>, z-index
            <code class="design-system__code-inline">var(--z-index-modal-nested)</code> au-dessus de la modale d'édition.
          </p>
        </header>

        <Button type="button" @click="openConfirmDemo">Ouvrir la confirmation</Button>
      </section>

      <section v-else-if="selected === 'finder'" class="design-system__section design-system__section--finder">
        <header class="design-system__header">
          <h1 class="design-system__h1">Finder (colonnes)</h1>
          <p class="design-system__lead">
            Ligne d'item : <code class="design-system__code-inline">src/views/GraphView/FinderItem.vue</code>
            — séparateur <strong>bordure basse</strong> sur la racine du composant ; props
            <code class="design-system__code-inline">hide-row-action</code>,
            <code class="design-system__code-inline">hide-chevron</code>,
            <code class="design-system__code-inline">date-subtitle-override</code>,
            <code class="design-system__code-inline">is-external-catalog</code>,
            <code class="design-system__code-inline">draggable</code> ; slot
            <code class="design-system__code-inline">#actions</code> (retirer / ajouter en frise). Gabarit colonnes : <code class="design-system__code-inline">finder-columns</code>,
            <code class="design-system__code-inline">finder-column</code> dans
            <code class="design-system__code-inline">finder-column-layout.css</code>. Ligne sélectionnée :
            <code class="design-system__code-inline">interaction-selected / text-on-selected</code> ; barre gauche enfants :
            <code class="design-system__code-inline">calc(var(--radius-md) / 2)</code>.
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

        <h2 class="design-system__h2">FinderItem — détail frise (slot, catalogue externe, événements)</h2>
        <p class="design-system__finder-hint">
          Même composant que dans le détail d’une frise : actions dans <code class="design-system__code-inline">#actions</code>, sans chevron pour la liste d'événements.
        </p>
        <div class="finder-columns finder-columns--demo design-system__finder-story-demos">
          <div class="finder-column">
            <div class="finder-column-header">
              <h2>Dans la frise</h2>
            </div>
            <div class="finder-column-content">
              <FinderItem
                :label="finderLabels.meso"
                :selected="finderStoryDemo === 'in'"
                :has-children="true"
                item-id="ds-story-in"
                start-date="-252000000"
                end-date="-66000000"
                :draggable="false"
                hide-row-action
                @click="finderStoryDemo = 'in'"
              >
                <template #actions>
                  <button type="button" class="finder-item-remove" aria-label="Retirer (démo)" @click.stop>
                    <Icon icon="mdi:close" width="14" height="14" aria-hidden="true" />
                  </button>
                </template>
              </FinderItem>
              <FinderItem
                :label="finderLabels.catalog"
                :selected="finderStoryDemo === 'ext'"
                :has-children="false"
                item-id="ds-story-ext"
                start-date="-1000000"
                end-date="-900000"
                :draggable="false"
                hide-row-action
                is-external-catalog
                @click="finderStoryDemo = 'ext'"
              >
                <template #actions>
                  <button type="button" class="finder-item-add" aria-label="Ajouter (démo)" @click.stop>
                    <Icon icon="mdi:plus" width="14" height="14" aria-hidden="true" />
                  </button>
                </template>
              </FinderItem>
            </div>
          </div>
          <div class="finder-column">
            <div class="finder-column-header">
              <h2>Liste événements</h2>
            </div>
            <div class="finder-column-content events-finder-list">
              <FinderItem
                :label="finderLabels.ev1"
                :selected="finderStoryDemo === 'ev1'"
                :has-children="false"
                item-id="ds-ev-1"
                start-date="1999-01-01"
                date-subtitle-override="1 janv. 1999 (démo)"
                :draggable="false"
                hide-row-action
                hide-chevron
                @click="finderStoryDemo = 'ev1'"
              >
                <template #actions>
                  <button type="button" class="finder-item-remove" aria-label="Retirer (démo)" @click.stop>
                    <Icon icon="mdi:close" width="14" height="14" aria-hidden="true" />
                  </button>
                </template>
              </FinderItem>
              <FinderItem
                :label="finderLabels.ev2"
                :selected="finderStoryDemo === 'ev2'"
                :has-children="false"
                item-id="ds-ev-2"
                start-date="2000-06-15"
                date-subtitle-override="15 juin 2000 (démo)"
                :draggable="false"
                hide-row-action
                hide-chevron
                @click="finderStoryDemo = 'ev2'"
              >
                <template #actions>
                  <button type="button" class="finder-item-remove" aria-label="Retirer (démo)" @click.stop>
                    <Icon icon="mdi:close" width="14" height="14" aria-hidden="true" />
                  </button>
                </template>
              </FinderItem>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="selected === 'story-timeline'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">StoryTimeline</h1>
          <p class="design-system__lead">
            <code class="design-system__code-inline">src/components/StoryTimeline.vue</code> — frise compacte périodes + marqueurs d'événements pour le détail d'une frise. Émissions <code class="design-system__code-inline">select-period</code>,
            <code class="design-system__code-inline">select-event</code>,
            <code class="design-system__code-inline">deselect</code> ; tooltips en Teleport.
          </p>
        </header>
        <div class="design-system__story-timeline-wrap">
          <StoryTimeline
            :periods="stDemoPeriods"
            :events="stDemoEvents"
            :selected-period-id="stSelPeriod"
            :selected-event-id="stSelEvent"
            @select-period="(id) => { stSelPeriod = id; stSelEvent = null; }"
            @select-event="(id) => { stSelEvent = id; stSelPeriod = null; }"
            @deselect="stSelPeriod = null; stSelEvent = null"
          />
        </div>
      </section>

      <section v-else-if="selected === 'iconify'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Iconify</h1>
          <p class="design-system__lead">
            Bibliothèque d'icônes unifiée via
            <code class="design-system__code-inline">@iconify/vue</code>.
            Plus de 200 000 icônes, chargées à la demande. Préfixe principal :
            <code class="design-system__code-inline">mdi:</code> (Material Design Icons).
            Usage : <code class="design-system__code-inline">&lt;Icon icon="mdi:nom-icone" /&gt;</code>.
            Taille via props <code class="design-system__code-inline">width</code> /
            <code class="design-system__code-inline">height</code> ou CSS. Toujours ajouter
            <code class="design-system__code-inline">aria-hidden="true"</code> sur les icônes décoratives.
          </p>
        </header>

        <h2 class="design-system__h2">Usage</h2>
        <pre class="design-system__code-block">import { Icon } from '@iconify/vue';

&lt;!-- Taille héritée du CSS (défaut 1em) --&gt;
&lt;Icon icon="mdi:plus" /&gt;

&lt;!-- Taille explicite --&gt;
&lt;Icon icon="mdi:chevron-right" width="16" height="16" aria-hidden="true" /&gt;

&lt;!-- Dans un slot #icon de Button --&gt;
&lt;Button&gt;&lt;template #icon&gt;&lt;Icon icon="mdi:delete-outline" /&gt;&lt;/template&gt;Supprimer&lt;/Button&gt;</pre>

        <h2 class="design-system__h2">Navigation</h2>
        <div class="design-system__icon-catalog">
          <div class="design-system__icon-item"><Icon icon="mdi:timeline" width="24" height="24" /><span>mdi:timeline</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:chart-tree" width="24" height="24" /><span>mdi:chart-tree</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:calendar-clock" width="24" height="24" /><span>mdi:calendar-clock</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:book-open-page-variant" width="24" height="24" /><span>mdi:book-open-page-variant</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:palette-swatch" width="24" height="24" /><span>mdi:palette-swatch</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:chevron-right" width="24" height="24" /><span>mdi:chevron-right</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:chevron-left" width="24" height="24" /><span>mdi:chevron-left</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:chevron-down" width="24" height="24" /><span>mdi:chevron-down</span></div>
        </div>

        <h2 class="design-system__h2">Actions</h2>
        <div class="design-system__icon-catalog">
          <div class="design-system__icon-item"><Icon icon="mdi:plus" width="24" height="24" /><span>mdi:plus</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:pencil-outline" width="24" height="24" /><span>mdi:pencil-outline</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:delete-outline" width="24" height="24" /><span>mdi:delete-outline</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:download-outline" width="24" height="24" /><span>mdi:download-outline</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:close" width="24" height="24" /><span>mdi:close</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:dots-vertical" width="24" height="24" /><span>mdi:dots-vertical</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:database" width="24" height="24" /><span>mdi:database</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:magnify" width="24" height="24" /><span>mdi:magnify</span></div>
        </div>

        <h2 class="design-system__h2">États</h2>
        <div class="design-system__icon-catalog">
          <div class="design-system__icon-item"><Icon icon="mdi:alert-circle" width="24" height="24" /><span>mdi:alert-circle</span></div>
          <div class="design-system__icon-item"><LoadingSpinner /><span>mdi:loading</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:check" width="24" height="24" /><span>mdi:check</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:information-outline" width="24" height="24" /><span>mdi:information-outline</span></div>
        </div>

        <h2 class="design-system__h2">Composants UI</h2>
        <div class="design-system__icon-catalog">
          <div class="design-system__icon-item"><Icon icon="mdi:gesture-tap-button" width="24" height="24" /><span>mdi:gesture-tap-button</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:form-textbox" width="24" height="24" /><span>mdi:form-textbox</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:form-dropdown" width="24" height="24" /><span>mdi:form-dropdown</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:toggle-switch" width="24" height="24" /><span>mdi:toggle-switch</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:tab" width="24" height="24" /><span>mdi:tab</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:window-maximize" width="24" height="24" /><span>mdi:window-maximize</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:filter-variant" width="24" height="24" /><span>mdi:filter-variant</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:file-tree-outline" width="24" height="24" /><span>mdi:file-tree-outline</span></div>
        </div>

        <h2 class="design-system__h2">Thème</h2>
        <div class="design-system__icon-catalog">
          <div class="design-system__icon-item"><Icon icon="mdi:weather-sunny" width="24" height="24" /><span>mdi:weather-sunny</span></div>
          <div class="design-system__icon-item"><Icon icon="mdi:weather-night" width="24" height="24" /><span>mdi:weather-night</span></div>
        </div>
      </section>

      <section v-else-if="selected === 'global-feedback'" class="design-system__section">
        <header class="design-system__header">
          <h1 class="design-system__h1">Toasts (global)</h1>
          <p class="design-system__lead">
            Le composant <code class="design-system__code-inline">Toast.vue</code> est monté dans
            <code class="design-system__code-inline">UiFeedbackHost.vue</code> ; les vues utilisent
            <code class="design-system__code-inline">useToast().show(message, type?, duration?)</code>.
          </p>
        </header>
        <div class="design-system__demo-row design-system__demo-row--wrap">
          <Button type="button" variant="secondary" @click="demoToast('info')">Toast info</Button>
          <Button type="button" variant="secondary" @click="demoToast('success')">Toast succès</Button>
          <Button type="button" variant="danger" @click="demoToast('error')">Toast erreur</Button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { tokenSections } from './tokenCatalogue';
import { documentTheme } from '@/composables/useDocumentTheme';
import SharedPatternsDemo from './SharedPatternsDemo.vue';
import CatalogueDemo from './CatalogueDemo.vue';
import { Icon } from '@iconify/vue';
import LoadingSpinner from '@/components/base/LoadingSpinner.vue';
import Button from '@/components/base/Button.vue';
import Input from '@/components/base/Input.vue';
import SearchInput from '@/components/base/SearchInput.vue';
import Select from '@/components/base/Select.vue';
import PeriodSelect from '@/components/PeriodSelect.vue';
import Tabs from '@/components/base/Tabs.vue';
import Switch from '@/components/base/Switch.vue';
import ModalShell from '@/components/base/ModalShell.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import FilterBar from '@/components/FilterBar.vue';
import StoryTimeline from '@/components/StoryTimeline.vue';
import FinderItem from '@/views/GraphView/FinderItem.vue';
import type { MultilingualText, ListPeriod, ListEvent } from '@/types/database';
import type { Tab } from '@/types/global';

type TokenFamilyId = 'tokens-colors' | 'tokens-typography' | 'tokens-layout' | 'iconify';

type SectionId =
  | TokenFamilyId
  | 'patterns'
  | 'catalogues'
  | 'button'
  | 'input'
  | 'search-input'
  | 'filter-bar'
  | 'select'
  | 'tabs'
  | 'switch'
  | 'modal-shell'
  | 'confirm-modal'
  | 'finder'
  | 'story-timeline'
  | 'global-feedback';

const mainRef = ref<HTMLElement | null>(null);
const selected = ref<SectionId>('tokens-colors');
const buttonVariants = ['primary', 'secondary', 'tertiary', 'ghost', 'danger'] as const;
const toggledButtons = ref(new Set<string>(buttonVariants));
function toggleButton(variant: string) {
  const next = new Set(toggledButtons.value);
  if (next.has(variant)) next.delete(variant); else next.add(variant);
  toggledButtons.value = next;
}

watch(selected, () => {
  mainRef.value?.scrollTo({ top: 0, behavior: 'instant' });
});

const componentNav: { id: Exclude<SectionId, TokenFamilyId>; label: string }[] = [
  { id: 'patterns', label: 'Tags, états & icônes' },
  { id: 'catalogues', label: 'Catalogues & frises' },
  { id: 'button', label: 'Button' },
  { id: 'input', label: 'Input' },
  { id: 'search-input', label: 'SearchInput' },
  { id: 'filter-bar', label: 'FilterBar' },
  { id: 'select', label: 'Select' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'switch', label: 'Switch' },
  { id: 'modal-shell', label: 'ModalShell' },
  { id: 'confirm-modal', label: 'ConfirmModal' },
  { id: 'finder', label: 'Finder' },
  { id: 'story-timeline', label: 'StoryTimeline' },
  { id: 'global-feedback', label: 'Toasts' },
];

const componentTabIcons: Record<Exclude<SectionId, TokenFamilyId>, string> = {
  patterns: 'mdi:shape-outline',
  catalogues: 'mdi:table',
  button: 'mdi:gesture-tap-button',
  input: 'mdi:form-textbox',
  'search-input': 'mdi:magnify',
  'filter-bar': 'mdi:filter-variant',
  select: 'mdi:form-dropdown',
  tabs: 'mdi:tab',
  switch: 'mdi:toggle-switch',
  'modal-shell': 'mdi:window-maximize',
  'confirm-modal': 'mdi:help-circle-outline',
  finder: 'mdi:file-tree-outline',
  'story-timeline': 'mdi:timeline-clock-outline',
  'global-feedback': 'mdi:message-badge-outline',
};

/** Une entrée de menu par famille de tokens (pas une seule page longue). */
const tokenNavTabs: Tab<SectionId>[] = [
  { label: 'Couleurs', value: 'tokens-colors', icon: 'mdi:palette-outline' },
  { label: 'Typographie', value: 'tokens-typography', icon: 'mdi:format-font' },
  { label: 'Espacements & effets', value: 'tokens-layout', icon: 'mdi:vector-arrange-below' },
  { label: 'Iconify', value: 'iconify', icon: 'mdi:shape-outline' },
];

const componentNavTabs: Tab<SectionId>[] = componentNav.map((c) => ({
  label: c.label,
  value: c.id,
  icon: componentTabIcons[c.id],
}));

const demoText = ref('');
const searchDemo = ref('');
const searchDemoFilled = ref('Mésozoïque');
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
    label: "Vue d'ensemble",
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
const switchSmDemo = ref(false);
const periodId = ref('');
const modalOpen = ref(false);
const modalSearchOpen = ref(false);
const modalHeaderSearch = ref('');
const confirm = useConfirm();
const toast = useToast();

const dsDemoCategoryOptions = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'cat-demo-a', label: 'Catégorie démo A' },
  { value: 'cat-demo-b', label: 'Catégorie démo B' },
];
const dsPhSearch = ref('');
const dsPhCategory = ref('');
const dsEvSearch = ref('');
const dsEvCategory = ref('');

const dsPeriodSuggestions = computed<ListPeriod[]>(() => {
  if (dsPhSearch.value.trim().length < 1) return [];
  return [
    {
      id: 'ds-suggest-period-1',
      label: { fr: `Suggestion pour « ${dsPhSearch.value.trim()} »`, en: 'Demo suggestion' },
      startDate: '-541000000',
      endDate: '-485400000',
      categories: [],
    },
  ];
});

const dsEventSuggestions = computed<ListEvent[]>(() => {
  if (dsEvSearch.value.trim().length < 1) return [];
  return [
    {
      id: 'ds-suggest-event-1',
      label: { fr: `Événement « ${dsEvSearch.value.trim()} »`, en: 'Demo event' },
      date: '1999-12-31',
      categories: [],
    },
  ];
});

function onDsPhAdd() {
  toast.show('Action « Ajouter une période » (démo design system)', 'info');
}
function onDsPhPick(_p: ListPeriod) {
  toast.show("Sélection d'une période depuis l'autocomplétion (démo)", 'success');
}
function onDsEvAdd() {
  toast.show('Action « Ajouter un événement » (démo)', 'info');
}
function onDsEvPick(_e: ListEvent) {
  toast.show("Sélection d'un événement depuis l'autocomplétion (démo)", 'success');
}

const stDemoPeriods = [
  {
    id: 'stp-1',
    label: { fr: 'Phase ancienne', en: 'Older phase' },
    startDate: '1950-01-01',
    endDate: '1970-01-01',
    parentId: null as string | null,
  },
  {
    id: 'stp-2',
    label: { fr: 'Phase récente', en: 'Recent phase' },
    startDate: '1970-01-01',
    endDate: '1990-01-01',
    parentId: null as string | null,
  },
];
const stDemoEvents = [
  { id: 'ste-1', label: { fr: 'Événement clé', en: 'Key event' }, date: '1985-06-01' },
];
const stSelPeriod = ref<string | null>(null);
const stSelEvent = ref<string | null>(null);

function demoToast(kind: 'info' | 'success' | 'error') {
  const messages = {
    info: 'Toast informatif (design system)',
    success: 'Toast de succès (design system)',
    error: "Toast d'erreur (design system)",
  };
  toast.show(messages[kind], kind);
}

const finderDemoLeft = ref<'meso' | 'ceno' | 'wd'>('meso');
const finderStoryDemo = ref<'in' | 'ext' | 'ev1' | 'ev2'>('in');

const finderLabels: Record<string, MultilingualText> = {
  meso: { fr: 'Mésozoïque', en: 'Mesozoic' },
  ceno: { fr: 'Cénozoïque', en: 'Cenozoic' },
  wd: { fr: 'Suggestion Wikidata (exemple)', en: 'Wikidata suggestion (demo)' },
  jura: { fr: 'Jurassique', en: 'Jurassic' },
  paleo: { fr: 'Paléogène', en: 'Paleogene' },
  catalog: { fr: 'Période (catalogue hors frise)', en: 'External catalog period' },
  ev1: { fr: 'Événement démo A', en: 'Demo event A' },
  ev2: { fr: 'Événement démo B', en: 'Demo event B' },
};

const openConfirmDemo = async () => {
  await confirm('Confirmer ?', 'Ceci est un exemple de boîte de dialogue de confirmation.');
};


const currentTokenSection = computed(
  () => tokenSections.find((s) => s.id === selected.value) ?? null
);

/** Valeurs lues sur `:root` (typos et espacements en px fixes dans `variables.css`). */
const tokenComputed = (name: string): string => {
  void documentTheme.value;
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
  background: var(--color-background-default);
}

.design-system__aside {
  flex-shrink: 0;
  width: calc(var(--spacing-xs) * 55);
  border-right: 1px solid var(--color-border-default);
  background: var(--color-surface-default);
  overflow-y: auto;
}

.design-system__back { flex-shrink: 0; padding: var(--spacing-xs) var(--spacing-sm); border-bottom: 1px solid var(--color-border-default); }

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
  border-top: 1px solid var(--color-border-default);
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
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface-default);
  max-width: calc(var(--spacing-xs) * 105);
  margin-bottom: 0;
}

.design-system__fake-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: var(--spacing-md);
  border-bottom: 1px solid var(--color-border-default);
}


.design-system__fake-panel-body {
  padding: var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
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
  color: var(--color-text-secondary);
}

.design-system__header {
  margin-bottom: var(--spacing-xl);
}

.design-system__h1 {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-heading);
  font-family: var(--font-family-base);
}

.design-system__h2 {
  margin: var(--spacing-xl) 0 var(--spacing-md);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.design-system__h2:first-of-type:not(.design-system__h2--token-group) {
  margin-top: var(--spacing-lg);
}

/** Sous-titres de listes à l'intérieur d'une famille de tokens (sous le h1 de la page). */
.design-system__h2--token-group {
  font-size: var(--font-size-base);
}

.design-system__token-block:first-child .design-system__h2--token-group {
  margin-top: var(--spacing-md);
}

.design-system__lead {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}

.design-system__code-inline {
  font-size: 0.92em;
  padding: 0.15em 0.4em;
  border-radius: var(--radius-sm);
  background: var(--color-surface-subtle);
  color: var(--color-text-primary);
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
  background: var(--color-surface-default);
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
  color: var(--color-text-primary);
  word-break: break-all;
}

.design-system__swatch {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-default);
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
  color: var(--color-text-secondary);
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

.design-system__demo-row--align {
  align-items: flex-end;
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

/* ── Button variant grid ── */
.design-system__variant-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  max-width: 680px;
}

.design-system__variant-row {
  display: grid;
  grid-template-columns: 140px 110px 1fr;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border-light);
}

.design-system__variant-row:last-child {
  border-bottom: none;
}

.design-system__variant-demo {
  display: flex;
}

.design-system__variant-name {
  white-space: nowrap;
}

.design-system__variant-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

/* ── Button size blocks ── */
.design-system__size-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-xs);
}

.design-system__size-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono, monospace);
}

/* ── Icon-only grid ── */
.design-system__icon-only-grid {
  display: grid;
  grid-template-columns: 32px repeat(4, auto) 1fr;
  align-items: center;
  gap: var(--spacing-sm);
  width: fit-content;
}

.design-system__icon-only-size-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono, monospace);
  text-align: right;
}

.design-system__row--search-input-demo {
  display: flex;
  flex-direction: column;
  max-width: calc(var(--spacing-xs) * 90);
  gap: var(--spacing-md);
}

.design-system__subheader-demo {
  max-width: calc(var(--spacing-xs) * 140);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface-default);
}

.design-system__finder-story-demos {
  max-width: calc(var(--spacing-xs) * 200);
}

.design-system__story-timeline-wrap {
  max-width: calc(var(--spacing-xs) * 140);
  min-height: calc(var(--spacing-xl) * 5);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  background: var(--color-surface-default);
}

.design-system__demo-row--align-start {
  align-items: flex-start;
}

.design-system__wikidata-demo-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.design-system__wikidata-last {
  margin-top: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.design-system__chevron-label {
  min-width: calc(var(--spacing-xs) * 18);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.design-system__chevron-on-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  background: var(--color-primary);
  border-radius: var(--radius-sm);
}

.design-system__modal-body-text {
  margin: 0;
  color: var(--color-text-primary);
}

@media (max-width: 768px) {
  .design-system {
    flex-direction: column;
  }

  .design-system__aside {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border-default);
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
.design-system__code-block {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  background: var(--color-interaction-hover);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-lg);
  overflow-x: auto;
  white-space: pre;
  color: var(--color-text-primary);
}

.design-system__icon-catalog {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.design-system__icon-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface-default);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-family: var(--font-family-mono);
  color: var(--color-text-secondary);
  overflow: hidden;
}

.design-system__icon-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.design-system__icon-item svg {
  flex-shrink: 0;
  color: var(--color-text-primary);
}
</style>
