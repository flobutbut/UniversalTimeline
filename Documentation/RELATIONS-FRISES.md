# Organisation des contenus dans les frises

Depuis le 2 novembre 2026, les frises sont la seule source d’organisation des périodes et événements. Le catalogue contient des fiches réutilisables, sans arbre global.

## Modèle

| Donnée | Source |
| --- | --- |
| Identité, nom, description, dates, Wikidata et catégories | Fiche commune dans `periods` ou `events` |
| Appartenance d’une période et parent dans cette frise | `story_periods(story_id, period_id, parent_period_id)` |
| Appartenance d’un événement | `story_events(story_id, event_id)` |
| Frise parente et parcours de navigation | `stories.parent_story_id` |
| Point d’entrée explicite depuis une période ou un événement de la frise parente | `story_anchors` |

Un parent de période NULL signifie « racine de cette frise ». Il n’existe plus de repli vers le catalogue, ni de `parent_override`. Le même objet peut avoir des parents différents dans deux frises. Modifier ses faits communs, notamment sa description ou ses dates, reste une modification partagée.

Une frise parente organise la navigation ; elle n’impose pas que les dates de sa frise enfant soient incluses dans les siennes. **Conquête spatiale reste enfant d’Époque moderne**, conformément au choix éditorial confirmé. Une frise enfant sans ancre explicite reste proposée au niveau des racines de sa parente.

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

`POST/PUT /periods` modifie uniquement les faits communs et refuse un `parent_id` non NULL. Les anciens endpoints globaux `/periods/:id/children` et `/periods/:id/parent` répondent 410. Les réponses du catalogue conservent des champs de compatibilité `parent_id: null` et `has_children: false` ; les réponses de frise transportent le parent local dans `story_parent_id` / `storyParentId`.

La clé étrangère composée impose l’existence du parent dans la même frise. Elle est différée jusqu’au commit pour permettre la copie ou la suppression atomique d’une branche. Un trigger invoker sérialise les modifications par frise, interdit les cycles et empêche de modifier l’identité d’une appartenance par UPDATE. Les règles RLS et les droits de propriété existants restent applicables.

## Migration et vérification

La migration `frise_only_period_hierarchy` matérialise d’abord les parents effectivement affichés dans chaque frise. Un ancien parent extérieur à la frise devient une racine locale, comme dans l’affichage antérieur. Les placements explicites existants sont conservés. La colonne globale `periods.parent_id`, le drapeau `parent_override` et la routine obsolète `maintain_period_relations()` sont ensuite retirés.

Une vérification transactionnelle compare le nombre de fiches, leurs données communes, les appartenances et les arbres visibles avant/après. Une différence ou un cycle préexistant annule la migration entière. Aucun contenu ni identifiant n’est recréé. La baseline des nouvelles installations contient directement ce modèle ; elle ne doit jamais être appliquée au projet existant.

Validation : `yarn verify`, tests PostgreSQL 17 de migration et hiérarchie (y compris SQL concurrent), baseline/RLS, écritures atomiques et suppressions concurrentes. Toutes les suites PostgreSQL utilisent uniquement des bases locales jetables ; jamais Supabase.

## État de la base active

La migration distante `20261102001509_frise_only_period_hierarchy` est appliquée. Ses invariants transactionnels de conservation ont réussi. Le contrôle après migration relève 113 périodes, 104 événements, 16 frises, 144 appartenances de périodes et 156 appartenances d’événements, sans parent local extérieur à sa frise. Les anciens champs d’héritage sont absents et l’audit de sécurité Supabase ne remonte aucune alerte.

Pendant la préparation, une modification concurrente a ajouté une période et une appartenance et a déplacé Conquête spatiale sous Univers moderne. Ces ajouts ont été conservés. Après confirmation explicite de l’utilisateur, Conquête spatiale a été réattachée à Époque moderne ; son point d’entrée vers l’ancien parent a été retiré. Aucun texte de description n’a été complété par cette migration.
