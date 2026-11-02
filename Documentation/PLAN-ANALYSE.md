# Plan d’analyse produit — PostHog

> Rédigé le 2 novembre 2026. Projet PostHog « Universal Timeline » (id 331677, région EU). Mesure installée par `src/lib/analytics.ts`, uniquement après consentement (voir `Documentation/RGPD.md`).

## 1. Ce qu’on veut comprendre

| # | Question | Réponse attendue |
| --- | --- | --- |
| Q1 | **Où les visiteurs s’arrêtent-ils** entre la landing et une première frise ? | Un entonnoir chiffré, étape par étape, avec la plus grosse perte identifiée. |
| Q2 | **Pourquoi** s’arrêtent-ils à cette étape ? | Erreurs, blocages de formulaire, clics sans effet, réponses à un sondage court. |
| Q3 | **Comment utilisent-ils la plateforme** ? | Explorer des frises existantes, créer les siennes, ou les deux ; profondeur de navigation ; retours. |
| Q4 | **Contribuent-ils ou s’en servent-ils pour eux** ? | Part des frises publiques/privées, contributions au catalogue partagé, motif déclaré. |

## 2. Contraintes à garder en tête

- **Échantillon consenti.** Seuls les visiteurs qui acceptent la mesure sont comptés. Les chiffres PostHog sont des tendances et des taux, pas des totaux. Les totaux viennent de la base (section 7).
- **Pas d’identification des comptes aujourd’hui.** Sans `identify`, un même utilisateur sur deux appareils compte pour deux, et on ne peut pas classer une *personne* comme « contributeur » sur la durée. Décision D1 (section 9).
- **Pas d’enregistrement de sessions.** Le « pourquoi » s’appuie d’abord sur les erreurs, les clics sans effet et les sondages. L’enregistrement ciblé est une option (D3).
- **Aucune donnée personnelle dans les événements** : ni e-mail, ni nom d’utilisateur, ni texte saisi, ni titre de frise privée. Les recherches sont mesurées par leur nombre de résultats, pas par leur texte.
- **Faibles volumes au début.** Tant que les entonnoirs comptent quelques dizaines de personnes, les sondages et les retours directs valent plus que les pourcentages.

## 3. Les parcours mesurés

### Parcours A — Acquisition : de la landing au compte confirmé

```
Landing (/ ou /voyage)
  ├─ « Explorer les frises » ──────────────► Timeline publique (parcours C)
  └─ « Créer ma première frise » / « Créer un compte »
        ► Formulaire d’inscription (/login?mode=signup)
        ► Inscription envoyée ► E-mail de confirmation ► Première connexion
```

### Parcours B — Activation : du compte à la première frise utile

```
Première connexion ► Nom d’utilisateur (requis pour créer) ► Frise créée
  ► Contenu ajouté (périodes, événements, import Wikidata) ► Frise rendue publique
```

### Parcours C — Usage de la timeline

```
Frise ouverte (recherche, landing, lien, fil d’Ariane, frise associée)
  ► Période ouverte (profondeur 1, 2, 3…) ► Événement consulté
  ► Navigation latérale (précédent/suivant), retour, changement de frise
```

## 4. Plan de marquage

Convention : noms en anglais `objet_action` (snake_case), propriétés en snake_case, valeurs courtes et sans donnée personnelle. Deux mécanismes :

- **Clics** : attribut `data-attr="…"` sur les boutons et liens clés, puis **Actions** PostHog définies sur l’autocapture. Aucun code d’envoi, modifiable sans déploiement.
- **Résultats** (inscription réussie ou échouée, frise créée…) : événements personnalisés envoyés par un helper `track(event, properties)` ajouté à `src/lib/analytics.ts`, qui ne fait rien sans consentement.

### 4.1 Landing et inscription (phase 1)

| Événement / Action | Déclencheur | Propriétés | Où |
| --- | --- | --- | --- |
| `$pageview` (auto) | Chaque page, navigation SPA comprise | `$pathname`, `$referrer`, UTM | déjà actif |
| Action `CTA landing` | Clic sur un `data-attr="landing-cta-*"` | `cta` : `explore`, `create`, `login`, `footer_explore`, `footer_signup`, `journey_story`, `journey_create`, `journey_outro` | `LandingView.vue`, `ScrollLandingView.vue` |
| `landing_section_viewed` | Section visible à 50 % (une fois par visite) | `page` (`landing`, `voyage`), `section` (`experience`, `comprendre`, `creer`) | `LandingView.vue` |
| `landing_demo_scale_changed` | Onglet d’échelle de la démo | `scale` (`IntroScaleId` : `universe`, `earth`, `dinosaurs`, `humans`, `inventions`) | `LandingTimeDemo` (`changeScale`) |
| `journey_step_reached` | Étape atteinte sur /voyage | `step_index`, `step_id`, `method` (`scroll`, `button`) | `ScrollLandingView.vue` |
| `signup_form_viewed` | Affichage du mode inscription | `redirect` (chemin cible) | `LoginView.vue` |
| `signup_blocked` | Envoi impossible côté client | `reason` (`username_invalid`, `username_taken`, `terms_unchecked`) | `LoginView.vue` |
| `signup_submitted` | Envoi du formulaire | — | `LoginView.vue` |
| `signup_failed` | Erreur renvoyée par Supabase | `reason` = code d’erreur déjà distingué par `signupError` (`weak_password`, `over_email_send_rate_limit`, `over_request_rate_limit`, `email_address_invalid`, `unexpected_failure` = nom pris entre-temps…) | `LoginView.vue` |
| `signup_succeeded` | Compte créé, confirmation attendue | — | `LoginView.vue` |
| `login_succeeded` / `login_failed` | Connexion | `reason` pour l’échec | `LoginView.vue` |
| `username_set` | Nom d’utilisateur enregistré depuis le profil | `first_time` | `ProfileView.vue` |

### 4.2 Création et contribution (phase 2)

| Événement | Déclencheur | Propriétés | Où |
| --- | --- | --- | --- |
| `story_created` | Nouvelle frise | `visibility` (`public`, `private`), `source` (`blank`, `from_period`) | `useDatabaseSave`, `useDatabaseView` |
| `story_visibility_changed` | Changement de visibilité | `from`, `to` | `useDatabaseSave` |
| `story_content_added` | Périodes/événements associés à une frise | `kind` (`period`, `event`), `count` | `StoryApiService.changeAssociations` (appelants) |
| `period_created` / `event_created` | Nouvel élément du catalogue partagé | `source` (`manual`, `wikidata`), `in_story` | `useGraphModals`, `useStoryEventCreation`, `useStoryWikidataPeriodImport` |
| `wikidata_import_completed` / `wikidata_import_failed` | Import Wikidata | `kind`, `count` ou `reason` | `useStoryWikidataPeriodImport` |
| `child_story_linked` | Frise rattachée à une autre | `anchor_type` | `linkChildStories` (appelant) |
| `story_deleted` | Suppression | — | `useDatabaseSave` |

### 4.3 Timeline (phase 2)

| Événement | Déclencheur | Propriétés | Où |
| --- | --- | --- | --- |
| `timeline_story_opened` | Frise affichée | `story_id`, `source` (`search`, `landing`, `link`, `breadcrumb`, `associated`, `choice`), `own_story`, `signed_in` | `HomeView.vue` / `useHomeNavigation` |
| `timeline_period_opened` | Clic sur une période | `depth`, `has_children` | `handlePeriodClick` |
| `timeline_period_slid` | Précédent/suivant | `direction` | `slideToAdjacentPeriod` |
| `timeline_back` | Retour en arrière | `via` (`button`, `breadcrumb`, `story_breadcrumb`) | `goBack`, `navigateToBreadcrumb` |
| `timeline_event_opened` | Clic sur un événement | `depth` | `handleEventClick` |
| `timeline_story_choice_shown` / `…_selected` | Plusieurs frises pour une période | `choices_count` | `navigationChoices` |
| `timeline_load_failed` | Erreur de chargement | `reason` (catégorie, pas le message) | `HomeView.vue` |
| `search_performed` | Recherche globale aboutie | `results_count`, `has_results` | `GlobalSearch` |
| `search_result_selected` | Résultat choisi | `position` | `GlobalSearch` / `useAppNavigation` |

### 4.4 Réglages PostHog sans code

- Activer **« Capture dead clicks »** (clics sans effet) et garder les **rage clicks** de l’autocapture.
- Activer la **capture des exceptions JavaScript** (`$exception`), pour relier une erreur à un abandon.
- Garder les **Web Vitals** (lenteurs sur mobile = cause fréquente d’abandon).
- Fuseau horaire du projet en **Europe/Paris** (actuellement UTC).

## 5. Tableaux de bord

### Dashboard 1 — « Landing & inscription » (phase 1)

1. Visiteurs uniques par jour, `/` et `/voyage` séparés.
2. Provenance : domaines référents et UTM des visites de landing.
3. Profondeur de lecture : part des visiteurs atteignant chaque section (`landing_section_viewed`) et chaque étape de /voyage.
4. Clics sur les CTA par bouton (Action `CTA landing`, ventilée par `cta`).
5. **Entonnoir d’acquisition** : landing vue → CTA création → formulaire vu → inscription envoyée → inscription réussie → première connexion. Ventilé par page de landing et par type d’appareil, avec temps de conversion.
6. Raisons d’échec : `signup_blocked` et `signup_failed` par `reason`.
7. Comparaison des deux landings : taux de clic « Explorer » et « Créer » sur `/` et `/voyage`.

### Dashboard 2 — « Activation & contribution » (phase 2)

1. Entonnoir d’activation : connexion → nom d’utilisateur → frise créée → contenu ajouté → frise publique.
2. Délai médian entre inscription et première frise.
3. Frises créées par visibilité, et changements privé ⇄ public.
4. Contributions au catalogue : périodes et événements créés, part venant de Wikidata.
5. Échecs d’import Wikidata par raison.

### Dashboard 3 — « Usage de la timeline » (phase 2)

1. Frises les plus ouvertes et source d’ouverture.
2. Profondeur atteinte (`depth` maximal par session).
3. Événements consultés par session.
4. Chemins (Paths) après l’ouverture d’une frise : où les gens vont, où ils sortent.
5. Recherche : volume, part sans résultat, position du résultat choisi.
6. Rétention hebdomadaire : explorateurs (ont ouvert une frise) vs créateurs (ont créé une frise).

### Dashboard 4 — « Frictions » (phase 1 puis enrichi)

Rage clicks et clics sans effet par page et élément, exceptions par page, échecs de chargement de la timeline, Web Vitals par page.

## 6. Comprendre le « pourquoi »

Du plus simple au plus intrusif :

1. **Raisons d’échec instrumentées** (`signup_blocked`, `signup_failed`, `timeline_load_failed`) : elles expliquent une bonne partie des abandons de formulaire.
2. **Clics sans effet, rage clicks, exceptions** : ils montrent ce que les gens essaient de faire sans y arriver.
3. **Sondages PostHog d’une question**, affichés seulement aux visiteurs consentants :
   - après `story_created` : « À quoi va servir cette frise ? » → *pour moi*, *pour la partager*, *pour enseigner*, *pour un travail ou une étude*, *autre*. C’est la réponse directe à Q4.
   - sur la landing, à la sortie après 45 s sans clic : « Qu’est-ce qui vous a manqué pour aller plus loin ? » (texte libre court).
   - sur le formulaire d’inscription abandonné : « Qu’est-ce qui vous retient ? » (choix : *je veux d’abord explorer*, *trop d’informations demandées*, *je ne comprends pas l’intérêt*, *autre*).
4. **Enregistrement de sessions ciblé** (option D3) : seulement landing et inscription, tous les champs masqués, échantillon de 20 %. Montre précisément où les gens hésitent.
5. **Entretiens** avec 5 à 8 inscrits, choisis selon leur segment.

## 7. Chiffres de référence côté base

Comptés dans Supabase en lecture seule, sans dépendre du consentement : comptes créés, comptes confirmés, comptes avec nom d’utilisateur, frises par visibilité, frises par compte, comptes ayant créé au moins un élément du catalogue. Ils servent de dénominateur réel aux taux PostHog. Mise en œuvre possible : une requête SQL relue, puis éventuellement une page d’administration.

## 8. Segments

| Segment | Définition | Usage |
| --- | --- | --- |
| Visiteur | Aucune frise ouverte | Efficacité de la landing |
| Explorateur | ≥ 1 `timeline_story_opened`, aucune frise créée | Valeur perçue de la lecture |
| Inscrit inactif | Compte, aucune frise | Cible prioritaire des sondages et relances |
| Créateur privé | Frises, toutes privées | Usage personnel |
| Contributeur public | ≥ 1 frise publique ou contribution au catalogue | Contribution |

Les trois derniers segments supposent l’identification (D1) ; sans elle, ils sont calculés par appareil.

## 9. Décisions à prendre

- **D1 — Identifier les comptes.** Appeler `identify` avec l’UUID du compte (pseudonyme, jamais l’e-mail) après consentement, `reset` à la déconnexion. Nécessaire pour suivre une personne de l’inscription à la contribution. Impose une mise à jour de la politique de confidentialité et de `CONSENT_VERSION`.
- **D2 — Sondages.** Activer les sondages PostHog (consentement requis, à mentionner dans la politique cookies).
- **D3 — Enregistrement ciblé.** Landing et inscription seulement, champs masqués. Impose une mise à jour des textes.
- **D4 — Proxy d’ingestion.** Passer les envois par `universaltimeline.net` (réécriture Vercel) pour ne pas perdre les visiteurs avec bloqueur de publicité. Le consentement reste requis.

## 10. Feuille de route

| Phase | Contenu | Résultat |
| --- | --- | --- |
| 1 | `track()` + `data-attr`, événements landing/inscription, réglages 4.4, Dashboard 1 et 4 | Q1 sur le parcours A |
| 2 | Événements création et timeline, Dashboards 2 et 3, segments | Q1 et Q3 sur les parcours B et C |
| 3 | Décisions D1–D3 appliquées, sondages, chiffres de base | Q2 et Q4 |
| 4 | Revue après 2 à 4 semaines de données : plus grosse perte, hypothèse, correctif, mesure | Boucle d’amélioration |

Chaque événement ajouté est documenté ici (tableaux de la section 4) avant son déploiement.
