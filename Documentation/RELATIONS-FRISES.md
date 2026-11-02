# Organisation des contenus dans les frises

Depuis le 2 novembre 2026, les frises sont la seule source d’organisation des périodes et événements. Le catalogue contient des fiches réutilisables, sans arbre global.

## Modèle

| Donnée | Source |
| --- | --- |
| Identité, nom, description, dates, Wikidata et catégories | Fiche commune dans `periods` ou `events` |
| Appartenance d’une période et parent dans cette frise | `story_periods(story_id, period_id, parent_period_id)` |
| Appartenance d’un événement | `story_events(story_id, event_id)` |
| Points d’entrée explicites depuis plusieurs frises sources | `story_entry_points(source_story_id, target_story_id, period_id, event_id)` |
| Rattachements historiques, conservés et toujours affichés | `stories.parent_story_id` et `story_anchors` |

Un parent de période NULL signifie « racine de cette frise ». Il n’existe plus de repli vers le catalogue, ni de `parent_override`. Le même objet peut avoir des parents différents dans deux frises. Modifier ses faits communs, notamment sa description ou ses dates, reste une modification partagée.

Une même frise peut être proposée depuis plusieurs périodes d’une source, ou depuis plusieurs sources différentes. Ajouter un point d’entrée conserve les autres accès et n’impose aucune inclusion de dates. Le rattachement historique de **Conquête spatiale à Époque moderne** reste conservé. Un ancien rattachement sans ancre explicite reste proposé au niveau des racines de sa source.

L’onglet **Relations** présente les points d’entrée vers la frise courante, regroupés par source. L’ajout demande une source et une période ; un retrait ne supprime que le point choisi. Les frises accessibles depuis la frise courante restent affichées au niveau des périodes et événements concernés, sans liste globale d’enfants dans cet onglet.

Les événements appartiennent explicitement aux frises. Dans la timeline, leurs dates déterminent leur affichage à l’intérieur des périodes de cette frise. Il n’existe pas de relation globale événement–période, ni de rattachement obligatoire à une période unique.

## Édition

- Le catalogue `/periods` propose toutes les fiches, avec recherche, catégories et accès aux frises associées. Il ne propose plus de déplacement global.
- Dans une frise, le menu d’une période permet **Déplacer dans la frise**. Les choix excluent la période et ses descendants.
- Une nouvelle appartenance sans indication de parent est une racine. Réajouter une appartenance existante sans parent explicite conserve son placement.
- Un retrait simple détache la période de cette frise ; ses enfants directs deviennent des racines. La fiche commune et les autres frises sont conservées.
- Changer la racine conserve uniquement la branche choisie parmi les périodes déjà associées. Les événements sont conservés, comme auparavant.
- Les sous-périodes Wikidata restent des suggestions. Leur import crée ou réutilise une fiche commune, puis l’associe explicitement à la frise et au parent capturés.

## API et intégrité

Les écritures passent par les associations de frise : `POST /stories/:storyId/periods` avec `operation`, `ids` et, pour un placement explicite, `parentPeriodId` (NULL pour une racine).

Les points d’entrée utilisent `POST /stories/:sourceId/entry-points` avec `childStoryIds`, `operation` (`add` ou `remove`) et `anchor: { anchorType, anchorId }`. Une période ou un événement de la source est obligatoire à l’ajout. La même relation est dédupliquée ; plusieurs sources et plusieurs emplacements par source sont permis. Les deux frises doivent être modifiables par le compte. Les clés étrangères composées retirent les accès lorsque leur période ou événement est retiré de la source. Le détail de frise transporte les sources dans `parentStories` et les destinations dans `childStories`, avec leurs ancres limitées à ce contexte. Les anciens endpoints de hiérarchie sont conservés pour compatibilité ; l’interface utilise les points d’entrée multiples.

`POST/PUT /periods` modifie uniquement les faits communs et refuse un `parent_id` non NULL. Les anciens endpoints globaux `/periods/:id/children` et `/periods/:id/parent` répondent 410. Les réponses du catalogue conservent des champs de compatibilité `parent_id: null` et `has_children: false` ; les réponses de frise transportent le parent local dans `story_parent_id` / `storyParentId`.

La clé étrangère composée impose l’existence du parent dans la même frise. Elle est différée jusqu’au commit pour permettre la copie ou la suppression atomique d’une branche. Un trigger invoker sérialise les modifications par frise, interdit les cycles et empêche de modifier l’identité d’une appartenance par UPDATE. Les règles RLS et les droits de propriété existants restent applicables.

## Migration et vérification

La migration `frise_only_period_hierarchy` matérialise d’abord les parents effectivement affichés dans chaque frise. Un ancien parent extérieur à la frise devient une racine locale, comme dans l’affichage antérieur. Les placements explicites existants sont conservés. La colonne globale `periods.parent_id`, le drapeau `parent_override` et la routine obsolète `maintain_period_relations()` sont ensuite retirés.

Une vérification transactionnelle compare le nombre de fiches, leurs données communes, les appartenances et les arbres visibles avant/après. Une différence ou un cycle préexistant annule la migration entière. Aucun contenu ni identifiant n’est recréé. La baseline des nouvelles installations contient directement ce modèle ; elle ne doit jamais être appliquée au projet existant.

Validation : `yarn verify`, tests PostgreSQL 17 de migration et hiérarchie (y compris SQL concurrent), baseline/RLS, écritures atomiques et suppressions concurrentes. Toutes les suites PostgreSQL utilisent uniquement des bases locales jetables ; jamais Supabase.

## État de la base active

La migration `20261102075026_story_entry_points` ajoute le stockage des points d’entrée multiples. Les 16 frises et 16 ancres historiques ont été conservées à l’application. La nouvelle table dispose de RLS, de règles d’accès limitées aux frises lisibles et de droits d’écriture réservés au propriétaire des deux extrémités. L’audit de sécurité après application ne remonte aucune alerte. Les tests d’ajout/retrait ont été exécutés uniquement sur des données fictives dans PostgreSQL local.

La migration distante `20261102001509_frise_only_period_hierarchy` est appliquée. Ses invariants transactionnels de conservation ont réussi. Le contrôle après migration relève 113 périodes, 104 événements, 16 frises, 144 appartenances de périodes et 156 appartenances d’événements, sans parent local extérieur à sa frise. Les anciens champs d’héritage sont absents et l’audit de sécurité Supabase ne remonte aucune alerte.

Pendant la préparation, une modification concurrente a ajouté une période et une appartenance et a déplacé Conquête spatiale sous Univers moderne. Ces ajouts ont été conservés. Après confirmation explicite de l’utilisateur, Conquête spatiale a été réattachée à Époque moderne ; son point d’entrée vers l’ancien parent a été retiré. Aucun texte de description n’a été complété par cette migration.


## Navigation chronologique entre frises — 2 novembre 2026

Les points d’entrée thématiques ne définissent pas les voisins chronologiques. La table `story_period_presentations(context_story_id, period_id, target_story_id)` déclare qu’une frise est une vue de détail d’une période dans un parcours donné. La période doit appartenir à la fois à la frise de référence et à sa vue de détail (clés étrangères composées, suppression en cascade de la présentation). Le lecteur doit avoir accès aux deux frises ; l’écriture est réservée au propriétaire des deux extrémités.

La frise de référence porte l’arbre du parcours dans ses appartenances normales. Les voisins se recalculent par date de début au même rang du contexte ; une égalité est départagée par l’identifiant pour un ordre stable. Ce premier lot ne comporte pas d’ordre manuel. Les chevauchements sont permis ; l’ordre représente un parcours de lecture. Aucun lien précédent/suivant n’est stocké.

`GET /stories/:id` transporte `navigationContexts` : contextes lisibles, périodes et présentations accessibles au lecteur. Les associations ordinaires et les frises partageant du contenu ne sont jamais promues implicitement en présentations. Sans vue dédiée, une période s’ouvre dans sa frise de référence. Plusieurs vues explicites provoquent un choix. Plusieurs contextes provoquent un choix de parcours ; un contexte unique peut être retrouvé automatiquement.

Au niveau de la période présentée, les boutons suivent le contexte, même vers une autre frise. Dans ses subdivisions, ils suivent le niveau local. Une période sans enfant peut être ouverte directement. Les URL acceptent `story`, `period` et `context` pour retrouver la même position après rechargement et avec l’historique du navigateur. Un contexte ou une période disparus sont signalés, sans repli arbitraire vers une autre frise. Le fil d’Ariane garde le parcours comme repère ; une transition chronologique ne transforme pas la frise précédente en ancêtre.

L’onglet **Relations → Parcours chronologique** permet de choisir une frise de référence et la période présentée par la frise courante. L’ajout enregistre la période dans le parcours si elle manque (racine locale) et crée la présentation dans la même transaction. Si la période y est déjà placée, sa position est conservée. Dissocier la vue conserve la période dans le parcours : elle reste consultable dans la référence. Retirer aussi cette période se fait dans les périodes de la frise de référence.

`POST /stories/:contextId/presentations` prend `periodId`, `targetStoryId` et `operation` (`add` ou `remove`). La création d’une frise depuis une période enregistre automatiquement une présentation dans sa source, en plus de son ancre historique.

Le contexte initial « Grandes périodes de l’histoire européenne » comporte Antiquité, Moyen Âge, Époque moderne et Histoire contemporaine. Pour ajouter la Renaissance : ouvrir sa frise, aller dans Relations, choisir ce parcours et la période Renaissance. Son début en 1400 la place automatiquement après Moyen Âge et avant Époque moderne. Aucun voisin existant n’est à modifier.

Validation : suite applicative complète, checks de design et de typage, builds, baseline PostgreSQL, écritures atomiques, tests dédiés aux présentations et test visuel sur Moyen Âge / Époque moderne / Histoire contemporaine. Les tests de mutation utilisent uniquement PostgreSQL local jetable. Les données actives comptent après initialisation 22 frises, 152 périodes, 128 événements, 234 appartenances période–frise, 21 ancres historiques et 4 présentations.
