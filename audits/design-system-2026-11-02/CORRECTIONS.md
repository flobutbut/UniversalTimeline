# Bilan des corrections du design system

2 novembre 2026. Ce bilan décrit l’état corrigé ; [l’audit initial](AUDIT.md) conserve les constats et captures avant intervention.

## Écarts traités

| Audit | Correction appliquée |
| --- | --- |
| A1 — Sélections et appels à l’action | Couples de tokens pour fond sélectionné/texte associé ; dates, chevrons et actions héritent de la sélection. Les appels à l’action d’accueil utilisent `Button` avec navigation. |
| A2 — Couleurs de données dans les textes | Rôles de texte contrastés pour les libellés et légendes ; les accents de périodes, événements et frises restent dédiés aux représentations graphiques. |
| A3 — Interrupteurs éteints | Piste et curseur dédiés, visibles en clair et sombre. |
| A4 — Tokens inexistants | Références corrigées ; vocabulaire canonique pour les textes, surfaces, statuts, rayons et interlignes. |
| A5 — Styles concurrents | Cascade de `Tabs` réécrite ; densité et disposition exposées par les composants. Les adaptations profondes du panneau de frise sont supprimées. |
| A6 — Patterns dupliqués | `Tag`, `FeedbackState`, `LoadingSpinner` et `PopoverSurface` mutualisés. Les tags des sélecteurs utilisent aussi `Tag`. Actions sans date et relances utilisent `Button`. Connexion via `Input` ; cases des frises liées nommées. |
| A7 — Cohérence des catalogues | `CatalogueTable` partagé entre Frises, Périodes et Événements ; deux densités explicites. Surfaces, actions et libellés français harmonisés. |
| A8 — Textarea et formulaires | Styles natifs de textarea effectifs ; tailles publiques ; transmission des attributs de formulaire et associations ARIA vers le champ natif. |
| A9 — Documentation et éléments inutilisés | Catalogue des tokens extrait des sources, démonstrations des nouveaux patterns et catalogues. Anciennes modales et dépendances isolées retirées. |
| A10 — Typographie et espacements | Rôles typographiques partagés, poids/interlignes explicites, espacements courants tokenisés ; règles globales répétées retirées. |

Le mode automatique du thème suit désormais le système sans enregistrer ce choix comme une préférence manuelle. Le bouton de thème reste synchronisé avec le thème réellement appliqué.

## Nettoyage

13 fichiers supprimés : quatre anciens composants de sélection, trois modules métier isolés, le test du module supprimé et cinq assets inutilisés. Les styles du starter, alias obsolètes et règles remplacées par les primitives sont également retirés.

Les contrôles de symboles inutilisés passent. Le parcours des imports depuis l’entrée de l’application, y compris les routes différées, ne détecte plus de fichier Vue/TypeScript isolé ; les déclarations et fixtures de tests sont exclues de ce contrôle.

## Vérifications

- `node scripts/check.mjs` : succès. **98 fichiers de tests, 1 069 tests**, configuration serveur sans connexion, symboles inutilisés, types et builds frontend/API.
- `yarn verify:design` : aucun token CSS inconnu ; **36 couples de contraste** contrôlés sur les deux thèmes, tous conformes aux seuils définis. Le contrôle refuse aussi les couleurs de données employées directement comme couleur de texte dans les styles Vue/CSS.
- `git diff --check` : succès.
- Vérification visuelle en navigateur : bureau 1 280 × 720 ; cadres de contenu mobile 390 × 844 et tablette 768 × 844. Galerie, listes, filtres et thèmes examinés. Le débordement des actions de filtre sur mobile est corrigé en répartissant la barre sur deux lignes.
- Mesures calculées dans le navigateur : contrôles 44/36 px, textarea standard 88 px, lignes de catalogue confortables 64 px, tags de sélecteur 26 px. Texte de sélection sombre **9,47:1** ; texte du bouton principal sombre **7,15:1**.

Ces vérifications portent sur les parcours et couples de couleurs décrits ; elles ne constituent pas une certification d’accessibilité exhaustive. Les tests d’intégration PostgreSQL nécessitant une base dédiée ne font pas partie de cette exécution.

## Captures après correction

- [Finder sombre](corrections/finder-dark.png)
- [Sélecteur multiple et tags partagés](corrections/select-dark.png)
- [Interrupteurs clairs](corrections/switch-light.png)
- [Liste des frises](corrections/story-list-light.png)
- [Galerie et liste, mobile et tablette](corrections/responsive-light.png)
- [Périodes sur mobile](corrections/responsive-periods-light.png)
- [Comparaison sombre/clair](corrections/responsive-dark-light.png)
- [Accueil sombre et accents de données](corrections/landing-dark.png)

La page `/design-system` présente les tokens et exemples actualisés. Les règles de contribution sont décrites dans [COMPONENTS.md](../../.agent/COMPONENTS.md) et [CONVENTIONS.md](../../.agent/CONVENTIONS.md).
