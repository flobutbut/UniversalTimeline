# Exploration : frises multiples

Analyse et implémentation du 9 novembre 2026. L’ajout multiple, le repli individuel et le réordonnancement sont implémentés, avec le fond du conteneur et l’espacement de 4 px.

## Conclusion

L’ajout de plusieurs frises, leur repli individuel et leur réordonnancement sont compatibles avec le moteur actuel. Le chantier est principalement frontend : aucune modification du modèle de données ou de l’API n’est nécessaire pour ce périmètre. Il demande une généralisation de la comparaison, et pas seulement la répétition de son bouton d’ajout.

## Ce qui est déjà réutilisable

- `useTimelineComparisonLane` isole la navigation, les fils d’Ariane et le filtre des événements de chaque frise.
- La dernière navigation temporelle explicite fixe l’échelle ; les autres suivent ce cadre et choisissent automatiquement le niveau de périodes adapté avec `followLevel`.
- `PeriodGrid` porte déjà le rendu normal/compact, l’échelle imposée et l’agrandissement partagé au survol. Les couches animées sont exposées sous forme de liste.
- Le store mutualise les lectures des frises : il n’est pas nécessaire de dupliquer leurs données pour chaque panneau.

## Généralisation réalisée

| Partie | Ancienne limite | Implémentation |
| --- | --- | --- |
| `HomeView.vue` | Deux blocs de rendu et deux instances de navigation fixes | Une liste ordonnée de panneaux avec une identité stable et un rendu commun, gérée par `useTimelineComparisonWorkspace` |
| `useTimelineComparisonLane.ts` | Identité limitée à `primary` ou `secondary` | Identifiants de panneaux indépendants de leur position visuelle |
| Échelle et survol | Références explicites aux deux grilles | Registre des grilles et diffusion du cadre et du survol aux panneaux ouverts |
| `useTimelineComparisonLinks.ts` | Deux grilles et deux listes d’événements | Connexions entre occurrences visibles successives d’un même identifiant d’événement |
| URL | Un seul identifiant `compare` | Plusieurs valeurs `compare`, liens existants compatibles ; valeurs `order` lorsque la principale n’est plus en tête |
| Mise en page | Deux panneaux se partagent toute la hauteur, sans défilement global | Hauteur minimale des panneaux ouverts et défilement vertical du conteneur |

## Comportement

### Ajouter et naviguer

Le bouton « Ajouter une frise » reste disponible en superposition, en bas de la zone d’exploration. Il ne réserve aucune hauteur dans la pile scrollable. Sa couche locale (`--z-index-timeline-item`) est inférieure aux détails d’événement au survol, au focus ou figés ; les menus et modales restent au-dessus de ces détails. Pendant le choix d’une frise, la surface d’ajout reprend `--z-index-dropdown`, car son menu est rendu dans le même conteneur. Le sélecteur exclut les frises déjà affichées. Chaque panneau conserve ses actions, son filtre et sa navigation. Le clic sur le fond (ou Entrée/Espace au clavier) change seulement la sélection visuelle, indiquée par un fond bleu transparent utilisant le token primaire. Le cadrage, les périodes, les événements, les hauteurs et l’URL restent identiques ; aucune lecture supplémentaire n’est lancée. La sélection est un état distinct de la source du cadre. Une navigation temporelle explicite (ouvrir une période, revenir au parent, choisir la vue d’ensemble ou un parcours) sélectionne son panneau et lui donne la main sur l’échelle commune, sans le déplacer.

L’ordre visuel doit rester indépendant de la frise qui mène et de la frise principale portée par l’URL. Déplacer la frise principale en troisième position ne doit donc pas changer son rôle dans le routage. Une navigation qui rejoint une frise déjà affichée doit traiter explicitement le doublon, comme le fait déjà la comparaison actuelle.

### Replier individuellement

Le panneau réduit conserve sa grille, avec les breadcrumbs, les périodes, l’axe et les points d’événement. Les cartes et leurs légendes persistantes sont masquées au repos. Les détails des événements restent accessibles sur demande. Les vrais breadcrumbs de frise et de périodes restent navigables, avec la poignée de déplacement et le bouton de dépliage. Tant qu’au moins deux frises sont affichées, chaque frise peut être retirée, y compris celle portée par l’URL. Ce rôle est transféré à une frise restante en conservant sa navigation. Dès qu’il ne reste qu’une frise, sa commande de fermeture est masquée et la suppression est également bloquée dans le workspace. Ajouter une seconde frise rend à nouveau les deux commandes disponibles. Les anciens liens `?empty=1` restent lisibles sans charger de frise cachée. Le filtre et la navigation restent mémorisés. Le repli libère la hauteur pour les autres panneaux.

Le repli ne réinitialise pas le zoom et ne change pas la frise qui mène. La même instance de PeriodGrid reste montée, en mode `minimized`, et continue de fournir le cadre commun via `getScaleFrame()`. Les frises normales ont une hauteur minimale de 240 px (320 px sur mobile). Les vues réduites prennent uniquement la hauteur de leurs breadcrumbs, périodes et axe, sans réserve pour les cartes d’événement, même lorsque toutes les frises sont réduites. Ces minima ne plafonnent pas la hauteur : les panneaux et PeriodGrid utilisent une base flex automatique et grandissent selon les lignes de périodes et le contenu. La pile occupe toute la zone et constitue l’unique défilement vertical. PeriodGrid ne crée pas de scroll interne ni de confinement de taille ; ses légendes persistantes disposent d’une réserve de hauteur dans le flux.

La sélection, le repli et l’ordre ne changent jamais l’échelle commune. Un panneau replié suit encore cette échelle : le déplier montre le cadre actuel, conformément au fonctionnement des frises suiveuses. Sa position de navigation mémorisée ne constitue pas un zoom indépendant.

### Réordonner

Une poignée dédiée déplace le panneau entier, ouvert ou replié. Le déplacement conserve son identité, sa navigation, son filtre et son état de repli ; il ne recrée pas sa navigation et ne lui donne pas la main. Un indicateur montre l’insertion avant/après ; le conteneur défile aux bords pendant le déplacement. Alt + flèches haut/bas sur la poignée et les boutons monter/descendre permettent aussi de réordonner au clavier et sur mobile.

Exemple de lien : `/timeline?story=1&compare=2&compare=3&order=3&order=1&order=2` affiche 3, 1, puis 2, avec 1 comme frise principale. L’URL partage les frises et leur ordre ; le repli, les filtres et les positions des frises ajoutées restent dans la mémoire de la vue KeepAlive, comme la position de la comparaison précédente.

### Événements partagés et animations

Relier les occurrences visibles successives d’un même événement dans l’ordre des panneaux, puis recalculer les traits après déplacement, repli, dépliage, défilement et animation. Les panneaux réduits participent aussi aux liens entre événements, au survol partagé et aux animations. Les identifiants du catalogue restent la référence, jamais les libellés.

Le glissement entre périodes anime ensemble les couches de toutes les grilles. Le survol partagé peut provenir de n’importe quelle grille, réduite ou normale. Changer de densité ferme les infobulles actives.

Les détails des événements conservent le comportement CSS existant de `EventCard` : même élément ancré au point, alignements aux extrémités, pont de survol, focus clavier et clic pour figer le détail. Le conteneur d’événements actif est élevé au-dessus des frises voisines ; la grille reste en overflow visible. Les détails fermés ne participent pas au défilement global. Aucun popover natif ne déplace la carte au survol.

## Points de vigilance et validation

- Garder une frise seule en affichage normal, comme aujourd’hui ; utiliser le mode compact en comparaison.
- Chaque frise dispose désormais de son état de chargement, son erreur et sa reprise. Une frise inaccessible ne perturbe pas les autres.
- Préserver la compatibilité de `?story=1&compare=2`, les retours navigateur et le comportement KeepAlive de l’exploration. Conserver initialement les états de repli en mémoire de session de la vue ; leur partage par URL est un périmètre supplémentaire.
- Mesurer le rendu sur des frises denses avant de fixer une limite de panneaux. La hauteur disponible et le nombre de cartes rendues seront plus contraignants que le chargement mutualisé.
- Tester au minimum trois frises, le changement de meneuse, le retrait de la meneuse, le repli de la meneuse et de tous les panneaux, le déplacement de la principale, les liens d’événements et la restauration depuis l’URL. Vérifier aussi le clavier, le mobile et les animations réduites.

## Correction visuelle réalisée

Le conteneur `.home-view__viewport` utilise désormais `--color-surface-default` en permanence. Chaque frise conserve `--color-background-default`, plus clair en mode sombre ; la frise sélectionnée reçoit la teinte bleue de `--timeline-panel-background`, également utilisée par sa grille. L’espace entre frises utilise `--spacing-xs` (4 px), laissant apparaître le fond du conteneur. Le token spécifique `--color-timeline-separator`, qui imposait le même noir dans les deux thèmes, est supprimé.

Les tests de comparaison couvrent trois frises, l’ajout successif, le repli de la meneuse et de tous les panneaux, le déplacement de la principale, les retours navigateur, les doublons et les erreurs de lecture. Des tests dédiés vérifient les liens entre événements et la conservation des filtres lors d’un transfert de l’échelle. `yarn verify:design` contrôle les références CSS et les 62 couples de contraste du design system.

Aperçu contrôlé à 390 px de large, sans débordement horizontal. Les tests de vue réduite vérifient la présence des périodes et événements, la conservation de l’instance et du cadre. Les tests des événements vérifient le maintien de l’activité entre survol et focus, la sélection au clic et l’indépendance des liens associés, y compris en vue réduite.

Validation des ajustements : 1 843 tests réussis dans 172 fichiers, compilation de production, audit des symboles inutilisés et contrôles du design system réussis. La capture `audits/2026-11-09-exploration-frises-ajustements.jpg` montre une vue réduite et une infobulle affichée au-dessus de la frise suivante.

Vérification du défilement unique : une frise de quatorze périodes superposées atteint 712 px dans un viewport de 500 px. Le geste de défilement sur cette frise déplace la pile globale ; les grilles gardent `scrollTop = 0`, avec leur hauteur égale à leur contenu. La vue réduite conserve les deux fils d’Ariane et masque les cartes persistantes.

Capture de cet état : `audits/2026-11-09-exploration-scroll-unique.jpg`. Contrôle également effectué à 390 px de large, sans défilement interne ni débordement horizontal. Suite complète : 1 843 tests réussis ; vérification finale des composants concernés : 50 tests réussis, compilation de production validée.

En comparaison uniquement, la frise sélectionnée porte un fond bleu transparent, sans modifier la géométrie de sa grille ni le cadre commun. Le contrôle « Étendre » est masqué pendant la comparaison. Avec une seule frise, la teinte de sélection et les commandes de repli/fermeture disparaissent, « Étendre » revient avec son choix précédent et la grille reprend le mode normal avec la ligne de temps comme repère : `useTimelineAxisCenter` mesure la position réelle de l’axe et le cadre au milieu du viewport d’exploration, en tenant compte de l’en-tête. Les périodes gardent leur hauteur naturelle ; si elles dépassent l’écran, le défilement global cadre la ligne. Un défilement manuel n’est pas annulé. Le cadrage est réévalué après chargement, navigation, changement d’extension ou redimensionnement. Les breadcrumbs et les contrôles de la vue seule restent visibles en haut. Ce cadrage est désactivé en comparaison. Retirer la dernière comparaison déplie automatiquement la principale si nécessaire ; le retour via l’URL suit la même règle.

Contrôle navigateur de l’ancrage : dans un viewport de 500 px, la ligne reste à 250 px avec 27 cartes de périodes et « Étendre » activé (rangée de 1 344 px), puis après désactivation, navigation suivante et aller-retour en comparaison. Dans la vue réelle, la ligne est à 395,5 px, au centre exact du viewport d’exploration.

Correction du survol : retour au mécanisme CSS d’origine et suppression du popover natif. Vérification navigateur au simple survol (sans sélection ni focus du point), passage point → pont → description, chevauchement de la frise suivante en vue normale et repliée, clic pour figer/libérer et accès clavier aux liens associés. Le retour à une seule frise conserve « Étendre », retire le contour actif et cadre l’axe au centre (395,5 px pour le viewport contrôlé). Validation : 1 848 tests dans 173 fichiers, build et contrôles design réussis. Capture : `audits/2026-11-09-exploration-hover-retabli.jpg`.

Audit complet du chantier : `audits/2026-11-09-audit-frises.md`. Six défauts corrigés (superpositions, focus après retrait, ajout pendant une animation, repli pendant une navigation, reprise de lecture de suivi et débordement mobile). Hauteur naturelle limitée à HomeView via la variante `naturalHeight`, sans modifier le viewport des autres usages de PeriodGrid. Validation finale : `yarn verify` réussi, 1 857 tests dans 173 fichiers, contrôles de configuration et TypeScript, builds frontend/API et design system. Les limites et scénarios détaillés figurent dans le rapport.

Sélection stable : séparation de `selected` et `leader`, sans modifier le moteur de projection ni déplacer les infobulles. Les cartes qui dépassent du cadre commun reçoivent les propriétés de continuation existantes ; les prolongements peuvent atteindre les bords grâce à la marge de clipping de la rangée. `storyOutsideFrame` distingue une frise datée entièrement hors cadre d’une frise vide, sans dates déterminées, ou dont les événements sont simplement filtrés. Une frise hors cadre reste sélectionnable sans recadrage ; son titre/fil d’Ariane permet de revenir volontairement à sa vue d’ensemble. Vérification navigateur : les trois panneaux restent à 278/248/248 px, avec 14/16/2 événements, après deux clics au même endroit sur « Histoire de la vie ». L’ouverture explicite de « Hadéen » change ensuite le cadre et affiche « Hors de la période affichée » sur les ères primordiales. Capture : `audits/2026-11-09-exploration-selection-stable.jpg`.

Validation de la sélection stable : `yarn verify` réussi (tests isolés, configuration, TypeScript, design system, builds frontend et API), puis suite complète réexécutée avec les deux scénarios de conservation de la sélection : 1 871 tests réussis dans 173 fichiers. Les scénarios couvrent le clic répété sans mouvement des panneaux, la navigation temporelle explicite, la sélection d’une frise hors plage, le retour volontaire à la vue d’ensemble, la conservation lors du réordonnancement/retrait d’un autre panneau et le retour KeepAlive. Console navigateur sans erreur ni avertissement pendant le contrôle.
