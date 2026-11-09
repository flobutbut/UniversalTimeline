# Retours utilisateurs

La bulle « Donner mon avis » est disponible sur toutes les pages. Elle propose une note facultative sur cinq étoiles, un objet et un message obligatoire (5 000 caractères au plus). Le lien de la page au moment de l’envoi est joint automatiquement, en conservant les paramètres de navigation des frises et en retirant les jetons de connexion ou de récupération de compte.

Le retour est enregistré avant de proposer une adresse e-mail facultative. Fermer le panneau à cette étape conserve donc le message. L’adresse est rattachée grâce à un reçu secret conservé uniquement en mémoire pendant ce parcours : elle ne peut pas être ajoutée à un autre retour, remplacée, ou ajoutée plus de 24 heures après l’envoi. Le serveur ne conserve que l’empreinte du reçu. Les nouvelles tentatives après une coupure réseau réutilisent le même reçu et le même contenu pour éviter les doublons.

Dans **Administration → Retours utilisateurs**, les retours apparaissent par ordre de réception, par pages de 50. Les filtres de statut et d’objet se combinent et s’appliquent en base avant la pagination, à tous les retours. Le compteur indique le nombre de correspondances et chaque changement de filtre ramène à la première page. L’administrateur peut choisir Nouveau, À traiter ou Résolu. Si une adresse est présente, « Répondre » ouvre un modèle modifiable, adapté à une prise en compte ou une résolution et rappelant le message et le lien. « Ouvrir dans ma messagerie » prépare un e-mail dans le logiciel de messagerie ; l’administrateur confirme lui-même l’envoi. L’ouverture du modèle ne change pas le statut.

L’interface utilise les composants partagés `Button`, `Input`, `Select`, `Switch`, `Tag`, `ModalShell`, `PopoverSurface`, `FeedbackState` et `DesignIcon`. La variante de succès de `FeedbackState` et les deux icônes d’étoile sont visibles dans le catalogue du design system. Les couleurs, espacements, styles typographiques, rayons et ombres proviennent des tokens communs.

Chaque retour dispose d’un bouton « Supprimer ». La confirmation partagée avertit que la suppression est définitive. L’API et la base réservent cette action à un administrateur actuel ; seule la ligne sélectionnée et ses notifications associées sont supprimées. Une suppression ne peut pas retirer un e-mail déjà envoyé.

## Activation globale

Le switch compact « Activer les avis », dans l’en-tête de l’admin, active ou désactive la fonctionnalité pour tout le site. Activée par défaut, elle peut être coupée uniquement par un administrateur actuel. La désactivation masque le bouton et ferme le formulaire ; elle bloque aussi les dépôts et ajouts d’adresse côté base avec une réponse API 503. Les anciens retours restent consultables et gérables.

Le widget relit le réglage à l’ouverture de la page, au retour sur l’onglet et toutes les 60 secondes pendant qu’il est visible. Le changement dans l’admin s’applique immédiatement au widget du même onglet. Si le réglage est indisponible, le widget reste masqué ; le bandeau cookies reste indépendant. Les notifications en attente sont annulées à la désactivation et ne sont pas reprises à la réactivation ; un envoi SMTP déjà engagé peut néanmoins arriver. Les préférences personnelles de notification sont conservées pour les futurs retours.

La migration `20261109230646_feedback_feature_switch.sql` ajoute une configuration privée à une seule ligne et les routines de lecture et écriture. Aucun accès direct à la table n’est accordé. Les écritures de feedback et la prise en charge des notifications verrouillent cette configuration pour se coordonner avec la désactivation.

## Notifications de nouveaux retours

Chaque administrateur peut activer « Recevoir les retours par e-mail ». Le choix est mémorisé pour son compte et désactivé par défaut. Le destinataire est lu depuis l’adresse confirmée du compte dans Supabase Auth, y compris après un changement d’adresse ; le navigateur ne peut pas choisir une autre adresse. Les futurs retours sont notifiés, sans envoi rétroactif de tout l’historique.

L’envoi SMTP utilise Nodemailer dans l’API. Variables serveur nécessaires : `SMTP_HOST`, `SMTP_PORT` (465 avec TLS ou 587 avec STARTTLS obligatoire), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (facultatif, prend la valeur de `SMTP_USER`). Les réglages non secrets sont dans `server/.env.example`. Ils sont distincts des paramètres SMTP de Supabase Auth. En leur absence, le switch reste indisponible et le site l’explique. Les cinq variables SMTP de production sont configurées dans Vercel, avec le mot de passe saisi par l’utilisateur en type Secret. Les notifications sont activées pour le compte administrateur. Le test UT-SMTP-20261109 a été accepté par Hostinger dès la première tentative et reçu dans la boîte de réception ; son feedback technique a ensuite été retiré. Le mot de passe local dans `server/.env` reste vide : cette activation concerne le site public.

Une file privée est créée dans la même transaction que chaque nouveau retour, avec un seul envoi par retour et par administrateur abonné. Les dépôts idempotents ne créent pas de nouvelles notifications. Le traitement utilise une transaction serveur dédiée au rôle `service_role` ; ni les visiteurs ni les comptes ordinaires ne peuvent lire les adresses destinataires ou réclamer des envois. L’envoi est attendu avant la réponse HTTP, pour fonctionner sur Vercel. Un échec SMTP conserve le feedback et programme une reprise après cinq minutes, à l’occasion d’un prochain dépôt ou d’une consultation de l’admin, avec cinq tentatives au plus. Il n’y a pas de tâche périodique dédiée. En cas d’interruption entre l’acceptation SMTP et la confirmation en base, une reprise peut renvoyer le même message ; le Message-ID reste identique.

Les notifications contiennent le message, la note, la page consultée et un lien vers l’admin. L’adresse facultative de l’auteur, ajoutée après le dépôt, reste consultable dans l’admin. La désactivation annule les notifications encore en attente. Les comptes suspendus ou ayant perdu leur rôle admin sont exclus des envois.

## Stockage et accès

Migration additive : `database/migrations/20261109220108_user_feedback.sql`, incluse aussi dans la baseline des installations vides. Appliquée au projet Supabase Universal-Timeline le 9 novembre 2026. Ne pas rejouer cette migration après une installation depuis la baseline.

La migration `20261109221920_feedback_email_notifications.sql`, appliquée le même jour et incluse dans la baseline, ajoute les préférences et la file d’envoi. RLS et l’interdiction des lectures directes s’appliquent aussi à ces deux tables privées ; le conseiller Supabase signale donc des avis informatifs « RLS Enabled No Policy » attendus.

La migration `20261109222916_feedback_list_filters.sql`, également appliquée le 9 novembre et intégrée à la baseline, ajoute la lecture filtrée par objet et statut. Les mêmes contrôles admin s’appliquent à cette routine.

La migration `20261109223738_feedback_delete.sql`, appliquée le même jour et incluse dans la baseline, ajoute la suppression ciblée réservée aux administrateurs.

La table `feedback_private.submissions` n’est pas exposée par la Data API. RLS est activée, aucun accès direct aux lignes n’est accordé aux visiteurs ou comptes connectés. Les routines privées autorisent uniquement le dépôt et l’ajout d’une adresse avec le reçu. La lecture et les changements de statut vérifient le rôle admin côté API, puis le rôle actuel stocké dans Auth, via `admin_private.require_admin()`. L’avis informatif « RLS Enabled No Policy » du conseiller Supabase est attendu : les accès directs sont volontairement interdits, les routines privées contrôlent les opérations autorisées.

Un maximum de dix nouveaux retours par source et par période de quinze minutes limite les rafales. L’adresse IP n’est pas enregistrée : une empreinte à clé aléatoire propre au processus et au jour est utilisée. Cette protection limite les rafales par instance ; elle ne remplace pas une protection anti-abus distribuée. Les empreintes anciennes sont effacées lors d’un dépôt suivant. Sur Vercel, la source vient du header `X-Forwarded-For` réécrit par la plateforme ; en local, du pair réseau direct. Le bandeau cookies et la bulle partagent une pile flottante : un bloqueur qui masque le bandeau ne masque pas l’accès au feedback.

## Vérification

`yarn verify` couvre le typage, les builds frontend/API et les tests isolés. `server/test/feedback.postgres.mjs` exerce les vrais handlers sur une base locale jetable : migration depuis l’ancienne baseline, dépôt anonyme, retry sans doublon, ajout sécurisé de l’adresse, refus aux non-admins, et limites en concurrence. Ce scénario est inclus dans `yarn verify:clean` et refuse les bases distantes. Le schéma privé fait également partie des sauvegardes de test.

## Déploiement validé

Version de production : `dpl_8iZLbgFb734cvpyXCpahkN9qb6ic`, [inspection Vercel](https://vercel.com/flobutbuts-projects/universaltimeline/8iZLbgFb734cvpyXCpahkN9qb6ic). Cette première publication incluait la correction de badges de `origin/main` (`ca441ca`). La branche des feedbacks reprend cette base et ajoute le réglage global.

L’envoi initial incluait des sorties de compilation locales et l’API échouait au chargement des modules. Retour temporaire à la version précédente, puis publication de la correction : `.vercelignore` exclut `dist`, `server/dist` et les métadonnées TypeScript ; la fonction inclut explicitement le `package.json` ESM et le certificat PostgreSQL. Le point d’entrée importe Express explicitement. L’API et la validation du feedback ont été vérifiées sur l’URL de déploiement avant promotion. Le test final couvre l’activation depuis l’admin public, le dépôt d’un feedback, son traitement SMTP et sa réception chez Hostinger.
