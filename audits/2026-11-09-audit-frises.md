**Audit intermédiaire des modifications des frises — 9 novembre 2026**

Ce rapport décrit la vérification réalisée avant les derniers ajustements de sélection, de protection de la dernière frise et de superposition du bouton d’ajout. Le comportement final est documenté dans `Documentation/EXPLORATION-FRISES-MULTIPLES.md`.

L’audit a identifié six défauts, corrigés dans le workspace. Aucun autre défaut n’a été identifié dans les scénarios contrôlés. Cette conclusion porte sur le périmètre et les vérifications décrits ci-dessous ; elle ne constitue pas une garantie sur tous les navigateurs et tous les jeux de données.

L’ensemble du chantier a été relu par rapport à `HEAD` : vue d’exploration, panneaux dynamiques, chargement des frises suiveuses, filtres, liens entre événements, grille, centrage de l’axe, cartes d’événement, tokens et tests. Les nouveaux composables ont aussi été examinés : identité stable, destruction des scopes, résultats asynchrones tardifs et conservation du cadre partagé.

**Défauts corrigés**

| Cas | Cause et correction | Vérification |
| --- | --- | --- |
| Un détail figé recouvrait les options du menu de la frise suivante. | Le conteneur d’événements avait été élevé au niveau des infobulles globales. Il reste désormais dans la couche timeline, au-dessus des frises et sous les menus/modales. | Avant correction, les premières options étaient recouvertes et ne recevaient pas le pointeur. Après correction, toutes les options reçoivent le pointeur et la sélection du filtre fonctionne. Contrôle navigateur à 1280 px et 320 px. |
| Supprimer la dernière comparaison perdait le focus clavier lorsque le titre de la principale était un sélecteur. | Le retour de focus ne recherchait qu’un bouton. Il accepte aussi le combobox existant. | Test échouant avant correction ; focus réellement revenu sur « Univers moderne » après retrait, dans le navigateur. |
| L’ajout en overlay restait utilisable pendant le glissement chronologique. | L’overlay se trouve hors du conteneur rendu inerte pendant l’animation. Le bouton et le sélecteur d’ajout sont désactivés pendant celle-ci. | Test avec animations en attente : contrôle désactivé pendant le glissement, réactivé à la fin. |
| Naviguer dans une période de la principale repliée la dépliait. | Le traitement de l’URL réinitialisait systématiquement le repli. Cette remise à zéro est maintenant réservée à la vue seule ; le retour à une seule frise continue de la déplier. | Test échouant avant correction ; la période change et le panneau reste replié en comparaison. |
| « Réessayer » ne réparait pas une erreur de chargement de la principale lorsqu’elle suivait une autre frise. | Le bouton relançait sa navigation inactive au lieu de la lecture de suivi. Il appelle désormais la reprise correspondant au rôle courant du panneau. | Test après invalidation du cache et erreur de lecture : reprise réussie, frise active conservée. Échec reproduit avant correction. |
| Une bulle pouvait sortir horizontalement de l’écran mobile. | Les seuils d’alignement historiques en pourcentage ne tenaient pas compte de la largeur réellement disponible. La translation CSS est bornée par la largeur mesurée de l’axe ; le même élément et son pont de survol sont conservés. | Survol sans clic ni focus à 390 px : passage point → pont → description maintenu. À 320 px, carte sélectionnée de 240 px entre x=74 et x=314, largeur défilable de la vue=320 px. Aucun popover natif ajouté. |

Une correction de portée a également été appliquée : la hauteur naturelle et le défilement porté par la pile sont une variante explicite `naturalHeight` de `PeriodGrid`, utilisée par HomeView. L’usage autonome de la grille, notamment le prototype de navigation, conserve son viewport et son défilement internes d’origine. Un test vérifie le choix de cette variante.

**Scénarios contrôlés**

| Comportement | Résultat et méthode |
| --- | --- |
| Vue seule | Étendre présent, aucun contour actif, aucun contrôle de repli. Axe exactement au centre : 395,5 px en bureau et 457,5 px dans le viewport mobile contrôlé. Retrait de la dernière comparaison : focus restauré et vue normale retrouvée. Tests et navigateur. |
| Plusieurs frises | Ajout réel depuis le sélecteur mobile ; exclusion des frises déjà ouvertes ; URL et ordre sérialisés ; retour navigateur. Tests et navigateur selon le scénario. |
| Réorganisation | Glisser-déposer natif de la principale entre deux autres frises : ordre 2,1,3 et URL correspondante. Tests complémentaires pour boutons, Alt + flèches, annulation du drag et conservation des instances. |
| Repli | Instances, périodes, points, échelle et filtres conservés ; légendes persistantes masquées ; absence de réserve de hauteur sous l’axe. Tests et navigateur. |
| Défilement | À 390 px, trois panneaux de 320/342/320 px dans un viewport de 773 px : scroll global de 217 px, scroll interne des trois grilles=0. Bouton d’ajout resté en overlay. Pas de débordement horizontal au repos. |
| Survol et sélection | Passage sans clic du point au détail et sortie du survol ; alignement de bord ; clic pour figer/libérer ; accès clavier aux frises associées ; liens indépendants du clic de sélection. Contrôles navigateur et tests d’intégration. |
| Hauteurs et centrage | Étendre affiche les sept périodes du cas réel sans scroll interne ; axe recentré. Un défilement manuel vers les périodes reste possible, y compris pendant le survol de la période longue contrôlée. Tests du composable de centrage et navigateur. |
| Rôles et cycle de vie | Retirer une suiveuse conserve la meneuse. Retirer la meneuse rend la main à la principale. Une réponse tardive d’un panneau supprimé ne le rétablit pas. Aller-retour RouterView/KeepAlive conserve instances, ordre, repli et navigation locale. Tests d’intégration. |
| Échelle et liens | Cadre commun après changement de meneuse ; filtres indépendants ; liens entre occurrences successives, y compris non adjacentes et avec identifiants arbitraires ; retrait des points absents et recalcul après réorganisation. Tests existants et nouveaux relus/exécutés. |
| Thèmes | Gap calculé de 4 px. Fond sombre du conteneur distinct du fond des frises ; valeurs issues des tokens. Contrôle des thèmes clair et sombre, puis restauration du thème sombre initial. |

**Validation technique**

`yarn verify` a réussi sur le code final : 1 857 tests dans 173 fichiers (frontend et tests serveur isolés), quatre tests de configuration sans connexion, audit TypeScript des symboles inutilisés, compilation frontend, compilation API et contrôle du design system (62 contrastes dans les deux thèmes). Le test de conservation du focus lors du redimensionnement a ensuite été affiné et réexécuté avec les trois autres tests EventCard : quatre réussites. `git diff --check` est propre. Aucune erreur ni alerte console relevée dans l’onglet d’exploration contrôlé.

Les vérifications de navigateur utilisent le navigateur intégré : 1280×720, 390×844 et 320×740. Les tests automatisés de données, erreurs, course asynchrone et KeepAlive emploient des fixtures. Safari, Firefox, les gestes tactiles sur appareil physique et les tests PostgreSQL/Docker de `verify:clean` n’ont pas été exécutés. Aucun code serveur, schéma de base de données ou contrat API n’a été modifié dans ce chantier.

Captures après correction : [superpositions et menu en bureau](2026-11-09-audit-frises-superpositions.jpg), [carte et menu à 320 px](2026-11-09-audit-frises-mobile.jpg).
