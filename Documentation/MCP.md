# Serveur MCP — cadrage avant implémentation

Rédigé le 31 octobre 2026. Ce document décrit ce qu’il faudrait mettre en place pour exposer le projet via le Model Context Protocol (MCP), afin que toute personne disposant d’un compte puisse contribuer, en public ou en privé, depuis un client IA (Claude, Cursor, etc.). **Rien n’est implémenté.** Les décisions ouvertes sont listées en fin de document.

## Objectif

- Lecture des frises publiques depuis un client MCP, avec ou sans compte.
- Contribution authentifiée : créer et éditer ses frises, choisir leur visibilité, y associer périodes et événements.
- Contribution au catalogue partagé, selon le modèle retenu (voir « Point bloquant »).
- Mêmes droits qu’en passant par l’interface : un appel MCP ne doit jamais donner plus d’accès que le compte n’en a.

## Ce que l’existant fournit déjà

- **Comptes et sessions** : Supabase Auth. L’API vérifie chaque bearer avec `auth.getUser(token)` ; le rôle admin vient seulement de `app_metadata`. Voir [AUTHENTICATION.md](../server/AUTHENTICATION.md).
- **Isolation SQL** : chaque transaction applique `SET LOCAL ROLE anon/authenticated` et les claims de l’identité vérifiée, via `AsyncLocalStorage`. RLS s’applique donc à tout appel qui passe par ce contexte.
- **Stories public/privé** avec propriétaire (`owner_user_id`) ; une nouvelle story est privée par défaut ; les liens et ancres suivent la visibilité de leur story.
- **Couche métier séparée de HTTP** : `api/routes.ts` valide et répond, `services/` coordonne règles et transactions, `repositories/` reçoit son client explicitement. Les parsers de `api/inputValidation.ts` valident toute entrée inconnue avant SQL.
- **Erreurs expurgées** : le wrapper `endpoint` passe par `sendApiError`, sans détails SQL, stack ni paramètres.

Conséquence : le serveur MCP doit être **une nouvelle porte d’entrée sur le même backend**, pas une application parallèle ni un client HTTP de notre propre API.

## Architecture proposée

### Transport

- Endpoint `/mcp` en Streamable HTTP, avec le SDK officiel TypeScript `@modelcontextprotocol/sdk`.
- Monté dans `createApp`, à côté du routeur `/api`, pour partager middleware d’accès, contexte de requête, arrêt propre (`createShutdown`) et contrôle du schéma avant écoute.
- Mode sans état au départ : chaque requête porte son token, aucune session MCP conservée côté serveur.
- Les handlers d’outils appellent les **services**, après passage par les mêmes parsers que les routes HTTP.

### Authentification

La spécification MCP s’appuie sur OAuth 2.1 : le serveur MCP est un *resource server*, l’émission des tokens revient à un serveur d’autorisation.

1. Publier `/.well-known/oauth-protected-resource` (RFC 9728), qui désigne Supabase Auth comme serveur d’autorisation.
2. Utiliser le serveur OAuth 2.1 de Supabase pour la connexion depuis le client MCP (flux navigateur, PKCE). **À vérifier avant de s’engager** : niveau de disponibilité de cette fonctionnalité sur notre offre et support de l’enregistrement dynamique de clients (DCR), dont dépendent les clients MCP grand public.
3. Ajouter dans le front une **page de consentement** (« <client> demande l’accès à vos frises »), sous connexion.
4. Côté serveur, le token reçu passe par la même vérification `getUser` et le même contexte SQL que l’API. Contrôler l’audience ; ne jamais relayer le token vers un autre service.
5. Sans token : accès lecture seule anonyme aux contenus publics, comme la timeline. Toute écriture anonyme est refusée avant le handler, comme pour `/api`.

Alternative si OAuth Supabase ne convient pas : jetons personnels créés depuis l’interface (révocables, à portée limitée, stockés hachés). Plus simple, mais moins standard pour les clients MCP et à concevoir entièrement.

### Outils

Les outils sont conçus pour un agent, pas comme un miroir des routes HTTP. Chaque outil déclare son schéma d’entrée et ses annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`).

| Outil | Accès | Rôle |
|---|---|---|
| `search_stories` | anonyme / compte | Recherche par titre, description ou contenu associé (comme `/api/search/stories`) |
| `get_story` | anonyme / compte | Détail, périodes, événements, stories enfants, breadcrumb |
| `search_catalogue` | anonyme / compte | Recherche périodes/événements (texte, catégorie) |
| `get_period_path` | anonyme / compte | Chemin complet d’une période ; erreur si ancêtre absent ou cyclique |
| `search_wikidata` | compte | Résultats Wikidata présentés comme brouillons, sans import automatique |
| `create_story` | compte | Création, privée par défaut |
| `update_story` | compte, propriétaire | Titre, description, catégories ; visibilité omise = conservée |
| `set_story_visibility` | compte, propriétaire | Passage public/privé explicite |
| `change_story_items` | compte, propriétaire | Ajout/retrait de périodes et événements, une transaction par appel (`changeAssociations`) |
| `link_child_story` | compte, propriétaire | Rattachement d’une story enfant du même propriétaire |
| `propose_period` / `propose_event` | compte | Selon le modèle catalogue retenu |

Hors première version : suppressions (stories, périodes, événements), déplacement de hiérarchie, outils admin.

Ressources MCP possibles plus tard : une story publique en lecture (`timeline://story/<id>`).

## Point bloquant : le catalogue partagé

Les stories ont un propriétaire et une visibilité ; **les périodes et événements forment un catalogue partagé sans propriétaire ni visibilité**, décision produit en attente. Ouvrir l’écriture du catalogue à tout compte via des agents IA permettrait de modifier ou dégrader les données de tous, à grande échelle.

Options :

- **A. Propriété et visibilité sur périodes/événements**, sur le modèle des stories : entrées privées par défaut, publication explicite. Migration, policies RLS et adaptation du finder nécessaires.
- **B. Contributions modérées** : les écritures sur le catalogue public créent des propositions, validées par un admin. Table de propositions, écran de revue, historique.
- **C. Catalogue en lecture seule via MCP** : contribution limitée aux stories ; catalogue réservé à l’admin.

Recommandation : **A pour les créations**, combinée à **B pour toute modification d’une entrée publique existante**. C peut servir de première étape si l’on veut livrer vite.

## Prérequis hors MCP

- **SMTP Supabase** : l’envoi intégré ne fonctionne que pour les membres de l’organisation ; sans fournisseur SMTP et domaine vérifié, aucune personne extérieure ne peut confirmer un compte.
- **Domaine et déploiement HTTPS public** : l’API écoute aujourd’hui sur 127.0.0.1. Un client MCP distant doit joindre `/mcp` en HTTPS.
- **Configuration Auth du domaine** : Site URL, redirection exacte `/login` et callback OAuth du futur domaine, sans joker.
- **Production** : `AUTH_ENABLED=true` obligatoire, vérification du schéma avant écoute (déjà imposés).

## Garde-fous propres aux agents

- **Idempotence** : les clients MCP peuvent rejouer un appel. La règle du projet interdit tout retry d’écriture sans contrat ; prévoir une clé d’idempotence sur les outils d’écriture, stockée avec le résultat pendant une durée limitée.
- **Quotas et rate limiting** par compte et par adresse pour l’anonyme ; limites de taille sur textes et nombre d’éléments par appel.
- **Journal d’audit** : compte, outil, entités touchées, canal (MCP ou interface), sans contenu sensible ni token.
- **Injection de prompt** : le contenu public rédigé par d’autres comptes sera lu par des LLM. Le renvoyer comme données structurées, borné en taille, sans instruction implicite ; aucune action déclenchée par le contenu lu.
- **Erreurs** : réponses d’outil construites comme `sendApiError`, sans SQL, stack, body ni paramètres.
- **Pas de contournement RLS** : aucun pool exporté, aucune requête hors du contexte `SET LOCAL ROLE`.
- **Champs de droits ignorés** : propriétaire, rôle ou visibilité forcée dans une entrée d’outil ne donnent aucun droit (même règle que pour `/api`).

## Tests

- Tests unitaires des handlers d’outils : validation, refus anonyme, erreurs expurgées.
- Tests PostgreSQL jetables (socket, base `universaltimeline_test_*`, jamais Supabase) avec deux comptes : isolation des stories privées via MCP, refus d’écriture sur la story d’autrui, idempotence, rollback.
- MCP Inspector en local, puis un vrai client (Claude) sur un environnement de test dédié.
- Intégration à `yarn verify:clean` et à la CI.

## Phasage

1. **Décisions et prérequis** : modèle du catalogue, SMTP, domaine, vérification du serveur OAuth Supabase.
2. **MCP lecture seule** : transport, outils de lecture, accès anonyme et authentifié par bearer existant.
3. **OAuth + écriture sur ses stories** : métadonnées de ressource, consentement, idempotence, quotas, audit.
4. **Contributions au catalogue** selon l’option retenue, avec modération.

## Décisions ouvertes

1. Modèle du catalogue : A, B, C ou combinaison.
2. Fournisseur SMTP et domaine d’envoi.
3. Domaine et hébergement de production.
4. OAuth Supabase ou jetons personnels.
5. Quotas par défaut (appels, créations par jour).
6. Exposition anonyme du MCP en lecture ou réservée aux comptes.
