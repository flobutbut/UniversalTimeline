# Étude — suivre Wikidata pour mettre à jour les dates

Date : 2026-11-12 · Périmètre : faisabilité et pertinence, aucune implémentation. Mesures faites en lecture seule sur la base de production et sur les API publiques Wikidata.

## Verdict

**Techniquement simple, mais peu utile sous la forme « mise à jour automatique ».** Une vérification périodique qui **signale** les écarts et laisse un admin décider est faisable en 1 jour (script) et suffit au volume actuel. Une écriture automatique des dates est déconseillée.

## Ce que contient le catalogue aujourd'hui

| | Périodes | Événements |
|---|---|---|
| Fiches | 648 | 910 |
| Avec Q-id | 493 | 761 |
| Avec trace d'un fait Wikidata (`wikidata_source` : Q-id, propriété, `statementId`) | 7 | 12 |

Les fiches réellement susceptibles de changer sont celles qui courent encore : **37 périodes ont pour fin `TODAY`**.

- 14 sont cosmologiques ou géologiques (Univers, Terre, Holocène…) : elles ne se termineront pas.
- 9 n'ont **pas de Q-id** (Présidence d'Emmanuel Macron, Chine contemporaine, Après la guerre froide…) : rien à écouter.
- 14 ont un Q-id et pourraient un jour recevoir une fin : Station spatiale internationale, Programme Artemis, Invasion de l'Ukraine, Cinquième République, Conquête spatiale…

Le cas cité (une personnalité quitte un poste) est justement celui que le Q-id ne couvre pas : un mandat n'est pas une entité Wikidata, c'est une déclaration `P39` portée par la personne. Les 4 présidences récentes du catalogue n'ont pas de Q-id. Seules les fiches issues de la génération (`wikidata_source` avec `statementId`) permettent de suivre une telle déclaration : il y en a 19, dont **une seule encore ouverte**.

## Faisabilité technique

Vérifié le 12/11/2026 :

- **Détecter un changement** : `schema:dateModified` en SPARQL, ou `action=query&prop=revisions` (50 Q-id par appel). Les 1 254 Q-id tiennent en 4 requêtes SPARQL de 400, comme dans `scripts/wikipedia-titles-backfill.mjs`.
- **Relire les dates** : `P580`/`P571` (début), `P582`/`P576` (fin), `P585` (date), `P570` (décès), via `psv:` et `src/lib/wikidataTime.ts` (règle 25). Les 8 entités testées répondent en une requête ; aucune des périodes `TODAY` testées n'a de fin dans Wikidata.
- **Pas d'abonnement possible** : Wikidata ne propose pas de webhook par entité. Le flux EventStreams existe mais demande un processus permanent, incompatible avec Vercel. Une vérification hebdomadaire suffit.

Trois endroits possibles pour l'exécuter :

| Option | Coût | Limite |
|---|---|---|
| **Script lancé à la main** (modèle du backfill : lit une liste de Q-id, produit un rapport et un SQL à relire) | ~1 jour | Dépend de la régularité de l'admin |
| GitHub Actions planifié | ~1,5 jour | Il faut lui donner un accès en lecture à la base (secret à créer) |
| Cron Vercel + file de propositions dans Administration | 3 à 4 jours, une migration | Seule option avec validation en un clic et mémoire des écarts refusés |

## Pourquoi pas d'écriture automatique

1. **Aucune provenance stockée.** Hors des 19 fiches générées, la base ne dit pas si une date vient de Wikidata ou d'un choix éditorial (règle 24). Beaucoup de dates ont été arrondies ou regroupées à la main (`Documentation/CREATION-DE-FRISES.md`). Un premier passage produira donc beaucoup d'écarts qui ne sont pas des erreurs, et une écriture automatique écraserait ce travail.
2. **Fiabilité de Wikidata sur l'actualité.** Les décès et fins de mandat sont la cible habituelle des canulars et des modifications prématurées. Reprendre la valeur sans délai ni relecture, c'est les publier.
3. **Dates non convertibles.** Précision au siècle, calendrier julien, valeurs multiples : la règle 25 impose une date vide et un avertissement, donc une décision humaine.
4. **Règles du projet.** Toute modification du catalogue passe par un script relu et un accord avant la production (règle 31) ; un robot sans compte contournerait la garde d'écriture (règle 36).
5. **Effets en chaîne.** Clore une période peut imposer d'en créer une suivante (nouvelle présidence), ce qu'aucune lecture de dates ne fait.

## Recommandation

1. **Maintenant, si le besoin est réel : le script manuel**, limité aux périodes `TODAY` avec Q-id, aux faits générés encore ouverts et aux personnes sans date de décès. Il produit un rapport d'écarts et, pour ceux retenus, un SQL transactionnel avec rollback.
2. **Avant d'aller plus loin : donner un Q-id ou un `wikidata_source` aux fiches à suivre.** Sans cela, les mandats ne seront jamais détectés. C'est le vrai prérequis du cas d'usage.
3. **Cron et file d'attente dans l'administration : seulement si le catalogue accueille beaucoup de personnes vivantes ou de mandats en cours.** Avec une quinzaine de fiches concernées, l'outil coûterait plus que la veille manuelle.

## Non vérifié

- Le nombre de fiches qui sont des personnes vivantes n'a pas été mesuré sur Wikidata (`P31 = Q5` sans `P570`) ; par les libellés, le catalogue contient surtout des périodes et événements historiques.
- L'ampleur des écarts entre dates stockées et dates Wikidata sur l'ensemble du catalogue : elle ne se connaît qu'en lançant un premier passage.
