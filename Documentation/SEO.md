# Référencement technique

Premier lot du 7 novembre 2026 : métadonnées et routage HTTP des écrans existants. Les vues Vue, styles, interactions et URL de navigation sont conservés. Aucun rendu serveur du contenu des frises, nouveau catalogue ou changement de base de données n’est introduit dans ce lot.

## Métadonnées et routes

`server/src/shared/seoMetadata.ts` centralise les titres, descriptions, directives robots et URL canoniques, réexportés côté navigateur par `src/seo/metadata.ts`. `scripts/seo-plugin.ts` produit des enveloppes HTML par route sous `dist/__seo__/`, ainsi que `404.html` et un sitemap statique minimal. Seul le `<head>` est modifié ; le corps et les ressources du document sont conservés.

Les routes déclarées dans `vercel.json` envoient les URL statiques existantes vers leur enveloppe. Les ressources statiques sont ensuite résolues sur le système de fichiers ; les URL inconnues reçoivent le document de l’application avec le statut HTTP 404. Le routage `/api/*` vers le service Express reste prioritaire. `/timeline`, `/timeline/` et `/sitemap.xml` sont également dirigés explicitement vers Express avant le repli vers l’app Vite.

`server/src/api/seo/pages.ts` fournit ces documents dans le service Express. Le point d’entrée Vercel le monte explicitement ; la livraison ne dépend pas de la découverte automatique d’un middleware à la racine du projet. Le premier déploiement a confirmé que ce middleware n’était pas exécuté dans la composition multiservice du projet.

`publicRead.ts` appelle directement les services de lecture sous un contexte anonyme imposé, même si un appelant est administrateur. Seul le modèle HTML statique est obtenu par HTTP depuis l’origine frontend configurée. Aucun cookie, en-tête Authorization ou Host du visiteur n’est transmis ou utilisé comme origine ; les lectures directes évitent un aller-retour HTTP vers la même API.

`src/seo/installSeo.ts` met à jour les métadonnées après les navigations SPA à partir du catalogue déjà chargé, sans requête de données supplémentaire. Un titre de frise privée n’est jamais repris dans le head, même pour son propriétaire.

## Frises publiques

Deux lectures dédiées ont été ajoutées :

- `GET /api/seo/stories/:id` : ID, titre et description d’une frise strictement publique. Une frise privée ou inexistante donne la même réponse 404. Aucun auteur, propriétaire, période ou événement n’est exporté.
- `GET /api/seo/stories` : ID des frises publiques dont le titre et la description ne sont pas vides, pour le sitemap. Les imports incomplets restent hors de cette liste.

Les requêtes SQL conservent les transactions et rôles RLS existants, avec un prédicat `is_public = true` explicite qui s’applique aussi aux appelants connectés. Les réponses sont `no-store` et portent `X-Robots-Tag: noindex`.

Le document initial de `/timeline?story=<id>` reçoit le titre et la description publics actuels. Les réponses enrichies ne sont pas mises en cache. Une frise privée ou inexistante conserve une enveloppe générique non indexable en statut 200 : le propriétaire connecté peut ainsi continuer à consulter sa frise via l’application.

En cas d’indisponibilité temporaire des métadonnées, le document de l’application est envoyé avec 503 et `Retry-After: 60`, afin de demander aux robots de réessayer. Le JavaScript et le rendu de l’application sont conservés. Si l’enveloppe HTML elle-même ne peut pas être obtenue, la réponse est 503 avec demande de reprise.

Les lectures de métadonnées sont bornées à 1,5 seconde ; celle du modèle HTML à 2,5 secondes. Ces lectures parallèles ajoutent un coût au chargement initial de la timeline. Aucun appel supplémentaire n’est introduit lors des navigations internes. Observer le TTFB et les réponses 503 après déploiement ; une optimisation du rendu complet ou du cache relève d’un lot ultérieur.

## Politique d’indexation

- Accueil, contact et informations légales : métadonnées propres ; canonical sur le domaine HTTPS de production, sans paramètres de campagne.
- Entrée et vue d’ensemble d’une frise publique : indexables ; canonical conservant l’ID et `view=overview` lorsqu’il est présent.
- Positions par période/contexte/référence et comparaisons : `noindex`, sans canonical vers une vue différente. Les liens profonds continuent à fonctionner.
- Recherche, génération, connexion, récupération de mot de passe, espaces de gestion, administration, accès refusé, prototype `/voyage` et pages inconnues : `noindex`.
- Déploiements Vercel Preview : `noindex` dans les enveloppes, dans la navigation SPA et dans les réponses du service ; sitemap vide lorsque l’API Preview est disponible.

Robots.txt autorise l’exploration pour permettre aux moteurs de lire les directives `noindex`. Les contrôles d’accès, et non robots.txt, protègent les données privées. Le domaine canonique est fixé à `https://universaltimeline.net` et ne dépend pas d’un en-tête Host fourni par le client.

Le sitemap dynamique relit la visibilité à chaque demande et contient l’accueil, le contact et les vues d’ensemble des frises publiques complètes. Aucun `lastmod` artificiel n’est produit. Au contrôle local du 7 novembre : 46 URL, soit 44 frises et deux pages fixes ; trois descriptions de frises étaient vides. Si l’API est indisponible, le sitemap répond 503 plutôt qu’une liste vide présentée comme valide.

## Vérification et déploiement

`yarn verify` contrôle design system, tests, configuration hors connexion, symboles inutilisés et builds frontend/API. Les tests SEO couvrent l’échappement du HTML, la conservation du corps du document, les titres privés, les URL canoniques, les routes existantes, les changements de visibilité dans le sitemap et les erreurs temporaires.

`yarn preview --host 127.0.0.1 --port 4174 --strictPort` reproduit le routage HTML et les réponses SEO localement, avec l’API existante sur 3000. Les tests de statut HTTP portent sur cet aperçu de production ; le serveur de développement Vite conserve son propre repli SPA.

Les tests couvrent également le branchement Express, l’origine frontend imposée et le contexte de lecture anonyme depuis une session administrateur. La livraison utilise les réécritures vers le service Express déjà utilisées par l’API. La composition finale des deux services est contrôlée dans le déploiement Git Vercel. Ne pas déployer depuis le poste : conserver la procédure Git existante pour éviter d’embarquer `server/.env`.

Après déploiement, contrôler au minimum : `/`, `/robots.txt`, `/sitemap.xml`, `/timeline?story=22&view=overview`, une page de connexion, une URL inconnue et un fichier JS absent. Vérifier l’absence de 503 inattendus sur la timeline et la conservation des liens directs. Soumettre ensuite le sitemap dans Search Console, une fois la propriété validée.

La propriété Search Console du domaine n’était pas accessible au compte connecté lors de ce lot. La validation DNS et la soumission du sitemap n’ont pas été effectuées.
