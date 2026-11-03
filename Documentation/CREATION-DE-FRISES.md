# Créer une frise — règles et bonnes pratiques

Ces règles viennent de la création des frises Néolithique, extinctions, climat, révolutions industrielles, Mésopotamie et âge des révolutions (novembre 2026). Elles complètent le modèle décrit dans [RELATIONS-FRISES.md](RELATIONS-FRISES.md). La liste des frises envisagées est dans [FRISES-A-CREER.md](FRISES-A-CREER.md).

## 1. Le modèle en bref

- Une **frise** (`stories`) organise des **périodes** et des **événements** du catalogue partagé.
- Les fiches de `periods` et `events` sont **communes à toutes les frises**. Modifier leur libellé, leur description ou leurs dates les change partout. Pour une variante propre à une frise, créer une nouvelle fiche.
- `story_periods` place chaque période dans la frise. Un `parent_period_id` NULL fait de la période une racine de cette frise. La même période peut avoir des parents différents d'une frise à l'autre.
- `story_events` rattache les événements. Ils s'affichent selon leur date, sans lien obligatoire avec une période.
- **Place dans l'arbre** :
  - `parent_story_id` donne le fil d'Ariane ;
  - `story_anchors` donne la période de la frise parente sur laquelle la nouvelle frise est proposée ;
  - `story_entry_points` ajoute d'autres accès depuis d'autres frises.

## 2. Avant de créer : partir de l'existant

1. **Lister ce qui est déjà en base** sur le sujet : périodes, événements et frises proches. Réutiliser une fiche plutôt que la dupliquer ; les frises se relient alors naturellement.
2. **Choisir la frise parente** et l'**ancre** : une période **présente dans la frise parente**, en général sa racine ou la période qui englobe le sujet.
3. **Repérer les autres points d'accès utiles** : une frise sœur ou thématique qui partage une période. Exemple : « Histoire du climat » → « Révolutions industrielles » par la période « Réchauffement climatique actuel ».

## 3. Structurer pour une lecture claire

**Comment la timeline range les périodes.** Elle range les périodes d'un même niveau sur des lignes, dans l'ordre chronologique. Chaque période prend la **première ligne où elle ne chevauche rien**.

Conséquences :
- **Une longue période au même niveau que des phases successives casse leur alignement.** Exemple : « Réchauffement climatique actuel » (1850 → aujourd'hui) à côté des révolutions industrielles faisait descendre la deuxième révolution d'une ligne.
- **Regrouper les phases successives sous une période englobante.** Exemple : « Ère industrielle » contient les révolutions et la Grande accélération. Ouverte, elle les aligne sur une ligne.
- **Les recouvrements doivent avoir du sens.** Deux lignes pour deux histoires réellement simultanées, c'est bien : France et Amériques dans « L'âge des révolutions ». Deux lignes pour deux périodes qui se doublent, ce n'est pas bien : « Guerres napoléoniennes » et « Premier Empire » ; garder une seule période et mettre les batailles en événements.
- **Ajuster les bornes au jour près pour éviter un faux chevauchement** : Premier Empire jusqu'au 22 juin 1815, Restauration à partir du 8 juillet 1815.

Autres règles :
- **Chaque sous-période doit tenir dans les dates de sa période parente.** Si elle déborde, la remonter d'un niveau ou élargir le parent.
- **Viser 3 à 10 éléments par niveau.** Au-delà, ajouter un niveau de regroupement ou découper en sous-frises.
- **Une frise trop large se découpe.** Utiliser « Créer une frise depuis une période » dans l'interface, ou reproduire sa logique : sous-arbre copié, événements compris dans les dates, catégories reprises, ancre sur la période de départ.

## 4. Les dates

Il n'y a **qu'un seul moteur de dates** : `server/src/shared/temporal.ts`. Ne jamais calculer les années à la main.

| Cas | Format à écrire | Affichage |
| --- | --- | --- |
| Échelle géologique | `G2.4`, `M445`, `M66.04`, `K11.7` | « il y a 445.0 Ma » |
| Années avant J.-C. | `3000 BCE` | « 3000 av. J.-C. » |
| Années après J.-C., précision année | `0950`, `1850` (toujours 4 chiffres) | « 950 », « 1850 » |
| Précision mois | `1958-03` | « mars 1958 » |
| Précision jour | `1789-07-14` | « 14 juillet 1789 » |
| Jusqu'à aujourd'hui | `TODAY` | « aujourd'hui » |

- **Ne pas écrire d'année négative au format ISO** (`-9600-01-01T00:00:00Z`). Le moteur la lit comme une année astronomique, ce qui donne « 9601 av. J.-C. » avec un « 1 janvier » parasite. Ce format reste dans d'anciennes fiches : voir les corrections à prévoir dans [FRISES-A-CREER.md](FRISES-A-CREER.md).
- **Choisir la précision réelle de la source.** Pas de jour inventé quand seule l'année est connue.
- **Avant 1582, utiliser les dates usuelles (calendrier julien)** : Crécy le 26 août 1346, pas le 3 septembre que donne Wikidata en grégorien proleptique.
- **`start_years_bp`, `end_years_bp` et `date_years_bp`** se calculent avec `yearsBeforePresent()`, arrondis à 3 décimales pour éviter les artefacts du type `66400000.00000001`.
- **Le début doit être strictement antérieur à la fin.**
- **Les années stockées dépendent de la date du calcul.** Pour une frise au jour près, recalculer les `*_years_bp` des anciennes fiches réutilisées en même temps que les nouvelles, sinon une sous-période semble déborder de son parent de quelques mois.
- **Mélanger une date calendaire et une date géologique crée un petit écart.** Exemple : le Cryogénien stocké en ISO et une glaciation en `M635`, soit environ 2 000 ans. Dans les contrôles d'imbrication, tolérer environ 1e-5 de l'âge du parent.

## 5. Identifiants Wikidata

- Les retrouver par la recherche Wikidata (`wbsearchentities`) ou par une requête SPARQL sur les libellés anglais. **Ne jamais deviner un Q-id.**
- **`wikidata_id` est unique** dans `periods` et, séparément, dans `events`. Si l'élément est déjà porté par une autre fiche, il y a deux cas :
  - réutiliser la fiche existante ;
  - ou créer la nouvelle fiche **sans** Q-id. Exemple : la période « Révolution française » sans Q-id, parce que l'événement du même nom porte Q6534.
- L'**identifiant interne** (`id`) d'une nouvelle fiche est un UUID. Ne pas réutiliser un Q-id comme `id` : d'anciennes fiches l'ont fait, et cela crée des confusions (l'événement `Q217450` est la bataille d'Actium, alors que Q217450 sur Wikidata est le traité de Paris).
- Ajouter un contrôle en tête de script : refuser l'insertion si l'un des Q-ids existe déjà.

## 6. Contenu

- **Titre et description en français et en anglais.** La description de frise tient en une ou deux phrases et dit ce que la frise montre. Celle de chaque fiche est factuelle et courte (une phrase), sans dates répétées.
- **Catégories** : deux ou trois catégories existantes par fiche et par frise, parmi `CAT_ANTHRO`, `CAT_ART`, `CAT_ASTRO`, `CAT_BIO_EVO`, `CAT_BOT`, `CAT_CHEM`, `CAT_COSMO`, `CAT_ECO` (économie), `CAT_ECO_SYS` (écologie), `CAT_GEO`, `CAT_HIST`, `CAT_MICRO`, `CAT_OCEAN`, `CAT_PALEO`, `CAT_PART`, `CAT_PHILO`, `CAT_PHYS`, `CAT_TECH`. Ne pas créer de catégorie au passage.
- **Auteur** : le nom d'utilisateur du compte propriétaire. L'API l'impose à la création ; un script doit écrire le même nom, aujourd'hui « flobutbut » (compte `727252ea-…`, propriétaire de toutes les frises).
- **Propriétaire et visibilité** : `owner_user_id` du compte. `is_public = true` seulement pour une frise relue.
- **Événements de contexte** : relier aussi les causes et conséquences. Exemples : volcanisme et impact pour les extinctions, Arrhenius et la courbe de Keeling pour le climat.

## 7. Écrire en base

- **Par l'interface** : c'est le chemin normal, qui applique la validation, les droits et l'auteur automatiquement.
- **Par script, pour une frise complète** :
  - Générer le SQL avec un petit script Node qui importe `temporal.ts`. Il calcule les années, vérifie les bornes et l'imbrication, et produit **un seul bloc `DO $$ … $$` transactionnel**.
  - **Relire le SQL** avant de l'exécuter.
  - **Exécuter sur la production seulement avec l'accord explicite** du propriétaire.
  - Ordre dans le bloc : la frise (`RETURNING id INTO sid`), ses catégories, son ancre, les nouvelles fiches et leurs catégories, `story_periods` (parents avant enfants), `story_events`, puis les points d'entrée.
  - Ne jamais passer par l'API REST publique de Supabase. Ne jamais supprimer ni modifier une fiche partagée sans le vérifier.
- **Tester localement les changements de schéma**, jamais les ajouts de contenu : une base PostgreSQL 17 jetable, comme décrit dans [../database/baseline/README.md](../database/baseline/README.md).

## 8. Après la création

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
- [ ] La frise parente, l'ancre (présente dans la frise parente) et les points d'entrée sont choisis.
- [ ] Les phases successives sont regroupées ; les recouvrements restants ont un sens.
- [ ] Chaque sous-période tient dans son parent ; tous les intervalles vont du plus ancien au plus récent.
- [ ] Les dates sont au bon format (`N BCE`, `AAAA`, `M…`), avec la bonne précision et les années calculées par `temporal.ts`.
- [ ] Les textes sont en français et en anglais ; les catégories sont existantes ; l'auteur est le nom d'utilisateur du compte.
- [ ] Le SQL a été relu, la transaction est unique et l'accord pour la production est donné.
- [ ] La frise a été vérifiée sur le site, et la feuille de route est à jour.
