# Exploration et tags — pistes mises de côté

Date : 30 octobre 2026.
Statut : conservé pour reprise ultérieure, à la demande de l’utilisateur. Cette note ne vaut pas validation d’une implémentation et ne déclenche aucun changement applicatif.

## Besoin exprimé

Permettre l’exploration de n’importe quelle époque ou sujet : origine de l’Univers, division cellulaire, Troisième Reich, vie de Picasso. La navigation doit permettre d’approfondir, de changer de thème ou de parcours et de revenir à son contexte précédent.

L’utilisateur a explicitement confirmé que l’exploration souhaitée comprend le catalogue existant **et les découvertes externes**, notamment Wikidata.

Les catégories fermées ne répondent pas au besoin à long terme. L’utilisateur souhaite pouvoir ouvrir la création de catégories/tags aux utilisateurs, en tenant compte des doublons, variantes orthographiques, synonymes et divergences de sens.

## Pistes d’exploration à reprendre

- Période de référence « Univers » comme entrée possible, plutôt qu’une story imposée. Proposition discutée, pas encore implémentée ni définitivement arbitrée.
- Accès direct à une époque ou à un sujet par recherche ; ne pas imposer une descente depuis l’origine de l’Univers.
- Catalogue accessible comme fond d’exploration ; thèmes comme chemins transversaux ; stories comme parcours éditoriaux à périmètre annoncé.
- Passage explicite entre parcours guidé et exploration libre, avec conservation des repères temporels.
- Découverte progressive de contenus externes sourcés, sans importation implicite dans le catalogue ou les stories.
- Relations entre sujets au-delà d’une arborescence unique : recouvrement temporel, personne, lieu, discipline, événement ou processus.
- Distinguer la hiérarchie du contexte et l’historique des visites ; prévoir des retours et un état partageable/restaurable.

Question restée ouverte : « division cellulaire » désigne-t-elle aussi l’exploration des étapes d’un processus sur une chronologie relative, ou uniquement son apparition dans l’histoire du vivant ? Les deux usages ont des repères temporels différents.

Voir l’audit détaillé et ses priorités : [AUDIT-UX-EXPLORATION.md](AUDIT-UX-EXPLORATION.md). Ses recommandations restent à cadrer ; les constats de l’audit initial ne décrivent pas tous l’état actuel après correctifs.

## Couverture des catégories observée lors de la discussion

Les 18 catégories présentes : Cosmologie ; Astrophysique ; Physique Théorique ; Physique des Particules ; Chimie ; Géologie ; Océanographie ; Écologie ; Biologie Évolutive ; Microbiologie ; Botanique ; Paléontologie ; Anthropologie et Archéologie ; Histoire et Civilisations ; Économie ; Religion et Philosophie ; Art et Culture ; Technologie et Innovations.

Domaines manquants ou insuffisamment détaillés relevés : biologie cellulaire et moléculaire ; médecine et santé ; politique/institutions/droit ; sociétés et vie quotidienne ; agriculture et alimentation ; climat/météorologie ; zoologie/physiologie ; mathématiques/informatique ; psychologie/neurosciences ; langues/éducation. Certains sont partiellement couverts par les catégories existantes.

Cette analyse de couverture ne constitue pas une liste fermée de catégories à ajouter. La préférence exprimée ensuite est d’ouvrir la contribution et de structurer progressivement les tags.

## Principes proposés pour les tags

Proposition de travail : création ouverte, aide à la saisie et entretien progressif du vocabulaire partagé.

1. Un concept possède un identifiant stable, distinct du texte utilisé pour le nommer.
2. Plusieurs appellations ou traductions peuvent désigner un même concept.
3. La saisie propose des concepts existants, accompagnés d’un court sens et de variantes ; l’utilisateur peut aussi créer un nouveau tag.
4. Une similarité de texte ou une proximité thématique ne suffit pas à fusionner des concepts.
5. Les rapprochements ambigus doivent pouvoir être vérifiés et discutés. Les fusions éventuelles doivent rester traçables et réversibles.
6. Conserver qui a associé un tag à un contenu et dans quel contexte ; distinguer l’usage personnel d’une classification partagée.
7. L’automatisation peut proposer des rapprochements, sans transformer silencieusement une suggestion en équivalence validée.

Exemples à garder pour une maquette ou une recette :

| Cas | Comportement proposé |
|---|---|
| Faute ou variante d’écriture | Proposer un concept existant pendant la saisie |
| ADN / acide désoxyribonucléique | Appellations d’un même concept |
| Mars, planète / divinité | Concepts distincts, description pour choisir |
| Mitose / division cellulaire | Relation spécifique/générale, sans fusion automatique |
| Interprétation divergente | Conserver auteur/contexte et permettre une discussion |

Ne pas mélanger automatiquement thème et type de sujet : personne, régime politique et processus biologique peuvent chacun être liés à plusieurs thèmes.

## Travaux de recherche repérés

- **Golder et Huberman, 2005/2006 — The Structure of Collaborative Tagging Systems / Usage Patterns of Collaborative Tagging Systems.** Analyse des usages et de leur stabilité dans les systèmes collaboratifs. La stabilité collective ne garantit pas la résolution de chaque ambiguïté. [Prépublication des auteurs](https://arxiv.org/abs/cs/0508082).
- **Peters et Weller, 2008 — Tag Gardening for Folksonomy Enrichment and Maintenance.** Cadre d’entretien et d’enrichissement progressif des tags. [Article et résumé](https://www.webology.org/abstract.php?id=152).
- **Holstrom, 2020 — The Effects of Suggested Tags and Autocomplete Features on Social Tagging Behaviors.** Dans l’expérience rapportée, l’autocomplétion améliore la cohérence, réduit les fautes et le temps par tag ; les simples suggestions n’ont pas les mêmes effets significatifs sur les mesures étudiées. Résultat à replacer dans le contexte de l’étude, pas une garantie pour toute interface. [Article](https://asistdl.onlinelibrary.wiley.com/doi/10.1002/pra2.263).

Mots-clés de recherche : folksonomie, indexation collaborative, social tagging, vocabulary problem, entity reconciliation, tag gardening.

## Standards et outils à évaluer

| Référence | Usage potentiel | Limite / place proposée |
|---|---|---|
| [SKOS — W3C](https://www.w3.org/TR/skos-primer/) | Concepts, libellés préférés, variantes, définitions et relations | Modèle d’inspiration ; pas une obligation d’installer une infrastructure RDF |
| [Wikidata](https://www.wikidata.org/wiki/Help:Items) et [alias](https://www.wikidata.org/wiki/Help:Aliases) | Identifiants externes et appellations multilingues | Liaison facultative ; un concept local doit pouvoir exister sans équivalent Wikidata |
| [OpenRefine](https://openrefine.org/docs/manual/reconciling) | Examen des doublons et rapprochement avec un référentiel | Entretien par lots ; décisions sémantiques à vérifier humainement |
| [Clustering OpenRefine](https://openrefine.org/docs/technical-reference/clustering-in-depth) | Variantes syntaxiques | La ressemblance des chaînes ne résout pas le sens |
| [VocBench](https://vocbench.uniroma2.it/doc/user/) | Gestion collaborative, historique et validation d’un vocabulaire | À considérer si la gestion éditoriale devient importante |
| [Annif](https://annif.org/) | Suggestions de sujets à partir de textes, avec vocabulaire et données d’apprentissage | Étape ultérieure ; ne résout pas à lui seul la création ouverte de concepts |

La sélection ci-dessus repose sur les fonctions documentées et leur adéquation possible au projet. Aucun benchmark comparatif ni déploiement de ces outils n’a été réalisé.

## État de l’application à la mise de côté

- Audit UX conservé dans le dépôt et suivi dans SUIVI-AUDIT.md.
- Transmission des catégories d’événements à la frise corrigée au lot UI09 ; Eukaryota et Explosion cambrienne se mettent mutuellement en évidence via Biologie évolutive.
- Transparence des marqueurs liés retirée au lot UI10.
- Création collaborative des tags, nouvelle origine de navigation et exploration libre/externe : sujets de cadrage mis de côté, pas des fonctionnalités livrées.
- Aucun de ces points de discussion n’autorise à modifier des catégories, des droits ou des liens de stories dans les données existantes.

## Pour reprendre

Relire cette note et l’audit UX, puis choisir un premier scénario de navigation et de création de tag à maquetter. Arbitrages encore ouverts : portée personnelle ou partagée des tags ; règles de publication/modération ; gestion des sens distincts ; gouvernance des fusions ; articulation entre thèmes, types de sujets et relations ; chronologies absolues et relatives.
