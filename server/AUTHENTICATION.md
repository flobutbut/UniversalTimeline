# Accès utilisateurs — activation du 29 octobre 2026

## État réel

**L’authentification est activée** sur le serveur local (`AUTH_ENABLED=true`). Après confirmation explicite de l’utilisateur, la migration Supabase `20261029090427_story_access` a été appliquée avec succès. L’utilisateur a créé et confirmé le compte choisi ; son rôle admin a été attribué. Après autorisation explicite distincte, les 11 stories historiques lui ont été rattachées. Leur visibilité publique et leurs catégories sont conservées, vérifiées avant/après par ID. Aucun compte, mot de passe ni e-mail d’inscription n’a été créé/saisi/envoyé par l’agent.

Le projet Universal-Timeline existant est compatible avec la préparation : stories integer, entités varchar, tables de liens et ancres présentes, RLS déjà activée sur les dix tables applicatives. La lecture préalable du 29 octobre relevait 11 stories et aucun compte Auth. `author` est un libellé libre ; ce champ n’identifie pas un compte. Les anciennes policies exposaient les liens et ancres indépendamment de la visibilité de leur story ; elles ont été remplacées par les règles décrites ci-dessous.

## Inscription — diagnostic du 30 octobre 2026

- Deux refus Auth 422 récents indiquent un mot de passe connu comme faible. Le compte de test recherché n’existe pas ; aucun nouvel essai, compte ou e-mail n’a été déclenché par l’agent. Les journaux consultés ne permettent pas d’attribuer individuellement chaque refus à une adresse.
- Le tableau de bord Emails indique le service d’envoi intégré, sans SMTP personnalisé actif. Ce service est limité aux adresses des membres de l’organisation Supabase et ne permet donc pas une ouverture générale des inscriptions. Les alias ne doivent pas être réécrits vers le compte principal pour contourner cette limite. Voir [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).
- Fournisseur retenu (2 novembre 2026) : boîte Hostinger `florian@universaltimeline.net` ; DNS du domaine déjà prêt (MX Hostinger, SPF `include:_spf.mail.hostinger.com`, DKIM `hostingermail-a/b/c`, DMARC `p=none`). Reste à saisir le SMTP dans Supabase (`smtp.hostinger.com`, port 465, mot de passe saisi par l’éditeur) puis coller les modèles français de `Documentation/emails/` et autoriser `https://universaltimeline.net/**` dans les Redirect URLs. Parcours dans l’interface : mot de passe oublié (`/reset-password`, jeton `token_hash` vérifié par `verifyOtp`) et changement d’adresse (Profil, `updateUser({ email })` avec retour sur `/profile`). Les messages d’erreur sont choisis par code dans `src/lib/authErrors.ts`. Ne pas affaiblir la protection des mots de passe ou désactiver la confirmation pour débloquer un test.
- Le formulaire traduit désormais une liste explicite de codes d’erreur : mot de passe faible/compromis, adresse non autorisée/invalide, limites d’envoi/de requêtes et inscriptions désactivées. Les autres erreurs gardent un message neutre, sans exposer les détails du fournisseur ni l’existence d’un compte. L’aide du mot de passe est liée au champ en mode inscription. Le signe `+` est conservé.
- Vérification UI11 : 874 tests / 68 fichiers dont 18 du formulaire, quatre contrôles de configuration, TypeScript/inutilisés et builds front/API réussis dans un conteneur sans réseau. Pas de validation de livraison d’e-mail réel.

## Accès confirmés

Sans session vérifiée, le header expose la recherche et les deux liens « Se connecter » (`/login`) / « Créer un compte » (`/login?mode=signup`). La timeline reste accessible sans compte, sans onglet redondant dans le header. La recherche globale renvoie uniquement des frises accessibles, via leur titre, leur description ou le contenu des périodes/événements associés. Une sélection ouvre `/timeline?story=<id>` avec les seules associations de cette frise, ses suggestions et son breadcrumb. Les requêtes restent soumises aux rôles/RLS existants ; une frise absente ou inaccessible ne déclenche aucun repli vers le catalogue. Les accès directs à Frises, Periods (alias `/graph`), Events et Design system redirigent vers la connexion avec conservation de la destination. Le frontend conserve cette restriction même si l’authentification est désactivée ou indisponible ; le mode historique du serveur reste réservé au développement local. Après connexion, les onglets de gestion réapparaissent selon les droits du compte.

| Usage | Accès après activation |
|---|---|
| Timeline et lecture des stories publiques | Sans compte |
| Stories privées | Leur propriétaire uniquement |
| Page Stories et édition/relations d’une story | Compte connecté, stories propres au compte |
| Périodes et événements | Catalogue partagé ; pages et mutations sous connexion, sans propriété inventée |
| Design system | Compte portant `app_metadata.role = admin` vérifié par l’API |

L’admin du Design system n’obtient pas de passe-droit sur les stories privées d’autres comptes. Les périodes/événements restent partagés en attendant la décision produit. Une nouvelle story est privée par défaut ; une édition qui omet la visibilité conserve la valeur existante.

## Mécanisme

- Supabase Auth gère inscription, confirmation d’adresse, connexion par mot de passe et session. Seule la clé publiable `sb_publishable_…` est utilisée dans le navigateur. Aucun mot de passe ni token n’est enregistré durablement par le code applicatif en dehors du SDK officiel.
- `/api/access` annonce le mode actif ; en cas d’échec de vérification, aucune page protégée n’est ouverte. Les pages restent chargées à la demande. Le SDK est également chargé à la demande uniquement si les accès sont activés.
- L’API vérifie chaque bearer auprès de `auth.getUser(token)` ; l’identité et le rôle proviennent de la réponse vérifiée. `user_metadata` n’intervient jamais dans une autorisation. `/api/account` expose seulement ID et rôle admin.
- `AsyncLocalStorage` isole les requêtes concurrentes. Chaque opération SQL reçoit `SET LOCAL ROLE anon/authenticated` et des claims paramétrés dans sa transaction. La connexion privilégiée du pool n’exécute donc pas les requêtes HTTP en contournant RLS lorsque les accès sont activés. Commit/rollback restaurent rôle et claims.
- Les mutations anonymes sont refusées avant le handler ; RLS couvre aussi les accès directs à la Data API. Les liens/ancres suivent la visibilité et la propriété de leur story. Une contrainte interdit les liens parent/enfant entre propriétaires distincts.
- Le store partagé et le cache KeepAlive sont vidés quand l’identité change ; les réponses anciennes ne rétablissent pas une session après déconnexion. Les fenêtres de confirmation sont annulées. Les réponses API authentifiées sont `no-store`.
- Les redirections de retour restent internes et les appels API ne peuvent pas envoyer un bearer vers un autre hôte. Le rôle est revérifié avant chaque navigation vers une page protégée.

## Historique de migration et attribution réalisées

`database/migrations/20261029090427_story_access.sql` a été créée avec la CLI Supabase 2.122.0, rédigée et vérifiée sur une base temporaire locale, puis appliquée au projet distant. Son nom local a été aligné sur la version renvoyée par Supabase (préparation initiale 20261029072114). Elle ajoute `owner_user_id`, son index et ses contraintes, remplace les policies connues, refuse une policy supplémentaire inattendue, retire les droits d’écriture anonymes et rend les nouvelles stories privées par défaut. Elle conserve les données et les visibilités existantes. Cette migration n’attribuait aucun propriétaire implicitement ; l’attribution des onze stories a depuis été effectuée après l’autorisation distincte.

Les opérations sont séparées : `database/operations/assign_admin_role.sql` attribue le rôle à un compte existant confirmé ; `database/operations/assign_legacy_stories.sql` attribue uniquement les stories sans propriétaire à un compte confirmé déjà admin. Elles exigent une adresse fournie explicitement, ne créent aucun compte et conservent visibilité/catégories. Les stories déjà attribuées ne changent pas. L’adresse personnelle choisie reste dans une préparation locale ignorée par Git.

La procédure ci-dessous décrit l’activation historique sur la base existante. Pour un nouveau projet vide, suivre maintenant [la baseline et le guide de mise en service](../Documentation/MISE-EN-SERVICE.md), sans rejouer ces migrations :

1. Vérifier à nouveau les policies, les comptes et le nombre de stories ; sauvegarder le schéma/policies avant application. Appliquer la migration au projet Universal-Timeline, pas les dumps historiques.
2. Vérifier la liste des URL de redirection Auth dans Supabase : pour le développement, autoriser exactement `http://127.0.0.1:5173/login`. Ne pas utiliser une URL de production arbitraire. La liste des URL distante n’a pas été inspectée/modifiée : le tableau de bord demandait une connexion. Le compte a toutefois été créé/confirmé et sa session fonctionne dans l’application ; cette connexion de gestion n’est plus nécessaire pour terminer l’activation courante. Revoir la liste avant déploiement sur un autre domaine.
3. Passer `AUTH_ENABLED=true` dans `server/.env`, puis redémarrer l’API. Le démarrage et `/health` refusent l’activation si la migration attendue manque. Le front lit le mode annoncé par l’API ; il n’existe pas de second interrupteur frontend à désynchroniser. Les URL et clés publiables locales sont préparées dans les fichiers ignorés, exemples sans clé réelle versionnés.
4. L’utilisateur crée son compte depuis `/login` et confirme son adresse. Il choisit lui-même son mot de passe. Aucun e-mail d’inscription n’a été envoyé par l’agent.
5. Appliquer le rôle puis, avec autorisation explicite de transfert des anciennes stories, leur attribution, dans des transactions après `SELECT set_config('timeline.admin_email', '<adresse choisie>', true)`. Vérifier ensuite, en lecture seule, le rôle et le nombre de stories attribuées. Se reconnecter pour actualiser l’interface.
6. Vérifier en navigation privée : timeline publique ; accès directs Stories/Periods/Events redirigés vers la connexion ; Design system refusé au compte ordinaire. Vérifier avec deux comptes de test distincts uniquement sur un environnement de test dédié que les données privées restent isolées.

Avant ouverture réseau, ne pas désactiver l’authentification pour contourner une erreur. Le mode historique reste réservé au développement local.

## Vérification locale

- Suite Vitest : 468 tests / 45 fichiers à ce stade (dont contrats de données, contrôle d’accès, isolation des sessions, navigation, formulaire et protections du bearer).
- PostgreSQL 14 temporaire via socket Unix : 19 tests réels de policies, propriété, liens privés, refus d’écriture anonyme, changement de propriétaire, isolation du pool et attributions séparées rôle/propriété, avec conservation des statuts public/privé et des catégories. Le projet distant est en PostgreSQL 17 ; les constructions utilisées sont compatibles, mais cette exécution ne vaut pas une migration déjà appliquée à Supabase.
- Builds frontend/backend et contrôle TypeScript des symboles inutilisés réussis. `/health` 200, `/api/access` actif et lectures des 11 stories, de la story 1 et de ses périodes/événements, du catalogue et des catégories vérifiés sous le nouveau rôle SQL anonyme. `/api/account` refuse sans connexion. Les quatre méthodes d’écriture anonymes ont été refusées avant les handlers sur une URL inexistante, sans mutation SQL.
- Le script d’intégration refuse les connexions TCP et impose un nom de base jetable `universaltimeline_test_*`. Le cluster local est arrêté et retiré après les tests. Aucune mutation de vérification sur Supabase.

## Durcissement SQL appliqué — lot 20

Deux migrations supplémentaires ont été appliquées au projet, le 29 octobre 2026 :

- `20261029093707_harden_public_functions.sql` fixe le search_path des deux fonctions applicatives et retire leur droit EXECUTE à PUBLIC, anon, authenticated et service_role. Les triggers existants de `set_updated_at` restent fonctionnels pour les auteurs de table autorisés. La routine historique `maintain_period_relations` reste réservée au propriétaire SQL : son ancien corps utilise des colonnes disparues et doit être revu au lot de maintenance, jamais appelé depuis l’API.
- `20261029093923_isolate_postgis.sql` reconstruit PostGIS 3.3.7 dans `extensions`, hors du schéma exposé par la Data API. Aucun usage PostGIS dans le code actif, aucune colonne de table/vue applicative géographique et aucune dépendance explicite à l’extension n’ont été trouvés. Le DROP utilise RESTRICT, sans CASCADE, avec contrôle de version et transaction ; toute dépendance imprévue ou différence de référentiel annule l’opération. Les 8 500 références géographiques sont conservées à l’identique. L’API locale a été suspendue pendant l’application puis relancée pour renouveler ses connexions.

Sauvegardes du schéma/données publics, des rôles sans mots de passe et du référentiel complet dans `.tmp/lot20`, ignorées par Git et mode 600. Comparaison avant/après : les dix tables applicatives sont strictement identiques, y compris propriété, visibilité et catégories des 11 stories. La lecture REST de `spatial_ref_sys` renvoie désormais 404/PGRST205. Toutes les alertes SQL de l’advisor sécurité ont disparu ; aucune écriture de vérification n’a été faite sur les données Supabase.

Le premier essai PostGIS a été annulé avant tout DROP : le contrôle initial incluait deux types composites internes de l’extension. Le contrôle corrigé distingue tables/vues et types de retour internes ; l’application suivante a réussi. La fonction de dates a été testée sur PostgreSQL 14 local jetable (4 scénarios réels). PostGIS n’est pas installé sur cette base locale : sa migration a été vérifiée par ses gardes transactionnelles et les comparaisons distantes en lecture seule.

Pour rejouer les tests de permissions sur une base jetable vide, définir `TIMELINE_TEST_SOCKET` (chemin absolu du socket Unix, port 55439) et `TIMELINE_TEST_DATABASE=universaltimeline_test_<nom>`, puis exécuter `yarn --cwd server test:privileges`. Le script refuse les connexions TCP et les noms ordinaires ; il crée ses propres tables et rôles, donc utiliser une instance dédiée.

Ne pas réintroduire PostGIS dans public lors d’une nouvelle installation, ni modifier les objets gérés par Supabase pour contourner leur propriétaire. Les migrations historiques et dumps restent à réconcilier avant un démarrage neuf : ne pas les rejouer en bloc.

## Points avant déploiement

Après reconnexion de l’utilisateur au Dashboard à la fin du lot 28, **Prevent use of leaked passwords a été activé et enregistré**. La page Attack Protection affiche ENABLED et l’advisor sécurité ne renvoie plus aucune alerte. Cette option nécessite une offre Pro ou supérieure selon la [documentation Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ; l’organisation actuelle est déjà Pro, sans changement d’abonnement.

Site URL hérité était `http://localhost:3000`, avec aucune Redirect URL. Après confirmation explicite de l’utilisateur, les deux valeurs locales ont été enregistrées puis relues après rechargement : Site URL `http://127.0.0.1:5173`, unique redirection exacte `http://127.0.0.1:5173/login`, sans joker. L’application reste accessible et /api/account refuse l’anonymat. Aucun e-mail de test envoyé : le retour réel d’une nouvelle confirmation n’a pas été rejoué. Le domaine de production reste à choisir puis à vérifier.

Procédure officielle de déplacement et limites des permissions PostGIS : [guide Supabase](https://supabase.com/kb/troubleshooting/security-advisor-flags-spatial_ref_sys-and-other-postgis-objects-in-the-public-schema). Notre migration refuse les cascades et préserve aussi les modifications éventuelles des références standard, au lieu de les remplacer par celles de l’extension.

Références officielles consultées : [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Vue et Auth](https://supabase.com/docs/guides/getting-started/tutorials/with-ionic-vue), [claims JWT](https://supabase.com/docs/guides/auth/jwt-fields), [alerte spatial_ref_sys](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).

## Preuves d’application distante (lot 19)

Avant/après : 11 stories et 11 publiques ; après migration, avant attribution : 11 propriétaires NULL, 21 policies applicatives, RLS sur dix tables, défaut is_public=false et aucun droit INSERT anonyme sur stories. Historique Supabase : migration 20261029090427, nom story_access. Schéma public et métadonnées sauvegardés avant application dans .tmp/lot19 (ignorés par Git, mode 600). Aucun mot de passe de base affiché.

Le premier appel a été rejeté par la revue automatique faute de confirmation jugée explicite. Aucun contournement n’a été tenté. Le second appel a suivi la réponse utilisateur « Oui, appliquer la migration à Supabase » et a réussi. Aucune écriture de vérification sur les données existantes.

## Attribution et vérification de l’interface

Le compte cible a été confirmé, puis son rôle admin seul a été attribué. Le contrôle automatique avait refusé l’opération combinée faute d’autorisation assez explicite sur les stories. Après la réponse utilisateur autorisant expressément les 11 rattachements tout en conservant leurs tags publics, l’opération de propriété seule a réussi. Comparaison par ID avant/après : onze propriétaires attendus, statuts is_public et catégories strictement identiques. Preuve locale ignorée : .tmp/lot19/ownership-verification.json.

Le navigateur avec la vraie session confirme l’accès au Design system et l’affichage des 11 stories du propriétaire. Les contrôles anonymes avaient confirmé la timeline publique, la redirection des pages privées et le refus des écritures avant tout handler. Aucun contenu de story n’a été modifié pour vérifier l’interface. Le retour de confirmation avec une session déjà restaurée et le renouvellement des droits ont été corrigés/testés : sortie immédiate de /login et invalidation des caches lors d’un changement de rôle.

Vérification finale du formulaire : story « Guerre froide » du compte courant ouverte en édition, Mode public activé et badge « Publique » affiché. Fenêtre fermée par Annuler, aucune sauvegarde de vérification. Les 19 tests SQL incluent aussi une story privée pour prouver que l’attribution ne la rend pas publique.


## Validation locale finale — lot 28

L’API refuse un démarrage de production sans AUTH_ENABLED=true, même si le flag est absent. La configuration du middleware se fait dans le chemin de démarrage dont les erreurs sont expurgées ; la vérification du schéma précède toujours l’écoute. Les nouveaux contrôles des fichiers frontend/API ne publient aucune valeur de configuration dans leur rapport.

La passe vierge Docker exécute 798 tests Vitest, quatre tests de configuration TLS, les builds et 85 tests PostgreSQL 17 : 11 baseline, 3 restauration fictive, 19 accès/attributions, 4 privilèges, 8 hiérarchie, 10 suppressions et 30 handlers/écritures atomiques. Les rôles et auth.users y sont une doublure minimale isolée ; aucun compte Supabase réel ni e-mail n’est créé. Les migrations historiques sont testées séparément de la baseline finale.

Le domaine de production n’est pas encore défini. La protection des mots de passe compromis est vérifiée active et les URL locales sont finalisées ; définir Site URL et la redirection exacte /login du futur domaine avant exposition publique. Les résultats locaux n’attestent pas une confirmation par e-mail sur ce futur domaine. Le travail UI/UX qui suit ne doit pas supprimer ces contrôles d’accès.
