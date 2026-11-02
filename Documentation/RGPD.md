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
| Cookies (art. 82 loi Informatique et Libertés) | `useConsentStore` + bandeau `CookieConsent` : aucun traceur actif aujourd’hui, donc aucun bandeau. Dès que `VITE_ANALYTICS_PROVIDER` est défini, le bandeau demande un choix, refus aussi simple que l’acceptation, choix conservé six mois puis redemandé, retrait possible à tout moment (politique cookies, profil). |

## Installer un outil de mesure d’audience plus tard

1. Définir `VITE_ANALYTICS_PROVIDER` dans l’environnement Vercel (front).
2. Démarrer l’outil **uniquement** via `useConsentStore().registerTracker({ start, stop })` : `start` charge le script après consentement, `stop` l’arrête et supprime ses cookies au retrait.
3. Compléter la section « Mesure d’audience » de la politique cookies (outil, finalité, cookies, durées) et incrémenter `CONSENT_VERSION` pour redemander le choix.
4. Si l’outil est exempté de consentement selon la CNIL (mesure strictement anonyme), le documenter ici avant de s’en passer.

## Registre des traitements (à compléter)

| Traitement | Finalité | Base légale | Données | Durée | Sous-traitants |
| --- | --- | --- | --- | --- | --- |
| Comptes et profils | Gérer l’accès et signer les frises | Contrat | E-mail, mot de passe chiffré, nom d’utilisateur, avatar, acceptation des conditions | Jusqu’à suppression du compte ; [À compléter : comptes inactifs] | Supabase (UE) |
| Frises | Créer, publier, partager | Contrat | Contenus, visibilité, auteur | Jusqu’à suppression de la frise ou du compte | Supabase (UE), Vercel |
| Journaux techniques | Sécurité | Intérêt légitime | IP, horodatage, requête | [À compléter] | Vercel, Supabase |
| Mesure d’audience | Statistiques | Consentement | [À compléter le jour de l’installation] | 13 mois maximum pour les cookies | [À compléter] |

## Reste à faire hors code

- Identité de l’éditeur, du directeur de publication, du responsable de traitement et adresse de contact « données personnelles ».
- Accords de sous-traitance (DPA) avec Supabase et Vercel ; garanties de transfert hors UE pour Vercel.
- Durées de conservation (comptes inactifs, journaux), âge minimum, licence des contenus publiés, modération.
- Configuration Supabase Auth : modèles d’e-mails en français mentionnant la politique de confidentialité.
