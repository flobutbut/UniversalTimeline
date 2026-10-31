# Installation et préparation de la livraison

Ces procédures concernent l’état local remis en ordre dans le répertoire Desktop de référence. Rien n’est publié automatiquement. Le travail UI et expérience utilisateur reste un chantier distinct de cette validation technique.

## Projet Supabase existant

1. Utiliser Node 22.23.1 et Yarn Classic 1.22.22. Installer les deux arbres : `yarn install --frozen-lockfile --non-interactive`, puis `yarn --cwd server install --frozen-lockfile --non-interactive`.
2. Conserver les fichiers de connexion déjà présents. Les commandes suivantes créent uniquement les fichiers manquants :

   ```sh
   [ -e .env.local ] || cp .env.example .env.local
   [ -e server/.env ] || cp server/.env.example server/.env
   ```

3. Si ces fichiers viennent d’être créés, renseigner les vraies valeurs localement selon [SUPABASE.md](../server/SUPABASE.md). La connexion PostgreSQL et les secrets restent côté API ; le navigateur utilise seulement l’URL Supabase et sa clé publiable. Le frontend et l’API doivent viser le même projet. `AUTH_ENABLED=true` est requis pour le modèle d’accès confirmé et tout démarrage en production.
4. Lancer `yarn verify:config`. Le résultat affiche seulement des statuts, jamais les valeurs. Ce contrôle lit server/.env et .env.local, sans connexion ni modification. Il vérifie notamment TLS, l’authentification, la correspondance frontend/API et l’origine du front ; il ne vérifie pas la liste des URL dans le Dashboard Auth.
5. Lancer le développement avec `yarn dev:all` ou conserver les services PM2 déjà actifs. Le lancement durable reste `yarn daemon:up` ; cette commande redémarre les processus du projet et utilise 3000/5173. Tester http://127.0.0.1:3000/health puis http://127.0.0.1:5173/timeline.

Ne rejouer ni baseline, ni migration, ni attribution sur le projet existant. Les onze stories historiques ont déjà leur propriétaire et leur visibilité a été conservée.

## Nouveau projet vide

Préparer d’abord un projet Supabase PostgreSQL 17 ou ultérieur et vérifier explicitement son identité avant toute application SQL. Aucun nouveau projet n’est créé par les scripts de vérification.

Lire puis appliquer uniquement [la baseline applicative](../database/baseline/README.md) sur cette cible vide. Elle suppose Supabase Auth déjà fourni par la plateforme. Ne pas rejouer ensuite les trois migrations historiques : leurs changements figurent dans la baseline. Elle ne transfère ni les anciennes données ni les comptes et ne crée pas d’administrateur.

Créer et confirmer le premier compte depuis l’application, puis attribuer son rôle avec l’opération explicite décrite dans [AUTHENTICATION.md](../server/AUTHENTICATION.md). Ne pas effectuer d’attribution globale de stories sur une nouvelle cible sans données à transférer et autorisation correspondante.

## Vérification reproductible

- `yarn verify` : tests isolés, contrôle de configuration DB sans connexion, TypeScript des symboles inutilisés et builds front/API, avec les dépendances locales déjà installées.
- `yarn verify:clean` : même contrôle depuis une installation verrouillée vierge dans Docker, audits Yarn des deux arbres, puis PostgreSQL 17 jetable pour la baseline, sa restauration, Auth, hiérarchie, suppression, fonctions et écritures atomiques. Les tests applicatifs et SQL sont sans réseau externe ; les installations et audits utilisent les registres publics.
- `node scripts/check-clean.mjs` : même procédure sans installation des dépendances sur le poste, avec Node et Docker disponibles. Le workflow GitHub utilise cette entrée ; son exécution distante attend une publication autorisée.

Docker sert à cette vérification isolée et reste optionnel pour le développement courant. Les ressources de test portent un identifiant unique et sont nettoyées en fin de passe ; le serveur PM2 et la base Supabase ne sont pas touchés. Les images de base et le cache de construction peuvent rester pour les passes suivantes.

## Avant de rendre le service public

Définir le vrai domaine de livraison, puis préparer les variables du build frontend et de l’API pour ce domaine. `FRONTEND_ORIGIN` doit être une origine HTTPS exacte. `yarn verify:config --production` contrôle les fichiers locaux dans ce mode et échoue volontairement avec l’origine HTTP de développement. Cette commande ne déploie rien.

Dans le Dashboard Supabase du projet cible, vérifier Site URL et la liste des URL de redirection. Le formulaire utilise `<origine>/login` pour la confirmation. Pour le développement actuel, Site URL `http://127.0.0.1:5173` et l’unique redirection exacte `http://127.0.0.1:5173/login` sont enregistrés et relus après rechargement du Dashboard, après confirmation explicite de l’utilisateur au lot 28. Le domaine de production n’est pas encore choisi : ne pas inventer son URL ni autoriser un joker général. La protection contre les mots de passe compromis a été activée et vérifiée dans le projet actuel, déjà Pro ; l’advisor sécurité ne renvoie plus d’alerte. Vérifier cette option aussi pour une nouvelle cible.

Le déploiement doit fournir le frontend compilé, un repli vers index.html pour les routes front, et le proxy /api vers Express. Il doit transmettre les en-têtes nécessaires sans exposer la connexion SQL. L’image de production de l’API est server/Dockerfile ; le compose publie seulement localhost:3000 pour une utilisation derrière le frontal choisi. L’API refuse de démarrer en production si AUTH_ENABLED n’est pas explicitement true.

Avant publication, vérifier confirmation de compte et retour de connexion sur la cible, accès anonyme à la timeline, accès propriétaire aux stories privées et Design system réservé à l’admin. Le compte courant fonctionne en local ; les essais automatiques utilisent uniquement des comptes fictifs et une doublure Auth, pas des envois d’e-mails réels.

Enfin, définir et tester la reprise des données du projet cible selon [le guide des sauvegardes](../database/README_backup.md). La restauration automatisée de données fictives ne remplace pas cette procédure d’exploitation.

Références : [URL Auth](https://supabase.com/docs/guides/auth/redirect-urls), [sécurité des mots de passe](https://supabase.com/docs/guides/auth/password-security), [sauvegarde/restauration Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
