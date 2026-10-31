# Suivi de remise en état — UniversalTimeline

Mis à jour le 30 octobre 2026. Référence : audit de la codebase du 28 octobre 2026 (A01–A25).

Ce fichier est le suivi de référence. Mettre à jour les statuts, preuves et prochaines étapes après chaque lot. Ne pas cocher un audit entier si seule une partie est corrigée. Les sections des lots 1 à 8 décrivent leur état historique. Depuis la consolidation du 29 octobre, le dépôt de référence est Desktop/Developpement/web-chronologie-univers-2 ; les 69 copies `* 2.*` déjà retirées dans ce dépôt restent supprimées.

## Modèle d’accès confirmé le 29 octobre 2026

- La timeline est accessible sans compte.
- Les autres pages demandent un compte ; chaque utilisateur dispose de ses propres stories.
- Design system réservé à l’administrateur.
- La présence/édition des périodes et événements pour les comptes ordinaires reste une décision ouverte ; ne pas ajouter de propriété ou masquer ces fonctions arbitrairement.
- A01 actif après validation et application des lots 17–19 ; durcissement des fonctions et de PostGIS appliqué au lot 20. Préparer et vérifier chaque migration concrète avant toute nouvelle application distante.

## Inscription — UI11 (30 octobre)

**Corrigé :** le formulaire affiche une explication sûre des principaux refus Supabase, notamment mot de passe trop faible/compromis, adresse non autorisée et limites d’envoi. Aide accessible, alias `+` conservé. 874 tests/68 fichiers, quatre contrôles de configuration, TypeScript/inutilisés et builds front/API réussis sans réseau ; douze régressions supplémentaires. Journaux et compte de test vérifiés en lecture seule ; aucun essai d’inscription ni e-mail envoyé par l’agent.

**P1 restant pour l’ouverture des inscriptions :** service d’e-mail intégré confirmé dans le Dashboard, aucun SMTP personnalisé actif. Aucun ancien fournisseur ou domaine d’envoi retrouvé dans la documentation ; utilisateur ne s’en souvient plus. Retrouver ou choisir un service et un domaine, puis configurer et vérifier la livraison des confirmations. Protection des mots de passe et confirmation conservées. Détails dans `server/AUTHENTICATION.md`.

## Règles de travail

**Cadrage mis de côté le 30 octobre, à la demande de l’utilisateur :** pistes d’exploration libre, période de référence et création collaborative de tags conservées dans [CADRAGE-EXPLORATION-ET-TAGS.md](CADRAGE-EXPLORATION-ET-TAGS.md), avec recherches et outils. À reprendre sur demande ; aucune nouvelle implémentation lancée pour ces pistes.

- Lots courts, vérifiables ; pas de refonte et suppression massives dans un même lot.
- Tests des mutations avec doublures de base ou base de test dédiée ; aucune écriture de vérification sur Supabase existant.
- Ne jamais afficher ou versionner les identifiants. Pas de push sans demande.
- Distinguer compilation réussie, tests ciblés réussis et suite globale réussie.

## P1 — Données et accès

| Ordre | Audit | Travail | Statut | Critère de validation |
|---|---|---|---|---|
| 1 | A02 | Refuser les conflits sans suppression automatique | Corrigé — lot 1 | Aucune suppression ni sauvegarde si Q-id déjà affecté ; tests |
| 2 | A03 | Transactions sur les écritures liées | Corrigé dans les parcours actifs — lots 1, 3–4, 6 et 21 | Métadonnées/parent/catégories et sélections d’associations atomiques ; pas de relance automatique d’une écriture au résultat incertain ; rollback et concurrence testés |
| 3 | A04 | Permettre de vider les catégories | Corrigé — lot 1 | [] vide les liens, champ absent préserve, entrée invalide refusée ; tests |
| 4 | A01 | Authentification et autorisations des données | Accès actifs — lots 17–20/28 ; protection des mots de passe et URL locales finalisées | 21 policies, propriétaires conservés, garde de production ; advisor sécurité sans alerte ; Site URL et unique redirection /login enregistrés puis relus ; domaine de production à définir |
| 5 | A05 | Bornes chronologiques numériques | Corrigé — lot 2 | Tests géologiques/BCE/modernes et bornes inconnues |
| 6 | A06 | Réponse canonique après sauvegarde | Corrigé — lot 2 | Dates, BP, catégories et métadonnées cohérentes dans le store |
| 7 | A07 | Contrat de suppression des périodes | Corrigé — lot 4 | Politique des enfants/liens, route et tests de rollback |
| 8 | A08 | Détecter les Q-id aussi dans les descendants | Corrigé — lot 3 | Recherche dédiée, test avec période non racine |
| 9 | A09 | Interdire les cycles côté serveur | Corrigé dans l’API — lot 3 | Auto-parent et ascendant refusés, concurrence traitée |
| 10 | A21 | Correctifs de dépendances de sécurité prioritaires | Corrigé local — lot 5 (arbres JS) | Retirer d’abord les paquets inutilisés ; avis conservés requalifiés et tests |

## P2 — Contrats, état et architecture

| Audit | Travail | Statut | Critère de validation |
|---|---|---|---|
| A20 | Résolution des imports de tests | Corrigé — lots 1–2 | Alias @ et import ESM du composable résolus |
| A20 | Réparer/retirer les tests historiques et ajouter une CI | Validé depuis installation vierge — lot 28 ; workflow distant non déclenché | 798 tests/60 fichiers, 4 configuration et 85 PostgreSQL 17 ; mêmes entrée et environnement pour CI, audits et builds réussis, aucun push |
| A10 | Invalidation ciblée et déduplication des requêtes | Corrigé dans les parcours audités — lots 6 et 25 | Store/catégories invalidés après mutations ; réponses Wikidata publiques partagées, bornées, expirables et rafraîchissables |
| A11 | États erreur/vide/chargement distincts | Corrigé dans les parcours audités — lots 6, 9, 10, 12, 14 et 25 | Pannes réessayables distinctes des listes vides ; enrichissements incomplets et compteur inconnu explicites ; vigilance pour les nouveaux consommateurs |
| A12 | Annuler/ignorer les réponses obsolètes | Corrigé dans les parcours audités — lots 4, 6, 9, 10, 12 et 25 | Gardes de contexte conservées ; annulation réseau des recherches/imports ; un lecteur ne coupe pas une lecture partagée encore utile |
| A13 | Séparer Select générique et PeriodSelect | Corrigé — lot 7 (code actif) | Select/SelectShell sans store ni réseau ; filtre métier dans PeriodSelect/usePeriodSelect ; appels migrés |
| A14 | RouterView, imports différés, KeepAlive ciblé | Corrigé local — lot 8 | Routes réelles, pages différées, seule HomeView conservée ; accès directs, historique et erreurs testés |
| A15 | DTO typés et ID normalisés | Corrigé aux frontières formulaires/HTTP — lots 16 et 22 | Brouillons/soumissions/DTO distincts ; entrées inconnues contrôlées avant SQL ; lignes SQL et agrégations internes typées au lot 23 |
| A16 | Service UI sans variables window et confirmations en file | Corrigé local — lot 11 | File, réponses indépendantes, fermeture, timers et annulation avant mutation testés |
| A17 | Extraire services métier, repositories et domaine temporel | Corrigé — lots 23 et 24 | Routes/services/SQL séparés ; moteur temporel partagé, règles pures et bornes communes testés |
| A18 | Clavier, dialogues, focus et erreurs accessibles | Corrigé sur les parcours ciblés — lots 11, 13 et 26 ; validation assistive complète distincte | Suggestions et contrôles reliés, focus visible/restauré, actions accessibles sans survol, tri/redimensionnement clavier et lien d’évitement ; contrôle AX réel, sans certification WCAG |
| A19 | Corriger les breakpoints CSS | Corrigé pour les gabarits principaux — lots 13 et 26 | Timeline/Stories/Periods/Events chargés à 320, 768, 1024 et 1280 px ; formulaires et barres adaptées, tableau à défilement local partagé |
| A21 | Séparer dépendances navigateur/API et mettre à niveau | Corrigé local — lots 5 et 27, dépendances JS et runtime Docker | Deux audits JS sans avis, dépendances de maintenance retirées, image API construite et démarrée avec PostgreSQL TLS jetable |
| A22 | Erreurs centralisées, logs et arrêt contrôlé | Corrigé local — lot 15 (serveur HTTP) | 31 handlers centralisés, erreurs/logs expurgés, drainage avant pool, limite et sortie fatale testés |

## P3 — Nettoyage contrôlé

| Audit | Travail | Statut | Critère de validation |
|---|---|---|---|
| A23 | Retirer les 69 copies identiques | Corrigé local — nettoyage Desktop conservé à la consolidation | 69 fichiers suivis absents, aucun réintroduit ; builds et tests réussis |
| A24 | Décider du sort des 8 composants isolés et anciens sous-graphes | Traité dans le périmètre audité — lot 27 | 40 fichiers historiques archivés en texte avec SHA-256, hors sources/runners ; aucun module applicatif isolé dans le graphe des imports observé |
| A25 | Retirer fonctions mortes et unifier les doublons | Traité dans le périmètre audité — lots 10–14 et 24–27 | Dernier adaptateur temporel, ancien chargeur de story Wikidata, types et alias inutilisés retirés ; GlobalSearch relié à une navigation testée |
| Transverse | Documentation, migrations historiques, démarrage neuf | Validé local — lot 28 ; préparation de livraison distincte | Baseline vide contrôlée, vraie image API démarrée avec TLS/Auth, restauration fictive et procédure CI reproductible ; domaine/URL Auth de production et reprise du projet réel à finaliser avant déploiement |

## État après le lot 28

**Aucun lot de nettoyage de code supplémentaire n’est planifié à ce stade.** La validation locale et les réglages Auth du développement sont terminés. Le Dashboard est accessible après reconnexion de l’utilisateur ; les contrôles Auth complémentaires sont consignés à la fin du lot. Cela ne signifie ni déploiement effectué ni certification d’accessibilité.

Avant exposition publique, restent :

- Choix du domaine de livraison et stratégie de reprise du projet réel. Le contrôle --production refuse correctement l’origine HTTP locale ; la restauration de données fictives ne remplace pas une restauration Supabase complète.
- Configuration et vérification de Site URL, de la redirection exacte /login et du retour par e-mail pour ce futur domaine. Les valeurs locales sont enregistrées et relues : Site URL `http://127.0.0.1:5173`, unique redirection `http://127.0.0.1:5173/login`, sans joker. La protection contre les mots de passe compromis est activée et l’advisor sécurité ne signale aucune alerte.

Le lot 28 prépare et vérifie la livraison ; il n’autorise ni push ni déploiement. Le catalogue périodes/événements reste partagé en attendant la décision produit.

## Chantier suivant — UI et expérience utilisateur

Ce chantier est confirmé par l’utilisateur et distinct de l’audit technique. Aucun écran n’a été redessiné dans le lot 28. Les priorités ci-dessous sont à préciser à partir de ses retours avant estimation des lots :

| Priorité | Périmètre à travailler | Résultat à valider |
|---|---|---|
| P1 | Parcours timeline publique, stories personnelles et catalogue | Comprendre où l’on est, ce que l’on consulte et la prochaine action ; repérer les frictions de navigation/création/import |
| P2 | Cohérence des écrans et lisibilité | Libellés, hiérarchie visuelle, dates, densité et états cohérents ; conserver les textes/dates historiques en base |
| P2 | Ergonomie des formulaires, recherche et petits écrans | Réduire les hésitations, rendre les actions/retours clairs, vérifier avec du contenu réel et au clavier |
| P3 | Finitions visuelles et validation assistive | Ajustements après validation des parcours ; tests de contraste et lecteurs d’écran à compléter, sans annoncer une certification acquise |

### UI01 — Marqueurs d’événements sur l’axe principal

Corrigé à la demande de l’utilisateur. Le navigateur montrait un décalage de 5 px vers le bas sur les douze événements visibles. Les boutons inline participaient à la ligne de texte de leur conteneur ; leur position est maintenant absolue à l’origine de la carte, et l’ancrage vertical tient compte de la marge et de la demi-épaisseur de l’axe.

Vérification dans la timeline locale : centres des douze marqueurs confondus avec le centre de l’axe ; l’agrandissement du marqueur sélectionné conserve son centre (écart inférieur à 0,001 px). Affichage de la fiche puis désélection contrôlés, sans modification de données. Captures et mesures conservées sous .tmp/ui-timeline-alignment. Aucun changement du positionnement horizontal ou des événements sans date.

Compilation frontend avec `yarn vite build` réussie (356 modules), contrôle des espaces réussi. `yarn build` n’est pas déclaré validé sur cette passe : ses deux essais ont été interrompus pendant un contrôle vue-tsc sans progression visible. Aucun changement TypeScript dans cette correction CSS, aucun nouveau test unitaire ajouté pour reproduire des déclarations de style.

### UI02 — Superposition des infobulles d’événements

Corrigé à la demande de l’utilisateur. Chaque carte créait un contexte de superposition au même niveau : l’ordre du DOM pouvait donc maintenir une infobulle verrouillée devant celle d’un événement survolé. Priorités locales explicites sur les cartes : repos 10, sélection 11, focus interne 12, survol 13, dérivées des variables existantes. Les infobulles restent dans leur carte ; le verrouillage et la sélection ne changent pas au survol.

Cas reproduit puis vérifié dans le navigateur : Premières traces de vie verrouillé et Eukaryota survolé, avec recouvrement des deux infobulles. Eukaryota passe au premier plan malgré son ordre antérieur dans le DOM ; la sélection reste sur Premières traces de vie. Déplacement de la souris hors des marqueurs : l’infobulle verrouillée reste visible. Avec le pointeur ailleurs, Tab donne le focus à Eukaryota et sa fiche passe également devant la fiche verrouillée. Captures et mesures sous .tmp/ui-tooltip-stacking. Aucun changement de données ni nouveau test unitaire de déclarations CSS.

Compilation Vite finale réussie (356 modules), contrôle des espaces réussi. Correction CSS uniquement ; contrôle TypeScript global non relancé sur cette passe après le blocage signalé dans UI01.

### UI03 — Périodes sans enfant et recette de navigation

Corrigé à la demande de l’utilisateur : mention « Sans sous-période » supprimée, avec son style spécifique. Une période sans enfant conserve son clic pour les stories ancrées, mais ne prépare plus d’animation vers la barre parent.

Le contrôleur usePeriodFlip est séparé du rendu de PeriodGrid. Il n’anime que la période réellement atteinte, après la fin du chargement et la mise à jour du DOM. Un échec, un retour ou une destination remplacée abandonne l’animation préparée ; les timers et les styles sont annulés sur nouvelle navigation, désactivation et destruction. Le réglage de mouvement réduit est respecté.

Autres problèmes corrigés pendant la recette :

- Le niveau courant reste monté pendant la lecture des suggestions ou des enfants, avec aria-busy ; le spinner initial est réservé à une timeline sans contexte. Cela évite les disparitions/réapparitions et animations d’entrée parasites.
- Une période courante devenue vide conserve sa barre de retour, au lieu d’être remplacée par un écran vide sans retour.
- Après activation d’une période au clavier, le focus rejoint le nouveau bouton de retour quand la carte activée disparaît. Il ne remplace pas un focus déplacé volontairement vers un autre contrôle pendant le chargement.

Vérifications :

- **811 tests / 62 fichiers réussis**, aucun ignoré, dont 13 nouveaux : 10 pour la destination effective, les feuilles, les échecs, les transitions concurrentes, l’annulation, le mouvement réduit et le focus ; 3 pour la conservation des cartes pendant le chargement, le retour depuis un niveau vide et le spinner initial. Les suites existantes de navigation, historique, reconstruction de pile, stories, erreurs/reprises, réponses tardives, cache et recherche restent vertes.
- Quatre tests de configuration hors connexion, contrôle TypeScript des symboles inutilisés et builds frontend/API réussis. Le contrôle TypeScript complet est donc à nouveau validé, y compris les changements UI01/UI02 ; leur ancien blocage ne reste pas une vérification en attente.
- La première passe native ciblée a validé 19 tests, mais quatre workers n’ont pas démarré à temps : passe non retenue comme validation complète. La passe finale est `yarn verify` dans l’image de contrôle construite depuis le dépôt courant, sans .env du poste et avec réseau désactivé ; sortie 0. Aucun test PostgreSQL distant et aucune migration sur cette passe.
- Recette dans le navigateur : Voie Lactée → Système solaire → Terre ; clics Hadéen et Phanérozoïque sans changement du parent ; retour Terre → Système solaire, Tab puis Entrée sur Terre avec focus sur « Revenir depuis Terre ». Passage Stories puis précédent/suivant du navigateur, branches Voie Lactée/Système solaire du catalogue Periods et ouverture Events : le retour à Timeline conserve Terre et ses quatre périodes, sans transformation résiduelle.
- Les pannes et la navigation entre stories sont vérifiées avec les fixtures automatisées ; la recette manuelle utilise la hiérarchie et les pages existantes, en lecture. Captures et relevés dans .tmp/ui03-navigation ; aucun contenu enregistré, aucun rôle ou paramètre Supabase modifié, aucun push.

Recette utilisateur : sur Terre, cliquer Hadéen : la barre Terre reste immobile. Revenir au Système solaire puis ouvrir Terre au clavier : le focus doit rejoindre sa barre de retour. Ouvrir Stories ou Events, puis Timeline : le niveau Terre doit être conservé.

### UI04 — Projection des périodes et informations complètes

Corrigé à partir de la capture utilisateur. Dans la fenêtre Terre (début affiché 4,54 Ga), le Hadéen commence plus tôt (4,57 Ga affiché). Son début était borné à gauche mais sa largeur conservait la durée complète hors fenêtre : son bord droit dépassait sous l’Archéen. TimelineScalingService projette et borne désormais séparément le début et la fin, puis calcule leur différence. Le calcul de largeur indépendant devenu inutilisé est retiré ; les fenêtres invalides ne produisent pas de pourcentages NaN.

Mesure sur le navigateur, même largeur de frise 1 070 px : ancien bord droit Hadéen 138,390625 px pour un début Archéen à 131,9609375 px, soit 6,4296875 px de chevauchement. Après correction, les deux bornes sont à 131,9609375 px. Les dates du catalogue sont conservées : il s’agit de la projection de la partie visible dans la fenêtre parent, pas d’une correction des données historiques.

Une infobulle unique donne le nom et l’intervalle complets pour les cartes de période, au survol et au focus clavier. Elle suit la dernière interaction souris/clavier, s’appuie sur le même formateur de dates que la carte, reste reliée par aria-describedby et se ferme avec Échap. Elle reste accessible au pointeur, suit les mouvements/agrandissements de carte et se ferme sur changement de page, disparition de la cible, défilement de la page ou redimensionnement de la fenêtre. Son placement privilégie l’espace sous la carte pour préserver l’accès à la barre de retour ; elle se décale aux bords ou passe au-dessus si nécessaire. L’agrandissement existant à 8 % des petites périodes est conservé et fonctionne aussi au focus.

Validation finale : **835 tests / 64 fichiers réussis**, aucun ignoré, dont 24 nouveaux scénarios (13 de projection et 11 d’infobulle/interaction). Quatre tests de configuration hors connexion, contrôle TypeScript des symboles inutilisés et builds frontend/API réussis dans l’image de contrôle, sans réseau ni fichiers .env du poste. La première passe a mis en évidence une doublure géométrique de test partagée entre deux éléments ; elle a été corrigée avant la passe finale. La recette réelle a aussi permis de corriger la priorité d’une souris immobile face à un nouveau focus clavier.

Recette navigateur : raccord Hadéen/Archéen, vrai survol Hadéen, fermeture par Échap, parcours Tab entre les quatre périodes, informations complètes de Phanérozoïque au bord droit (bord de l’infobulle 1 082 px pour une fenêtre de 1 094 px). Le rechargement à chaud avait momentanément affiché une version intermédiaire lors du renommage d’un état ; le code cohérent a été rechargé puis revalidé. Le focus Hadéen est relié à son infobulle avec les deux dates complètes. Captures, mesures et log final sous .tmp/ui04-period-details. Aucun changement de données, de rôle, de paramètres Supabase ou de dépôt distant.

### UI05 — Agrandissement unique ; infobulle conservée désactivée

À la demande de l’utilisateur, `PeriodGrid.periodTooltips` vaut `false` par défaut. Le composable, le rendu, les styles et les onze tests de l’infobulle UI04 restent disponibles ; une activation explicite reste testée. Aucun `aria-describedby` ne pointe vers un contenu absent.

L’agrandissement réutilise la même transformation des coordonnées pour les périodes et les événements. Le minimum de 8 % est conservé et augmenté selon la largeur du nom/des dates réellement tronqués, avec les marges internes et une réserve pour les arrondis. Une carte déjà lisible garde son échelle. La dernière interaction souris ou clavier détermine la période active ; la sortie des deux restaure l’échelle, Échap et le retour réinitialisent l’interaction. Si le texte dépasse toute la frise, il revient à la ligne et la hauteur des couloirs s’adapte. Les mesures et observateurs sont isolés dans `useTimelinePeriodExpansion` et nettoyés à la destruction.

Validation : **843 tests / 65 fichiers réussis**, dont huit nouveaux cas (désactivation par défaut et réactivation, texte complet, carte déjà lisible, raccords et événement à la même date, souris/clavier, largeur disponible, texte très long, réinitialisation). Quatre tests de configuration, TypeScript/inutilisés et builds front/API réussis via `yarn verify`, dans le conteneur de contrôle sans réseau ; sortie 0. Pas de test distant ni d’écriture Supabase.

Recette réelle à Terre : Hadéen au survol et au clavier avec dates complètes, Phanérozoïque au bord droit avec intervalle complet, Archéen déjà lisible sans changement de largeur. Aucun tooltip rendu ; dix marqueurs gardent leur centre sur l’axe à 518 px. Après sortie, raccord Hadéen/Archéen revenu exactement à 131,9609375 px comme avant le survol, sans chevauchement. Les très longs textes et le redimensionnement sont testés par géométrie simulée ; pas de changement de dimensions du navigateur. Captures et log sous `.tmp/ui05-period-expansion`. Aucun changement de données ni de dépôt distant.

Recette utilisateur : survoler Hadéen ou Phanérozoïque ; la carte s’élargit pour montrer ses dates, sans infobulle. Sortir de la carte pour retrouver l’échelle. Le parcours avec Tab permet la même lecture.

### UI06 — Hauteur stable pendant l’élargissement

Régression UI05 signalée par l’utilisateur : la classe active autorisait immédiatement le retour à la ligne alors que la largeur animée était encore petite. Le texte empilé augmentait la hauteur des cartes/couloirs avant l’élargissement, puis celle-ci redescendait. La classe d’interaction et le repli du texte sont désormais séparés. Les libellés et dates restent sur une ligne pendant toute la transition. Le repli n’est autorisé que si le texte dépasse la largeur totale disponible et que la carte l’a effectivement atteinte (tolérance d’arrondi 1 px), sans temporisation arbitraire. Les observateurs existants suivent l’avancement et adaptent ensuite la hauteur uniquement si nécessaire.

Validation : **845 tests / 65 fichiers réussis**, avec deux régressions supplémentaires pour les largeurs intermédiaires et le repli différé des textes exceptionnels, puis réinitialisation. Les quatre tests de configuration, types/inutilisés et builds front/API passent via `yarn verify` sans réseau ; sortie 0. Contrôle des différences sans erreur d’espaces.

Recette réelle : lors de l’élargissement Hadéen, largeur intermédiaire 125,65 px (entre 119,96 et 129 px), hauteur carte constante 52 px, couloir 56 px, axe à 517 px. Même hauteur au passage clavier vers Phanérozoïque, puis Échap et survol natif Hadéen. Texte `nowrap` durant l’animation et absence d’infobulle vérifiés. Captures/log sous `.tmp/ui06-period-transition`. Aucun changement de dates, de Supabase ou de dépôt distant.

### UI07 — Fil d’Ariane stories et périodes

Remise en place du chemin complet au-dessus de la frise, à partir du composant StoryBreadcrumb existant. Il affiche les stories puis les ancêtres de la période courante, avec des clés distinctes pour stories/périodes, des titres complets et une mise en page dans le flux qui peut revenir à la ligne. Chaque ancêtre est un bouton ; le niveau courant est indiqué par `aria-current="location"` dans une liste ordonnée. Après une activation clavier, le focus rejoint le nouveau niveau courant une fois son chargement terminé, sans reprendre le focus à un autre contrôle.

Les clics sur une période ancêtre raccourcissent la pile sans ajouter de doublon, rétablissent les enfants/événements dans le périmètre de la story et annulent les résultats de navigation devenus obsolètes. Un clic sur la story courante ouvre sa vue d’ensemble ; le retour à une story précédente conserve son snapshot de périodes. Les libellés restent synchronisés avec les mises à jour canoniques. Le layout HomeView réserve la place du fil d’Ariane au-dessus de la frise.

Validation finale : **858 tests / 67 fichiers réussis**, dont 13 nouveaux cas pour le rendu accessible, le focus, les retours multi-niveaux, les stories imbriquées, la portée des événements/périodes, les requêtes tardives, les indices invalides et les libellés modifiés. Quatre tests de configuration, types/inutilisés et builds front/API passent dans l’environnement de contrôle sans réseau ; sortie 0. Première passe corrigée sur deux fixtures : détail de clic en lecture seule dans l’outil de test et événements de test marqués NOW malgré leur valeur BP historique. Aucun correctif de données réelles lié à ces fixtures.

Recette réelle : Univers moderne / Voie Lactée / Système solaire / Terre ; retour direct Terre → Voie Lactée avec Entrée et focus conservé sur la destination ; retour à Univers moderne et nouvelle descente jusqu’à Terre. Trois ancêtres cliquables et Terre comme position courante, couloir des périodes à 56 px. Capture/log sous `.tmp/ui07-breadcrumb`. Sélecteur de catégories laissé en attente de discussion : aucun filtre ajouté. Aucune donnée, configuration Supabase ni dépôt distant modifiés.

Recette utilisateur : cliquer « Système solaire » ou « Voie Lactée » dans le chemin pour remonter directement ; cliquer le nom de la story pour sa vue d’ensemble. Tab puis Entrée permet les mêmes actions.

### UI08 — Audit UX de l’exploration (30 octobre)

Audit réalisé, recommandations à mettre en œuvre après cadrage du parcours. Référence : `AUDIT-UX-EXPLORATION.md`. L’utilisateur confirme une exploration du catalogue et des découvertes externes. Aucun changement applicatif pendant cet audit.

Constats vérifiés : 11 stories publiques et 18 catégories ; deux enfants directs d’Univers moderne sans ancre ; deux stories seulement théoriquement atteignables par les ancres depuis l’entrée, celle-ci comprise. Trois périodes feuilles dans Univers moderne ont déjà des enfants dans d’autres stories (Archéen 4, Protérozoïque 3, Phanérozoïque 3). Les 14 événements d’entrée portent des catégories dans le détail, toutes absentes de la réponse dédiée à la frise. Les 11 stories n’ont aucune catégorie explicite. Recette réelle : Hadéen sans suite visible, Premières traces de vie affiche « Aucune story liée » sans catégories ou mise en évidence, page Stories orientée gestion sans lancement de la frise.

| Priorité | Chantier UX | État |
|---|---|---|
| P1 | UX01–UX02 : sortir du périmètre d’une story et proposer les parcours indépendamment du maillage manuel | Audité — à réaliser |
| P1 | UX03 : transmettre les catégories des événements à la frise | Corrigé — UI09 |
| P1 | UX04 : rendre les catégories explorables | Audité — à réaliser |
| P1 | UX05–UX06 : choisir un parcours depuis la frise et rendre les continuations explicites/cohérentes | Audité — à réaliser |
| P2 | UX07–UX09 : fiche de lecture, historique/URL et densité temporelle | Audité — à réaliser |
| P2, préalable externe | UX10 : découverte Wikidata progressive, provenance et dates inconnues | Audité — à réaliser |

Modèle proposé : catalogue comme fond d’exploration, thèmes comme axes transversaux, stories comme parcours guidés à périmètre annoncé, sources externes comme prolongement. Préserver date/contexte lors d’une bifurcation ; séparer hiérarchie et historique. Quatre lots proposés dans l’audit : UX-A parcours existants et contrat de catégories ; UX-B catalogue libre/thèmes ; UX-C retours et densité ; UX-D sources externes. Maquette des parcours UX-A/UX-B recommandée avant une refonte de la frise. Pas d’ajout immédiat d’un simple filtre de couleurs.

Lectures anonymes et comparaison de l’API locale uniquement ; aucun rôle, contenu, lien ou paramètre Supabase modifié. Les 858 tests/67 fichiers du lot UI07 sont le dernier résultat de validation applicative ; suite non relancée pour cet audit documentaire. Analyse experte, sans étude utilisateur ni recette responsive exhaustive. Preuves/captures sous `.tmp/ux-audit-20261030`. Le graphe d’ancres ne mesure pas toutes les voies de consultation possibles, notamment l’éditeur.

### UI09 — Catégories partagées des événements (30 octobre)

Correction du point UX03 à partir du cas Eukaryota / Explosion cambrienne. Le service de liste des événements d’une story réutilise maintenant la lecture avec catégories déjà employée par le détail de story et regroupe les lignes par événement. Les noms des champs historiques, valeurs numériques, descriptions nulles, dates et ordre sont conservés. Les événements sans catégorie restent présents avec `categories: []`. L’ancienne lecture redondante sans catégories est retirée. Aucun ajustement arbitraire des tags ni changement de schéma/droits.

Validation : **862 tests / 68 fichiers**, quatre tests de configuration, TypeScript/inutilisés et builds front/API réussis hors réseau, sortie 0. Quatre régressions ajoutées : agrégation de plusieurs catégories sans doublon et préservation du contrat ; liste vide ; chargement de la vraie HomeView depuis les réponses API avec catégories communes non placées en premier, sélection dans les deux sens et désélection ; événements sans rapport ou sans catégorie. Aucun test SQL d’écriture exécuté sur le projet réel.

API locale redémarrée seule sous PM2 (watch était désactivé), sans modifier son environnement. Lecture anonyme avant/après : 14 événements, auparavant zéro avec catégories, désormais 14 avec catégories. Eukaryota : Microbiologie + Biologie évolutive ; Explosion cambrienne : Biologie évolutive + Paléontologie. Après rechargement du navigateur, sélection Eukaryota → Explosion cambrienne mise en évidence, puis sens inverse ; désélection → zéro mise en évidence. Capture/log et relevé sous `.tmp/ui09-event-categories`. Aucun changement de données Supabase ni push.

Recette utilisateur : dans Terre, cliquer Eukaryota puis Explosion cambrienne. L’autre marqueur prend la couleur de relation ; un second clic sur le marqueur sélectionné retire la mise en évidence. Le comportement concerne tous les événements visibles partageant au moins une catégorie.

### UI10 — Événements liés sans transparence (30 octobre)

Opacité 0,55 retirée des marqueurs `.is-category-active .event-dot`. Vérification dans la vraie frise, Eukaryota sélectionné : les cinq marqueurs partageant une catégorie, dont Explosion cambrienne, ont une opacité calculée de 1. Capture sous `.tmp/ui10-event-opacity`. Changement CSS uniquement ; pas de nouvelle suite complète, les 862 tests de UI09 restent le dernier résultat global.

## Journal des lots

### Lot 1 — Sauvegardes et catégories

Statut : terminé pour le périmètre défini ; A03 et A20 restent partiels.

Périmètre : A02, A04 et écritures liées A03 ; configuration minimale pour exécuter les tests ciblés. Pas de changement de schéma ni d’écriture sur Supabase.

Changements livrés :

- A02 : la sauvegarde refuse le Q-id en conflit, sans suppression ni mise à jour. Les deux anciennes fonctions de résolution automatique refusent également le conflit. La stratégie explicite historique reste à revoir dans A25 ; elle n’est pas appelée par la sauvegarde.
- A03 : ajout de `runInTransaction` et `withTransaction`. Même client pour BEGIN, opérations, COMMIT/ROLLBACK ; libération garantie et connexion écartée si rollback impossible.
- Transactions appliquées à POST /events, PUT /events/:id, PUT /periods/:id, PUT /stories/:id, DELETE /events/:id et DELETE /stories/:id.
- A04 : remplacement des catégories mutualisé ; champ absent = préserver, [] = vider, entrée mal formée = HTTP 400 avant écriture. ID dédupliqués et valeurs paramétrées.
- A20 : alias @ ajouté à Vitest ; tests backend exécutés en environnement Node avec la couche base remplacée. Aucun .env lu ni connexion réseau dans ces tests.

Vérifications :

- 46 nouveaux tests réussis dans les trois fichiers `server/test/transaction.test.ts` (6), `server/test/mutations.test.ts` (33) et `src/services/__tests__/safeConflicts.test.ts` (7).
- Les tests exécutent les vrais handlers Express sans ouvrir de port, avec client SQL simulé ; ils vérifient catégories vides/absentes/invalides, échecs d’insertion ou suppression, commit et rollback, absence de suppression en conflit et libération du client.
- Ce sont des tests isolés et de contrat SQL : ils ne remplacent pas une intégration sur un PostgreSQL de test avec de vraies contraintes.
- `yarn build` : réussi.
- `yarn --cwd server build` : réussi.
- `yarn test --run` : 74 tests réussis, 14 échoués, 88 exécutés ; 3 fichiers réussis, 5 en échec (dont un fichier vide). Tous les nouveaux tests passent. L’alias corrigé charge désormais les anciennes suites Wikidata ; leurs mocks/assertions historiques échouent. L’ancien require(), les assertions dateFormatter et la suite vide restent à traiter dans A20.
- Contrôle HTTP en lecture seule : /health API = 200 avec database connected ; front = 200.
- Aucune écriture de test dans Supabase, aucune migration, aucun push.

Limites restantes : A03 ne couvre pas encore les opérations métier réparties sur plusieurs requêtes HTTP (création d’une période puis rattachement dans le graphe), ni les retries d’écriture sans idempotence. A01 (accès) reste à faire avant exposition publique. La détection de doublons dans les descendants (A08) et la synchronisation du store (A06) ne sont pas corrigées par ce lot.

Étape suivante de ce lot : A20, A05 et A06 ont été traités dans le lot 2 ci-dessous. A01 reste prioritaire avant tout déploiement ou ouverture réseau.

### Lot 2 — Suite verte, dates et synchronisation

Statut : terminé localement.

Changements livrés :

- A05 : suppression des agrégations MIN/MAX sur les dates textuelles. Les deux endpoints stories utilisent la même fonction de sélection numérique, avec fallback de parsing pour les colonnes BP absentes. Bornes inconnues/vides exclues ; NOW/TODAY restent des bornes actuelles explicites. Une requête charge les candidats de toutes les stories, sans requête supplémentaire par story. La liste des stories effectue désormais deux lectures groupées (métadonnées, candidats temporels).
- Extraction du calcul backend `computeYearsBP` dans `server/src/domain/yearsBeforePresent.ts` ; prise en compte des timestamps SQL avec espace. Les parsers frontend et backend ne sont pas encore unifiés : A17 reste ouvert.
- A05 côté UI : comparaison numérique dans `temporalBoundsFromStoryDetail`, avec conversion nullable pour ne pas confondre une date inconnue et aujourd’hui.
- A06 : les mappers normalisent les réponses de création/édition ; le store remplace les entités avec les réponses serveur complètes, conserve leur ordre et ne reconstruit plus les dates et catégories à partir du formulaire. Les réponses de mutation renvoient les catégories réellement enregistrées ; l’édition d’une période conserve son indicateur d’enfants.
- Le cache des périodes de stories est invalidé après sauvegarde d’une période ; la timeline remplace ses objets affichés sans réinitialiser son historique de navigation. Le flux de création du graphe réutilise également la période mappée.
- ID numériques des stories normalisés en chaînes côté frontend. Les bornes dérivées sont conservées lors d’une simple édition de leurs métadonnées.
- A20 : les mocks Wikidata couvrent maintenant la requête temporelle et la requête enfants ; les erreurs réseau persistent sur les tentatives, testées avec une horloge simulée. Le fichier de test vide teste désormais le composant PeriodCard actif. Le require() historique du composable est remplacé par son import ESM et son initialisation réelle.
- Les assertions historiques du DateFormatter ont été corrigées : elles n’attendent plus une heure arbitraire, un résultat sans les champs publics numériques, ni la prise en charge d’une expression non supportée. Corrections effectives du code legacy : âge géologique positif, conservation jour/mois français, distinction année BCE/années écoulées et absence d’heure inventée pour une date sans heure. L’expression « 8. millennium BCE » reste explicitement non supportée et conservée telle quelle ; elle n’est pas transformée en date inventée.
- Les tests ont révélé et corrigé deux bugs Wikidata supplémentaires : le flag hasChildren après chargement et les labels bilingues de la requête story qui ne correspondaient pas au mapper.
- Workflow `.github/workflows/checks.yml` préparé : installations verrouillées, tests isolés sans secret, tests de configuration et builds. Déclenchement sur push et pull_request, accès dépôt en lecture seule. Aucun workflow n’a été lancé sur GitHub puisque rien n’a été poussé.

Vérifications finales :

- `yarn test --run` : **111 tests réussis, 10 fichiers réussis, aucun test ignoré ou désactivé**.
- Nouveaux scénarios : ordres géologiques inverses, unités mixtes, BCE/calendrier, timestamps avec espace, valeurs inconnues, événements aux bornes, égalité des deux endpoints, réponse serveur prioritaire après création/édition, conservation de l’ordre et de la navigation, invalidation du cache et absence de changement du store si sauvegarde refusée.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**, sans connexion.
- `yarn build` et `yarn --cwd server build` : réussis.
- Contrôle HTTP en lecture seule : /health connecté ; 11 stories et 11 lignes de bornes retournées, correspondance des valeurs vérifiée entre les deux endpoints.
- PostgreSQL réel : EXPLAIN sans ANALYZE de la requête UPDATE période accepté (aucune exécution) ; SELECT de catégories accepté.
- `git diff --check` : réussi.
- Workflow revu structurellement ; pas de validation par exécution GitHub pour le moment.
- Aucune écriture de test dans Supabase, aucune migration, aucun push.

Limites restantes : ces tests ne remplacent pas une base PostgreSQL dédiée aux tests d’intégration des mutations. A10 reste partiel (invalidation des associations ajoutées/retirées et déduplication des promesses encore à faire). A15 reste partiel (DTO et validation externe). Les scripts optionnels test:ui/test:coverage et les dépendances vulnérables restent dans A21. Les anciens moteurs de dates restent dans le code jusqu’au nettoyage A24/A25. Les copies « 2 » n’ont pas été modifiées : depuis les correctifs, certaines sont devenues des versions historiques différentes des originaux ; recontrôler l’inventaire avant retrait.

Étape suivante de ce lot : A08/A09 ont été traités dans le lot 3 ci-dessous. A07 reste à traiter avec une politique de suppression explicite. A01 reste un prérequis à toute exposition publique. Le nettoyage mécanique A23 peut ensuite être isolé dans un lot dédié.

### Lot 3 — Doublons dans les descendants et hiérarchie protégée

Statut : terminé localement pour A08 et les mutations de hiérarchie via l’API (A09).

Changements livrés :

- A08 : les vérifications de conflit consultent `/periods/wikidata/:wikidataId`, qui recherche dans toute la table, au lieu de parcourir la liste des racines. L’édition du même élément reste autorisée. Les routes de détail renvoient aussi `hasChildren`.
- Seul un HTTP 404 signifie désormais « période absente ». Une erreur réseau ou serveur bloque la création et la validation ; le contrôle des événements distingue également absence et échec réseau. Les anciens résolveurs automatiques refusent une validation impossible.
- La création d’une période refuse un Q-id déjà présent, y compris dans un descendant : elle ne renvoie plus une période existante comme si elle venait d’être créée, ce qui pouvait provoquer son déplacement dans le flux du graphe.
- Les contraintes uniques existantes sur `periods.wikidata_id` et `events.wikidata_id` protègent aussi les courses entre requêtes. Les collisions lors de POST période et PUT période/événement renvoient HTTP 409 ; les éditions sont annulées avec leurs catégories. L’interface affiche le message de refus de l’API.
- A09 : `PATCH /periods/:id/parent` valide le contrat (`parent_id` requis, chaîne non vide ou null explicite), vérifie l’existence des deux périodes et refuse l’auto-parent, les cycles indirects et le rattachement à une chaîne déjà cyclique ou incomplète.
- Vérification et déplacement utilisent le même client et la même transaction. Un verrou `SHARE ROW EXCLUSIVE` est pris avant les lectures ; deux déplacements croisés sont donc examinés successivement sur l’état enregistré. Attente du verrou limitée à cinq secondes, puis HTTP 503 pour permettre une nouvelle tentative.
- La requête récursive utilise UNION pour terminer même en présence d’un cycle préexistant. Le parcours frontend devient itératif avec un ensemble des identifiants visités ; il ne boucle plus sur des données corrompues et supporte une hiérarchie profonde.
- Le store reçoit la réponse canonique du déplacement, avec catégories et indicateur d’enfants. Un refus conserve l’état affiché ; une réponse ne remplace plus toute la liste à partir d’un ancien instantané et préserve les modifications d’autres lignes survenues pendant la requête. Les caches de périodes des stories sont invalidés après déplacement.

Vérifications :

- `yarn test --run` : **154 tests réussis dans 14 fichiers**, aucun test ignoré ou désactivé. Le lot ajoute 43 scénarios aux 111 du lot 2, dont recherche dans les descendants, vrais 404/pannes, absence de réutilisation destructive, contrats HTTP, rollback, cycles indirects, données incomplètes et maintien de l’état après refus.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**, sans connexion.
- **8 tests d’intégration PostgreSQL réussis** : instance temporaire PostgreSQL 14.18 disponible sur la machine, sans accès TCP, base dédiée et vide `universaltimeline_test_lot3`. Déplacement, détachement, auto-parent/cycles, références inexistantes, rollback réel, deux déplacements croisés sur deux connexions, et lecture concurrente sous verrou. Instance arrêtée et répertoire temporaire supprimé après exécution.
- Ces tests exécutent le code backend compilé, dans `server/test/periodHierarchy.postgres.mjs`. Pour les rejouer, créer une base locale vide dédiée, accessible par socket Unix sur le port 55439, puis définir `TIMELINE_TEST_SOCKET` et `TIMELINE_TEST_DATABASE=universaltimeline_test_<nom>` et lancer `yarn --cwd server test:hierarchy`. Le test refuse une destination TCP et un nom de base ordinaire. Il crée ses propres tables simplifiées : ne pas le lancer dans une base contenant des données à conserver.
- `yarn build` et `yarn --cwd server build` : réussis.
- Supabase PostgreSQL 17, en lecture seule : parcours d’un descendant avec dix lignes d’ascendance, aucune période cyclique détectée, présence des deux index uniques Q-id vérifiée. EXPLAIN sans ANALYZE du nouvel UPDATE accepté, avec utilisation des index d’identifiant et de parent ; aucun UPDATE exécuté.
- HTTP : `/timeline` et `/graph` = 200, `/health` connecté. Le proxy Vite retrouve le descendant Q170314, absent de la liste des racines, avec son parent et son indicateur d’enfants.
- `git diff --check` : réussi.
- Aucune écriture de test ni modification du schéma Supabase, aucun push.

Choix et limites :

- Le verrou porte sur toute la table des périodes et bloque brièvement ses autres écritures, tout en laissant les lectures simples disponibles. C’est un choix de correction pour le volume actuel ; une forte concurrence demandera de réévaluer ce compromis. Les propriétés du verrou et l’arrêt de UNION ont été vérifiés dans la [documentation PostgreSQL 17 sur les verrous](https://www.postgresql.org/docs/17/explicit-locking.html) et les [requêtes récursives](https://www.postgresql.org/docs/17/queries-with.html).
- La protection des cycles couvre le chemin d’écriture de l’API. Une écriture SQL directe ou un autre outil peut toujours créer un cycle : aucune contrainte ni aucun trigger n’a été ajouté dans Supabase.
- Les mutations ont été testées sur PostgreSQL 14 local avec un schéma simplifié ; sur Supabase 17, seules les lectures et la planification SQL ont été vérifiées. L’intégration PostgreSQL est une commande locale séparée, pas encore un job du workflow GitHub.
- A03 reste partiel : création et rattachement d’une période sont encore deux requêtes HTTP. A10 reste partiel : les indicateurs d’enfants des anciens/nouveaux parents et les caches de chargement des relations demandent encore une synchronisation dédiée. Les fonctions mortes et le nom trompeur `getAllPeriods` restant seront traités dans A25.

Étape suivante de ce lot : A07 a été traité dans le lot 4 ci-dessous. A01 reste requis avant exposition publique.

### Lot 4 — Suppression explicite et protégée des périodes

Statut : terminé localement pour A07, de l’API au bouton du graphe.

Politique retenue :

- Refuser une période qui possède des sous-périodes ou figure dans une story. Les enfants doivent être déplacés et les liens de stories retirés explicitement avant de supprimer la période.
- Autoriser la suppression d’une feuille inutilisée et retirer seulement ses associations de catégories. Les catégories, les événements et les autres périodes sont conservés.
- Ne pas déléguer cette politique aux cascades de la base : l’inspection en lecture seule du schéma Supabase montre `ON DELETE SET NULL` pour les enfants et `ON DELETE CASCADE` pour les liens de catégories et de stories. Les deux premiers comportements pourraient respectivement détacher des enfants ou retirer des liens sans décision explicite.

Changements livrés :

- Ajout de `deleteUnusedPeriod` et de `DELETE /periods/:id`, jusque-là absent. Contrat : HTTP 200 `{ id, parent: { id, hasChildren } | null }` après COMMIT ; 404 si absent, 409 si encore utilisé, 503 si verrou indisponible ou deadlock. Erreur interne générique, sans SQL dans la réponse.
- Même transaction pour validation, suppression des associations, suppression de la période et calcul du véritable indicateur d’enfants du parent. Tout échec annule l’ensemble des changements.
- Verrou de table identique au déplacement, pris avant les lectures, puis verrou de ligne FOR UPDATE : les déplacements/insertions d’enfants et les nouveaux liens de stories ne peuvent pas contourner la vérification en arrivant simultanément. Attente limitée à cinq secondes.
- Le bouton Supprimer du formulaire du graphe est désormais branché. Confirmation avant la requête, annulation sans changement, message explicite en cas de refus, formulaire fermé seulement après succès de la suppression. Les actions Supprimer/Mettre à jour sont désactivées pendant la confirmation et la suppression ; un second clic ne lance pas une seconde confirmation dans ce gestionnaire.
- Après succès, le store retire la période et ses suggestions Wikidata locales, actualise le flag du parent à partir de la réponse serveur et invalide les caches enfants/story concernés. La sélection du graphe est tronquée au niveau supprimé et la timeline conserve les objets survivants ou revient au contexte parent.
- Des réponses commencées avant la suppression ne réinsèrent plus la période dans les chargements des racines, enfants et stories. Les réponses Wikidata tardives sont ignorées si leur parent a été supprimé. Cette protection ciblée ne clôt pas l’ensemble de A12.
- Documentation du contrat API dans `.agent/DATA-MODELS.md` et commande `yarn --cwd server test:deletion` ajoutées.

Vérifications :

- `yarn test --run` : **188 tests réussis dans 16 fichiers**, aucun test ignoré ou désactivé. Le lot ajoute 34 scénarios : 12 handlers backend, 18 comportements du service/store/navigation et 4 parcours de composants Vue avec le vrai formulaire et le vrai dialogue de confirmation. Les requêtes de ces tests UI sont remplacées au niveau du client API ; aucun navigateur ni service distant n’est sollicité par ces tests.
- Les parcours UI vérifient Graph → Edit → Supprimer → Annuler, refus HTTP 409 avec conservation du formulaire et de la ligne, succès avec fermeture/retrait et nettoyage des colonnes, ainsi que les boutons désactivés pendant la confirmation.
- **10 tests d’intégration PostgreSQL réussis** sur une instance locale temporaire PostgreSQL 14.18, avec les actions de clés étrangères reproduites depuis le schéma Supabase. Vérifiés : feuille avec catégories, parent avec frère restant, racine inutilisée, refus d’un parent, refus d’une période de story, absences et double suppression, rollback réel, rattachement de story avant/après verrou et déplacement simultané. Attentes réelles sur `pg_locks` observées pour les courses entre connexions. Instance arrêtée et fichiers temporaires supprimés.
- Tests d’intégration dans `server/test/periodDeletion.postgres.mjs`. Rejeu : créer une base locale neuve et vide nommée `universaltimeline_test_<nom>`, sur un socket Unix au port 55439 ; définir `TIMELINE_TEST_SOCKET` et `TIMELINE_TEST_DATABASE`, puis lancer `yarn --cwd server test:deletion`. Le script refuse une destination TCP et un nom de base ordinaire ; il crée et vide ses propres tables de test.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**.
- `yarn build` et `yarn --cwd server build` : réussis.
- Supabase PostgreSQL 17 : inspection des références/triggers et requête de dépendances exécutées en lecture seule ; EXPLAIN sans ANALYZE du DELETE accepté avec l’index primaire. Aucun DELETE exécuté, aucun verrou explicite de validation ni aucune mutation de test dans cette base.
- Contrôle HTTP en lecture seule : front `/graph` et `/timeline` = 200 ; `/health` = 200, database connected.
- `git diff --check` : réussi. Aucun push, aucune migration et aucune modification des données Supabase par ces vérifications.

Choix et limites :

- La politique s’applique aux suppressions via cette API. Le comportement des clés étrangères dans Supabase reste inchangé ; une suppression SQL directe conserve donc les cascades existantes. Les règles de [verrouillage](https://www.postgresql.org/docs/17/explicit-locking.html) et de [clés étrangères](https://www.postgresql.org/docs/17/ddl-constraints.html) ont été vérifiées dans la documentation PostgreSQL 17.
- Les intégrations de mutation utilisent PostgreSQL 14 et un schéma de test simplifié ; Supabase 17 n’a reçu que des lectures et de la planification SQL. Les commandes d’intégration PostgreSQL ne sont pas encore exécutées par le workflow GitHub.
- A10 reste partiel : les caches après déplacements et modifications des associations doivent encore être revus, ainsi que les promesses en cours. A12 reste ouvert pour les autres réponses obsolètes et le démontage. A16 reste ouvert pour la file globale des confirmations.
- La fermeture prématurée du formulaire lors d’une création/édition reste à corriger dans A11 ; la suppression de ce lot, elle, ferme le formulaire seulement après succès.
- A03 reste partiel pour la création suivie d’un rattachement et l’idempotence des retries ; A01 reste requis avant exposition publique.

Recette manuelle sans suppression attendue : dans le graphe, ouvrir Big Bang → Edit → Supprimer ; Annuler conserve tout. Refaire et Confirmer doit afficher un refus (neuf sous-périodes et un lien de story au moment de la vérification), sans changement après actualisation. Les suppressions réussies ont été vérifiées uniquement dans la base locale de test.

Étape suivante de ce lot : A21 a été traité pour les arbres de dépendances JavaScript dans le lot 5 ci-dessous. A23 (copies historiques) reste un lot mécanique séparé.

### Lot 5 — Dépendances utilisées, versions corrigées et outils vérifiés

Statut : terminé localement pour le nettoyage des déclarations inutilisées et les alertes de sécurité des deux arbres JavaScript. A21 reste partiel pour la validation Docker et les migrations de maintenance.

Changements livrés :

- Retrait de 17 déclarations inutilisées du manifeste front : `@prisma/client`, `@types/d3`, `@types/lodash-es`, `@types/pg`, `@types/uuid`, `@vueuse/core`, `cors`, `d3`, `express`, `lodash-es`, `pg`, `prisma`, `ts-node`, `@testing-library/vue`, `@types/cors`, `@types/express`, `@types/jest`. Les imports actifs, les tests, les copies historiques et les scripts ont été recherchés avant retrait ; la référence aux types Jest a été retirée de tsconfig. Le fichier de déclarations Jest historique reste pour A25.
- Les bibliothèques HTTP/PostgreSQL restent dans `server/`. Prisma et son client sont classés comme outils de développement de l’API, utilisés seulement par le script historique `update-dates`. La déclaration directe esbuild de l’API a été retirée : tsx gère sa propre dépendance de transformation.
- Versions corrigées verrouillées : Axios 1.21.0 dans les deux projets, Express 4.22.3 dans l’API, Vue 3.5.44, UUID 11.1.1, Vite 6.4.5 et plugin Vue 5.2.4. Les fichiers Yarn ont été régénérés pour sélectionner aussi les correctifs compatibles des dépendances indirectes.
- Vitest passe de 3.1.1 à 4.1.12, compatible avec Vite 6 et Node 22. Les 188 tests existants passent sans réécriture ou désactivation. `@vitest/ui` et `@vitest/coverage-v8` sont ajoutés exactement à la même version ; `@vue/compiler-dom` est déclaré explicitement pour le contrat de test Vue.
- `test:ui` utilise `--api.host 127.0.0.1 --no-open`. Les commandes UI et couverture disposent maintenant de leurs fournisseurs et fonctionnent. En environnement CI, `--watch` permet de maintenir temporairement l’UI ouverte pour vérifier sa page.
- Prisma/client restent verrouillés à 6.5.0 pour l’outil historique. La branche 6.19.3 introduit `deepmerge-ts <8`, signalée par [l’avis du mainteneur](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx), d’où le maintien de la version existante pour cet outil hors API. Sa réconciliation avec le vrai schéma Supabase reste dans A24 ; la maintenance n’a pas été exécutée.
- Node 22.23.1 déclaré dans `.nvmrc`, version minimum dans les deux manifestes, Yarn Classic 1.22.22 déclaré. Image Docker alignée sur `node:22.23.1-alpine`, dont le tag officiel a été vérifié. Node 20 est en fin de support selon le [calendrier officiel Node](https://nodejs.org/en/about/previous-releases).
- La CI préparée inclut maintenant `yarn audit` dans chaque projet, avec les dépendances de développement. La génération implicite Prisma est désactivée pendant son installation en CI ; aucun secret de base n’est nécessaire pour les tests/builds. Aucun workflow GitHub n’a été exécuté.
- README et documentation `.agent/`/CLAUDE alignés sur la stack réellement utilisée et les commandes verrouillées. Le schéma Prisma ancien est explicitement distingué du schéma Supabase de l’application.

Résultat des audits Yarn du 28 octobre 2026 (arbre complet, outils compris) :

| Projet / état | Critique | Élevée | Modérée | Faible | Dépendances comptées par Yarn |
|---|---:|---:|---:|---:|---:|
| Front avant | 5 | 82 | 82 | 17 | 567 |
| Front final | 0 | 0 | 0 | 0 | 285 |
| API avant | 2 | 15 | 28 | 5 | 241 |
| API finale | 0 | 0 | 0 | 0 | 184 |

Ces nombres représentent les occurrences remontées par Yarn sur les chemins de dépendances ; ils ne sont pas un nombre de failles uniques ni un audit de sécurité de toute l’application. Les deux audits finaux quittent avec le code 0. A01 (authentification et autorisations) reste requis avant exposition publique.

Vérifications :

- `yarn test --run` sous Vitest 4.1.12 : **188 tests réussis dans 16 fichiers**, aucun test ignoré ou désactivé. Les mêmes scénarios ont aussi réussi pendant les vérifications de couverture et d’UI.
- `yarn test:coverage` : réussi, rapport généré. Couverture mesurée sur les sources prises en compte : 52,28 % des instructions et 53,74 % des lignes ; cette mesure ne signifie pas que tous les parcours métier sont couverts. Le fournisseur v4 change son remappage ; ne pas comparer directement à d’anciennes mesures v3.
- `yarn test:ui --watch --api.port 51205 --api.strictPort` : interface HTTP 200 vérifiée sur 127.0.0.1 ; serveur de tests arrêté après le contrôle. Aucun test ne contacte Supabase.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**.
- `yarn build` et `yarn --cwd server build` : réussis. La migration des outils n’a pas nécessité de changement des composants.
- Réinstallations `--frozen-lockfile --non-interactive` des deux projets : réussies. L’installation initiale de l’API utilise `PRISMA_SKIP_POSTINSTALL_GENERATE=true`.
- Installation distincte `--production --frozen-lockfile` de l’API dans un dossier temporaire : seules ses dépendances d’exécution sont présentes ; Prisma, TypeScript, tsx et ts-node sont absents. Import des vraies routes compilées et de la configuration réussi, avec URL de validation fictive et certificat public, sans fichier .env ni connexion de base. Cela vérifie l’indépendance des bibliothèques du front et des outils de développement.
- `prisma validate` 6.5.0 : schéma historique syntaxiquement valide avec URL fictive, sans connexion ; cela ne prouve pas son adéquation à Supabase.
- Serveurs de développement redémarrés sur leurs ports habituels. GET `/timeline`, `/graph`, `/events`, `/database`, `/src/main.ts` et les endpoints de lecture : 200. API connectée à Supabase, trois racines, 76 événements, 11 stories, recherche d’un descendant toujours fonctionnelle.
- `git diff --check` : réussi. Aucun push, aucune migration et aucune écriture de test sur Supabase.

Limites et suites :

- Le daemon Docker local est arrêté : tag officiel vérifié et Dockerfile mis à jour, mais image non construite/exécutée. L’import en installation de production a été testé sur macOS/Node 22 ; Linux/Alpine reste à valider.
- La chaîne de dépendances installée est réduite ; le bundle JS de production augmente avec les mises à jour : 338,65 → 372,30 kB, gzip 113,52 → 124,67 kB. Aucun gain de poids du bundle n’est revendiqué ; les imports différés restent dans A14.
- `lucide-vue-next` est désormais marqué déprécié en faveur de `@lucide/vue`, et jsdom 26 utilise des encodeurs dépréciés. Aucun avis de sécurité n’est remonté pour ces versions dans l’arbre final. Leurs migrations feront l’objet d’un lot de maintenance distinct.
- Les audits sont une photographie du registre à cette date, limitée aux avis connus des paquets JS. Ils ne couvrent pas les paquets système de l’image Docker, le modèle d’accès de l’application ou les scripts SQL historiques.
- Les copies « 2 », composants isolés et anciens moteurs de dates restent dans A23/A24/A25.

Sources de compatibilité : [migration Vitest 4](https://v4.vitest.dev/guide/migration.html), [releases Axios](https://github.com/axios/axios/releases), [mises à jour Express](https://expressjs.com/en/advanced/security-updates/). Les versions et contraintes exactes ont été vérifiées dans le registre npm avant installation.

Étape suivante de ce lot : A10/A11 et une partie d’A12 ont été traités dans le lot 6 ci-dessous. A01 reste un préalable à toute exposition publique.

### Lot 6 — Chargements partagés, réponses obsolètes et formulaires conservés

Statut : terminé pour les ressources API partagées, les catégories et les flux d’interface décrits ci-dessous. A11/A12 restent partiels pour les autres recherches, imports et ouvertures asynchrones Wikidata. A03 reste partiel pour la transaction de création puis rattachement.

Changements livrés :

- A10 : cache commun de lectures avec une promesse par ressource en cours et un indicateur de succès indépendant de la longueur des tableaux. Racines, enfants par parent, événements, stories, périodes et détails de story, catégories : les chargements simultanés sont partagés et une réponse vide réussie est mémorisée. Une erreur n’est jamais mémorisée comme une liste vide ; la tentative suivante peut reprendre.
- A10/A12 : révisions par ressource et génération de réinitialisation. Une lecture antérieure à une mutation ne publie plus ses données ou son erreur ; elle rejoint la lecture actuelle ou recharge la ressource invalidée. Une lecture antérieure à resetData/clearCache est rejetée explicitement et ne peut ni repeupler le cache ni supprimer l’état de chargement d’une nouvelle requête.
- Les sauvegardes et déplacements invalident les racines, les deux parents concernés et les snapshots de stories. Un parent sans rapport conserve son cache d’enfants. Le chargement des enfants actualise le flag du parent ; les suggestions Wikidata locales sont ajoutées sans invalider les lectures de base. Les champs absents de la réponse peu enrichie « périodes de story » ne vident plus les catégories et flags connus.
- Les associations de périodes/événements invalident la story concernée et la liste avec ses bornes agrégées. Chaque mutation capture l’ID cible avant l’attente réseau ; changer de story ne modifie pas le panneau suivant. Les lots d’associations annoncent explicitement les succès partiels. Une panne de relecture reste visible et Réessayer recharge aussi la liste des stories.
- Retrait de la deuxième lecture des bornes de stories et de son helper client devenu inutile : GET /stories fournit déjà ces bornes. L’endpoint historique de l’API reste disponible.
- A11 : timeline, graphe, événements, stories et modales de sélection distinguent erreur, chargement et vide avec Réessayer. Une panne des enfants de l’API ne déclenche plus un fallback Wikidata comme si la base était vide. Une erreur de remontée des ancêtres du sélecteur est propagée.
- A12 : garde de sélection et de portée pour la navigation timeline, les détails de story, les suggestions du graphe, les chargements de sélecteurs et la validation Q-id du formulaire. Les réponses obsolètes sont ignorées après un changement de sélection ou le démontage ; les requêtes partagées peuvent continuer pour alimenter le store utilisé par les autres vues.
- A11 : EditModal émet la demande de sauvegarde et attend sa réussite côté parent pour fermer. Après refus API ou validation, le formulaire et ses champs sont conservés, l’erreur est affichée et une nouvelle tentative reste possible. Pendant l’écriture, sauvegarde, suppression, champs et fermeture par Annuler/Escape/fond sont bloqués ; les gestionnaires refusent les soumissions en double.
- Catégories : retrait de l’attente par polling et des catégories fictives retournées en panne. Le service utilise le client API commun et partage le chargement ; une panne est affichée dans le formulaire avec Réessayer. La sauvegarde attend une lecture réussie des vraies catégories et conserve le brouillon.
- A03, amélioration locale : dans le graphe, une période créée avant un échec de rattachement apparaît immédiatement dans le store. Le formulaire conserve son ID pour reprendre la tentative avec cette période et sa réponse serveur, sans deuxième POST. L’erreur distingue l’élément déjà enregistré de l’étape échouée.

Vérifications :

- `yarn test --run` : **228 tests réussis dans 20 fichiers**, soit 40 scénarios supplémentaires ; aucun test ignoré. Nouveaux fichiers : `sharedReads.test.ts`, `asyncNavigation.test.ts`, `saveAndLoadFlow.test.ts`, `categoryLoading.test.ts`. Fixture du parcours de suppression adaptée pour fournir réellement l’endpoint enfants appelé par le graphe.
- Couverture ciblée : déduplication et vide pour cinq ressources, catégories et détails, rafraîchissement forcé partagé, panne/reprise, deux parents indépendants, lectures obsolètes réussies ou échouées, reset pendant une lecture, invalidation des deux parents et snapshots ciblés, réponse partielle des périodes de story, détail et navigation dans l’ordre inverse, démontage, changement de story pendant écriture, succès partiel et reprise de la liste après panne.
- Les parcours montent les vrais composants pour vérifier : formulaire événement conservé après refus puis fermé au succès ; création de story conservée ; double soumission/fermeture bloquées pendant l’écriture ; erreurs réessayables des trois vues et des deux pickers ; échec de catégories ; création graphe puis rattachement échoué et repris avec le même ID. Client HTTP remplacé : aucune mutation de test dans Supabase.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**.
- `yarn build` et `yarn --cwd server build` : réussis.
- Navigateur local : timeline et détail de story chargés ; formulaires story et événement ouverts puis annulés sans sauvegarde ; filtre de périodes chargé avec les racines réelles ; vue événements chargée. Les pannes et mutations sont vérifiées par les tests avec réseau simulé.
- HTTP en lecture seule : `/timeline`, `/database`, `/graph`, `/events`, `/src/main.ts` = 200 ; `/health` = 200 avec database connected ; périodes, événements, stories et catégories = 200. Serveurs conservés sur 127.0.0.1:5173 et 127.0.0.1:3000.
- `git diff --check` : réussi. Aucun paquet modifié dans ce lot ; pas de migration, de push ni d’écriture de vérification dans Supabase.

Limites restantes :

- Le cache est celui de la session du navigateur ; aucune synchronisation temps réel entre plusieurs navigateurs n’est ajoutée. Les caches et imports des autres services Wikidata restent à auditer. L’ignorance des réponses obsolètes ne constitue pas une annulation de toutes les requêtes HTTP.
- A03 : création puis rattachement restent deux appels indépendants. L’ID de reprise est conservé pendant l’ouverture du formulaire ; fermer/recharger perd ce contexte. Ce mécanisme ne remplace pas une transaction métier unique ou l’idempotence serveur des écritures/réessais réseau.
- A11/A12 : la recherche/import Wikidata et les autres ouvertures asynchrones doivent encore être revus. A13 reste ouvert : le Select générique contient toujours le métier de sélection des périodes. A16/A18 (confirmations globales, focus et accessibilité complète des dialogues) ne sont pas clos par le blocage pendant sauvegarde.

Recette manuelle sur le serveur local, sans écriture attendue :

1. Événements → Modifier : remplacer le titre français par trois espaces, puis Mettre à jour. La validation doit afficher une erreur et garder le formulaire ouvert. Annuler ensuite. Ce refus est local au formulaire et n’enregistre rien.
2. Stories : sélectionner rapidement deux stories. Le titre et le contenu du panneau doivent correspondre à la dernière sélection ; réouvrir une story déjà consultée doit réutiliser son chargement.
3. Événements : ouvrir le filtre de périodes, descendre dans les sous-périodes puis revenir. Les listes doivent se charger normalement ; une absence réelle d’éléments ne doit pas rester affichée comme un chargement infini.
4. Pour les pannes réseau, doubles clics et reprises d’écriture, privilégier les scénarios automatisés ci-dessus : ils ne modifient aucune donnée existante.

Étape suivante de ce lot : A13 a été traité dans le lot 7 ci-dessous. A11/A12 sur Wikidata restent listés pour la suite ; A01 reste requis avant exposition publique.

### Lot 7 — Select générique et sélection métier des périodes

Statut : terminé localement pour A13 dans le code actif. Les copies historiques restent dans A23.

Changements livrés :

- `base/Select.vue` ne reçoit plus de mode métier. Il affiche les options fournies par son parent, gère la recherche, la sélection simple/multiple et les événements `update:modelValue` / `change`. Il fonctionne sans Pinia, services, types de période ou requêtes réseau. Son code passe de 722 à 237 lignes ; la logique de périodes est déplacée dans les composants dédiés, ce chiffre ne représente pas une réduction équivalente de toute la codebase.
- `components/PeriodSelect.vue` présente le filtre de périodes et gère son panneau et le focus. `usePeriodSelect` porte les niveaux, le tri, la recherche locale et les lectures via le store partagé du lot 6. Les listes vides, les erreurs avec Réessayer, les chargements partagés et les gardes contre les réponses obsolètes sont conservés. Fermer le panneau par clic extérieur ou Escape invalide aussi sa navigation en cours ; la lecture partagée reste utilisable par les autres consommateurs.
- `SelectShell` reste une enveloppe de présentation indépendante du métier, avec slots et fermeture. Les styles de listes/recherche sont mutualisés dans `select-options-shared.css`, en complément des styles de champ existants. Les styles propres à la navigation de périodes sont dans `components/period-select.css` ; Select ne charge plus la feuille métier historique.
- Migration des appels actifs dans Événements et Design system. Le filtre de catégories et les catégories des formulaires restent des Select génériques. Le Design system présente les deux composants, et son ancien préchargement silencieux des racines est retiré : ses contrôles de périodes chargent à l’ouverture.
- Types et helper de sélection plate déplacés dans `lib/selectOptions.ts`, sans dépendance aux dates ou aux périodes. Un réexport de compatibilité reste dans l’ancien helper pour `Select 2.vue`, qui est encore compilé mais n’est pas importé par l’application. Cette implémentation n’est pas dupliquée.
- Vérifications ciblées du clavier : les options désactivées sont ignorées par la navigation clavier et refusées à la sélection ; les tags d’un contrôle désactivé ne peuvent pas être supprimés. La recherche accepte les espaces ; les touches des boutons de retrait ne déclenchent plus l’ouverture du champ parent. IDs, labels et relations de panneau sont explicites. Choisir une période et ouvrir ses enfants sont deux boutons distincts, sans bouton imbriqué.
- Pendant une sauvegarde de formulaire, les Select de catégories reçoivent explicitement `disabled` : le fieldset HTML seul ne bloque pas un déclencheur personnalisé. La régression est vérifiée dans le test existant de sauvegarde en cours.
- Documentation des composants, architecture, règles de contribution et aperçu README actualisés.

Vérifications :

- `yarn test --run` : **246 tests réussis dans 22 fichiers**, soit 18 scénarios supplémentaires dans `Select.test.ts` et `PeriodSelect.test.ts`, sans test ignoré. Les tests montent les vrais composants ; le client HTTP est simulé.
- Select : rendu/recherche sans fournisseur Pinia, valeurs numériques et chaînes distinctes, sélection multiple/retrait, options désactivées, espaces dans la recherche, fermeture Escape/clic extérieur, focus, mise à jour des props et désactivation pendant ouverture.
- PeriodSelect : chargement à l’ouverture, tri/formatage/recherche locale, navigation aller/retour, sélection/désélection et Toutes les périodes, réouverture d’une période imbriquée, partage du cache, échecs des racines/enfants et reprise, niveau vide, fermeture pendant requête, ordre inverse après réouverture et démontage.
- Intégration Événements : le cumul des filtres période et catégorie reste effectif ; Toutes les périodes retire seulement la contrainte temporelle. Intégration Design system : les listes génériques ne déclenchent pas de lecture métier, les deux variantes de PeriodSelect partagent la lecture des racines.
- `yarn build` : réussi, vérification TypeScript et bundle Vite. L’API n’est pas modifiée par ce lot ; son build n’a pas été rejoué.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**, sans connexion de base.
- Navigateur réel, en lecture seule : filtre de périodes dans Événements, affichage des racines puis sous-périodes de Big Bang ; Design system, sélection multiple A+B et ouverture de la variante compacte de PeriodSelect. Présentation inspectée visuellement. Onglet de contrôle fermé, onglet utilisateur conservé.
- HTTP : `/events`, `/design-system`, `/timeline`, `/graph`, `/database` et les deux modules de sélecteurs = 200 ; `/health` = 200, database connected. Serveurs de développement conservés sur 127.0.0.1:5173 et 127.0.0.1:3000.
- `git diff --check` : réussi. Aucun paquet, schéma ou paramètre de connexion modifié ; aucune écriture de vérification dans Supabase, aucun push.

Limites et suites :

- Les copies `* 2.*` sont conservées telles quelles pour A23 ; `base/select-period-toolbar.css` n’est plus chargé par le code actif et reste nécessaire à la copie historique. Le réexport de compatibilité pourra être retiré dans ce nettoyage.
- Ce lot clôt la séparation A13, pas l’ensemble A18 : le parcours complet de focus, les annonces et les dialogues restent à auditer. Les imports/recherches Wikidata A11/A12 restent ouverts.
- `App.vue` continue de monter la timeline masquée au moyen de v-show, y compris sur d’autres vues. Le retrait du préchargement propre au Design system ne supprime pas ces lectures de la timeline ; cette séparation appartient à A14.

Recette manuelle, sans enregistrer de données :

1. Dans Événements, ouvrir le filtre de périodes ; utiliser le chevron pour descendre, le bouton portant le nom du parent pour remonter. Cliquer sur une période applique le filtre ; rouvrir doit afficher son niveau. Toutes les périodes le retire.
2. Ajouter un filtre de catégorie : les deux contraintes doivent se cumuler. Toutes les périodes doit conserver la catégorie sélectionnée.
3. Design system → Select : tester les listes simple et multiple, la recherche avec des espaces, le retrait d’un tag et les deux variantes du sélecteur de périodes. Escape ferme le panneau.

Étape suivante de ce lot : A14 a été traité dans le lot 8 ci-dessous. A01 reste requis avant exposition publique.

### Lot 8 — Routes réelles et conservation ciblée de la timeline

Finalisé le 29 octobre 2026.

Statut : terminé localement pour A14. Travail poursuivi dans le même dépôt que les lots 1 à 7, conformément au choix utilisateur : `Documents/Codex/2026-10-28/referenced-chatgpt-conversation-this-is-an/UniversalTimeline`. La copie Desktop/Developpement/web-chronologie-univers-2 n’a reçu aucun changement de source.

Changements livrés :

- `App.vue` affiche RouterView ; retrait des imports statiques de pages, du switch des URL et du composant factice `AppRouteShell`. Les routes réelles et leurs imports différés sont dans `router/routes.ts`, la création du routeur dans `router/index.ts`.
- Les onglets et leur type sont dans `router/navigation.ts`. `useAppNavigation` dérive la sélection de la route effectivement résolue : aucun changement optimiste d’onglet pendant un téléchargement. Les chemins historiques sont conservés, dont `/graph` pour Periods ; la valeur interne Design system devient `design-system`.
- KeepAlive conserve uniquement HomeView, explicitement nommée. Sa clé par nom de route conserve la période courante, la pile de navigation et les lectures en cours entre onglets, y compris lors de changements de query/hash. Les autres vues sont démontées à la sortie. Une entrée directe sur une autre page ne monte plus la timeline et ne lance plus ses lectures.
- Chargement de page annoncé, erreur visible avec Réessayer ; page précédente conservée si un téléchargement échoue. Erreurs tardives de navigations abandonnées ignorées. Deux navigations vers la même URL ne confondent pas leurs états de chargement. Les gardes sont désinscrites à la destruction du shell.
- `/` redirige toujours vers `/timeline`. Ajout d’une page introuvable avec lien de retour ; aucun onglet actif sur une route inconnue. Toasts et confirmations globaux conservés pour le futur lot A16.
- Documentation de navigation, architecture, composants, conventions, CLAUDE et README actualisée.

Vérifications :

- `yarn test --run` : **260 tests réussis dans 23 fichiers**, sans test ignoré. Les 14 scénarios supplémentaires montent App, le vrai Header et HomeView avec son composable/store ; les autres pages et les lectures HTTP sont simulées. La géométrie de la grille est remplacée dans ces tests, puis vérifiée séparément dans le navigateur réel.
- Scénarios : accès directs, racine et page inconnue, instance/période/pile timeline conservées, query/hash, navigation navigateur précédent/suivant, démontage des autres vues, chargement différé, échec et reprise initiale ou après navigation, requête de données achevée pendant le cache et mise à jour du store, réponses abandonnées et double navigation vers la même URL.
- `yarn build --manifest` : **réussi**, vérification TypeScript et bundle Vite. Le manifeste contient six entrées de vues différées et aucune importation statique de ces vues depuis l’entrée principale. JS d’entrée : 214,26 kB, gzip 81,16 kB ; des fichiers partagés et propres aux pages s’y ajoutent, ce chiffre n’est pas le poids total de l’application.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**, sans connexion de base. API et dépendances inchangées par ce lot ; build API non rejoué.
- Navigateur réel, en lecture seule : accès direct Events, Timeline → Système solaire (affichage Système solaire/Terre) → Stories → Timeline ; même niveau retrouvé avec les onglets et Précédent/Suivant. Lien inconnu : page introuvable et retour vers la timeline fonctionnels. Onglet de contrôle fermé, onglet utilisateur conservé.
- HTTP : `/timeline`, `/database`, `/graph`, `/events`, `/design-system` et `/unknown-page` renvoient le document front avec HTTP 200 ; ce dernier affiche la page introuvable côté client. `/health` = 200, database connected. Front et API conservés sur 127.0.0.1:5173 et 127.0.0.1:3000.
- `git diff --check` : réussi. Copies `* 2.*` inchangées. Aucun paquet, schéma ou paramètre de connexion modifié ; aucune écriture de vérification dans Supabase, aucun push.

Limites et suites :

- La conservation de la timeline est en mémoire, comme l’ancien montage permanent ; un rechargement complet redémarre sa navigation. L’URL n’encode pas la période choisie. Le cache n’est pas étendu aux formulaires des autres pages.
- Le déploiement devra servir index.html pour les URL directes de l’historique HTML5 ; aucune configuration d’hébergement distant n’est modifiée ici.
- A11/A12 sur les recherches et imports Wikidata, A15 sur les DTO et A16 sur les services UI restent ouverts. A01 reste requis avant exposition publique.

Recette manuelle, sans enregistrer de données :

1. Ouvrir http://127.0.0.1:5173/timeline, entrer dans une période comportant des enfants et retenir son niveau.
2. Ouvrir Stories ou Events, puis revenir à Timeline : retrouver le même niveau. Le retour vers la période parente doit encore fonctionner.
3. Utiliser Précédent/Suivant du navigateur : page et onglet actif doivent suivre, et la timeline doit conserver son niveau.
4. Ouvrir directement `/events` ou `/graph` dans un autre onglet. Une URL inconnue affiche Page introuvable, avec un lien de retour.

Références de mise en œuvre : [Vue Router — imports différés](https://router.vuejs.org/guide/advanced/lazy-loading), [Vue — KeepAlive](https://vuejs.org/guide/built-ins/keep-alive).

Prochain lot proposé : poursuivre A11/A12 sur les recherches et imports Wikidata, avec gestion visible des échecs et protection contre les réponses obsolètes.

### Consolidation du 29 octobre 2026 — répertoire projet unique

Statut : terminé localement. La référence de travail devient `/Users/florianbutour/Desktop/Developpement/web-chronologie-univers-2`. Tous les prochains lots, tests et serveurs doivent utiliser ce répertoire. L’ancienne copie Documents/Codex est conservée comme sauvegarde et ses serveurs sont arrêtés.

Intégration effectuée :

- Deux états de code et configurations locales sauvegardés sous `.tmp/consolidation-20261029/backup/source` et `backup/target`, avec commit de base et patchs Git. Ce dossier est ignoré par Git ; les fichiers de connexion sont protégés en lecture/écriture pour leur propriétaire.
- Fusion à partir du commit commun `25ef9b3` : changements des lots 1 à 8 ajoutés au projet Desktop, changements propres à Desktop conservés. Les 47 fichiers modifiés des deux côtés ont été rapprochés ; 30 nécessitaient une résolution manuelle. Aucun fichier propre à l’une des versions n’a été perdu.
- RouterView, pages différées et KeepAlive conservés. `/periods` reste l’URL du finder avec alias `/graph` et nom de route interne `graph`. La recherche, les filtres et les champs du sous-header Desktop sont conservés.
- Navigation timeline réunie : breadcrumb, passage entre stories, restauration du niveau de périodes, périmètre de périodes et événements de la story courante, cache partagé, reprise des erreurs et protection contre les réponses tardives. Les suggestions téléportées sont fermées lorsque la timeline entre dans le cache, pour ne pas recouvrir les autres pages.
- Séparation Select/PeriodSelect conservée ; recherche de parent dans toute la base et exclusion de la période courante portées dans PeriodSelect. Le choix du parent, le préremplissage Wikidata, la reprise du formulaire finder sans double création et le statut de sauvegarde restent compatibles.
- Stories liées, ancres et retrait d’un sous-arbre de périodes conservés. Les nouvelles relations utilisent les mêmes règles de cible capturée et d’invalidation du cache que les associations des lots ; changer de sélection pendant une écriture ne remplace pas le détail d’une autre story.
- Nettoyage Desktop conservé : aucune des 69 copies historiques n’est réintroduite. Les anciens composants isolés restent retirés, WikidataImportButton reste remplacé par le composable de la modale. Le test historiquement vide mais réécrit au lot 2 est conservé et adapté au clic des feuilles servant aux suggestions de stories.
- Iconify reste la bibliothèque d’icônes du projet. Outils de démarrage conservés, verrouillés sur PM2 7.1.1 et concurrently 10.0.6 ; lockfile des lots utilisé comme base pour éviter de réintroduire les dépendances obsolètes de l’ancien projet. Les scripts de tests exécutent une passe.
- `server/.env` transféré localement, ignoré par Git ; connexion Supabase et TLS vérifié conservés. Aucun identifiant affiché. API et Vite démarrés sous PM2 depuis le projet Desktop, sur 127.0.0.1:3000 et 127.0.0.1:5173. Aucun déploiement ni changement de schéma distant.
- CLAUDE, README et documentation agent mis à jour avec ce répertoire unique et les contrats effectivement réunis.

Vérifications dans le répertoire projet :

- `yarn test` : **278 tests réussis dans 27 fichiers**. Les tests des deux versions restent présents ; six scénarios de consolidation ajoutés : recherche distante de parent, fermeture pendant recherche, relation de story pendant changement de sélection, rafraîchissement des ancres, chargements de stories dans l’ordre inverse et fermeture du panneau téléporté en cache.
- `yarn build --manifest` : **réussi**, TypeScript et bundle front. Les six pages restent chargées à la demande.
- `yarn --cwd server build` : **réussi**.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**, sans connexion de base.
- Tests réels PostgreSQL : **8 tests de hiérarchie + 10 tests de suppression réussis**, dans deux bases vides temporaires sur socket Unix. Instance sans écoute TCP, arrêtée et supprimée après les tests ; aucune mutation de vérification dans Supabase.
- Installations figées front/API : **réussies**. `yarn audit` et `yarn --cwd server audit` : **aucune vulnérabilité signalée** dans les arbres installés lors du contrôle final. Le premier rapprochement brut de lockfiles réintroduisait des versions obsolètes ; cette tentative a été remplacée et ses résultats ne décrivent pas l’état livré.
- HTTP : timeline, stories, periods, graph, events et design-system = 200 ; santé API = 200, database connected. Lectures périodes, événements, stories, détail/périodes/événements de la story 1 et recherche de parent = 200 avec JSON valide. Les dossiers des deux processus correspondent au projet Desktop.
- Navigateur réel, sans enregistrement : timeline → Système solaire → Stories → Timeline, niveau préservé ; breadcrumb affiché. Finder `/periods`, ouverture de création et recherche de parent dans tout le catalogue vérifiées. Onglet de contrôle fermé, onglet utilisateur conservé.
- `git diff --check` : réussi. Aucun marqueur de conflit restant, aucun commit ou push, aucune migration distante exécutée.

La suite de l’audit reprend dans ce dossier à partir des statuts en tête de fichier. Les limites historiques restent ouvertes : A01 avant exposition publique, transactions encore partielles, autres recherches/imports Wikidata, DTO, services UI et maintenance Prisma/SQL.

### Lot 9 — Recherches et imports Wikidata fiables

Statut : terminé localement pour la recherche globale et le formulaire Wikidata. A11/A12 restent partiels pour les autres recherches et ouvertures asynchrones du finder. Travail effectué uniquement dans Desktop/Developpement/web-chronologie-univers-2.

Nettoyage demandé avant le lot :

- Comparaison des 322 fichiers de code/configuration de l’ancienne copie avec la sauvegarde de consolidation : identiques. Configuration locale du projet présente ; aucun serveur n’utilise l’ancienne copie.
- L’ancienne copie `Documents/Codex/2026-10-28/referenced-chatgpt-conversation-this-is-an/UniversalTimeline` est placée dans la Corbeille macOS, sans vidage ni suppression définitive. Son dossier d’origine est absent et la copie dans la Corbeille contient encore son dépôt Git. Les sauvegardes du projet restent sous `.tmp/consolidation-20261029/backup/` ; la position exacte choisie par macOS est enregistrée dans `.tmp/lot9/legacy-trash-location.txt`.

Changements livrés :

- `useDebouncedSearch` mutualise attente de saisie, états résultats/chargement/erreur, reprise, délai maximal et annulation. Changer de recherche, fermer son contexte ou démonter la vue invalide les résultats et erreurs tardifs. Un signal annule les requêtes HTTP concernées ; le garde reste effectif si une source ignore cette annulation. Un délai de recherche dépassé devient une erreur réessayable.
- Recherche globale : les résultats locaux restent visibles quand Wikidata échoue et inversement. L’état vide apparaît seulement lorsque les deux recherches ont réussi sans résultat. Chaque source possède son bouton Réessayer. Les réponses obsolètes ne remplacent plus une nouvelle saisie ; les doublons Wikidata sont recalculés même si la réponse locale arrive après eux. Délais et tâches différées sont nettoyés à la fermeture/démontage ; les boutons du panneau conservent le focus du contexte de recherche.
- Le filtrage des événements parcourt maintenant les ancêtres P279 avec une pile et un ensemble de nœuds visités. Un cycle de classes ne provoque plus de dépassement de pile ; deux scénarios vérifient un cycle avec ou sans racine événement accessible. Les lectures d’ancêtres s’arrêtent aux racines sémantiques déjà utilisées pour la classification, afin de ne pas charger leur hiérarchie plus générale ; un scénario vérifie cette limite. Ce défaut a été détecté pendant la vérification dans le navigateur réel.
- `SearchApiService` propage les erreurs réseau, HTTP, JSON/API Wikidata et les échecs de lecture des détails/classes. Ces cas ne renvoient plus une liste vide ou une sélection d’événements dépourvue du filtrage sémantique demandé. Le signal d’annulation suit les lectures successives. Un résultat vide valide reste une liste vide.
- Logique Wikidata du formulaire extraite dans `useWikidataForm`. EditModal conserve la présentation et le positionnement du panneau. Les échecs de recherche et d’import s’affichent dans la fenêtre avec reprise. Une modification manuelle du brouillon, un autre Q-id, un changement de données/type/mode, la fermeture ou le démontage empêchent l’ancien import et sa résolution de parent de modifier le formulaire.
- Application du préremplissage après la fin de la lecture principale et des enrichissements pertinents. En cas d’échec, Q-id et saisies précédents sont conservés. La sauvegarde et la suppression sont bloquées tant que l’import est en cours ; la fermeture reste possible et invalide ce travail. La modification manuelle d’un champ abandonne l’application de l’ancien import.
- `useWikidataImport` garde l’état de chargement sur tout le pipeline et propage l’erreur principale. Échecs facultatifs de catégories/P361 signalés dans un message ; les données principales restent utilisables et les choix manuels sont conservés. Échec de résolution du parent dans le catalogue : message visible et parent choisi conservé. Le Q-id est validé avant lecture. Un compte d’enfants égal à zéro réinitialise maintenant l’ancien compte affiché.

Vérifications :

- `yarn test` : **312 tests réussis dans 31 fichiers**, sans test ignoré ; les 278 tests de la consolidation passent encore. **34 scénarios supplémentaires** dans `wikidataForm.test.ts`, `wikidataSearch.test.ts`, `GlobalSearch.test.ts` et `wikidataModal.test.ts`. Réseau et données simulés, aucune écriture distante.
- Couverture : HTTP/API/réseau/JSON en erreur, vide valide, détails/classification indisponibles, cycles de classes, propagation du signal ; ordre inverse, déduplication indépendante de l’ordre, effacement, démontage, dépassement du délai et reprise ; import principal/facultatif, chargement complet, parent tardif, édition manuelle, fermeture, remplacement du brouillon, abandon de sa cible de reprise et reprise. Les tests de la vraie modale vérifient le message, les champs conservés, le blocage de sauvegarde, l’annulation et le panneau de recherche.
- `yarn build` : **réussi**, TypeScript et bundle front. API, dépendances et schéma inchangés par ce lot ; build API et tests de mutations PostgreSQL non rejoués.
- `node --experimental-strip-types --test server/test/database.test.mjs` : **4 tests réussis**, sans connexion de base.
- Navigateur réel : ajout d’événement ouvert sans enregistrement ; recherche « Révolution française », indicateur de chargement puis délai dépassé visible et reprise fonctionnelle. La lenteur du service externe n’a pas permis de valider un import complet en direct ; les succès et échecs d’import sont couverts par les tests simulés. Import direct par Q-id lancé puis annulé sans sauvegarde ; une nouvelle modale s’ouvre vierge. Recherche globale de contrôle dans Timeline : états séparés de chargement et conservation des résultats locaux vérifiés. Formulaire de contrôle fermé sans sauvegarde, onglet temporaire fermé.
- HTTP local et connexion : front accessible, API saine ; serveurs PM2 conservés dans le répertoire projet. `git diff --check` réussi. Aucun commit/push, aucune mutation de vérification dans Supabase.

Recette manuelle :

1. Timeline → recherche de l’en-tête : saisir rapidement deux recherches différentes. Seuls les résultats de la dernière doivent rester ; effacer le champ doit fermer et vider le panneau.
2. Événements → Ajouter un événement → recherche Wikidata : observer chargement, résultats ou erreur avec Réessayer. Une panne ne doit pas s’afficher comme Aucun résultat.
3. Dans un formulaire comportant un Q-id, utiliser Remplir avec Wikidata. Si l’import échoue, le brouillon est conservé et Réessayer est disponible. Fermer la fenêtre ou modifier un champ pendant la lecture empêche l’ancien résultat de remplacer la saisie. Ne pas enregistrer pour ce contrôle.

Limites et suite :

- Les requêtes SPARQL partagées ne sont pas interrompues par la fermeture d’un formulaire : leur résultat est ignoré par le consommateur abandonné. Le cache Wikidata A10 reste à revoir.
- Les recherches du finder, ses ouvertures de modales et certaines suggestions de timeline restent dans A11/A12 ; ce lot ne clôt pas ces audits entiers. A01, A15 et A16 restent ouverts.
- Référence de cycle de vie : [Vue — nettoyage des effets des watchers](https://vuejs.org/guide/essentials/watchers.html#side-effect-cleanup).

Prochain lot proposé : finir les gardes et messages des recherches/ouvertures du finder, avant de poursuivre les services UI globaux A16.

### Lot 10 — Recherche, chemins et formulaires du catalogue de périodes

Statut : terminé localement pour le finder principal `/periods` (alias `/graph`). A11/A12 restent partiels pour les recherches du panneau de story et d’autres suggestions. Travail effectué dans le répertoire projet Desktop, sans nouvelle copie de travail.

Changements livrés :

- Recherche du finder migrée sur `useDebouncedSearch`, enrichi d’un critère réactif pour la catégorie. Saisie, catégorie, effacement et démontage invalident l’ancienne requête et son signal HTTP ; une réponse ou une erreur tardive ne remplace plus les résultats récents. Délai maximal et reprise réutilisent le mécanisme du lot 9.
- `FilterBar` reste un composant de présentation. Il reçoit chargement/erreur et émet Réessayer ; Aucun résultat apparaît seulement après une recherche terminée sans résultat. Échap ferme le panneau, les délais de perte de focus sont nettoyés et le bouton Créer d’une suggestion Wikidata ferme le panneau sans déclencher aussi la sélection de sa ligne.
- Navigation des résultats extraite dans `useFinderNavigation`. Le chemin et les colonnes des ancêtres sont lus avant de remplacer la sélection. Une erreur laisse le parcours existant visible, avec Réessayer et Annuler. Nouvelle sélection/recherche/catégorie, ajout, édition, début de déplacement ou démontage abandonnent l’ancien chemin. Les lectures partagées du store peuvent finir et alimenter le cache ; elles ne poursuivent plus une navigation abandonnée.
- `buildPeriodIdAncestorChain` refuse cycles, ancêtres introuvables et chemins dépassant la limite de protection. La profondeur de protection passe de 12 à 100 ; un chemin de plus de douze niveaux est testé. Un chemin incomplet ne devient plus une fausse racine. Le panneau de story propage désormais les échecs de lecture et les signale ; sa recherche et son cycle de navigation restent à migrer complètement.
- Ouverture d’édition : lecture du détail canonique via l’API, état de chargement annulable, erreur visible et reprise. Seule la dernière demande peut ouvrir le formulaire ; ajout, navigation, fermeture ou démontage invalident les anciennes réponses et erreurs. Les mécanismes existants de sauvegarde/suppression restent couverts par les tests.
- Création depuis une ligne Wikidata : le brouillon et le parent sont capturés immédiatement depuis la ligne déjà chargée. La requête supplémentaire de racines est supprimée. La branche de création depuis la recherche locale est retirée : cette recherche ne retourne que des périodes déjà enregistrées. Le bouton Add des lignes Wikidata dans les colonnes reste disponible.
- Nettoyage des anciens délais/recherches dupliqués, du wrapper de chargement qui masquait les erreurs et des imports devenus inutiles.

Vérifications :

- `yarn test` : **336 tests réussis dans 33 fichiers**, sans test ignoré. **24 nouveaux scénarios** dans `finderFlow.test.ts` et `periodAncestorChain.test.ts` ; le test de suppression utilise désormais aussi la vraie lecture de détail attendue.
- Couverture : panne/reprise de recherche, catégorie et signal, réponse obsolète, effacement/démontage ; panne d’ancêtre/colonne, reprise complète, ordre inverse, annulation pendant une lecture partagée, nouvelle saisie/sélection/ajout ; édition concurrente, détail canonique, panne/reprise, abandon ; brouillon Wikidata avec parent capturé ; chemin profond, manquant, cyclique ou abandonné. API et données simulées pour tous ces scénarios.
- `yarn build` : **réussi**, vérification TypeScript et bundle front. Backend, schéma et dépendances inchangés ; pas de nouveau test de mutation SQL nécessaire pour ce périmètre.
- Navigateur réel : recherche Terre avec indicateur de chargement, ouverture du chemin **Voie Lactée → Système solaire → Terre**, quatre colonnes et enfants de Terre affichés. Édition de Terre : titres, descriptions, dates, catégorie et parent Système solaire présents ; fermeture par Annuler, sans enregistrement. Onglet temporaire fermé, onglet utilisateur conservé.
- HTTP local : `/periods` = 200 ; API `/health` = 200 et connexion de base opérationnelle. Serveurs conservés dans le répertoire projet. `git diff --check` réussi. Aucun commit/push ni mutation de vérification dans Supabase.

Recette manuelle :

1. Ouvrir Periods, chercher Terre et cliquer le résultat : le chemin complet doit apparaître, puis les enfants de Terre.
2. Saisir rapidement plusieurs recherches et changer de catégorie : seuls les résultats correspondant à la dernière saisie/catégorie doivent apparaître. Effacer le champ ferme le panneau.
3. Ouvrir Edit sur Terre, contrôler les champs et le parent, puis Annuler. Sur une connexion lente, Annuler pendant Chargement du formulaire empêche toute ouverture tardive ; Ajouter une période doit également abandonner l’ancienne édition.
4. Si une recherche ou une lecture échoue, utiliser Réessayer. Une panne ne doit pas s’afficher comme une liste vide et un chemin en échec doit conserver la sélection précédente.

Limites et suite :

- A11/A12 restent partiels pour les recherches et changements de contexte du panneau de story et les suggestions de timeline ; le seul ajout dans le panneau de story est le signalement des échecs du helper partagé.
- A18 reste ouvert : les annonces d’état et Échap ajoutés ici ne constituent pas un audit complet du clavier, des rôles et du focus.
- Constat conservé pour A11/A15 : le compteur de sous-périodes du formulaire affiche encore zéro avant import Wikidata même lorsqu’il existe des enfants en base ; il ne doit pas être utilisé pour décider d’une suppression. L’API valide la suppression indépendamment de ce compteur.
- Prochain lot proposé : services UI globaux A16 (notifications et confirmations), puis reprise ciblée des recherches du panneau de story.

### Lot 11 — Services UI et file de confirmations

Statut : terminé localement (A16). Un seul `UiFeedbackHost` dans App ; `useUiStore` porte notifications et confirmations. `useToast` et `useConfirm` remplacent tous les appels runtime aux globals Window ; déclarations obsolètes et Toast isolé du finder supprimés. Démonstrations du design system et tests migrés.

- Les confirmations simultanées sont affichées dans l’ordre et chaque promesse reçoit sa propre réponse. Les réponses doubles/tardives ne confirment pas la demande suivante. Annulation d’un consommateur actif ou en attente, fermeture du host et destruction du store résolvent les demandes concernées par false.
- La fermeture d’une vue annule sa confirmation. Même si elle suit immédiatement l’acceptation, aucune suppression n’est lancée depuis ce consommateur fermé.
- Le dialogue possède un titre/description accessibles, focus initial sur Annuler, boucle Tab, retour de focus et Échap limité à la confirmation supérieure. Le reste d’A18 demeure à traiter.
- Notifications : état unique, durée propre au dernier message, message persistant explicite, annonce status/alert et timers nettoyés à la fermeture/destruction.

Vérification : **344 tests dans 34 fichiers réussis** (8 nouveaux scénarios), build front et `git diff --check` réussis. Les tests existants de suppression exercent la vraie file et le dialogue ; API simulée, aucune suppression sur les données réelles. Backend et dépendances inchangés. Contrôle navigateur groupé prévu après les lots suivants.

Suite : recherches et navigation du panneau de story (A11/A12).

### Lot 12 — Recherches de stories et suggestions de timeline

Statut : terminé localement sur les parcours audités de recherche/navigation de story et suggestions d’événements. A12 corrigé dans ces parcours ; A11 reste partiel pour les autres états et le compteur de sous-périodes.

- `useStoryPeriodFinder` extrait la navigation du panneau de story : frontière story/catalogue, chemin, sélection, chargement, erreur, reprise et annulation. Les lectures complètes précèdent l’application du parcours. Changement de story, d’onglet, de requête/catégorie, annulation, démontage ou nouvelle destination invalident les anciennes lectures. Les sélections/pickers sont réinitialisés lors d’un changement de story.
- Lecture des chemins mutualisée avec le catalogue principal via `usePeriodPath`. Les lectures partagées continuent à remplir le cache ; un consommateur abandonné ne publie plus son chemin. Aucune écriture de données ajoutée.
- Recherches périodes ET événements migrées sur `useDebouncedSearch`, avec erreurs/chargement/reprise dans FilterBar, signal HTTP, catégorie et contexte de story/onglet. Le filtre de catégorie est maintenant transmis aussi à la recherche d’événements.
- Catalogue externe accessible même depuis une story encore sans période. Activation de Hors story en erreur : message réessayable et état précédent conservé, sans faux résultat vide. Les clics de timeline, lignes finder et recherches passent par la même logique de navigation.
- Suggestions de stories d’événements sur la timeline : erreur visible avec reprise, chargement et vide valide distincts. Changement d’événement/story/période, retrait de l’événement, démontage ou entrée dans KeepAlive annulent la lecture. Les anciennes suggestions ne réapparaissent pas au retour. Signal transmis par StoryApiService.
- Mappers de résultats partiels mutualisés dans `searchHitEntities` et réutilisés par finder, panneau de story et PeriodSelect. Suppression des anciens délais, recherches et watchers asynchrones redondants du panneau.

Vérification : **365 tests dans 36 fichiers réussis** (21 nouveaux scénarios), build front et `git diff --check` réussis. Tests de composants réels pour les recherches/panneaux et ceux existants du finder conservés ; données/réseau simulés, aucune mutation distante. Contrôle navigateur groupé prévu après les lots suivants.

Suite : dialogues/clavier (A18) et breakpoints (A19), puis nettoyage A25.

### Lot 13 — Dialogues, clavier et petites largeurs

Statut : terminé sur les composants et gabarits ciblés. A18 reste partiel ; A19 corrigé pour les règles invalides et gabarits principaux.

- `useDialog` mutualise focus initial, boucle Tab, retour de focus, isolation du fond par inert et gestion de la fenêtre supérieure. Les fenêtres imbriquées ne ferment plus leur parent sur Échap. Une fenêtre occupée bloque sa fermeture, sans perdre le focus. L’état inert antérieur est restauré ; un contrôle en cours de retrait n’est pas choisi lors du retour de focus.
- ModalShell et ConfirmModal ont des rôles/titres/description accessibles. Les panneaux Wikidata téléportés déclarent leur dialogue propriétaire et restent dans son parcours clavier. Échap ferme d’abord le panneau ou le sélecteur ouvert, puis la fenêtre. Les annonces de notification sont rendues séparément du fond rendu inactif.
- Input lie erreurs et aide au champ (y compris textarea), SearchInput nomme la recherche et son bouton Effacer. Sélection du finder via un bouton natif séparé des actions ; cartes de timeline utilisables au clavier, événements via bouton natif ; flèches/Home/End sur les groupes Tabs en évitant les éléments désactivés.
- Remplacement des cinq règles media contenant var(--breakpoint-…) par leurs seuils CSS effectifs (640/768/1024 px). En-tête/filtres réorganisés aux petites largeurs, grille stories empilée, formulaires sur une colonne et dialogues de confirmation contenus dans le viewport. Les longs formulaires défilent avec l’overlay, sans recouvrir leur pied.

Vérification : **373 tests dans 37 fichiers réussis** (8 nouveaux scénarios), build front et contrôle d’espaces réussis. Navigateur réel dans un cadre de **390 px** : catalogue et navigation lisibles, création de période sur une colonne, Maj+Tab du premier champ à Annuler avec défilement vers le pied, puis fermeture sans enregistrement et retour du focus au bouton d’ouverture. Pas de mutation distante. Les autres largeurs et un audit complet avec lecteur d’écran restent à étendre.

Suite : nettoyage contrôlé du code mort et des doubles responsabilités (A24/A25).

### Lot 14 — Code mort et validation des Q-id

Statut : terminé pour les suppressions vérifiées. A24/A25 restent partiels pour les outils de maintenance et l’unification temporelle historique.

- Analyse des imports statiques/dynamiques depuis `src/main.ts` (scripts Vue compris), puis recherche manuelle des références. Retrait de **13 fichiers** : ancien arbre de périodes (3 composants et son formateur), DatabaseCard isolée, WikidataStoryService et barrel de services inutilisés, ancienne sortie geological.js, types graph/Jest inutilisés, helper d’import retiré, intention de clic triviale et ancien composable parent/enfant. Copies réversibles sous `.tmp/lot14/removed/` ; liste exacte dans `.tmp/lot14/removed-files.txt`.
- Les stratégies de remplacement/fusion de conflits et les anciens résolveurs automatiques, sans appel depuis l’application, sont supprimés. `ConflictResolutionService` est désormais uniquement un service de lecture et de détection ; aucune branche de suppression. Détection périodes/événements mutualisée, résultats typés.
- La validation du formulaire passe par `validateEntityQid`, avec le validateur commun de format et la même recherche autoritative que la sauvegarde. Une édition de l’entité elle-même n’affiche plus un faux conflit. Les gardes de validation couvrent aussi type, données, mode et fermeture, même lorsque le Q-id ne change pas.
- Chemin global local obsolète retiré au profit du helper de chemin complet ; helper Échap devenu inutile retiré ; paramètres locaux inutilisés nettoyés. Les anciennes conversions temporelles et leurs tests sont conservés explicitement comme compatibilité en attente d’A17, sans nouveau branchement dans l’application.
- Le compteur d’enfants du formulaire ne transforme plus une quantité inconnue en zéro : présence d’enfants affichée sans inventer leur nombre ; zéro seulement lorsqu’il est connu, compte importé explicite conservé.

Vérification : **372 tests dans 38 fichiers réussis**, build front réussi ; vérification TypeScript stricte des variables/paramètres inutilisés **réussie sans diagnostic**. Sept anciens tests portaient uniquement sur des APIs mortes supprimées ; six nouveaux scénarios couvrent validation réelle du formulaire, absence de réseau pour format invalide, édition de soi, ancien brouillon et compte d’enfants inconnu/connu. Tests de sauvegarde sans suppression et de hiérarchie serveur conservés. Le léger changement de total ne correspond pas à des tests ignorés.

Navigateur réel groupé : confirmation de démonstration affichée, focus sur Annuler, Échap puis retour au déclencheur ; notification de démonstration affichée. Catalogue et formulaire mobile vérifiés dans le lot 13. Aucune mutation distante ni push.

Suite : erreurs et arrêt contrôlé de l’API (A22), puis contrats DTO A15.

### Lot 15 — Erreurs HTTP, logs et arrêt du serveur

Statut : terminé localement pour le serveur HTTP (A22). Connexion/configuration et schéma Supabase conservés.

- Les **31 handlers** du routeur passent par `sendApiError` : refus métier explicites conservés, contraintes/concurrence/connexion classées, erreurs inattendues limitées au message public de l’opération. Les réponses PUT période/story ne renvoient plus details/stack. Le middleware traite JSON invalide/trop volumineux et délègue une erreur expurgée si une réponse a déjà commencé.
- Les logs n’affichent plus corps de formulaires, paramètres SQL, réponses de données ou erreurs brutes. Événements structurés limités au type/code d’erreur et à l’opération définie dans le code ; la couche pool propage l’erreur sans duplication sensible.
- Création de l’application Express séparée du démarrage/processus. Healthcheck en lecture seule, réponse JSON 404, refus de nouveaux traitements pendant le drainage, en-tête technique retiré.
- `createShutdown` arrête l’acceptation HTTP, attend les requêtes puis ferme le pool, avec un délai maximal de 10 s. Signaux dédupliqués, code de sortie non nul en cas d’échec/fatal, fermeture forcée bornée, une seule sortie même après terminaison tardive. Le serveur ne continue plus après uncaughtException/unhandledRejection. PM2 reçoit un délai de 12 s pour laisser ce drainage se terminer.

Vérification : **395 tests dans 39 fichiers réussis** (23 nouveaux scénarios de contrôle), build API réussi, **4 tests de configuration de base** réussis, contrôle d’espaces réussi. Les 65 tests existants de handlers/transactions passent ; aucune requête SQL de mutation ni nouvelle migration nécessaire. Tests de contrôle avec HTTP/pool simulés, sans écoute de port ni lecture du .env.

API locale rechargée seule via PM2, front conservé. HTTP : front /periods = 200, /health = 200 database connected (SELECT 1), période absente = 404 public, JSON invalide envoyé à une route inexistante = 400 expurgé, sans accès à un handler d’écriture. Aucun changement de données ni push.

Références vérifiées : index de changements Supabase (dont l’avis PostgreSQL 15.19/17.11 ; pas de changement d’extension/version dans ce lot), [connexion PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [node-postgres pool.end](https://node-postgres.com/apis/pool), [arrêt contrôlé Express](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/). L’index Markdown a été lu via HTTP après rejet de son content-type par l’outil de lecture web.

Suite : contrats DTO et normalisation API/UI (A15). A01 dépend encore du modèle d’accès ; question d’usage présentée pendant le travail, sans modification d’authentification distante.

## État de départ

- Front et API compilent ; connexion Supabase opérationnelle.
- Suite Vitest : 26 tests réussis, 7 en échec et 3 suites non chargées.
- Tests de configuration Supabase : 4 réussis.
- Les adaptations locales Supabase précèdent ce suivi ; elles ne doivent pas être écrasées.

### Lot 16 — Contrats et conversions API

Statut : terminé pour les services d’entités ; A15 reste partiel (formulaires et handlers backend encore à typer davantage).

- DTO explicites des réponses SQL/canoniques et des formulaires, mappers partagés pour catégories, périodes, événements et stories. ID imbriqués normalisés, bornes numériques conservées y compris zéro/négatives, horodatages canoniques préservés.
- Séparation StorySummary/Story : une réponse de métadonnées ne prétend plus contenir périodes/événements. Un détail incomplet et un identifiant absent sont refusés. Aucune date de création ou quantité d’enfants inventée pour une réponse partielle.
- Catégories SQL, multilingues ou libellés simples normalisées avant le sélecteur. API/services inutilisés retirés ; conservation des fonctions actives et réexport des mappers utilisés par les appelants.
- Régression : une réponse HTTP de sauvegarde sans ID n’écrase pas le store. La visibilité absente d’une story ne devient plus publique par défaut côté UI ; cela ne remplace pas l’autorisation côté serveur.

Validation : suite globale 413 tests / 40 fichiers, build front et contrôle TypeScript des symboles inutilisés réussis. Aucun changement de schéma, migration distante ou push.

### Lot 17 — Isolation des accès côté API et migration préparée

Statut : terminé en préparation locale ; A01 reste ouvert tant que Supabase n’a pas reçu la migration et que le premier compte n’est pas créé/attribué.

- Lecture du schéma, des policies, des privilèges, des triggers et des advisors du projet Universal-Timeline. 11 stories existantes, aucun compte Auth et aucune colonne propriétaire. Connexion DB existante confirmée ; l’authentification utilisateur n’était pas mise en œuvre.
- Supabase SDK 2.118.0 fixé dans les deux manifestes/lockfiles. API : vérification distante de chaque token avec getUser, refus des mutations anonymes et des comptes anonymes Supabase, rôle admin pris seulement dans app_metadata. Erreurs publiques expurgées ; refus RLS convertis en 403.
- Identité isolée par AsyncLocalStorage. Toutes les requêtes HTTP passent sous rôle SQL restreint et claims locaux à la transaction quand les accès sont actifs, y compris les transactions existantes. Retrait des accès directs inutilisés au pool. Précontrôle du schéma, RLS sur dix tables, rôles non privilégiés et capacité SET ROLE avant démarrage actif.
- Migration créée par la CLI officielle : owner_user_id/index, propriété par défaut, stories privées par défaut, policies de lecture publique/propriétaire et de mutation propriétaire, liens/ancres privés protégés aussi dans Data API, écriture anonyme retirée et parent/enfant de même propriétaire. Pas d’admin qui contourne la propriété des autres stories.
- L’absence de champ visibilité dans une édition conserve maintenant sa valeur. Une réponse de story expose son propriétaire de façon compatible avec le schéma historique non migré.
- Opération d’attribution séparée : exige une adresse explicite et un compte confirmé existant, définit le rôle et n’attribue que les stories sans propriétaire. L’adresse choisie reste dans une préparation locale ignorée ; aucun compte/mot de passe créé, aucun e-mail envoyé.

Validation : tests middleware et précontrôle ; 16 tests PostgreSQL réels sur base jetable via socket Unix (propriété, lectures publiques/privées, liens, transferts interdits, absence de fuite après commit/rollback, attribution admin conditionnelle). Cluster arrêté et supprimé. Aucun test de mutation sur Supabase.

Points distants encore ouverts : advisor spatial_ref_sys sans RLS et avec droits d’écriture API ; fonctions PostGIS SECURITY DEFINER exposées, extension dans public et search_path mutable. Consignés dans server/AUTHENTICATION.md pour durcissement distinct, sans modification hasardeuse d’extension.

### Lot 18 — Parcours utilisateur et cycle de session préparés

Statut : terminé localement derrière l’activation serveur ; AUTH_ENABLED=false conservé jusqu’à revue/application de la migration et configuration des URL Auth.

- Connexion et inscription, confirmation par e-mail, erreurs neutres et reprises, champs natifs avec autocomplete, protection du double envoi et des retours après fermeture. Déconnexion de la session locale uniquement.
- Route publique timeline ; autres pages sous connexion ; Design system réservé au rôle vérifié, y compris en accès direct. Vérification fraîche du rôle avant les navigations protégées. Redirections locales contrôlées, configuration indisponible = accès fermé aux pages protégées.
- Un seul interrupteur côté API via /api/access. Le SDK est chargé à la demande après activation. /api/account ne renvoie que ID et droit admin. Bearer limité aux appels vers /api sur le même serveur ; pas de transfert vers une URL/baseURL externe.
- Le store des données et le KeepAlive sont réinitialisés lors d’un changement d’identité. Déconnexion/changement d’onglet-compte invalident les anciennes lectures et confirmations. Le panneau Stories et le choix de stories enfants ne proposent à l’édition que celles du propriétaire ; la timeline conserve les stories publiques.
- Les périodes et événements gardent leur catalogue partagé avec pages/mutations sous compte après activation ; aucune propriété ajoutée tant que la décision reste ouverte.
- Configuration publiable locale préparée dans .env.local et server/.env, ignorés et mode 600. Aucun secret serveur transmis au frontend. Procédure de migration/activation et attribution documentée dans server/AUTHENTICATION.md ; exemples sans vraie clé versionnés.

Validation : suite globale finale 466 tests / 45 fichiers ; 16 intégrations PostgreSQL et 4 tests de configuration DB réussis. Builds front/backend et contrôle des symboles inutilisés réussis. Audits des dépendances de production : aucun avis signalé dans les deux arbres. Contrôles HTTP en lecture seule : health 200, front timeline 200, /api/access = false, 11 stories et champ de propriété présents. Vérification navigateur : timeline réelle chargée, stories accessibles et page de connexion signalant honnêtement l’activation encore à faire.

Étape suivante A01 : revue/application de la migration concrète à Supabase, vérification des URL de redirection Auth, activation côté API, création/confirmation du compte choisi par l’utilisateur puis attribution explicite du rôle admin et des stories historiques. Les limites d’accès ne sont pas encore actives sur le serveur courant ; conserver localhost.

### Lot 19 — Préparation de l’activation distante

Statut : terminé pour l’activation, le compte admin et le rattachement autorisé des stories ; durcissement PostGIS et revue des URL avant déploiement restent ouverts.

- Vérification distante préalable : 11 stories, toutes publiques ; aucun compte Auth, colonne owner_user_id absente, policies identiques au périmètre testé.
- Sauvegarde locale ignorée du schéma public (pg_dump 18.6, TLS vérifié, 25 806 octets) et des métadonnées/policies/privilèges dans .tmp/lot19, fichiers mode 600. Aucun identifiant affiché.
- Lecture du service Auth : HTTP 200, fournisseur e-mail et inscriptions activés, confirmation par e-mail requise. Aucun compte créé et aucun e-mail envoyé.
- L’appel apply_migration story_access a été rejeté par la validation automatique : « continue » jugé insuffisamment explicite après la demande d’approbation. Aucun contournement ni exécution indirecte. Confirmation précise redemandée à l’utilisateur.
- Vérification après rejet : 11 stories publiques toujours présentes, migration absente. AUTH_ENABLED=false conservé ; serveur local utilisable.
- Le tableau de bord Auth demande une connexion navigateur ; onglet Supabase laissé disponible et demande de connexion présentée à l’utilisateur pour vérifier l’URL de retour locale.

Suite : après confirmation reconnue, appliquer la migration autorisée, vérifier les policies et les lectures publiques sans écriture de test, vérifier la redirection Auth, activer l’API puis laisser l’utilisateur créer/confirmer son compte avant l’attribution admin.

Complément du lot 19 — application réalisée :

- Après la réponse explicite « Oui, appliquer la migration à Supabase », apply_migration story_access a réussi. Version distante 20261029090427 ; fichier local et références alignés sur cette version renvoyée par Supabase, sans changement du SQL validé.
- Vérification distante : 11 stories publiques conservées, 11 propriétaires non attribués, 21 nouvelles policies et dix tables applicatives sous RLS ; nouvelles stories privées par défaut, INSERT anonyme refusé par les privilèges.
- AUTH_ENABLED=true dans server/.env ; seule l’API PM2 a été redémarrée. Front conservé sur 127.0.0.1:5173, API sur 127.0.0.1:3000. Health 200 et précontrôle des rôles/schéma réussi.
- Lectures HTTP sous les nouveaux droits : stories (11), détail story 1, périodes/événements de story, catalogue périodes, 82 événements et 18 catégories : 200. Compte anonyme : 401. POST/PUT/PATCH/DELETE sur une URL inexistante : 401 avant tout handler ; aucune mutation SQL de vérification.
- Navigateur neuf : /database redirige vers /login?redirect=/database et le formulaire de connexion s’affiche. Design system absent de l’en-tête anonyme. SDK chargé avec la configuration publiable.
- Suite globale après activation : 466 tests / 45 fichiers réussis. Advisors après migration : seuls les points PostGIS/search_path déjà identifiés restent ouverts ; aucune modification d’extension dans ce lot.

L’étape encore dépendante de l’utilisateur est la connexion au tableau de bord Supabase pour les URL Auth, puis la création/confirmation du compte choisi. L’attribution admin et des 11 stories attend un compte confirmé et ne se fait pas automatiquement.

Complément — premier compte confirmé et rôle admin :

- Le compte choisi a été créé/confirmé par l’utilisateur pendant l’activation. Aucune saisie de mot de passe ni création par l’agent.
- L’opération combinée rôle + attribution des 11 stories a été refusée par la revue automatique : autorisation du rôle reconnue, attribution globale jugée insuffisamment explicite. Aucun contournement : rôle seul appliqué comme alternative autorisée, 11 stories toujours sans propriétaire et publiques. Une confirmation spécifique d’attribution a été présentée.
- Rôle admin vérifié en lecture seule ; fichier d’opération séparé assign_admin_role.sql pour éviter de coupler rôle et propriété.
- Correction du retour de confirmation : une session déjà restaurée avant montage quitte immédiatement /login. Un changement de rôle vérifié vide aussi les caches pour ne pas conserver une vue obsolète des droits/données. Deux tests de régression ajoutés.

Complément final — attribution autorisée et vérifiée :

- L’utilisateur a expressément autorisé le rattachement des 11 stories au compte choisi, en demandant de tenir compte de leurs tags publics. L’opération de propriété seule a alors réussi ; rôle et rattachement sont désormais deux scripts distincts. L’ancien script couplé reste uniquement en sauvegarde ignorée.
- Comparaison distante avant/après par ID : 11 propriétaires attendus, is_public et catégories identiques ; aucun contenu modifié et aucune story déjà possédée transférée.
- La vraie session utilisateur a permis de vérifier l’accès Design system et l’affichage des 11 stories dans le compte. La création/confirmation a été effectuée par l’utilisateur ; la demande préalable de connexion au tableau de bord n’est plus nécessaire pour terminer cette étape. La liste des URL Auth reste non inspectée, à revoir au déploiement.
- Résultat final : 468 tests / 45 fichiers, 19 intégrations SQL sur base jetable, builds front et contrôle TypeScript strict inutilisés réussis ; build backend précédent inchangé. Les trois tests SQL supplémentaires couvrent les opérations séparées, l’exigence d’un admin confirmé et la conservation des statuts privé/public, parenté et catégories.
- Le suivi A01 reste partiel pour les points globaux Supabase/PostGIS déjà signalés ; les parcours demandés compte/story/admin sont actifs. Aucun push GitHub.

Vérification finale du formulaire : Mode public activé et badge Publique conservés sur une story existante du compte ; fermeture par Annuler sans sauvegarde. L’activation et les attributions demandées sont terminées. La demande de connexion au tableau de bord n’est plus nécessaire pour cette étape ; inspection des URL reportée à la revue du déploiement.

### Lot 20 — Fonctions SQL restreintes et PostGIS isolé

Statut : terminé pour le durcissement SQL ciblé. A01 conserve les contrôles Auth avant déploiement ; huit lots techniques restent estimés ci-dessus.

- Sauvegarde locale du schéma/données publics (dump de 76 500 octets), des rôles sans mots de passe, du référentiel géographique complet et des définitions/privilèges des fonctions. Fichiers ignorés dans `.tmp/lot20`, mode 600 ; aucun identifiant affiché.
- Migration `20261029093707_harden_public_functions.sql` appliquée : search_path fixe pour `set_updated_at` et `maintain_period_relations`, retrait d’EXECUTE à PUBLIC et aux trois rôles API. Le trigger reste SECURITY INVOKER et fonctionne pour les écritures autorisées. La routine historique, inutilisée et incompatible avec les colonnes actuelles, reste réservée au propriétaire SQL en attendant la revue de maintenance ; elle n’a pas été appelée dans Supabase.
- Migration `20261029093923_isolate_postgis.sql` appliquée : PostGIS 3.3.7 reconstruit dans `extensions`, version inchangée. Transaction, délai de verrou, vérification des colonnes/dépendances/version, DROP RESTRICT et comparaison exacte des références avant COMMIT. Ni CASCADE ni modification des catalogues système/propriétaires gérés. API brièvement suspendue puis relancée pour renouveler les connexions ; front conservé.
- Première tentative PostGIS arrêtée par le garde-fou avant tout DROP : deux types composites internes avaient été comptés comme des colonnes applicatives. Contrôle précisé aux tables/vues, lectures de précontrôle renouvelées, seconde application réussie. Historique local aligné sur les versions réellement renvoyées par Supabase.

Vérifications :

- **468 tests Vitest / 45 fichiers réussis** ; aucun test désactivé.
- **4 tests PostgreSQL réels réussis**, instance 14 locale jetable sur socket Unix : chemins de résolution fixes, refus d’appel par les rôles API et PUBLIC, quatre triggers de dates conservés malgré EXECUTE retiré et search_path du caller différent, routine historique toujours réservée au propriétaire. Instance arrêtée/supprimée. Commande dédiée `yarn --cwd server test:privileges`, avec les gardes de destination documentées.
- PostGIS non installé sur la base locale : pas de simulation présentée comme un test de son extension. Application distante protégée par transaction/RESTRICT ; ensuite vérifications exclusivement en lecture.
- **Dix tables applicatives strictement identiques** par nombre de lignes et empreinte complète avant/après ; les 11 stories, leurs propriétaires, leur visibilité et leurs catégories sont conservés. **8 500 références géographiques strictement identiques**, comparées intégralement.
- Data API : ancienne table publique `spatial_ref_sys` inaccessible (404/PGRST205). PostGIS confirmé dans extensions, aucune table publique résiduelle du même nom ; version 3.3.7 conservée.
- Advisor sécurité relancé : **aucune alerte SQL restante**. Une seule alerte Auth demeure, protection des mots de passe compromis désactivée. Option réservée à Pro ou supérieur selon la [documentation Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ; offre/paramètres à vérifier au lot 28, sans changement d’abonnement automatique.
- HTTP en lecture : timeline, health, stories, périodes, événements et catégories = 200 ; authentification toujours active. Aucun contenu applicatif modifié pour tester, aucun push.

Procédure officielle suivie et adaptée avec refus des cascades : [PostGIS dans public et permissions gérées par Supabase](https://supabase.com/kb/troubleshooting/security-advisor-flags-spatial_ref_sys-and-other-postgis-objects-in-the-public-schema). Une simple révocation sur spatial_ref_sys ne fonctionne pas sous postgres, qui n’est pas propriétaire des objets PostGIS ; aucun contournement de ce contrôle n’a été tenté.

Suite : lot 21, opérations de création/rattachement réparties sur plusieurs requêtes et stratégie de nouvelle tentative d’écriture (A03).

### Lot 21 — Sauvegardes et sélections atomiques

Statut : terminé sur les parcours actifs A03. Sept lots restent estimés, le prochain étant le typage et la validation des formulaires/entrées backend (A15).

- POST/PUT période : parent, métadonnées et catégories dans une seule transaction. Le verrou de hiérarchie est pris avant la première écriture, puis les mêmes validations de parent/cycle que le déplacement s’appliquent. Parent omis = conserver en édition ; null explicite = détacher. Une catégorie ou un parent refusé annule aussi les autres changements.
- Formulaires finder et générique : une seule sauvegarde HTTP, application au store uniquement après succès, retrait de l’ancien état de période créée mais non rattachée et de son chemin PUT/PATCH de rattrapage. Un choix explicite « sans parent » prime sur le contexte de colonne. Les catégories sont désormais transmises/enregistrées dès la création d’une période ; celles d’une story sont également enregistrées dans sa transaction de création.
- Sélections de périodes/événements d’une story, y compris retrait d’un sous-arbre : une requête et une transaction pour toute la sélection, au lieu de boucles à succès partiel. Contrat borné à 500 identifiants, validation/déduplication, valeurs SQL paramétrées, éléments manquants refusés avant insertion, verrou sur la story modifiable. RLS continue de s’appliquer : sa visibilité publique ne donne aucun droit de modification. Les ajouts répétés ne doublent pas les liens et les retraits répétés sont sans effet supplémentaire.
- Rattachement de plusieurs stories enfants atomique, avec refus des cycles et sérialisation des changements de hiérarchie. Détachement et suppression des ancres maintenant dans une même transaction : le lien exact et le parent modifiable sont vérifiés avant toute suppression. Un faux parent ou un échec de détachement conserve les ancres.
- Retrait des relances automatiques réseau de sauvegarde : une réponse perdue après COMMIT ne prouve pas l’échec. Message explicite demandant de recharger les données avant de renvoyer une écriture non confirmée. Les brouillons restent ouverts et le double envoi simultané reste bloqué. Il ne s’agit pas d’une garantie de création « exactement une fois » : aucun registre persistant d’idempotence n’a été ajouté et un renvoi manuel après perte de réponse demande cette vérification préalable. Les retries de lectures Wikidata restent séparés.
- Retrait des quatre méthodes client d’associations individuelles devenues inutilisées. Les endpoints individuels restent compatibles côté API ; le client actif passe par les sélections groupées. Un échec d’écriture et un échec de rechargement après succès affichent des messages distincts, avec invalidation du cache et reprise de lecture.

Vérifications :

- **485 tests Vitest / 47 fichiers réussis**, aucun ignoré ; 17 nouveaux scénarios isolés. Les anciens tests de création/rattachement en deux étapes et de succès partiel ont été réécrits pour le nouveau contrat atomique, sans supprimer les protections de brouillon, de store ou de cible capturée. Trois types de création testés après perte de réponse : aucun renvoi automatique ni insertion locale inventée ; double clic bloqué.
- **19 intégrations PostgreSQL réelles réussies** sur instance 14 locale jetable. Vrais handlers compilés, vraies transactions/contraintes/policies de la migration story_access ; seul le fournisseur de connexion est redirigé vers le socket local avant import, sans chargement du .env. Création et édition avec rollback des métadonnées/parent/catégories, propriété, retrait atomique sous échec, répétition des lots périodes/événements, enfant étranger/manquant, ancres conservées et déplacements croisés de stories ET périodes sur des connexions concurrentes. Instance arrêtée et supprimée.
- Builds front et backend réussis ; vérification TypeScript stricte des symboles inutilisés et `git diff --check` réussis.
- API locale rechargée seule. HTTP : timeline, finder et lectures stories/périodes/événements/catégories = 200 ; health connecté, authentification active, 11 stories lisibles. Les trois nouvelles routes de mutation refusent un appel sans session (401 avant handler SQL). Aucun enregistrement de test sur Supabase.
- Aucune migration, modification du schéma Supabase, installation de dépendance ou publication GitHub pour ce lot.

Rejeu : `yarn --cwd server test:atomic`, avec `TIMELINE_TEST_SOCKET` absolu et `TIMELINE_TEST_DATABASE=universaltimeline_test_<nom>` sur une instance jetable vide, port 55439. Le test refuse TCP et les noms de base ordinaires. Il utilise le remplacement de module natif de Node 22 pour brancher la connexion locale avant import des routes ; le script fournit le flag expérimental nécessaire. Il crée ses propres tables/rôles et ne doit pas partager un cluster avec une base à conserver.

Références consultées : [policies RLS PostgreSQL 17](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [verrous et ordre d’acquisition](https://www.postgresql.org/docs/17/explicit-locking.html), documentation Supabase et index des changements récents. Le verrou FOR UPDATE sur une story publique d’un autre propriétaire a été vérifié avec les vraies policies sur la base locale, pas supposé à partir de sa seule visibilité SELECT.

Recette interface : créer une période sous un parent depuis le finder et vérifier son emplacement après actualisation ; sélectionner plusieurs éléments dans une story et vérifier la sélection complète après actualisation. En cas de perte de réponse, recharger avant de renvoyer le formulaire : ne pas assimiler une panne réseau à une annulation confirmée.

### Lot 22 — Contrats de formulaires et validation HTTP

Statut : terminé pour les frontières formulaires/HTTP de A15. Six lots restent estimés ; la séparation des handlers, du métier et des accès SQL vient ensuite (lot 23/A17).

- Contrats distincts pour initialisation d’une fenêtre, brouillon, soumission et payloads des services. Suppression des any dans le formulaire, son composable, les sauvegardes et le flux de création du finder. Le store conserve maintenant explicitement les métadonnées StorySummary ; les conversions ne masquent plus auteur/visibilité derrière un type de liste trop étroit. Les services sérialisent les champs prévus, sans propager tout le brouillon à une création de story.
- Un seul validateur de brouillon, avec retours par champ, remplace les anciennes méthodes redondantes/inutilisées. Il contrôle textes, longueurs, catégories, Q-id, auteur, visibilité et valeurs temporelles de type texte. Les erreurs sont liées aux champs par aria-invalid/aria-describedby ; soumission invalide bloquée sans fermer la fenêtre ni effacer la saisie. Auteur obligatoire et espaces seuls refusés. Une même fenêtre réévalue le type/mode courant et conserve les données du nouveau brouillon.
- Côté API, les bodies sont reçus comme inconnus puis transformés en objets typés explicites avant connexion/transaction. Objets/tableaux/nombres à la place de textes, textes trop longs, dates absentes requises, visibilité non booléenne, catégories mal formées et caractères de contrôle interdits sont refusés en HTTP 400. Les erreurs ne renvoient ni contenu reçu ni détails SQL ; les erreurs de validation typées peuvent fournir une carte fields.
- Identifiants : catalogue/catégories en texte historique ou UUID, jamais forcés artificiellement en UUID ; stories en entiers positifs dans la plage int4. Paramètres de chemin, ancres, sélections et suggestions contrôlés. Le payload historique childStoryId numérique reste accepté. Les valeurs des paramètres de recherche doivent être des chaînes uniques, avec limites de taille ; aucun tableau/objet converti en texte arbitraire.
- Catégories : limite de 500, déduplication et paramètres SQL ; omission et [] gardent leurs sens respectifs. Le schéma existant utilise varchar pour les IDs de catégories : suppression du cast UUID incorrect dans la recherche et application du filtre aux événements aussi. La fixture PostgreSQL a été alignée sur ce type réel, sans modifier Supabase.
- Dates : les expressions historiques libres restent conservées, y compris lorsqu’aucune borne BP ne peut en être déduite. Fin de période vide = NOW dans la soumission, conformément au libellé de l’interface ; les défauts des appels HTTP directs restent NOW en création et TODAY en édition. Espaces/retours à la ligne des descriptions préservés. L’unification des conversions et la cohérence chronologique complète restent au lot 24 : ce lot ne les prétend pas résolues.
- Le champ de localisation n’a aucune colonne de stockage ni écriture correspondante dans le schéma/API existants. Il reste affiché comme information Wikidata non modifiable, avec mention « non enregistrée », et n’est plus envoyé comme si sa sauvegarde était prise en charge. Sa conservation ou son évolution pourra être revue avec les anciens champs de maintenance au lot 27, sans inventer une migration ici.
- Les propriétés/roles reçus dans un body ne sont pas utilisés pour attribuer des droits ou un propriétaire ; la liste explicite de champs et l’identité vérifiée restent les seules sources. Auth, RLS et atomicité du lot 21 conservées. Une modification sans élément sélectionné est refusée au lieu de se transformer en création.

Vérifications :

- **582 tests Vitest / 49 fichiers réussis**, aucun ignoré ; 97 scénarios supplémentaires. Les vrais handlers sont appelés avec des bodies/paramètres mal formés et ne doivent appeler ni query ni withTransaction. Composants réels : auteur vide, longueurs, erreurs accessibles, soumission bloquée, brouillon préservé, fin vide, date historique libre et changement de type de fenêtre. Les fixtures historiques des tests de transactions ont reçu des entrées désormais valides, sans désactiver leurs assertions de commit/rollback.
- **23 intégrations PostgreSQL réelles réussies** sur une instance 14 locale jetable : les 19 protections atomiques/concurrentes précédentes restent vertes ; ajout de normalisation Q-id/date libre, refus des mauvais types sans création, compatibilité du childStoryId numérique et recherche filtrée avec ID de catégorie varchar non UUID. Instance arrêtée et supprimée.
- Builds front/backend, contrôle TypeScript strict des symboles inutilisés et contrôle d’espaces réussis. Aucune nouvelle dépendance.
- API locale rechargée seule : timeline/finder et lectures du catalogue/stories/catégories = 200, health connecté, 11 stories publiques lisibles, authentification active. Les exemples de paramètres invalides renvoient 400 et les appels de mutation sans session restent refusés avant les handlers (401). Recherche réelle avec catégorie = 200.
- Aucune écriture de vérification, migration ou modification du schéma Supabase ; aucun push.

À tester sans enregistrer : ouvrir la création d’une story, saisir un auteur composé d’espaces et quitter le champ ; l’erreur apparaît et Créer reste désactivé. Corriger l’auteur réactive l’action si les autres champs sont valides. Une description dépassant 1 000 caractères affiche son erreur ; le brouillon reste présent. Fermer par Annuler pour ne rien enregistrer.

### Lot 23 — Séparation HTTP, métier et SQL

Statut : terminé pour l’architecture serveur de A17. **Cinq lots restent estimés** ; la consolidation du domaine temporel vient au lot 24.

- Le fichier des routes passe de 1 438 à 168 lignes : validation des entrées, appel du service et réponse HTTP. Le wrapper endpoint centralise la traduction des erreurs ; les statuts 201 ne sont définis qu’après une écriture confirmée. Les 33 routes effectives, leurs méthodes, leurs statuts et les formats historiques de réponse sont conservés.
- Les services portent les transactions, les règles de création/édition/suppression et la composition des détails. Les repositories portent le SQL et reçoivent explicitement le client ; ils ne créent aucun pool et ne chargent ni configuration ni identité. Toutes les opérations d’une transaction conservent son client, ses verrous et les droits du principal vérifié. Aucun accès privilégié supplémentaire, modification RLS ou changement de schéma.
- Les lignes PostgreSQL sont typées (NUMERIC texte/nombre, timestamps, jointures et projections distinctes). Les agrégations Map non typées sont remplacées par un regroupement des catégories commun. Les réponses liste/détail conservent leurs noms de champs ; les deux lectures détail période par ID/Q-id partagent leur composition.
- Une fonction pure vérifie les chaînes d’ancêtres pour périodes et stories : auto-parent, cycle indirect ou préexistant, ascendant manquant. Les services conservent leurs messages métier, les verrous avant écriture et les refus d’accès. Les suppressions de feuilles restent conditionnées à l’absence d’enfants et de liens.
- Le calcul de bornes de stories est isolé du chargement SQL, sans changement d’algorithme. L’ancien helper Wikidata utilisé par le script de maintenance est déplacé hors du routeur HTTP ; ses reprises réseau et la compatibilité du script restent explicitement à revoir aux lots 25/27.
- Un contrôle d’architecture vérifie les imports et l’absence de SQL dans les routes/services/domaine. La documentation du projet décrit les nouvelles responsabilités.

Vérifications :

- **607 tests Vitest / 52 fichiers réussis**, aucun ignoré : 25 scénarios supplémentaires couvrent règles pures, contrats de lecture et séparation des couches. Les protections de validation avant SQL, transactions, erreurs expurgées, annulation et accès précédentes restent actives.
- **44 intégrations PostgreSQL réelles réussies** sur instance 14 locale jetable : 8 hiérarchie, 10 suppression et 26 vrais handlers avec transactions/RLS. Les nouveaux scénarios vérifient racines/enfants, détails période par ID/Q-id, catégories, stories privées/publiques, propriétaires, ancres et suggestions. Aucun chargement du .env ni accès Supabase ; instance arrêtée et supprimée.
- Builds frontend/backend, vérification TypeScript stricte des symboles inutilisés, 4 contrôles de configuration de connexion et contrôle d’espaces réussis. Aucun ajout de dépendance.
- API locale rechargée : lectures et détails accessibles, authentification active, paramètres invalides refusés (400) et mutations anonymes refusées avant SQL (401). Aucun enregistrement de vérification sur Supabase, aucune migration ni publication GitHub.

Recette interface : actualiser la timeline, naviguer entre période racine et enfant, puis ouvrir une story et consulter ses périodes/événements. En étant connecté, ouvrir l’édition et annuler : contenu, catégories et relations doivent rester identiques. Ce lot réorganise le serveur ; il n’ajoute pas de commande ou de nouvel écran.

### Lot 24 — Domaine temporel commun et anciens moteurs retirés

Statut : terminé pour A17. **Quatre lots restent estimés** : caches/chargements Wikidata, accessibilité/largeurs, maintenance, puis validation finale.

- Une source pure, `server/src/shared/temporal.ts`, est utilisée par l’API et le navigateur (alias @temporal). Ce placement garde le build/API Docker existant autonome, sans second paquet, dépendance ou copie générée à synchroniser. Le contrôle d’architecture couvre aussi ce domaine partagé. DateService conserve uniquement l’affichage ; il ne possède plus de parser ni de conversion de stockage isolée.
- Retrait de DateConversionService, useDateConversion, DateFormatter, de leurs types isolés et de la copie backend du calcul BP. Les scénarios utiles de leurs anciennes suites sont migrés vers le contrat commun : formats canoniques G/M/K/A, géologiques historiques, ISO/Wikidata étendu, année seule, français, BCE explicite et encodages annuels. Les anciens objets de sortie/options sans consommateur sont retirés avec leurs implémentations, sans prétendre qu’ils constituent encore une API utilisée.
- Le résultat distingue âge, calendrier, présent explicite et date inconnue. Une chaîne vide/inconnue ne devient plus aujourd’hui. Une expression historique non interprétable reste stockée telle quelle, avec coordonnée null. Seuls NOW/TODAY indiquent le présent ; pas de réécriture des textes ou de migration des données existantes.
- Dates civiles validées sans rollover automatique (mois/jours/bissextiles) ; interprétation UTC indépendante du fuseau de la machine, prise en compte des offsets, secondes et fractions. La précision vient des champs fournis, pas de leur valeur : minuit ou le 1er janvier ne deviennent plus une simple année si une heure/journée était fournie. Années 0–99 correctement interprétées ; dates futures gardées distinctes avec coordonnées négatives. Les très grandes années restent approximatives à l’année.
- La convention BP historique de l’application est explicitée : années avant l’instant courant fourni, pas une nouvelle conversion arbitraire de toute la base vers 1950. Les valeurs numériques importées finies restent prioritaires lorsque le texte est exploitable ; un texte explicitement inconnu/impossible ne fournit pas de date actuelle même si une ancienne colonne vaut 0. NOW/TODAY impose 0. Les tests de conservation des métadonnées du lot 16 sont conservés.
- Une même règle contrôle l’ordre début/fin dans le formulaire et avant SQL. Les périodes géologiques inversées, les bornes égales et les dates calendaires impossibles sont refusées sans ouvrir de transaction. Les dates historiques libres restent acceptées. Les deux coordonnées nouvelles d’une période utilisent le même instant de référence.
- Calcul de bornes de stories commun à l’API et au frontend, linéaire, sans tri lexicographique ni parsing répété dans un comparateur. Tris/filtres/scaling distinguent null et 0. Les éléments non positionnables restent accessibles dans une zone « Dates non déterminées », hors de l’axe ; les événements conservent leur détail, les suggestions, la reprise et la navigation de stories. Un filtre de période connue n’inclut pas un événement non daté comme s’il se produisait aujourd’hui.
- Aperçus de formulaire calculés au lieu de trois watchers et d’un second rafraîchissement manuel : effacer la saisie efface aussi l’aperçu, sans modifier le brouillon. Retrait des fonctions de scaling non consommées et regroupement des conversions d’événements/périodes de stories.

Précision de provenance : les chaînes ISO signées suivent la numérotation astronomique. Un libellé explicite 800 BCE désigne l’année ISO -0799. Le JSON Wikibase et ses littéraux RDF n’utilisent pas la même numérotation BCE ; le schéma actuel ne transporte pas ces métadonnées ni un modèle julien. Les champs Wikibase 00 non spécifiés restent du texte non positionnable, au lieu d’inventer une précision au 1er janvier. Aucune réinterprétation globale des anciennes données n’est effectuée. [Référence officielle Wikibase](https://doc.wikimedia.org/Wikibase/master/php/docs_topics_json.html#time).

Vérifications :

- **682 tests Vitest / 52 fichiers réussis**, aucun ignoré, soit 75 scénarios nets supplémentaires après migration des suites des moteurs retirés. La nouvelle suite temporelle contient 96 cas ; elle passe aussi sous America/Los_Angeles et Pacific/Kiritimati. Formulaires réels : intervalle géologique inversé/corrigé, aperçu effacé, texte historique préservé. Frise : éléments inconnus accessibles, hors axe, suggestions/reprise conservées.
- **48 intégrations PostgreSQL réelles réussies** sur instance 14 locale jetable : 8 hiérarchie, 10 suppression et 30 vrais handlers/RLS. Nouveaux cas : intervalle invalide sans résidu, secondes/fuseau conservés, texte historique avec BP null et période future ordonnée avec parent/catégories atomiques. Instance arrêtée et supprimée ; aucune écriture sur Supabase.
- Builds front/backend, contrôle strict des symboles inutilisés et contrôle d’espaces réussis. Aucune nouvelle dépendance.
- Navigateur réel : timeline et catalogue accessibles ; M10 → M65 produit l’erreur attendue, remplacer la fin par NOW la fait disparaître. Brouillon annulé, aucune sauvegarde distante. API locale rechargée et lectures/détails/400/401 vérifiés.
- Aucune migration, modification des droits ou publication GitHub.

Recette sans enregistrer : dans Ajouter une période, saisir M10 en début puis M65 en fin ; le message « La date de début doit être antérieure à la date de fin » apparaît. Remplacer la fin par NOW efface ce message. Effacer le début efface son aperçu. Fermer par Annuler.

### Lot 25 — Caches et lectures Wikidata bornées

Statut : terminé pour A10/A11 dans les parcours audités. **Trois lots restent estimés** ; lot suivant : accessibilité/clavier et largeurs d’écran.

- `wikidataTransport` mutualise SPARQL et MediaWiki entre les recherches, la classification et les imports. Les clés incluent endpoint, requête complète, langue, mode, limite et lots d’IDs triés. Cache public en mémoire uniquement : une minute pour les recherches, cinq minutes pour les autres réponses ; limites de 160 réponses SPARQL et 200 MediaWiki, 32 clés en cours au plus par cache. Les mêmes lectures en cours sont partagées et chaque lecteur reçoit sa propre copie. Aucune réponse utilisateur/Supabase, persistance locale ou identité dans ce cache.
- Une réponse vide valide est mémorisée ; une panne HTTP, une erreur logique MediaWiki, un JSON incomplet/mal formé ou une annulation ne l’est pas. Structure des bindings et claims contrôlée avant mémorisation, présence des entités demandées vérifiée, clés normalisées. Le Q-id est validé avant interpolation SPARQL. Changer l’endpoint ou les paramètres change la clé. Une reprise explicite force la relecture des réponses publiques déjà établies.
- Annulation par lecteur : un lecteur fermé ne reçoit pas de résultat tardif ; le dernier lecteur coupe le transport sous-jacent. Annuler un formulaire ne coupe pas la même lecture encore utilisée ailleurs. Une purge ou une ancienne réponse annulée ne peut pas remplir le cache. Les imports, recherches et résolution locale du parent propagent leur signal tout en conservant leurs gardes de contexte/brouillon.
- `shared/readOperation` remplace le helper de retry isolé. Chaque lecture reste bornée, attentes et tentatives comprises : 15 secondes MediaWiki, 30 secondes SPARQL, au plus trois tentatives pour réseau/408/429/5xx ou erreurs logiques transitoires. Retry-After respecté ; s’il dépasse le délai restant, aucune tentative anticipée. Les erreurs permanentes ne sont pas réessayées. Aucune mutation n’est ajoutée à ce mécanisme.
- L’import période utilise une requête de résumés des enfants, sans relire le détail de chaque sous-période pour compter. À 400 résultats ou après panne du complément, le nombre exact vaut null et le formulaire affiche qu’il est inconnu ; il ne réutilise pas un ancien compteur et ne l’annonce pas comme zéro. Données principales conservées, avertissement et bouton « Réessayer les compléments ». Les choix manuels de catégories/parent restent conservés si leur enrichissement échoue. Les qualificateurs temporels utilisés en fallback sont désormais projetés dans le SELECT SPARQL.
- La classification des suggestions d’événements respecte exactement sa borne de 520 classes et signale une classification trop complexe, au lieu de présenter une liste partielle comme une absence de résultat. Les réponses publiques répétées sont réutilisées. Les reprises s’appliquent uniquement à la requête en panne, sans recommencer toutes les lectures réussies.
- Le lecteur Wikidata historique de maintenance est borné aussi : suppression de la récursion de retry et de l’attente aléatoire, annulation et erreurs distinguées d’une date absente. Son script Prisma n’a pas été exécuté ; sa compatibilité avec le schéma reste au lot 27. L’ancien helper retryAsyncOperation et la normalisation Q-id redondante du composable sont retirés.

Vérifications :

- **749 tests Vitest / 56 fichiers réussis**, aucun ignoré, soit 67 scénarios supplémentaires. Tests des vrais services avec transports simulés : déduplication, copies, résultats vides, expiration/éviction, paramètres/endpoint distincts, échecs non mémorisés, plafonds, réponses mal formées, trois tentatives au maximum, Retry-After, délai dépassé, annulation d’un lecteur puis du dernier, réponse tardive et relecture forcée. 150 enfants demandent deux requêtes pour l’import complet, sans N+1. Formulaire réel : compteur inconnu, données conservées, complément repris et aucune émission submit.
- Builds front/API, contrôle TypeScript strict des symboles inutilisés et contrôle d’espaces réussis. Le lecteur de maintenance, hors graphe du build API, a également été vérifié séparément par TypeScript. Aucune nouvelle dépendance.
- Serveur local accessible : timeline/finder et lectures du catalogue/stories/détails = 200, health connecté, 11 stories publiques lisibles. Paramètres invalides = 400 ; mutations anonymes refusées en 401 avant SQL. Le code HTTP/SQL de l’API n’a pas changé dans ce lot.
- Navigateur réel : recherche « Empire romain », sélection Q2277, titres/descriptions/dates préremplis et 4 sous-périodes affichées. Le doublon existant reste signalé et Créer désactivé ; brouillon annulé sans sauvegarde. Une recherche d’événements « Apollo 11 » a dépassé le délai : message et reprise affichés ; l’API publique simple répondait 200, ce contrôle ne prouve donc pas la disponibilité du parcours complet de classification sous toutes les latences.
- Aucune écriture de vérification, migration ou modification des droits Supabase ; aucun push. Les intégrations PostgreSQL du lot 24 ne sont pas relancées pour ce lot sans changement SQL.

Limites à conserver : les caches sont par réponse/requête complète, pas par entité entre deux lots différents ; ils disparaissent au rechargement de page. Les délais portent sur chaque lecture, tandis que les recherches gardent aussi leur délai global d’interface. La classification distante reste sensible à la latence ; une expiration doit rester explicite et réessayable. Au lot 26, contrôler l’exposition des suggestions téléportées aux technologies d’assistance : elles étaient visibles sur la capture, sans apparaître dans l’arbre AX de l’outil utilisé. La cause reste à vérifier. Revoir au lot 27 les méthodes historiques sans consommateur applicatif, notamment loadStory de WikidataQueryService.

Références : [accès aux données Wikidata](https://www.wikidata.org/wiki/Wikidata:Data_access), [bonnes pratiques API MediaWiki](https://www.mediawiki.org/wiki/API:Etiquette), [annulation Axios](https://axios.rest/pages/advanced/cancellation).

Recette sans enregistrer : ouvrir Periods → Ajouter une période, chercher « Empire romain » dans la recherche Wikidata et sélectionner le résultat. Vérifier le préremplissage et le compteur ; le Q-id déjà présent doit bloquer la création. Fermer par Annuler. En cas de panne, vérifier le message et la reprise ; un complément indisponible ne doit ni vider les champs ni annoncer zéro sous-période.

### Lot 26 — Clavier, sémantique des contrôles et écrans étroits

Statut : terminé pour les parcours ciblés A18/A19. **Deux lots restent estimés** : maintenance, puis validation finale. Ce lot ne constitue pas une certification de conformité WCAG ni un test audio complet avec tous les lecteurs d’écran.

- Les suggestions Wikidata du formulaire restent dans le DOM du dialogue. Leur ancien Teleport vers body, qui les rendait absentes de l’arbre AX du navigateur sous aria-modal, est retiré avec le calcul de position et les listeners de scroll/resize devenus inutiles. Le panneau CSS s’adapte à la largeur disponible. Confirmation réelle : l’arbre AX expose maintenant la liste, ses sept options, le nombre de résultats et l’option parcourue comme sélectionnée.
- Recherche globale et import utilisent un petit composable commun de navigation : flèches, option active liée au champ par aria-activedescendant, défilement vers l’option, sélection par Entrée. Le focus reste dans le champ. Une nouvelle liste, une déduplication tardive ou une fermeture efface l’option active pour éviter de choisir une autre entité sans action. Les états chargement/erreur/vide et les actions de reprise restent hors des listbox. Échap ferme les suggestions avant le dialogue ; effacer ou sélectionner garde un focus utilisable.
- FilterBar conserve ses actions distinctes « choisir » et « créer » sous forme de boutons natifs, sans bouton imbriqué dans une option de listbox. Son panneau non modal possède un nom et une relation avec la recherche. Flèches/Home/End, Tab et Échap permettent d’atteindre ses actions et de revenir au champ ; panneau borné à la largeur et à la hauteur disponibles.
- Le sélecteur générique expose maintenant la surbrillance depuis son champ de recherche réellement focalisé. La listbox ne contient plus de champ de saisie. Les erreurs/indications de Select et PeriodSelect sont reliées aux contrôles ; la sélection restaure le focus, Échap est consommé localement et quitter le sélecteur au clavier ferme son panneau sans ramener le focus en arrière. La valeur courante du bouton PeriodSelect est décrite explicitement.
- Les actions Modifier/Ajouter du finder restent dans l’ordre de tabulation et deviennent visibles au focus, ainsi que les retraits de liens et les actions du tableau. Elles restent visibles sur les appareils sans survol. Libellés contextualisés, contrôles de recherche et interrupteurs nommés ; Mode public est relié à son vrai libellé. Les anneaux de focus sont renforcés sur champs, sélecteurs, interrupteurs et états sélectionnés. Le panneau de stories d’un événement annonce son état et revient à son déclencheur avec Échap. Les mouvements réduits sont respectés.
- La navigation principale est un nav avec de vrais liens et aria-current=page ; les clics ordinaires gardent la gestion de navigation/reprise existante et les clics modifiés conservent le comportement natif. Un lien « Aller au contenu » précède l’en-tête et focalise main. Le menu se replie sur plusieurs lignes au lieu de masquer ses liens. La recherche passe sur une seconde ligne aux largeurs intermédiaires. Le shell utilise la hauteur dynamique du viewport.
- Tableau Events : rôles de tableau/lignes/cellules, boutons de tri et direction aria-sort, poignées de largeur utilisables avec flèches et Home/End dans leurs limites. Les actions indiquent l’événement concerné. Barres de filtres adaptées aux petits écrans ; le tableau garde ses colonnes dans une région défilable horizontalement, en-tête et corps ensemble, avec une indication visible sur petit écran. Aucun changement du tri métier ou des données enregistrées.

Vérifications :

- **768 tests Vitest / 57 fichiers réussis**, aucun ignoré : 19 nouveaux scénarios sur focus, noms accessibles, relations de champs, navigation/annonces des suggestions, Échap, actions distinctes, liens natifs, tri et redimensionnement borné. Les anciens tests de navigation/reprise et de finders sont conservés avec des sélecteurs adaptés aux nouveaux éléments natifs. Aucun affaiblissement des contrôles d’annulation ou de soumission.
- Builds frontend/API, contrôle TypeScript strict des symboles inutilisés et contrôle d’espaces réussis. Aucune nouvelle dépendance.
- Navigateur réel, données chargées : Timeline, Stories, Periods et Events à **320, 768, 1024 et 1280 px**. Largeur du document égale à celle du viewport et aucune commande d’en-tête/barre d’outils hors écran dans cette matrice. Les tableaux/colonnes Finder conservent leur défilement local nécessaire à leur structure.
- À 320 px, recherche Wikidata réelle, flèche bas : option sélectionnée exposée dans AX, focus maintenu au champ, panneau et formulaire dans le viewport. Échap ferme la liste, le second ferme le formulaire et rend le focus à Ajouter une période. Aucun import ni enregistrement déclenché pour cette recette.
- Story Guerre froide ouverte : correction d’un conflit de spécificité sur les filtres hideTitle, puis validation à 320, 768, 769 et 1024 px. Champs/actions sans débordement ni chevauchement mesuré, y compris juste après le breakpoint du panneau de détail. Les barres peuvent se replier selon la place effective de leur conteneur.
- Tableau Events à 320 px : défilement jusqu’aux colonnes Modifié/Actions vérifié dans le navigateur. À 1024 px, en-tête et recherche de la timeline lisibles sans chevauchement. Au clavier, premier Tab sur le lien d’évitement, Entrée sur main vérifiés. Taille du navigateur rétablie après les essais.
- Aucune écriture de vérification, migration, modification des accès Supabase ou publication GitHub. Le backend reste inchangé ; ses intégrations SQL ne sont pas relancées pour ces changements de présentation.

Limites : les mesures de largeur ne remplacent pas une recette de chaque état et de chaque contenu long. Contrôles effectués dans le navigateur intégré et son arbre AX, sans prétendre avoir exécuté VoiceOver/NVDA, une certification de contraste exhaustive ou tous les navigateurs mobiles. Au lot 27, vérifier aussi le consommateur de l’événement select de GlobalSearch : Header monte actuellement ce composant sans relier sa sélection à une navigation métier ; ne pas assimiler le test d’émission du composant à une navigation fonctionnelle complète.

Références : [combobox et clavier WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), [rôles et relations WAI-ARIA](https://www.w3.org/TR/wai-aria/), [reflow à 320 pixels et exceptions de structure](https://www.w3.org/WAI/WCAG21/Understanding/reflow).

Recette sans enregistrer : actualiser, ouvrir Ajouter une période, rechercher Empire romain, utiliser les flèches puis Échap deux fois. Le premier Échap ferme la liste, le second le formulaire ; le focus revient sur Ajouter. Avec Tab, parcourir le finder : Modifier doit apparaître au focus. Dans Events, utiliser les boutons de tri et les poignées au clavier ; sur petit écran, faire défiler le tableau vers la droite pour atteindre les actions.


### Lot 27 — Archives de maintenance, runtime Docker et sélection de la recherche globale

Statut : terminé dans le répertoire Desktop de référence. **Un lot reste estimé : le lot 28**, démarrage neuf, documentation finale, validation CI locale et préparation Auth avant déploiement. Les migrations conservées ne constituent pas encore une baseline complète ; aucun push ni déploiement n’est autorisé par cette clôture.

- Vérification en lecture seule du schéma Supabase existant : dix tables applicatives, périodes/événements/catégories en varchar, stories en integer avec propriétaire UUID. L’ancien modèle Prisma Event ne décrit pas ces tables bilingues. L’ancienne migration related_stories ne correspond pas au modèle actuel childStories/ancres ; aucun renommage de table, d’ID ni modification de données effectué.
- **40 fichiers / 404 525 octets archivés sans changement de contenu** dans database/archive, extension .txt et droits non exécutables : anciens initialiseurs/imports/runners Docker/pgAdmin, SQL de maintenance, anciennes migrations, dumps, schéma et migrations Prisma, updater de dates et son lecteur Wikidata avec ses tests. Le manifeste conserve chemin d’origine, taille et SHA-256 ; test d’intégrité inclus dans Vitest. Les trois migrations d’accès/durcissement appliquées et les deux opérations explicites d’attribution restent à leur emplacement. Aucun replay de glob SQL, reset, restore ou routine de maintenance distante.
- Le classement évite de présenter les anciens scripts destructifs comme des outils compatibles : certains tronquaient les tables, remplaçaient des IDs ou retiraient parent_id. Les dumps historiques déjà suivis restent des archives, pas une sauvegarde de l’état courant. Les gabarits pgAdmin inutilisés sous config ont été retirés ; ils restent récupérables dans l’historique Git. La routine distante maintain_period_relations demeure restreinte comme au lot 20 ; elle n’a pas été supprimée ni exécutée.
- Retrait des dépendances serveur axios, @prisma/client, prisma et ts-node, du runner update-dates et de l’exception de génération Prisma en CI. Le front conserve son Axios actif. Le serveur HTTP utilise seulement pg pour PostgreSQL. Manifestes et verrou API alignés ; aucune nouvelle dépendance ajoutée. La compilation nettoie désormais server/dist avant tsc : l’ancien updater et un type supprimé y subsistaient dans les sorties des précédents builds ; leur absence dans le résultat final a été vérifiée.
- Docker reste optionnel : API seule, Supabase distante et front Vite/PM2 conservés pour le développement. L’image sépare compilation, installation des dépendances de production et runtime ; USER node, contrôle /health, démarrage direct de Node. Compose : localhost:3000, lecture seule, /tmp temporaire, capacités retirées, no-new-privileges et arrêt borné à 20 secondes. Pas de PostgreSQL/pgAdmin ni de runner d’initialisation dans le compose.
- Code mort actif retiré : adaptateur src/utils/storyTemporalBounds, type serveur geological, méthodes loadStory/buildStoryQuery/transformToPeriod/isMainEon et constantes/types/champs géologiques sans consommateur ; les bornes temporelles testent directement le domaine partagé. L’alias déprécié ensureDataLoaded n’avait plus d’appelant et a été retiré. L’inventaire AST des imports statiques/dynamiques depuis main.ts et server/src/index.ts atteint les 158 modules applicatifs observés ; les deux déclarations .d.ts restent hors de ce calcul. Cela ne prétend pas prouver l’absence de toute branche morte interne à une méthode.
- **GlobalSearch était affiché sans consommateur de son événement select.** Header transmet maintenant la sélection à useAppNavigation ; les destinations sont des routes nommées avec seulement un ID ou un Q-id validé en query. Les IDs catalogue historiques restent des textes et sont encodés lors de la lecture du détail période ; leur préfixe ne doit pas être interprété comme une identité métier. Les gardes existantes s’appliquent : une personne anonyme passe par la connexion, avec destination complète conservée.
- useSearchTarget attend la réussite du chargement initial, contrôle les paramètres et gère erreur/reprise/annulation. Une période locale rejoint son chemin complet via useFinderNavigation/usePeriodPath ; le bouton de la période reçoit le focus et devient visible dans les chemins longs. Une fiche événement utilise les données canoniques du store ; si le résultat manque du cache déjà chargé, une relecture forcée est réessayable et protégée contre les ouvertures tardives. Une ancienne réponse ne remplace pas une navigation ou un brouillon manuel plus récent ; un changement de hash ou de filtre sans rapport ne rouvre pas un formulaire fermé.
- Un résultat Wikidata ouvre uniquement un brouillon avec son Q-id. « Remplir avec Wikidata » reste une action explicite, suivie de la validation du formulaire ; aucune sauvegarde automatique. Le compteur de sous-périodes reste inconnu pour un brouillon Wikidata tant qu’il n’a pas été chargé, au lieu d’annoncer zéro par défaut.
- README, guides Supabase/base/sauvegarde et documentation agent actualisés. Les anciennes instructions de backup Docker et d’exécution Prisma ont été remplacées par l’état réel et les références Supabase ; aucune stratégie de restauration complète n’est déclarée validée.

Vérifications :

- **786 tests Vitest / 59 fichiers réussis**, aucun ignoré : 31 nouveaux scénarios couvrent paramètres de destination, parcours réels App/Header/GlobalSearch vers finder/formulaire, clavier/focus, anonymat, erreurs/reprises, cache événement, annulation et intégrité des archives. Les 12 tests du lecteur de maintenance archivé et le scénario isolé loadStory sont sortis des runners avec leur code ; les tests du domaine temporel, de readOperation, des transports actifs et des mutations restent exécutés. Variation explicite : 768 − 13 + 31 = 786.
- **48 intégrations PostgreSQL locales réussies** après le nettoyage des dépendances : 8 hiérarchie, 10 suppression, 30 handlers/écritures atomiques/RLS. Cluster temporaire accessible uniquement par socket local, arrêté et supprimé. Les quatre tests de configuration TLS sans connexion passent aussi.
- Builds frontend/API, contrôle TypeScript des symboles inutilisés et git diff --check réussis. Audits complets Yarn front/API : aucun avis de vulnérabilité JS signalé au moment de la vérification ; cela ne constitue pas un scan de toutes les bibliothèques système de l’image.
- **Image Docker réellement construite (172 060 578 octets) et exécutée** avec PostgreSQL 15 Alpine jetable et certificat de test, sans charger server/.env, avec AUTH_ENABLED=false uniquement sur cette base vide de test. Le serveur courant garde AUTH_ENABLED=true. /health renvoie database=connected ; UID 1000 ; sources, .env, archives, Prisma, TypeScript, tsx et ts-node absents du runtime. Écriture sous /app refusée en lecture seule. Même image avec CA non reconnue : démarrage refusé, code 1. SIGTERM avec CA de test correcte : drainage et sortie 0. Configuration Compose valide. Les conteneurs, réseau et volume de test sont supprimés ; le port 13000 n’est plus utilisé. Le compose contre Supabase n’a pas été démarré à côté de PM2 sur 3000.
- API PM2 redémarrée avec l’arbre nettoyé : /health connecté, AUTH_ENABLED=true et réponses 200 pour la timeline, Periods, Events et les lectures catalogue locales. Front conservé sur http://127.0.0.1:5173/timeline.
- Navigateur réel connecté : recherche « Empire romain », sélection au clavier puis contrôle du chemin complet jusqu’à Empire romain ; focus sur sa ligne et défilement vers la colonne correspondante. Recherche « Chute » → fiche complète de Chute de l’Empire romain d’Occident avec catégories, titres et date ; fermeture par Annuler. Résultat Wikidata « Empire romain tardif » → brouillon Q120754706, compteur inconnu et création désactivée tant que les champs requis manquent ; fermé sans import ni sauvegarde. Captures conservées dans les livrables du lot.
- Aucune écriture de vérification sur Supabase, migration, modification de rôle/propriété, commit ou publication GitHub. Les seules lectures distantes supplémentaires portaient sur les métadonnées et deux couples ID/libellé pour confirmer la conservation des identifiants hérités.

Commandes principales exécutées depuis le dépôt :

```sh
yarn --cwd server remove axios @prisma/client prisma ts-node --ignore-scripts --non-interactive
docker build --progress=plain -t universal-timeline-api:lot27 -f server/Dockerfile server
docker compose config --quiet
yarn audit --json
yarn --cwd server audit --json
yarn test --maxWorkers=4 --reporter=dot
yarn build
yarn --cwd server build
yarn vue-tsc -p tsconfig.audit-unused.json --noEmit
node --experimental-strip-types --test server/test/database.test.mjs
yarn pm2 restart chronologie-api
git diff --check
```

Les essais Docker et PostgreSQL ont utilisé des orchestrateurs temporaires sous .tmp/lot27, des noms de test dédiés et un nettoyage en fin d’exécution. Aucune commande de restauration ou de migration Supabase n’a été lancée.

Limites pour le lot 28 : baseline complète d’une base vierge, parcours de démarrage reproductible, configuration Auth/redirects avant exposition, sauvegarde/restauration testée et CI finale. Les archives SQL sont une conservation historique, pas un schéma à installer. Les IDs/libellés et dates des données historiques n’ont pas été corrigés. Le catalogue périodes/événements reste partagé en attente de décision produit. La protection Supabase des mots de passe compromis dépend de l’offre ; aucune modification d’abonnement.

Références : [connexion PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [sauvegardes Supabase](https://supabase.com/docs/guides/platform/backups), [images Docker à plusieurs étapes](https://docs.docker.com/build/building/multi-stage/).

Recette sans enregistrer : depuis Timeline, rechercher « Empire romain » et choisir la période dans Base de données ; le finder doit la sélectionner dans son chemin complet. Revenir à Timeline, rechercher « Chute » et sélectionner l’événement romain : sa fiche doit s’ouvrir, puis fermer avec Annuler. Choisir un résultat Wikidata ouvre un brouillon Q-id ; « Remplir avec Wikidata » lit les données mais seul Créer/Mettre à jour les enregistre.


### Lot 28 — Installation neuve, validation reproductible et préparation de livraison

Statut : **validation locale et réglages Auth du développement terminés** ; domaine de livraison et reprise du projet réel encore à finaliser avant exposition. Aucun push, déploiement, création de compte ou écriture sur les données distantes.

- La structure du projet Supabase existant a été relue par les catalogues PostgreSQL, sans export de ses lignes. Version observée : PostgreSQL 17.6.1.104. La baseline database/baseline/application.sql prépare une application vide à partir des dix tables, types/colonnes, contraintes, index, quatre triggers et 21 policies actuels. Elle conserve notamment l’identité GENERATED ALWAYS des stories, les IDs texte du catalogue, le défaut de propriétaire, la visibilité privée et les clés de parenté par propriétaire. Une fixture de métadonnées revue sert de contrat de compatibilité.
- La baseline ne contient ni compte, ni story/catégorie/période/événement, ni secret, ni valeur de compteur distant. Elle exige Supabase Auth, est transactionnelle et refuse de s’exécuter si un objet applicatif existe déjà. Le refus de replay conserve les lignes fictives et le préflight d’accès. Elle est hors du dossier des migrations historiques : leurs changements sont déjà inclus, sans historique distant inventé.
- Différences documentées pour une nouvelle cible : pas d’ancienne routine maintain_period_relations, pas de copie de PostGIS ou des schémas internes Supabase ; aucune colonne applicative n’en dépend. Les séquences ne sont pas ouvertes à anon et ne donnent à authenticated que USAGE ; CREATE public est refusé aux rôles clients. Ces restrictions n’ont pas été appliquées au projet existant. Les migrations historiques restent testées séparément.
- `yarn verify` regroupe les tests, contrôle DB sans connexion, symboles inutilisés et builds. `yarn verify:clean` / node scripts/check-clean.mjs installent les deux verrous dans une image vierge, puis exécutent cette validation, les deux audits et les suites PostgreSQL 17. Le workflow GitHub utilise exactement cette dernière entrée. Le contrôle local ne vaut pas une exécution GitHub distante ; les références officielles checkout/setup-node v7 ont été vérifiées.
- L’image de test repose sur une liste explicite de fichiers : aucun .env, .git, .tmp ni node_modules du poste. Les suites applicatives/SQL ont le réseau désactivé ; l’installation et les audits seuls contactent les registres publics. Chaque suite SQL reçoit son propre PostgreSQL et son socket, sans port TCP publié, avec identifiant de ressource unique. Les bases, conteneurs et volumes sont retirés en fin de passe, y compris en cas d’échec/interruption ; aucun checkout parallèle du projet.
- La restauration est maintenant un essai réel : pg_dump de public et du schéma auth fictif, avec ACL, puis pg_restore sur une autre base jetable. Comparaison des lignes, contraintes, index, triggers et policies ; visibilité privée, privilèges des fonctions/séquences et reprise des IDs vérifiés. La doublure auth est minimale et ne contient que des adresses example.test ; ceci n’atteste pas une restauration du service Supabase Auth réel, des comptes réels ou du Storage.
- `yarn verify:config` lit les fichiers locaux et publie seulement des statuts, sans valeur de connexion ni message de parseur brut. Il vérifie la configuration DB/TLS, les accès activés, la correspondance des paramètres publiables front/API, les variables front à risque et une origine exacte. Le mode --production exige le véritable domaine HTTPS et refuse correctement l’origine de développement actuelle. Ce contrôle reste statique ; il ne consulte pas les réglages Dashboard.
- L’API refuse désormais NODE_ENV=production si AUTH_ENABLED n’est pas explicitement true. La configuration du middleware est dans le chemin de démarrage protégé par la gestion d’erreurs expurgées et l’arrêt contrôlé. Le mode historique demeure limité à la préparation locale ; le serveur courant reste authentifié. Aucun élargissement des droits de stories ni de rôle admin.
- README, guides Supabase/Auth/base/sauvegarde, documentation agent et nouveau guide Documentation/MISE-EN-SERVICE.md alignés. Le guide distingue le projet existant, la baseline vide et la préparation du futur domaine. Les fichiers de connexion présents ne sont jamais écrasés par la procédure.

Vérifications finales :

- **798 tests Vitest / 60 fichiers réussis**, aucun ignoré, dans l’image vierge. Douze nouveaux scénarios : trois sur l’activation explicite en production et neuf sur la revue de configuration/redaction/origines. Les tests actifs des lots précédents sont conservés. Quatre tests supplémentaires Node de configuration TLS hors connexion passent.
- **85 tests PostgreSQL 17 réussis**, aucun ignoré : 11 baseline complète/vrais handlers, 3 restauration, 19 accès/attributions, 8 hiérarchie, 10 suppression, 4 privilèges de fonctions et 30 écritures atomiques/RLS. Pas de test écrit dirigé vers Supabase.
- Audits Yarn complets front/API : zéro avis de vulnérabilité JS signalé au moment de la passe. Builds front/API et TypeScript des symboles inutilisés réussis. Le contrôle Git des espaces passe. Ceci n’est pas un scan de toutes les bibliothèques système de l’image.
- **Image de production API construite et démarrée contre la baseline neuve avec TLS et AUTH_ENABLED=true** : /health connecté, /api/access actif et catalogues publics vides lisibles. Le fournisseur Auth est une URL fictive dans cet essai, sans token ni requête de connexion utilisateur ; les mécanismes de données/RLS et le startup sont réels. UID 1000, lecture seule et absence de sources/.env/outils de développement vérifiés. CA non reconnue refusée, AUTH_ENABLED=false ou absent refusés alors que la base/TLS sont valides ; sorties 1. SIGTERM sur la configuration correcte : sortie 0. Les ressources de cet essai sont également supprimées ; port de test 13000 libéré.
- Configuration locale existante : six statuts OK, aucune valeur affichée. API PM2 redémarrée après le garde-fou : /health 200 avec base connectée, /api/access activé, /api/account anonyme 401 et frontend 200. Les identifiants/configurations Supabase existants sont conservés. Dans le navigateur réel, la navigation protégée Stories fonctionne après redémarrage : onze stories du compte affichées et Guerre froide ouverte en lecture avec badge Publique, une période et cinq événements. Aucun formulaire de modification ouvert ni sauvegarde.
- Métadonnées de gestion en lecture seule : organisation Pro confirmée et advisor sécurité ne signalant que la protection de mots de passe compromis désactivée. Le Dashboard reste déconnecté ; ni les URL autorisées ni cette option n’ont été modifiées. Une reconnexion utilisateur a été demandée pendant que les travaux indépendants continuaient. L’application locale et sa session restent distinctes de cette session de gestion.

Commandes principales exécutées :

```sh
node scripts/check-clean.mjs
yarn verify:config
yarn verify:config --production
docker build --progress=plain -t universal-timeline-api:lot28 -f server/Dockerfile server
yarn pm2 restart chronologie-api
git -c core.fsmonitor=false diff --check
```

Le retour 1 du contrôle de configuration --production est attendu : le domaine HTTPS de livraison n’est pas encore défini. Les essais TLS/runtime supplémentaires et leurs résultats expurgés sont conservés sous .tmp/lot28. Les premiers essais de la procédure ont servi à corriger la liste de fichiers, la commande Yarn, la conversion du tableau de rôles dans le test et la préparation du schéma public vide pour pg_restore ; la passe complète finale est celle comptabilisée ci-dessus.

La suite est le chantier UI/UX confirmé par l’utilisateur. Les réglages Auth, le futur domaine et la reprise opérationnelle demeurent des conditions de livraison explicites ; ne pas les masquer derrière le succès des tests locaux.

Références : [redirections Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls), [sécurité des mots de passe](https://supabase.com/docs/guides/auth/password-security), [sauvegarde/restauration Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [checkout v7](https://github.com/actions/checkout/tree/v7), [setup-node v7](https://github.com/actions/setup-node/tree/v7).

#### Continuation — vérification du Dashboard après reconnexion

- Dashboard du projet Universal-Timeline accessible après l’action de l’utilisateur. Site URL hérité `http://localhost:3000`, liste Redirect URLs vide. Le formulaire d’inscription utilise l’origine du front suivie de /login ; le front courant est sur `http://127.0.0.1:5173`.
- Dans Email, seule l’option Prevent use of leaked passwords a été activée puis enregistrée. La page Attack Protection affiche ENABLED ; le connecteur renvoie ensuite une liste de lints sécurité vide. Confirmation e-mail conservée active, connexion anonyme désactivée ; aucun changement d’abonnement, de compte, de rôle, de contenu ou de schéma.
- Après la confirmation explicite « Oui, enregistrer ces deux adresses », la redirection exacte `http://127.0.0.1:5173/login` et Site URL `http://127.0.0.1:5173` ont été enregistrés séparément dans Supabase. Rechargement du Dashboard : les deux valeurs persistent, liste limitée à une URL, aucun joker. La confirmation requise par la politique du navigateur est satisfaite. Le futur domaine de production demeure à choisir.
- Recontrôle en lecture seule : advisor sécurité sans alerte ; /timeline et /login 200, /health 200 avec base connectée, /api/access 200 avec enabled=true, /api/account anonyme 401. Aucune nouvelle inscription, changement de mot de passe ni envoi d’e-mail de test ; le retour réel par e-mail n’a pas été rejoué.
- Captures locales ignorées : .tmp/lot28/auth-protection.png, auth-url-proposal.png et auth-urls-saved.png ; preuves expurgées auth-dashboard-verification.json et http-after-auth-settings.json. Les résultats du code et de la base jetable précédemment validés ne sont pas réexécutés pour ces réglages et mises à jour documentaires ; contrôle des espaces effectué.
