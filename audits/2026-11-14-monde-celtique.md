# Frise « Le monde celtique » (87)

Date : 14 novembre 2026. Frise créée le 13 novembre par le compte Olivier, qui en reste propriétaire et auteur. Analyse, corrections, compléments et liens appliqués en production après accord de l’administrateur.

## État initial

10 périodes, 7 événements, tag Peuplement & société, aucune description, titre anglais identique au titre français, aucune frise parente ni aucun accès. Contenu pertinent et bien décrit, avec réutilisation de fiches communes (Hallstatt, La Tène, guerre des Gaules, Gaule romaine, Bretagne romaine, Alésia, Boudica).

Problèmes relevés :

- toutes les périodes à la racine : 7 lignes dans l’exploration ; *Gaule celtique* doublait Hallstatt et La Tène pour la seule Gaule ;
- Grande Expédition écrite `-0279 → -0278` (années astronomiques), soit 280 → 279 av. J.-C. au lieu de 279 → 278 ;
- six dates au format ISO négatif, justes mais hors du format canonique `N BCE` ;
- Bretagne romaine sans titre Wikipédia.

## Changements

- **Frise** : « Le monde celtique » / « The Celtic world », descriptions française et anglaise, tag Conflits ajouté.
- **Dates** : Grande Expédition 279 → 278 av. J.-C. ; champs d’urnes, Narbo Martius, Télamon, sac de Rome et première mention des Celtes au format `N BCE`, même instant.
- **Structure (4 lignes)** : champs d’urnes, Hallstatt, La Tène sur la première ligne ; sous La Tène, Grande Expédition, guerres celtibères (nouvelle, Q2446231, 181-151 av. J.-C.) et guerre des Gaules ; Gaule romaine, puis Bretagne romaine ; nouvelle période sans thème *Haut Moyen Âge celtique* (400-800) avec l’Irlande chrétienne et l’émigration bretonne. *Gaule celtique* retirée de la frise, conservée sur Histoire de France.
- **Événements** : tombe de Vix (vers 500 av. J.-C.), siège de Numance (133 av. J.-C.), druides de Mona (60), fondation d’Iona (563), Livre de Kells (vers 800), et le mur d’Hadrien existant. 13 événements : tout s’affiche à l’ouverture.
- **Accès** : depuis Âges des métaux (La Tène), Antiquité (racine), Histoire de France (Gaule celtique), Angleterre (Bretagne romaine), Antiquité romaine (guerre des Gaules) ; vers Histoire de France (Gaule romaine), Angleterre (Bretagne romaine), Antiquité romaine (guerre des Gaules), Jules César (Alésia), Âges des métaux (Hallstatt).

Écartés faute de date fiable (siècle seulement dans Wikidata) : monnaie gauloise, cotte de mailles, chaudron de Gundestrup, calendrier de Coligny.

## Écart avec la proposition

Le rattachement historique à Âges des métaux (21) est refusé par la contrainte `stories_parent_same_owner` : une frise ne peut avoir pour parente qu’une frise du même propriétaire. La frise d’Olivier reste sans parente ; elle est accessible par les cinq accès entrants, qui n’ont pas cette contrainte.

## Lot

[Générateur](../database/data/20261114_monde_celtique_source/build.mjs), [JSON](../database/data/20261114_monde_celtique.json), [transaction](../database/data/20261114_monde_celtique.sql), [retour arrière](../database/data/20261114_monde_celtique_rollback.sql). La transaction refuse de s’appliquer si la frise ou l’une des fiches a changé depuis l’analyse.

Sur PostgreSQL 17 jetable, avec les lignes de production : application (11 périodes, 13 événements, 10 accès), refus d’une seconde exécution, retour arrière rétablissant toutes les lignes à l’identique hors dates de modification automatiques. L’inverse n’a pas été exécuté en production.

## Vérification en production

Frise 87 : 11 périodes, 13 événements, 10 accès, tags Peuplement & société puis Conflits, aucune ancre cassée, aucun jumeau ; *Gaule celtique* toujours sur la frise 51. Sur le site, l’ouverture montre les périodes sur quatre lignes et le Livre de Kells comme borne de fin.

## Non vérifié

- Les accès depuis les cinq frises sources n’ont été contrôlés qu’en base.
- Le sac de Rome et Télamon pourraient aussi figurer sur Antiquité romaine (45) ; non fait.
