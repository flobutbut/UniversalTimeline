# Créer une frise — règles et bonnes pratiques

Ces règles viennent de la création des frises de novembre 2026 et de l'audit du 3 novembre 2026, qui a montré que la plupart des incohérences venaient du rôle flou des frises les unes par rapport aux autres. Elles complètent le modèle décrit dans [RELATIONS-FRISES.md](RELATIONS-FRISES.md). La liste des frises envisagées est dans [FRISES-A-CREER.md](FRISES-A-CREER.md).

## 1. Le modèle en bref

- Une **frise** (`stories`) organise des **périodes** et des **événements** du catalogue partagé.
- Les fiches de `periods` et `events` sont **communes à toutes les frises**. Modifier leur libellé, leur description ou leurs dates les change partout. Pour une variante propre à une frise, créer une nouvelle fiche.
- `story_periods` place chaque période dans la frise. Un `parent_period_id` NULL fait de la période une racine de cette frise. La même période peut avoir des parents différents d'une frise à l'autre.
- `story_events` rattache les événements. Ils s'affichent selon leur date, sans lien obligatoire avec une période.
- **Place dans l'arbre** :
  - `parent_story_id` donne le fil d'Ariane ;
  - `story_anchors` donne la période de la frise parente sur laquelle la nouvelle frise est proposée ;
  - `story_entry_points` ajoute d'autres accès depuis d'autres frises ;
  - `story_period_presentations` inscrit la frise dans un parcours chronologique (précédente, suivante).

## 2. Architecture : le rôle de chaque frise

### Trois rôles

| Rôle | Ce qu'elle contient | Exemples |
| --- | --- | --- |
| **Portail** | Les grandes périodes qui ouvrent chacune sur une sous-frise, et les quelques événements qui marquent les bascules | Guerres modernes (4), Moyen Âge (15) |
| **Récit** | Un sujet raconté en détail : des périodes sur trois niveaux au plus, de 3 à 10 par niveau, et ses événements | Seconde Guerre mondiale (9), Les croisades (32) |
| **Parcours** | Une lecture qui traverse d'autres frises, dans l'ordre chronologique ou par thème. Il relie des contenus sans les posséder | Grandes périodes de l'histoire européenne (24) |

Un récit devient portail pour une de ses périodes dès que celle-ci sert d'ancre à une sous-frise. Le rôle se déduit donc de la structure : il n'a pas à être saisi.

### Un lien par type de relation

| Relation | Mécanisme | Règle |
| --- | --- | --- |
| **Contient**, dans le temps et par le sujet | `parent_story_id` et `story_anchors` | Une seule frise parente. L'ancre est la période de la parente qui englobe le cœur du sujet ; un débordement aux marges est admis (Grandes découvertes commence en 1415, avant l'Époque moderne). |
| **Vient avant ou après** | `story_period_presentations`, dans une frise parcours | Des époques successives sont **sœurs** dans un parcours, jamais parente et enfant. |
| **Concerne aussi** | `story_entry_points` | Depuis une période ou un événement que les deux frises partagent. Un point d'entrée ne remplace pas un rattachement et ne saute pas de niveaux de l'arbre. |
| **Se décompose en** | `story_periods.parent_period_id` | La structure interne d'une frise, sans chevauchement inutile (voir section 4). |

### Règles d'architecture

1. **Toute frise a une parente**, sauf la racine « Univers moderne ». Une frise sans parente est un brouillon et reste privée.
2. **Pas de structure en double.** Quand une période devient une sous-frise, la parente garde cette période, qui sert d'ancre, et retire ses sous-périodes : elles vivent dans la sous-frise.
3. **Une période devient une frise** quand au moins un de ces signes apparaît :
   - plus de 10 sous-périodes, ou plus de deux niveaux sous elle ;
   - une dizaine d'événements qui lui sont propres ;
   - un sujet qu'on voudrait ouvrir directement depuis la recherche.

   Sinon, elle reste une période de récit.
4. **Une frise d'une ou deux périodes sans événement propre** est soit un portail (elle doit alors avoir des sous-frises), soit une période à ranger dans une autre frise.
5. **Les époques successives se suivent par un parcours**, pas par la parenté. Exemple à corriger : l'Époque moderne (16) est aujourd'hui enfant du Moyen Âge (15).
6. **Un point d'entrée relie des voisins** : frises sœurs, niveaux adjacents ou thème partagé. Pour atteindre une frise éloignée dans l'arbre, passer par sa parente.

### Arbre cible (proposition à valider avant migration)

```
Univers moderne (1)                              portail
├─ Big Bang et ères primordiales (3)             récit
└─ Histoire géologique de la Terre (11)          portail du temps profond
   ├─ Histoire du climat (23)
   └─ Histoire de la vie sur Terre (2)           sans l'arbre géologique, ancrée sur le Phanérozoïque
      ├─ Les cinq grandes extinctions (22)
      ├─ Le temps des dinosaures (29)
      └─ Genre Homo (5)                          portail de l'histoire humaine
         ├─ Préhistoire récente (19)             portail : Néolithique (20), Âges des métaux (21)
         ├─ Antiquité (10)
         ├─ Moyen Âge (15)
         ├─ Époque moderne (16)                  sans l'histoire contemporaine
         └─ Époque contemporaine                 nouvelle, reprend les racines contemporaines de 16
Parcours : Grandes périodes de l'histoire européenne (24) enchaîne Antiquité → Moyen Âge → Époque moderne → Époque contemporaine.
```

### Migrer l'existant

- **Frise par frise**, chaque étape dans une transaction, avec son SQL inverse conservé.
- **Ne jamais supprimer une fiche partagée** : une migration déplace ou retire des appartenances, des ancres, des points d'entrée et des présentations.
- **Après chaque étape**, contrôler les ancres, les points d'entrée, les présentations et l'affichage sur le site.

### Ce que l'interface doit faire à la place de l'utilisateur

Ces règles doivent être appliquées par l'interface, pour que l'utilisateur n'ait pas à les connaître :

- **Créer une frise** : la parente et l'ancre sont demandées. L'ancre est proposée automatiquement, c'est la période de la parente qui contient les dates du sujet. Sans parente, la frise reste privée.
- **Créer une frise depuis une période** : les sous-périodes sont **déplacées** vers la nouvelle frise au lieu d'être copiées, la période reste dans la parente comme ancre, et la présentation est créée.
- **Signaler, sans bloquer** :
  - un niveau de plus de 10 éléments, avec une proposition de regroupement ou de sous-frise ;
  - une sous-période qui déborde de son parent ;
  - une période dont les sous-périodes existent aussi dans une sous-frise ;
  - un point d'entrée qui saute des niveaux.
- **Proposer « Promouvoir en sous-frise »** sur une période qui remplit les critères de la règle 3.
- **Afficher le rôle déduit** (portail, récit, parcours) dans le détail de la frise.
- **Calculer les années stockées à chaque écriture** avec `temporal.ts`, et faire lire les dates plutôt que les nombres stockés par la miniature des cartes.

## 3. Avant de créer : partir de l'existant

1. **Lister ce qui est déjà en base** sur le sujet : périodes, événements et frises proches. Réutiliser une fiche plutôt que la dupliquer ; les frises se relient alors naturellement.
2. **Choisir le rôle, la frise parente et l'ancre** (section 2). L'ancre est une période **présente dans la frise parente**, celle qui englobe le cœur du sujet. Si le sujet suit une époque déjà en base plutôt qu'il ne s'y inclut, il s'agit d'une sœur dans un parcours, pas d'une enfant.
3. **Repérer les autres points d'accès utiles** : une frise sœur ou thématique qui partage une période. Exemple : « Histoire du climat » → « Révolutions industrielles » par la période « Réchauffement climatique actuel ».

## 4. Structurer pour une lecture claire

**Comment la timeline range les périodes.** Elle range les périodes d'un même niveau sur des lignes, dans l'ordre chronologique. Chaque période prend la **première ligne où elle ne chevauche rien**.

Conséquences :
- **Une longue période au même niveau que des phases successives casse leur alignement.** Exemple : « Réchauffement climatique actuel » (1850 → aujourd'hui) à côté des révolutions industrielles faisait descendre la deuxième révolution d'une ligne.
- **Regrouper les phases successives sous une période englobante.** Exemple : « Ère industrielle » contient les révolutions et la Grande accélération. Ouverte, elle les aligne sur une ligne.
- **Les recouvrements doivent avoir du sens.** Deux lignes pour deux histoires réellement simultanées, c'est bien : France et Amériques dans « L'âge des révolutions ». Deux lignes pour deux périodes qui se doublent, ce n'est pas bien : « Guerres napoléoniennes » et « Premier Empire » ; garder une seule période et mettre les batailles en événements.
- **Ajuster les bornes au jour près pour éviter un faux chevauchement** : Premier Empire jusqu'au 22 juin 1815, Restauration à partir du 8 juillet 1815.

Autres règles :
- **Chaque sous-période doit tenir dans les dates de sa période parente.** Si elle déborde, la remonter d'un niveau ou élargir le parent.
- **Viser 3 à 10 éléments par niveau.** Au-delà, ajouter un niveau de regroupement ou découper en sous-frises.
- **Une frise trop large se découpe.** Utiliser « Créer une frise depuis une période » dans l'interface, ou reproduire sa logique : sous-arbre repris, événements compris dans les dates, catégories reprises, ancre sur la période de départ. Puis **retirer les sous-périodes de la frise parente** (règle 2 de la section 2) ; aujourd'hui, l'interface les copie et ce retrait reste à faire à la main.

## 5. Les dates

Il n'y a **qu'un seul moteur de dates** : `server/src/shared/temporal.ts`. Ne jamais calculer les années à la main.

Le moteur ramène toute date sur un seul axe, en années avant aujourd'hui. Le texte stocké, lui, suit **un format canonique par échelle** ; depuis le 3 novembre 2026, toute la base l'applique.

| Cas | Format à écrire | Affichage |
| --- | --- | --- |
| Temps profond (au-delà d'environ 12 000 ans) | `G13.8`, `M66`, `K40` (années avant aujourd'hui) | « il y a 66.0 Ma », « 40 000 ans » |
| Années avant J.-C. | `3000 BCE` | « 3000 av. J.-C. » |
| Jour avant J.-C. | ISO sans heure, en année **astronomique** : `-0489-08-12` (an 0 = 1 av. J.-C.) | « 12 août 490 av. J.-C. » |
| Années après J.-C., précision année | `0950`, `1850` (toujours 4 chiffres) | « 950 », « 1850 » |
| Précision mois | `1958-03` | « mars 1958 » |
| Précision jour | `1789-07-14` | « 14 juillet 1789 » |
| Heure réellement connue | `1969-07-16T13:32:00Z` | avec l'heure |
| Jusqu'à aujourd'hui | `TODAY` | « aujourd'hui » |

- **Ne jamais écrire d'horodatage complet** (`…T00:00:00Z`) sans heure réelle : le moteur en déduit une précision à la seconde et affiche un « 1 janvier » parasite.
- **Deux conventions pour les années négatives.** Le moteur suit la norme ISO, avec un an 0 : `-0490` vaut 491 av. J.-C. L'API JSON de Wikidata (`wbgetentities`) n'en a pas : `-0490` y vaut 490 av. J.-C. ; le SPARQL de Wikidata, lui, suit la norme. Une date reprise du JSON de Wikidata s'écrit donc `490 BCE`, jamais `-0490`.
- **Temps profond : compter depuis aujourd'hui**, avec `G`, `M` ou `K`. Une année ISO comme `-66000000` compte depuis l'an 0 et décale de 2 026 ans.
- **Choisir la précision réelle de la source.** Pas de jour inventé quand seule l'année est connue.
- **Avant 1582, utiliser les dates usuelles (calendrier julien)** : Crécy le 26 août 1346, pas le 3 septembre que donne Wikidata en grégorien proleptique.
- **`start_years_bp`, `end_years_bp` et `date_years_bp`** se calculent avec `yearsBeforePresent()`, arrondis à 3 décimales pour éviter les artefacts du type `66400000.00000001`.
- **Le début doit être strictement antérieur à la fin.**
- **Les années stockées dépendent de la date du calcul.** Pour une frise au jour près, recalculer les `*_years_bp` des anciennes fiches réutilisées en même temps que les nouvelles, sinon une sous-période semble déborder de son parent de quelques mois.

## 6. Identifiants Wikidata

- Les retrouver par la recherche Wikidata (`wbsearchentities`) ou par une requête SPARQL sur les libellés anglais. **Ne jamais deviner un Q-id.**
- **`wikidata_id` est unique** dans `periods` et, séparément, dans `events`. Si l'élément est déjà porté par une autre fiche, il y a deux cas :
  - réutiliser la fiche existante ;
  - ou créer la nouvelle fiche **sans** Q-id. Exemple : la période « Révolution française » sans Q-id, parce que l'événement du même nom porte Q6534.
- L'**identifiant interne** (`id`) d'une nouvelle fiche est un UUID. Ne pas réutiliser un Q-id comme `id` : d'anciennes fiches l'ont fait, et cela crée des confusions (l'événement `Q217450` est la bataille d'Actium, alors que Q217450 sur Wikidata est le traité de Paris).
- Ajouter un contrôle en tête de script : refuser l'insertion si l'un des Q-ids existe déjà.

## 7. Contenu

- **Titre et description en français et en anglais.** La description de frise tient en une ou deux phrases et dit ce que la frise montre. Celle de chaque fiche est factuelle et courte (une phrase), sans dates répétées.
- **Catégories** : deux ou trois catégories existantes par fiche et par frise, parmi `CAT_ANTHRO`, `CAT_ART`, `CAT_ASTRO`, `CAT_BIO_EVO`, `CAT_BOT`, `CAT_CHEM`, `CAT_COSMO`, `CAT_ECO` (économie), `CAT_ECO_SYS` (écologie), `CAT_GEO`, `CAT_HIST`, `CAT_MICRO`, `CAT_OCEAN`, `CAT_PALEO`, `CAT_PART`, `CAT_PHILO`, `CAT_PHYS`, `CAT_TECH`. Ne pas créer de catégorie au passage.
- **Auteur** : le nom d'utilisateur du compte propriétaire. L'API l'impose à la création ; un script doit écrire le même nom, aujourd'hui « flobutbut » (compte `727252ea-…`, propriétaire de toutes les frises).
- **Propriétaire et visibilité** : `owner_user_id` du compte. `is_public = true` seulement pour une frise relue.
- **Événements de contexte** : relier aussi les causes et conséquences. Exemples : volcanisme et impact pour les extinctions, Arrhenius et la courbe de Keeling pour le climat.

## 8. Écrire en base

- **Par l'interface** : c'est le chemin normal, qui applique la validation, les droits et l'auteur automatiquement.
- **Par script, pour une frise complète** :
  - Générer le SQL avec un petit script Node qui importe `temporal.ts`. Il calcule les années, vérifie les bornes et l'imbrication, et produit **un seul bloc `DO $$ … $$` transactionnel**.
  - **Relire le SQL** avant de l'exécuter.
  - **Exécuter sur la production seulement avec l'accord explicite** du propriétaire.
  - Ordre dans le bloc : la frise (`RETURNING id INTO sid`), ses catégories, son ancre, les nouvelles fiches et leurs catégories, `story_periods` (parents avant enfants), `story_events`, puis les points d'entrée.
  - Ne jamais passer par l'API REST publique de Supabase. Ne jamais supprimer ni modifier une fiche partagée sans le vérifier.
- **Tester localement les changements de schéma**, jamais les ajouts de contenu : une base PostgreSQL 17 jetable, comme décrit dans [../database/baseline/README.md](../database/baseline/README.md).

## 9. Après la création

1. **Contrôler en base** : nombre de périodes et d'événements, ancre, points d'entrée.
2. **Ouvrir la frise sur le site** (`/timeline?story=<id>`) et vérifier :
   - le fil d'Ariane ;
   - les dates affichées et leur précision ;
   - le rangement des lignes, au premier niveau puis en ouvrant les regroupements ;
   - le badge « frise associée » sur la période d'ancrage ou d'entrée.
3. **La vue « Frises » garde la liste chargée au début de la session** : recharger la page pour voir une frise créée hors de l'interface.
4. **Mettre à jour** [FRISES-A-CREER.md](FRISES-A-CREER.md) : arbre, points d'entrée, priorités.

## Liste de contrôle

- [ ] L'existant a été recherché et réutilisé ; aucun doublon de Q-id.
- [ ] Le rôle de la frise (portail, récit ou parcours) est clair.
- [ ] La frise parente contient le sujet ; l'ancre est présente dans la parente ; une époque qui suit une autre passe par un parcours, pas par la parenté.
- [ ] Aucune structure en double : les sous-périodes devenues une sous-frise ont quitté la parente.
- [ ] Les points d'entrée relient des voisins et ne sautent pas de niveaux.
- [ ] Les phases successives sont regroupées ; les recouvrements restants ont un sens.
- [ ] Chaque sous-période tient dans son parent ; tous les intervalles vont du plus ancien au plus récent.
- [ ] Les dates sont au bon format (`N BCE`, `AAAA`, `M…`), avec la bonne précision et les années calculées par `temporal.ts`.
- [ ] Les textes sont en français et en anglais ; les catégories sont existantes ; l'auteur est le nom d'utilisateur du compte.
- [ ] Le SQL a été relu, la transaction est unique et l'accord pour la production est donné.
- [ ] La frise a été vérifiée sur le site, et la feuille de route est à jour.
