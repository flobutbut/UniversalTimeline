# Rôles, contenus personnels et partage — cadrage

Rédigé le 1er novembre 2026. Ce document cadre l’évolution des droits d’accès avant toute implémentation : rôles utilisateur/contributeur/admin, éléments personnels hors catalogue, règle de publication et partage restreint des frises privées. **Rien n’est implémenté.** Il complète [AUTHENTICATION.md](../server/AUTHENTICATION.md) et tranche l’option catalogue laissée ouverte dans [MCP.md](MCP.md).

## Objectifs

1. Un utilisateur inscrit voit seulement **Timeline** et **Mes frises**, et ne gère que ses frises (publiques ou privées).
2. Un **contributeur** maintient le catalogue partagé (onglets Periods et Events) et consulte en lecture seule toutes les frises publiques.
3. Un utilisateur peut construire des frises **personnelles** avec des périodes/événements qui n’existent pas sur Wikipédia/Wikidata.
4. Une frise privée peut être **partagée** avec un cercle restreint : lien, puis invitation par e-mail.
5. Les frises **publiques** gardent une qualité éditoriale contrôlée.

## État actuel (constaté)

- Rôle unique `app_metadata.role = 'admin'`, sinon simple compte. Le serveur vérifie le bearer avec `getUser`, puis transmet `app_metadata.role` (`admin` ou `user`) dans les claims de chaque transaction (`server/src/auth/context.ts`).
- Header : tous les onglets pour un compte connecté, sauf Design system réservé à l’admin (`src/components/Header.vue`, `src/router/access.ts`).
- Page Frises : filtrée côté client sur les frises du compte (`useDatabaseView`, `ownsStory`).
- Frises : lecture si `is_public` ou propriétaire ; écriture par le propriétaire uniquement (RLS).
- **Catalogue périodes/événements/catégories d’éléments : tout compte connecté peut écrire**, par l’API comme par l’API de données Supabase (policies `ut_write_periods`, `ut_write_events`, `ut_write_*_categories`). Masquer des onglets ne suffit donc pas : la restriction doit être portée par la RLS.
- Identifiants de frise séquentiels (`integer`) : ils ne peuvent pas servir de secret de partage.
- `wikidata_id` est unique sur toute la table `periods` (et `events`).
- Aucun SMTP personnalisé : seules les adresses membres de l’organisation Supabase reçoivent des e-mails.

## Décisions retenues

- Trois rôles : **utilisateur** (par défaut), **contributeur**, **admin**. L’admin a les droits du contributeur plus le Design system ; il ne lit toujours pas les frises privées des autres.
- Les frises publiques des autres sont en **lecture seule** pour le contributeur.
- Le **Q-id Wikidata n’est pas obligatoire**, ni pour les éléments ni pour les frises publiques : il exclurait des éléments légitimes (histoire locale, familiale, concepts sans élément précis) et pousserait à des Q-ids approximatifs (l’audit du 31 octobre en a corrigé environ 80). Il reste encouragé et affiché comme source.
- La qualité des frises publiques repose sur une **règle de publication** : une frise publique ne contient que des éléments du catalogue partagé.

## Matrice des droits cible

| Action | Anonyme | Utilisateur | Contributeur | Admin |
|---|---|---|---|---|
| Timeline des frises publiques | oui | oui | oui | oui |
| Onglets Timeline, Mes frises | Timeline | oui | oui | oui |
| Onglets Periods, Events | non | non | oui | oui |
| Onglet Design system | non | non | non | oui |
| Créer/modifier/supprimer ses frises | non | oui | oui | oui |
| Voir les frises publiques des autres dans l’onglet Frises | non | non | lecture | lecture |
| Lire une frise privée partagée avec lui | via lien | via lien ou invitation | idem | idem |
| Rattacher un élément du catalogue à ses frises | non | oui | oui | oui |
| Créer un élément personnel (avec ou sans Q-id) | non | oui | oui | oui |
| Modifier/supprimer ses éléments personnels | non | oui | oui | oui |
| Créer/modifier/supprimer un élément du catalogue partagé | non | non | oui | oui |
| Intégrer un élément personnel au catalogue | non | proposer | valider | valider |
| Attribuer les rôles | non | non | non | opération SQL explicite |

## Modèle de données

### Rôles

- `auth.users.raw_app_meta_data.role` ∈ {absent, `contributor`, `admin`}. Jamais `user_metadata`, que l’utilisateur peut modifier.
- Opérations explicites sur le modèle de `assign_admin_role.sql` : `assign_contributor_role.sql` et `revoke_role.sql`, avec une adresse fournie explicitement, pour un compte confirmé, sans création de compte.
- Le jeton d’un utilisateur n’est mis à jour qu’à son prochain rafraîchissement : le serveur relit déjà le rôle via `getUser` à chaque requête, et le front le revérifie avant chaque navigation protégée.

### Éléments personnels

Ajout sur `periods` et `events` :

- `owner_user_id uuid NULL REFERENCES auth.users` : `NULL` = catalogue partagé ; renseigné = élément personnel.
- Identifiant d’un élément personnel : UUID généré. Aucun identifiant catalogue `varchar` n’est inventé (règle 23).
- Unicité du Q-id : remplacer la contrainte unique globale par un index unique partiel sur le catalogue partagé (`WHERE owner_user_id IS NULL`), plus un index unique `(owner_user_id, wikidata_id)`. Deux utilisateurs peuvent ainsi avoir le même Q-id dans leurs éléments personnels. Si le Q-id existe déjà dans le catalogue partagé, l’interface propose l’élément existant au lieu d’en créer un.
- Hiérarchie : un élément partagé ne peut pas avoir de parent personnel. Un élément personnel peut avoir un parent partagé ou un parent personnel du même propriétaire. Ces deux règles passent par une contrainte ou un trigger, et sont testées.
- Catégories : `period_categories` et `event_categories` suivent les droits de l’élément.

### Partage

- `story_shares` : lien de lecture.
  - Colonnes `id`, `story_id`, `token_hash` (SHA-256 d’un jeton aléatoire de 32 octets ou plus), `created_by`, `created_at`, `expires_at NULL`, `revoked_at NULL`.
  - Le jeton clair n’est montré qu’une fois, à la création ; seul le hachage est stocké.
- `story_members` : accès par compte.
  - Colonnes `story_id`, `user_id`, `role` (`viewer`), `invited_by`, `created_at`.
  - Primary key `(story_id, user_id)`.
- `story_invitations` : invitation par e-mail.
  - Colonnes `id`, `story_id`, `email` (normalisé), `token_hash`, `invited_by`, `expires_at`, `accepted_at`, `revoked_at`.
  - L’acceptation exige une session dont l’adresse vérifiée par `getUser` correspond à l’invitation. Elle crée alors la ligne `story_members`.
- Le partage donne la **lecture** de la frise, de ses associations, de ses ancres et de ses éléments personnels. Il ne donne jamais l’écriture.

## Règles d’accès (RLS)

Toutes les règles restent dans PostgreSQL. L’API ne fait qu’ajouter des contrôles et des messages lisibles.

- **Rôle courant** : `auth.jwt() -> 'app_metadata' ->> 'role'`, transmis par le serveur dans les claims. Une fonction `private.has_role(text[])` au `search_path` fixe, non exposée à l’API de données, factorise la lecture.
- **Catalogue partagé** (`owner_user_id IS NULL`) : lecture par tous ; écriture par `contributor` ou `admin` uniquement.
- **Éléments personnels** : écriture par leur propriétaire. Lecture par le propriétaire, et par toute personne autorisée à lire une frise qui les contient (membre, lien valide).
- **Frises** : lecture si `is_public`, propriétaire, membre (`story_members`) ou porteur d’un lien valide. Écriture par le propriétaire uniquement, comme aujourd’hui.
- **Lien de partage** : le serveur valide le jeton, puis place son hachage dans un paramètre de transaction réservé (`set_config('timeline.share_hash', …, true)`) que les policies consultent.
  - *À vérifier avant implémentation* : qu’un appel direct à l’API de données ne peut pas fixer ce paramètre. Sinon, passer par une fonction `SECURITY DEFINER` dédiée à la lecture partagée, non exposée.
- **Recherche** : la recherche globale, la recherche hybride (migration `hybrid_catalogue_search`) et les suggestions doivent rester en `SECURITY INVOKER` et ne jamais renvoyer d’éléments personnels d’autrui. Un test dédié est à prévoir.

## Règle de publication

- Une frise ne peut passer en public que si toutes ses périodes, tous ses événements et ses ancres appartiennent au catalogue partagé.
- Ajouter un élément personnel à une frise publique est refusé.
- Le contrôle est fait dans le service, pour un message clair qui liste les éléments en cause, et par un trigger en base, pour l’API de données.
- L’interface propose alors : garder la frise privée, ou proposer les éléments à un contributeur (étape 4).

## API et interface

### Rôles et navigation (étape 1)

- `Principal` : `role: 'user' | 'contributor' | 'admin'` au lieu de `isAdmin`. Les claims transmettent ce rôle, et `/api/account` renvoie `role`.
- Front :
  - `useAuthStore` expose `role`, `isContributor`, `isAdmin`.
  - Les onglets sont déclarés avec leurs rôles dans `navigation.ts`, et les routes portent `meta.roles`.
  - Un accès direct sans le rôle redirige vers `forbidden`.
  - Renommer l’onglet « Frises » en « Mes frises » pour l’utilisateur.
- Onglet Frises du contributeur :
  - filtre « Mes frises / Publiques » ;
  - les frises des autres s’ouvrent en lecture seule : panneau sans actions d’édition, d’association ni de suppression.
- Le serveur refuse l’écriture du catalogue partagé hors rôle, avec un message 403 lisible, et la RLS fait de même pour tout autre accès.

### Éléments personnels (étape 2)

- Pour l’utilisateur, la création d’un élément depuis ses frises crée un élément personnel. Pour un contributeur, elle propose « personnel » ou « catalogue ».
- Badge « Personnel » sur ces éléments dans le panneau de frise et dans la timeline.
- Wikidata : un Q-id déjà présent dans le catalogue propose l’élément existant ; sinon, l’import crée un élément personnel.

### Partage (étape 3)

- Panneau « Partager » d’une frise privée :
  - créer, copier ou révoquer un lien ;
  - inviter une adresse e-mail ;
  - lister et retirer les membres.
- Route de lecture `/timeline?share=<jeton>`. Le jeton n’est jamais journalisé ni réutilisé dans une autre URL ; l’en-tête `Referrer-Policy` est à vérifier.
- Les invitations par e-mail nécessitent un SMTP configuré et un domaine vérifié. En attendant, l’invitation peut produire un lien à transmettre soi-même.

### Intégration au catalogue (étape 4)

- `catalogue_proposals` :
  - colonnes `id`, `entity_type`, `entity_id`, `proposed_by`, `status` (`pending` / `accepted` / `rejected`), `reviewed_by`, `note`, horodatages ;
  - l’acceptation passe l’élément en partagé (`owner_user_id = NULL`) après contrôle des doublons de Q-id et de la hiérarchie.
- Le proposant garde ses frises intactes : l’identifiant de l’élément ne change pas.

## Migrations et mise en service

- Une migration par étape, rédigée avec la CLI Supabase et testée sur une base PostgreSQL 17 jetable par socket. Elle n’est appliquée à Supabase qu’**après confirmation explicite**, avec une sauvegarde préalable du schéma et des policies.
- Chaque migration intègre aussi la baseline (`database/baseline/application.sql`) pour les installations neuves. La garde de non-écrasement reste en place.
- Données existantes : tous les éléments actuels restent partagés (`owner_user_id NULL`), et aucune frise ne change de visibilité.
- Mettre à jour CLAUDE.md (règle 20), AUTHENTICATION.md et `.agent/` à chaque étape livrée.

## Tests

- **Vitest** :
  - garde de navigation par rôle ;
  - onglets visibles ;
  - panneau en lecture seule ;
  - messages 403 ;
  - refus de publication avec la liste des éléments ;
  - absence d’action d’écriture pour un non-propriétaire.
- **PostgreSQL jetable** (comme `auth.postgres.mjs`), avec quatre identités : anonyme, utilisateur A, utilisateur B, contributeur, plus un admin :
  - écriture du catalogue refusée à A, acceptée pour le contributeur ;
  - éléments personnels de A invisibles pour B, sauf via une frise partagée ;
  - trigger de publication ;
  - liens expirés ou révoqués ;
  - invitation acceptée avec une autre adresse : refusée ;
  - recherche sans fuite d’éléments personnels.
- Aucun test d’écriture sur Supabase.

## Découpage et ordre

1. **Rôles et navigation** : petite migration RLS du catalogue, rôle contributeur, onglets, lecture seule des frises publiques.
2. **Éléments personnels et règle de publication** : migration de schéma (colonnes, index, triggers) et interface de création.
3. **Partage** : lien d’abord, puis invitations une fois le SMTP configuré.
4. **Intégration au catalogue** : propositions et validation.

Les étapes 2 à 4 dépendent de l’étape 1. L’étape 3 peut être livrée sans l’étape 2, mais elle ne sert vraiment qu’avec des éléments personnels.

## Décisions ouvertes

1. Un utilisateur peut-il proposer ses éléments au catalogue dès l’étape 2, ou seulement à l’étape 4 ?
2. Durée de validité par défaut d’un lien de partage : sans expiration, ou 30 jours renouvelables ?
3. Un lien de partage doit-il exiger d’être connecté, ou être lisible anonymement ?
4. Une frise partagée peut-elle être dupliquée par un membre, avec copie dans ses propres frises ?
5. Un admin a-t-il un écran de gestion des rôles, ou les opérations SQL suffisent-elles au départ ?
6. Limites : nombre d’éléments personnels, de membres ou de liens par frise ?
7. Fournisseur SMTP et domaine d’envoi (déjà ouvert dans AUTHENTICATION.md).
