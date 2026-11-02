# Audit de faisabilité multilingue — 2 novembre 2026

**Recommandation : conserver les contenus FR/EN et construire un vrai parcours bilingue, puis ajouter les autres langues à la demande.** La traduction du navigateur reste un complément pratique pour les langues non prises en charge. Supprimer une langue des données ferait perdre des libellés disponibles sans résoudre les problèmes de recherche ou de contribution.

L'audit porte sur le code local, y compris les modifications déjà présentes dans le répertoire de travail. Aucune modification de l'application, des dépendances ou de la base distante. Aucun relevé de couverture des traductions sur les données de production ; les proportions de textes manquants ou dupliqués restent à mesurer. Aucun essai comparatif réel des traducteurs de navigateurs : leurs limites sur les écrans dynamiques sont des risques à vérifier, pas des pannes constatées ici.

## État réel de la plateforme

Le README annonce du multilingue FR/EN. Dans le code, il s'agit surtout d'un **modèle de contenu bilingue**, pas encore d'une application dont on peut changer globalement la langue.

| Couche | Constat vérifié | Conséquence |
|---|---|---|
| Initialisation | `src/main.ts:1` : Vue, Pinia et Router, sans couche i18n ; aucune dépendance `vue-i18n` dans `package.json`. | Installer et intégrer une gestion centrale des messages et de la langue. |
| Interface | Textes français dans les vues, composants, attributs accessibles, états vides, erreurs et confirmations. | Traduire les parcours complets, au-delà du menu et des boutons principaux. |
| Affichage des données | Nombreux accès directs à `.fr`, par exemple `src/components/GlobalSearch.vue:31`, `src/components/StoryTimeline.vue:184`, `src/views/DatabaseView/StoryGallery.vue:94`. | Centraliser le choix du texte affiché, y compris dans les titres calculés, filtres et infobulles. |
| Modèle | `src/types/database.ts:61` définit `MultilingualText` avec `fr` et `en` ; `database/baseline/application.sql:32` et suivantes stockent les deux langues pour catégories, périodes, événements et frises. | Bonne base pour deux langues ; une troisième langue demanderait une évolution du contrat et du stockage. |
| Import des périodes | `src/services/WikidataQueryService.ts:39` et `:269` lisent séparément les libellés et descriptions FR/EN. | Les deux langues peuvent être conservées sans traduction automatique. |
| Import des événements | `src/services/WikidataQueryService.ts:331` utilise un seul libellé avec préférence `fr,en`, puis `src/composables/useWikidataImport.ts:49` le recopie dans `fr` et `en`. | Les deux champs peuvent contenir le même titre français même si Wikidata possède un titre anglais distinct. |
| Enfants Wikidata | `src/services/WikidataQueryService.ts:97` demande un libellé avec repli ; `:143` à `:176` reconstitue deux valeurs à partir du libellé reçu. | Un résumé enfant n'est pas une preuve que deux traductions ont été récupérées. |
| Écriture | `src/composables/useEditModal.ts:60`, `src/lib/buildNewEntityCoreFields.ts:17`, `server/src/api/inputValidation.ts:49` et `server/src/repositories/catalogueRepository.ts:23` recopient le français si l'anglais manque. | La présence d'un champ anglais ne prouve pas une traduction. Le repli devrait être calculé à l'affichage, pas enregistré comme traduction. |
| Contribution | `src/validators/editFormValidators.ts:31` et `server/src/api/inputValidation.ts:53` exigent le titre français. | Un auteur anglophone ne peut pas créer une frise uniquement en anglais. |
| Description anglaise seule | `server/src/services/mappers.ts:4` retourne `undefined` si le français manque, même avec un anglais présent. | Certains parcours API perdent une description anglaise disponible. |
| Recherche Wikidata | `src/services/SearchApiService.ts:340` et `:414` fixent `language` et `uselang` à `fr` ; la recherche par sens affiche également FR puis EN (`:405`). | Le changement de langue doit piloter la recherche et les libellés de résultats. |
| Recherche locale | `server/src/repositories/searchRepository.ts:15` recherche déjà les deux langues pour les frises. Le catalogue utilise les textes FR/EN mais un analyseur lexical `french` (`:58` à `:72`). | Une recherche anglaise n'est pas entièrement impossible aujourd'hui ; son traitement lexical et les tris restent orientés français. |
| Dates et nombres | `src/services/DateService.ts:16` accepte une locale pour les dates calendaires, mais conserve des messages français et des formats géologiques fixes ; `src/lib/storyListDates.ts:21` fixe également le français. | Localiser les formats et la grammaire sans modifier les dates historiques ni les valeurs BP. |
| Pages et liens | `index.html:2` fixe `lang="fr"`, titre et description français ; `src/router/routes.ts:5` ne distingue pas de versions linguistiques. | Prévoir langue du document, métadonnées et URL si les pages publiques doivent être référencées dans plusieurs langues. |
| Périmètre éditorial | Landing, voyage et textes de `src/lib/legalDocuments.ts` sont français. L'inscription renvoie vers `/login` sans choix de langue (`src/views/LoginView.vue:58`). | Inclure contenu éditorial, retour d'authentification et messages de compte ; vérifier séparément les modèles d'e-mails configurés dans Supabase, non inspectés ici. |

Inventaire statique du frontend : **193 occurrences de `.fr` dans 53 fichiers**, et **63 littéraux de locale `fr`/`fr-FR` dans 27 fichiers**, parmi 183 fichiers TS/Vue dont 75 composants Vue. Comptage hors dossiers `__tests__`, `testFixtures`, fichiers `.test.ts` et déclarations `.d.ts`. Les démonstrations du design system sont incluses. Ces nombres incluent des usages légitimes d'import et d'édition ; ils mesurent les zones à examiner, pas le nombre de traductions à produire.

## Comparaison des stratégies

| Stratégie | Intérêt | Limite | Avis |
|---|---|---|---|
| Interface française et traduction du navigateur | Très peu de travail pour permettre une lecture occasionnelle dans d'autres langues. | Langue des requêtes, recherche, contribution et langue des contenus enregistrés restent gérées par le code actuel. Qualité des termes historiques et comportement sur les mises à jour dynamiques à tester. | Acceptable comme solution transitoire si le public reste principalement francophone. Conserver les deux langues en base. |
| Interface anglaise unique et traduction du navigateur | Une seule langue d'interface à entretenir. | Il faut déjà traduire toute l'interface française ; mêmes limites fonctionnelles, et perte d'expérience native française. | Pas de bénéfice suffisant dans l'état actuel du projet. |
| Vrai FR/EN puis extension progressive | Exploite les données bilingues existantes ; parcours cohérents ; recherche et contribution adaptées. | Chantier initial transversal et entretien des messages. | **Meilleur compromis pour une plateforme destinée à un public international.** |
| Toutes les langues, traduction automatique intégrée partout | Couverture théorique très large. | Stockage, coût de traduction, qualité, invalidation, recherche et contrôle éditorial deviennent immédiatement complexes. | À différer jusqu'à l'existence d'une demande mesurable. |

Chrome permet bien de traduire une page selon les choix de l'utilisateur, mais cette fonction relève du navigateur et de ses réglages ([aide officielle](https://support.google.com/chrome/answer/173424?hl=fr)). Dans cette application, les paramètres de recherche sont construits explicitement en français : traduire le texte visible ne modifie pas ces paramètres. Un terme affiché dans une autre langue ne devient pas automatiquement un terme indexé dans la base.

L'affirmation « les contenus dynamiques ne se traduisent jamais dans un navigateur » serait excessive. Il faut tester les modales, suggestions, infobulles et changements de période dans les navigateurs ciblés. Même si tout le texte visible est traduit, les problèmes fonctionnels de recherche et d'écriture décrits ci-dessus subsistent.

## Politique recommandée pour les données dynamiques

**Une entité, des faits communs, plusieurs textes.** Le Q-id, les identifiants internes, relations, dates et catégories référencées restent communs à toutes les langues. Seuls les libellés, descriptions et textes éditoriaux ont des versions linguistiques. Ne pas créer une période ou une frise distincte pour chaque langue.

Pour chaque champ, distinguer : texte fourni par Wikidata dans sa langue réelle, texte écrit ou corrigé par un auteur, traduction automatique, et langue absente. Le titre et la description peuvent avoir des provenances différentes.

Pour Wikidata :

1. Continuer à récupérer les libellés et descriptions FR/EN ensemble pour la première version. Corriger les événements afin qu'ils récupèrent réellement les deux libellés.
2. Conserver les absences. Ne pas remplir un champ anglais avec du français pour satisfaire le modèle ; calculer ce repli lors de la lecture.
3. Résoudre le texte dans l'ordre : version disponible dans la langue demandée, anglais, français, autre langue source connue ; pour un libellé sans aucun texte, identifiant. Dédupliquer cette liste selon la langue demandée. Une description absente peut rester absente.
4. Conserver la langue réellement sélectionnée afin de poser `lang` sur le texte de repli et, si utile, proposer une indication discrète de sa langue. Pour les résumés à libellé unique, conserver aussi `xml:lang` au lieu de fabriquer deux traductions.
5. Lors de l'ajout d'une troisième langue, récupérer ses textes par lots pour les entités nécessaires, avec cache, puis les persister selon la politique du catalogue. Ne pas appeler Wikidata une fois par carte ou à chaque rendu. Ne pas dépendre d'un appel externe réussi pour afficher une frise déjà enregistrée.
6. Si une réponse utilise `languagefallback`, conserver les informations de langue et de repli retournées ; ne pas assimiler la clé demandée à une traduction réelle. Le type de transport actuel ne modélise que `value` pour les libellés/descriptions : il faudra l'enrichir et vérifier les réponses de l'API.

Wikidata expose déjà les textes par langue et des mécanismes de repli : il n'est donc pas nécessaire de retraduire un texte dont une version existe ([API Wikibase](https://www.mediawiki.org/wiki/Wikibase/API), [exemple officiel avec repli](https://www.wikidata.org/wiki/Wikidata:REST_API/Comparison/en)). Un repli linguistique sélectionne un texte disponible ; il ne produit pas une traduction automatique.

Pour les frises et contenus d'auteurs :

- Déclarer une langue source et autoriser la création dans cette langue, sans exiger du français. Un auteur ne doit pas devoir produire deux versions pour contribuer.
- Afficher les traductions existantes ; en leur absence, afficher l'original avec sa langue.
- Ajouter ultérieurement une action « Traduire » si le besoin existe. Une traduction générée reste identifiée comme telle, avec accès à l'original et priorité aux corrections humaines.
- Calculer les traductions en arrière-plan, les mettre en cache par contenu/version source et langue cible, et les invalider si la source change. Ne pas ajouter un appel payant à chaque affichage.
- Si cette fonction est ouverte aux frises privées, traiter leurs traductions dans le même périmètre d'accès et vérifier le traitement par le fournisseur choisi. Aucun catalogue public de traductions ne doit absorber ces contenus privés.

Exemple : une entité dispose d'un titre français et anglais. Un visiteur anglais reçoit directement son titre Wikidata anglais ; aucune traduction automatique nécessaire. Un visiteur espagnol reçoit le titre espagnol s'il existe et a été récupéré, sinon un repli explicite. Une description française écrite par l'auteur reste l'original ; elle ne devient pas une description anglaise simplement parce que le visiteur utilise l'interface anglaise.

## Mise en œuvre progressive

**Lot 1 — Fiabiliser les langues réellement présentes.** Corriger l'import événement et la description anglaise seule ; définir le contrat des champs manquants ; arrêter les copies FR → EN dans toute la chaîne formulaire/API/repository. Les colonnes `NOT NULL` et les types doivent être adaptés si l'on choisit `null` pour les titres manquants : ce changement doit être coordonné, pas effectué seulement dans le frontend. Revoir également la validation « français obligatoire ».

Mesurer ensuite sur les données réelles, en lecture seule, les champs vides, les contenus FR/EN identiques et les Q-id disponibles. Des textes identiques peuvent être légitimes, notamment les noms propres : **ne jamais effacer automatiquement les doublons**. Réimporter les traductions Wikidata dans un processus qui préserve les corrections humaines. Sans historique de provenance, l'origine des valeurs déjà présentes restera parfois indéterminable.

**Lot 2 — Construire les fondations i18n.** Ajouter Vue I18n, un choix FR/EN persistant dans le navigateur et une locale centrale ; utiliser la préférence du navigateur au premier passage, avec français comme repli de l'interface et priorité au choix explicite. Centraliser les messages, pluriels, dates, nombres, tris et l'accès aux textes des entités. Vue I18n fournit la locale globale et les chaînes de repli ([documentation officielle](https://vue-i18n.intlify.dev/guide/essentials/scope), [replis](https://vue-i18n.intlify.dev/guide/essentials/fallback)).

Conserver les formats internes des dates et des identifiants. Localiser les libellés « aujourd'hui », « il y a », les unités et l'affichage des dates avant notre ère ; ne pas confier l'interprétation des dates historiques au traducteur. Pour les erreurs API, privilégier des codes stables et paramètres que l'interface peut traduire, avec message de secours. Si les réponses API contiennent tous les textes FR/EN, le changement de langue peut réutiliser les données ; si des réponses deviennent dépendantes de la locale, inclure celle-ci dans les clés de cache et les requêtes.

**Lot 3 — Livrer des parcours FR/EN complets.** Exploration publique, landing/voyage, recherche, galerie et détail des frises, création/édition/import, compte, consentement et pages éditoriales. Inclure `aria-label`, messages annoncés aux lecteurs d'écran, infobulles et retours d'erreur. Recalculer les libellés et tris au changement de langue. Préserver les brouillons en cours et annuler ou ignorer les réponses de recherche devenues obsolètes après le changement de langue.

Adapter `wbsearchentities` à la langue active, en distinguant la langue de recherche et celle de présentation. Garder la recherche locale FR/EN et adapter son analyse lexicale, plutôt que promettre une traduction automatique de toutes les requêtes. La recherche par sens existante est un complément à évaluer ; `lang=all` dans son appel n'établit pas une qualité équivalente dans toutes les langues.

**Lot 4 — Diffusion publique et vérification.** Si le référencement international est recherché, définir des URL linguistiques stables pour les pages réellement traduites, ainsi que métadonnées, liens canoniques et `hreflang`. Préserver les URL existantes et leurs paramètres de frise. Pour l'espace de gestion, une préférence de langue peut suffire. Google recommande des URL distinctes pour les versions linguistiques et avertit des pages où seuls les éléments d'interface sont traduits ([documentation officielle](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites?hl=fr)). Ne pas annoncer comme entièrement traduites toutes les frises dont seul le menu change.

**Lot 5 — Ouvrir une troisième langue si la demande le justifie.** Avant d'ajouter des colonnes `_es`, `_de`, etc., faire évoluer le modèle vers des traductions par entité/champ/locale avec provenance et version source. Une table de traductions convient à une recherche/indexation par langue ; un objet JSONB peut simplifier le transport mais ne remplace pas la conception des index et des droits. Choisir à ce moment selon les usages mesurés. Conserver des adaptateurs FR/EN durant la migration. Les droits des traductions de frises doivent suivre ceux de la frise d'origine.

Pour un premier FR/EN, garder les colonnes actuelles est raisonnable : une refonte de stockage à N langues n'est pas un prérequis. L'interface d'accès aux textes doit en revanche masquer dès maintenant la structure physique pour éviter une nouvelle dispersion des langues dans les composants.

## Charge indicative et critères d'acceptation

Ordre de grandeur de planification, **non un devis** : 2–3 jours pour la fiabilisation des données et contrats ; 2–3 jours pour les fondations ; 3–6 jours pour les parcours et recherches ; 1–3 jours pour la validation et les pages publiques. Soit **8–15 jours de développement** pour un FR/EN cohérent, sous réserve de la taille finale du catalogue de messages et du niveau de travail éditorial. La relecture des traductions, les e-mails hébergés, la réparation du catalogue existant et une éventuelle refonte de rendu pour le SEO peuvent ajouter du travail. Une simple traduction du header serait beaucoup plus courte, mais ne remplirait pas cet objectif.

À vérifier avant de déclarer le parcours bilingue terminé :

- Basculer FR/EN sur une frise ouverte conserve son identité, ses périodes, les dates et les données du brouillon ; textes calculés, dates, tris, aide et attributs accessibles changent correctement.
- Une recherche française et anglaise retrouve les entités attendues et ouvre la même frise ; le Q-id reste utilisable dans toutes les langues. Tester séparément frises locales, catalogue et Wikidata.
- Une frise créée uniquement en anglais est acceptée et ne provoque pas de texte perdu en français.
- Une description uniquement anglaise survit aux mappings API ; une absence de traduction reste une absence dans le stockage.
- Une période et un événement avec deux libellés distincts gardent ces valeurs après import, sauvegarde, rechargement et édition.
- Les textes longs, libellés de timeline tronqués et écrans mobiles restent lisibles ; les infobulles donnent accès au texte complet.
- Un échec ou une absence de traduction n'empêche ni l'exploration ni la sauvegarde ; aucun écran ne promet une langue sans repli défini.
- Les corrections humaines survivent aux réimports. Les caches distinguent les réponses dépendantes de la langue.
- Les retours d'authentification, e-mails configurés et pages éditoriales correspondent aux langues annoncées.
- Tester la traduction navigateur en complément sur les navigateurs effectivement visés, notamment après ouverture d'une modale ou chargement d'une autre période.

## Vérifications réalisées pendant cet audit

Six suites Vitest ciblées exécutées : `entityMappers`, `dateDisplay`, `wikidataSearch`, `wikidataTimeline`, `wikidataForm`, `formValidation` : **68 tests réussis**. Ils sécurisent des comportements existants et ne constituent pas une certification multilingue.

Trois vérifications d'exécution supplémentaires, sur fonctions locales sans accès à la base :

1. `description(null, 'English only')` retourne bien `undefined` dans le mapper serveur.
2. `parseStoryWrite` copie effectivement un titre et une description français vers l'anglais absent.
3. `parseStoryWrite` refuse une frise dont le titre existe seulement en anglais, avec erreur sur `title.fr`.

Les modifications déjà présentes dans le dépôt ont été conservées. Seul ce rapport a été ajouté pour l'audit.
