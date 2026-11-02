# Conformité RGPD — état au 2 novembre 2026

Ce document décrit ce qui est en place dans l’application et ce qui reste à fournir par l’éditeur avant une ouverture publique. Les textes affichés aux visiteurs sont dans `src/lib/legalDocuments.ts` (pages `/legal/...`) ; chaque passage « [À compléter : …] » y est signalé visuellement et ne doit pas être publié en l’état.

## Ce qui est en place

| Exigence | Mise en œuvre |
| --- | --- |
| Information (art. 13) | Pages publiques `/legal/mentions-legales`, `/legal/confidentialite`, `/legal/cookies`, `/legal/conditions`, liées depuis l’inscription, la page de connexion, l’accueil, le menu utilisateur et le profil. |
| Minimisation | Compte : e-mail et mot de passe (Supabase Auth). Profil : nom d’utilisateur, couleur et icône d’avatar (aucune photo), version et date d’acceptation des conditions. |
| Acceptation des conditions | Case obligatoire à l’inscription ; la version (`CURRENT_TERMS_VERSION`, `server/src/shared/accountRules.ts`) et la date sont enregistrées par le trigger d’inscription. Une nouvelle version est proposée à l’acceptation dans Profil → Données et confidentialité. |
| Droit d’accès et portabilité (art. 15, 20) | Profil → « Télécharger (JSON) » : compte, profil, frises avec leurs périodes, événements et catégories (`GET /api/profile/export`). |
| Rectification (art. 16) | Profil : nom d’utilisateur et avatar ; le nom suit sur les frises existantes. L’e-mail se modifie par le service d’authentification [À compléter : parcours de changement d’e-mail dans l’interface]. |
| Effacement (art. 17) | Profil → « Supprimer définitivement » (confirmation par saisie du nom) : `account_private.delete_own_account()` supprime les frises puis le compte ; le profil suit par cascade. Le catalogue partagé (périodes, événements) est conservé. |
| Sécurité (art. 32) | RLS : chaque compte ne lit et ne modifie que sa ligne de profil ; routines du compte hors du schéma exposé par la Data API ; HTTPS. |
| Cookies (art. 82 loi Informatique et Libertés) | `useConsentStore` + bandeau `CookieConsent`. Le bandeau n’apparaît que si `VITE_ANALYTICS_PROVIDER` est défini : refus aussi simple que l’acceptation, choix conservé six mois puis redemandé, retrait possible à tout moment (politique cookies, profil). |
| Mesure d’audience | PostHog Cloud EU (`src/lib/analytics.ts`), voir ci-dessous. |

## Mesure d’audience : PostHog

- **Activation :** `VITE_ANALYTICS_PROVIDER=posthog`, `VITE_POSTHOG_PROJECT_TOKEN` (clé publique `phc_…`) et `VITE_POSTHOG_HOST=https://eu.i.posthog.com`, dans `.env.local` et dans l’environnement Vercel (front). Sans ces trois valeurs, aucun traceur ni bandeau.
- **Projet :** organisation PostHog « Universal timeline », projet « Universal Timeline » (id 331677), région EU.
- **Consentement :** `installAnalytics` (appelé dans `main.ts`) enregistre le traceur via `useConsentStore().registerTracker`. Le SDK `posthog-js` n’est téléchargé et initialisé qu’après acceptation (import dynamique). Au retrait : `opt_out_capturing`, `reset(true)`, persistance en mémoire et suppression des cookies et stockages `ph_<clé>_…` / `__ph_opt_in_out_<clé>`. Sans consentement au chargement, les restes d’un ancien choix sont aussi supprimés.
- **Données :** pages vues (navigation SPA), clics (autocapture), Web Vitals, provenance, navigateur et appareil, identifiant pseudonyme. Pas d’`identify` : les événements ne sont pas rattachés aux comptes. Enregistrement des sessions désactivé dans le code (`disable_session_recording`), même s’il est activé dans les réglages du projet. IP anonymisées par le réglage « Anonymize IPs » du projet : le garder actif, la politique de confidentialité l’annonce.
- **Durées :** cookie `ph_<clé>_posthog` 365 jours (défaut du SDK) ; données conservées un an (plan gratuit).
- **Changer d’outil ou de finalité :** mettre à jour la politique cookies et la politique de confidentialité (`src/lib/legalDocuments.ts`), puis incrémenter `CONSENT_VERSION` pour redemander le choix (passé à 2 à l’installation de PostHog).
- Un outil exempté de consentement selon la CNIL (mesure strictement anonyme) devrait être documenté ici avant de se passer du bandeau.

## Registre des traitements (à compléter)

| Traitement | Finalité | Base légale | Données | Durée | Sous-traitants |
| --- | --- | --- | --- | --- | --- |
| Comptes et profils | Gérer l’accès et signer les frises | Contrat | E-mail, mot de passe chiffré, nom d’utilisateur, avatar, acceptation des conditions | Jusqu’à suppression du compte ; [À compléter : comptes inactifs] | Supabase (UE) |
| Frises | Créer, publier, partager | Contrat | Contenus, visibilité, auteur | Jusqu’à suppression de la frise ou du compte | Supabase (UE), Vercel |
| Journaux techniques | Sécurité | Intérêt légitime | IP, horodatage, requête | [À compléter] | Vercel, Supabase |
| Mesure d’audience | Statistiques d’usage pour améliorer le site | Consentement | Pages vues, clics, provenance, navigateur et appareil, identifiant pseudonyme (IP anonymisée) | Cookie 12 mois au plus ; données 1 an | PostHog Inc. (Cloud EU) |

## Reste à faire hors code

- Identité de l’éditeur, du directeur de publication, du responsable de traitement et adresse de contact « données personnelles ».
- Accords de sous-traitance (DPA) avec Supabase, Vercel et PostHog ; garanties de transfert hors UE pour Vercel.
- Durées de conservation (comptes inactifs, journaux), âge minimum, licence des contenus publiés, modération.
- Configuration Supabase Auth : modèles d’e-mails en français mentionnant la politique de confidentialité.
