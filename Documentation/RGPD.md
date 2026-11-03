# Conformité RGPD — état au 3 novembre 2026

Ce document décrit ce qui est en place dans l’application et ce qui reste à fournir par l’éditeur avant une ouverture publique. Les textes affichés aux visiteurs sont dans `src/lib/legalDocuments.ts` (pages `/legal/...`) ; chaque passage « [À compléter : …] » y est signalé visuellement et ne doit pas être publié en l’état.

## Ce qui est en place

| Exigence | Mise en œuvre |
| --- | --- |
| Information (art. 13) | Pages publiques `/legal/mentions-legales`, `/legal/confidentialite`, `/legal/cookies`, `/legal/conditions`, liées depuis l’inscription, la page de connexion, l’accueil, le menu utilisateur et le profil. |
| Contact et exercice des droits | Adresse unique `CONTACT_EMAIL` (`src/lib/legalDocuments.ts`, actuellement florian@universaltimeline.net), page publique `/contact` : sujets pré-remplis (question, signalement, données personnelles, problème technique) par lien `mailto:`, sans formulaire ni stockage côté site. Réponse aux demandes de droits sous un mois (art. 12.3). |
| Minimisation | Compte : e-mail et mot de passe (Supabase Auth). Profil : nom d’utilisateur, couleur et icône d’avatar (aucune photo), version et date d’acceptation des conditions. |
| Acceptation des conditions | Case obligatoire à l’inscription ; la version (`CURRENT_TERMS_VERSION`, `server/src/shared/accountRules.ts`) et la date sont enregistrées par le trigger d’inscription. Une nouvelle version est proposée à l’acceptation dans Profil → Données et confidentialité. |
| Droit d’accès et portabilité (art. 15, 20) | Profil → « Télécharger (JSON) » : compte, profil, frises avec leurs périodes, événements et catégories (`GET /api/profile/export`). |
| Rectification (art. 16) | Profil : nom d’utilisateur et avatar ; le nom suit sur les frises existantes. L’e-mail se modifie depuis Profil → Adresse e-mail (lien de confirmation envoyé par Supabase Auth). |
| Effacement (art. 17) | Profil → « Supprimer définitivement » (confirmation par saisie du nom) : `account_private.delete_own_account()` supprime les frises puis le compte ; le profil suit par cascade. Le catalogue partagé (périodes, événements) est conservé. |
| Sécurité (art. 32) | RLS : chaque compte ne lit et ne modifie que sa ligne de profil ; routines du compte hors du schéma exposé par la Data API ; HTTPS. |
| Cookies (art. 82 loi Informatique et Libertés) | `useConsentStore` + bandeau `CookieConsent`. Le bandeau n’apparaît que si `VITE_ANALYTICS_PROVIDER` est défini : refus aussi simple que l’acceptation, choix conservé six mois puis redemandé, retrait possible à tout moment (politique cookies, profil). |
| Mesure d’audience | PostHog Cloud EU (`src/lib/analytics.ts`), voir ci-dessous. |

## Mesure d’audience : PostHog

- **Activation :** `VITE_ANALYTICS_PROVIDER=posthog`, `VITE_POSTHOG_PROJECT_TOKEN` (clé publique `phc_…`) et `VITE_POSTHOG_HOST=https://eu.i.posthog.com`, dans `.env.local` et dans l’environnement Vercel (front). Sans ces trois valeurs, aucun traceur ni bandeau.
- **Projet :** organisation PostHog « Universal timeline », projet « Universal Timeline » (id 331677), région EU.
- **Consentement :** `installAnalytics` (appelé dans `main.ts`) enregistre le traceur via `useConsentStore().registerTracker`. Le SDK `posthog-js` n’est téléchargé et initialisé qu’après acceptation (import dynamique). Au retrait : `opt_out_capturing`, `reset(true)`, persistance en mémoire et suppression des cookies et stockages `ph_<clé>_…` / `__ph_opt_in_out_<clé>`. Sans consentement au chargement, les restes d’un ancien choix sont aussi supprimés.
- **Données :** pages vues (navigation SPA), clics (autocapture sans texte : `mask_all_text` et attributs descriptifs ignorés, seuls les `data-attr` et liens restent), événements produit de `track()` (étapes et motifs techniques, positions et événements consultés dans l’Exploration — frises privées seulement comptées, jamais identifiées —, recherches ; liste dans `Documentation/PLAN-ANALYSE.md`). Seul texte saisi collecté : le terme d’une recherche sans frise, normalisé, coupé à 50 caractères et refusé s’il contient une adresse, un lien ou un numéro (`searchTermForAnalytics`), erreurs JavaScript (`$exception`) et clics sans effet (réglages du projet), Web Vitals, provenance, navigateur et appareil, identifiant pseudonyme. Pas d’`identify` : les événements ne sont pas rattachés aux comptes. Enregistrement des sessions désactivé dans le code (`disable_session_recording`), même s’il est activé dans les réglages du projet. IP anonymisées par le réglage « Anonymize IPs » du projet : le garder actif, la politique de confidentialité l’annonce.
- **Durées :** cookie `ph_<clé>_posthog` 365 jours (défaut du SDK) ; données conservées un an (plan gratuit).
- **Changer d’outil ou de finalité :** mettre à jour la politique cookies et la politique de confidentialité (`src/lib/legalDocuments.ts`), puis incrémenter `CONSENT_VERSION` pour redemander le choix (passé à 2 à l’installation de PostHog).
- Un outil exempté de consentement selon la CNIL (mesure strictement anonyme) devrait être documenté ici avant de se passer du bandeau.

## Registre des traitements

| Traitement | Finalité | Base légale | Données | Durée | Sous-traitants |
| --- | --- | --- | --- | --- | --- |
| Comptes et profils | Gérer l’accès et signer les frises | Contrat | E-mail, mot de passe chiffré, nom d’utilisateur, avatar, acceptation des conditions | Jusqu’à suppression du compte ; compte sans connexion pendant 2 ans supprimé avec ses frises, après un e-mail d’avertissement un mois avant (recommandation CNIL sur les comptes inactifs) | Supabase (UE), Hostinger (envoi des e-mails, société chypriote) |
| Journal d’administration | Sécurité et modération (traçabilité des actions sur les comptes) | Intérêt légitime | Identifiants des comptes concernés, nom d’utilisateur au moment de l’action, action, date | 1 an après l’action (recommandation CNIL sur la journalisation : 6 mois à 1 an) | Supabase (UE) |
| Contact | Répondre aux messages | Intérêt légitime | Adresse e-mail et contenu du message | 1 an après le dernier échange | Hostinger (messagerie, société chypriote) |
| Frises | Créer, publier, partager | Contrat | Contenus, visibilité, auteur | Jusqu’à suppression de la frise ou du compte | Supabase (UE), Vercel |
| Journaux techniques | Sécurité | Intérêt légitime | IP, horodatage, requête | 7 jours au plus, fixés par les hébergeurs (Supabase Pro : 7 jours ; Vercel : 1 heure en Hobby, 1 jour en Pro), sans export | Vercel, Supabase |
| Mesure d’audience | Statistiques d’usage pour améliorer le site | Consentement | Pages vues, clics sans texte, frises publiques et éléments consultés, recherches (terme seulement sans frise trouvée, filtré), provenance, navigateur et appareil, identifiant pseudonyme (IP anonymisée) | Cookie 12 mois au plus ; données 1 an | PostHog Inc. (Cloud EU) |

## Décisions de l’éditeur (3 novembre 2026)

- **Éditeur, directeur de publication et responsable du traitement :** Florian Butour, particulier, projet non commercial (pas de SIREN) ; adresse postale non publiée au titre de l’article 6, III, 2 de la LCEN.
- **Hébergement :** Vercel héberge le site et l’API, c’est l’hébergeur à nommer au titre de la LCEN ; Hostinger fournit le nom de domaine et la messagerie, Supabase la base et l’authentification. Les trois figurent dans les mentions légales.
- **Âge minimum :** 15 ans pour créer seul un compte, accord parental en dessous (art. 45 loi Informatique et Libertés, décret du 29 mai 2019), déclaré par la case d’inscription, sans pièce d’identité (la CNIL parle d’obligation de moyens). L’interdiction des réseaux sociaux aux moins de 15 ans votée en 2026 a été censurée (décision n° 2026-911 DC du 14 août 2026) : à surveiller si une nouvelle loi est adoptée.
- **Licence :** frises publiques sous CC BY 4.0 (citer l’auteur et Universal Timeline) ; code, conception et textes éditoriaux : droits réservés à l’éditeur ; catalogue Wikidata en CC0.
- **Modération :** examen des signalements dans les meilleurs délais, retrait d’une frise manifestement illicite, suspension ou suppression du compte, auteur prévenu par e-mail.
- **PostHog :** accord de traitement des données (DPA) signé le 3 novembre 2026 par Florian Butour, en son nom propre (« Florian Butour (Universal Timeline) »), via le formulaire du projet PostHog (Settings → Legal documents, copie signée téléchargeable).
- **Transferts hors UE (Vercel) :** certification Data Privacy Framework UE–États-Unis, et clauses contractuelles types dans l’accord de traitement des données de Vercel (vercel.com/legal/dpa).
- **Conditions :** ces textes sont rattachés à la version `2026-11-03` de `CURRENT_TERMS_VERSION`, sans nouvelle version : le 3 novembre 2026, seuls les comptes de l’éditeur l’avaient acceptée. Toute modification ultérieure des conditions impose une nouvelle date.

## Reste à faire hors code

- Vérifier l’acceptation des DPA de Supabase et Vercel dans leurs Dashboards.
- Suppression des comptes inactifs : à mettre en œuvre (e-mail d’avertissement un mois avant, puis suppression) avant les premiers deux ans d’inactivité, soit au plus tard en octobre 2028. Purger aussi le journal d’administration au-delà d’un an et les messages de contact au-delà d’un an après le dernier échange.
- Configuration Supabase Auth (vérifiée le 3 novembre 2026) : SMTP Hostinger actif, six modèles français collés depuis `Documentation/emails/`, Site URL et Redirect URLs sur `https://universaltimeline.net`. Notifications de sécurité (mot de passe et adresse modifiés) : voir `Documentation/emails/README.md`.
