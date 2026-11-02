# Composants — inventaire structurant

Mis à jour le 2 novembre 2026 après consolidation du design system. Les routes chargent leurs vues à la demande ; `App` fournit Header et UiFeedbackHost.

## Primitives partagées (`src/components/base`)

| Composant | Contrat |
| --- | --- |
| Button | `variant`, `size` (`md` 44 / `sm` 36 / `xs` 28 px), `type`, `iconOnly`, `disabled`, `pressed`, `to`. Icône via le slot `#icon` ; une destination produit un vrai lien. |
| Input | `modelValue`, `label`, `type`, `placeholder`, `error`, `hint`, `disabled`, `required`, `size`, `textareaSize`. Les attributs natifs (`name`, `autocomplete`, contraintes, ARIA) sont transmis au champ. Les classes et styles de placement restent sur le conteneur. Textarea : 88 px, ou 160 px avec `textarea-size="lg"`. |
| SearchInput | Recherche 36 / 32 px, bouton d'effacement et retour du focus au champ. |
| Select / SelectShell | Liste générique sans réseau ; enveloppe commune, clavier, rôles, fermeture extérieure/Escape, PopoverSurface et styles partagés. |
| Switch | Booléen, variantes normale / `sm`, libellé ou nom accessible, rôle `switch`. Piste arrêt et curseur utilisent des rôles contrastés dans les deux thèmes. |
| Tabs | `tabs`, `modelValue`, `vertical`, `variant` (`pill` / `underline`), `density` (`compact` / `comfortable`). Navigation clavier ; sélection fond/texte sémantique. |
| Tag | `label`, `to`, `variant` (`neutral` / `accent`), `size`, `removable`, `removeLabel`, `disabled` ; événement `remove`. Slot `label` pour l'éditeur d'un filtre. |
| FeedbackState | États `loading` / `error` / `empty`, disposition `panel` / `inline`, `title`, `message`, `retryable`, `retryLabel`, événement `retry`, slots `icon` / `actions`. Les panneaux empilent icône, contenu et actions ; le mode inline reste horizontal. |
| LoadingSpinner | Indicateur décoratif partagé ; l'état accessible est porté par son message ou son bouton parent. |
| PopoverSurface | Fond, bordure, rayon, ombre et padding optionnel. Le parent garde le placement et le comportement de son menu. `elementRef` permet aux recherches et menus d'accéder au DOM de la surface. |
| ItemSummary | Titre, description et métadonnées compacts. |
| ModalShell | `title`, `height`, `busy` ; slots corps, `header-right`, `header-bottom`, `footer-left`, `footer-right`. Gestion du dialogue avec `useDialog`. |
| ConfirmModal | `title`, `message`, événements `confirm` / `cancel`. Hébergé par UiFeedbackHost via le store. |
| DesignIcon | SVG locaux du produit, décoratifs, dimensions centralisées. Iconify / mdi complète les actions métier. |

## Catalogues et filtres

- `CatalogueToolbar` porte la recherche et les slots filtres/actions ; Frises, Périodes et Événements l'utilisent.
- `CatalogueFilters` / `FilterBuilder` gèrent visibilité, catégories, appartenances, période et plage de dates selon le contexte. Les puces utilisent Tag, les panneaux PopoverSurface.
- `CatalogueTable` porte les colonnes, le tri et le redimensionnement accessible, les états de lecture et le défilement. Densité compacte (44 px) pour Périodes/Événements, confortable (64 px) pour Frises. Les cellules métier sont fournies par slot.
- `FilterBar` est la recherche/suggestion du détail d'une frise ; `layout="panel"` expose sa présentation intégrée sans surcharger ses descendants depuis la vue.
- `PeriodSelect` / `usePeriodSelect` assurent la sélection de période avec recherche distante et exclusions. Ils réutilisent SelectShell.

## Frises et timeline

- `StoryGallery` affiche les cartes avec miniatures StoryTimeline ou le CatalogueTable confortable. `totalStories` indique le nombre de frises avant recherche et filtres : zéro déclenche l’invitation à créer sa première frise ; une liste filtrée vide affiche l’absence de résultat. Les préférences de mode sont conservées dans le navigateur.
- `StoryTabsBar` porte les frises ouvertes et leur fermeture. Les onglets sont gérés par `useStoryTabs`.
- `StoryDetailPanel` assemble les onglets Périodes, Événements, Relations, Catégories et Paramètres.
- `FinderItem` porte les lignes de périodes/événements, la sélection et les actions. La vue ne redéfinit pas sa couleur interne.
- `StorySettingsForm`, `StoryCategoriesForm`, `StoryRelationsPanel`, `StoryMembershipField` éditent leurs domaines respectifs avec les primitives partagées.
- `EditModal` est le formulaire de création/édition et d'import Wikidata. StoryRelatedPickerModal, ParentStoryPickerModal, RootPeriodModal, MoveStoryPeriodModal et StoryFromPeriodModal couvrent les dialogues métier actifs.
- `HomeView` / `PeriodGrid` / `PeriodCard` / `EventCard` portent l'exploration ; AssociatedStoriesBadge et StoryBreadcrumb fournissent les liens et le contexte.
- `StoryTimeline` fournit la miniature et la visualisation intégrée. Les éléments sans date utilisent Button, comme PeriodGrid.

## Référence et contrôles

`/design-system` montre les primitives, les états, les variantes compactes/confortables, les catalogues, les filtres, les cartes et les onglets de frises. `tokenCatalogue.ts` génère l'inventaire depuis les CSS ; les valeurs suivent les changements de thème.

`yarn verify:design` contrôle les références de variables, les contrastes des rôles, l'absence d'accents de données utilisés directement comme couleurs de texte et les fichiers Vue/TypeScript isolés. Les fixtures et déclarations TypeScript ne sont pas du code applicatif mort.

Les anciennes modales EventPickerModal / PeriodPickerModal, leurs wrappers de pied et les utilitaires sans appelant ont été retirés. L'audit initial dans `audits/design-system-2026-11-02/AUDIT.md` reste une photographie avant correction ; voir `CORRECTIONS.md` dans le même dossier.
