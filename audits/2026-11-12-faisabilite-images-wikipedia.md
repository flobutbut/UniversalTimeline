# Audit de faisabilité — images Wikipédia dans les bulles

Date : 2026-11-12 · Contrainte : aucune image ni URL d'image stockée en base ; seuls les titres `wikipedia_title_fr/en` existants servent de source.

## Verdict

**Faisable, sans migration ni changement serveur obligatoire.** Les titres sont déjà chargés avec chaque période/événement (`wikipedia` dans les entités, règle 33). Le navigateur peut demander la vignette à Wikipédia au moment d'ouvrir la bulle, puis l'afficher depuis `upload.wikimedia.org`. Effort estimé : 1 à 2 jours, tests compris.

## Ce qui existe déjà

- `server/src/shared/wikipedia.ts` (`@/lib/wikipedia`) : `preferredWikipediaArticle` choisit FR puis EN → c'est exactement la clé de lecture.
- `WikipediaLink` est déjà rendu dans `EventCard.vue:31` (bulle d'événement) et `PeriodCard.vue:32` (barre de période, pas de bulle) ainsi que dans les fiches (`StoryPeriodDetail`, `StoryDetailPanel`).
- `wikidataTransport` + `readCache` + `shared/readOperation` (règle 25) : cache mémoire public à durée limitée, annulation `AbortSignal`, reprises bornées. Réutilisable tel quel pour cette lecture.
- Aucune Content-Security-Policy n'est définie (ni `vercel.json`, ni serveur, ni `index.html`) : rien ne bloque des `<img>` externes aujourd'hui.

## API testée (12/11/2026)

| Option | Requête | Résultat |
|---|---|---|
| **PageImages (recommandée)** | `{lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail\|name&pithumbsize=320&redirects=1&origin=*&titles=A\|B\|…` | OK, CORS `*`, **jusqu'à 50 titres par appel**, suit les redirections, donne le nom du fichier Commons. |
| REST summary | `{lang}.wikipedia.org/api/rest_v1/page/summary/{titre}` | OK, CORS `*`, cache CDN 14 j, mais un appel par article. |

Exemples : Révolution française → *Prise de la Bastille* ; Guerre froide → carte 1959 (SVG rendu en PNG) ; Paléolithique → nucléus de Brassempouy. Les articles sans image renvoient simplement aucun `thumbnail`.

## Conception proposée

1. **`src/lib/wikipediaImages.ts`** : `fetchWikipediaThumbnails(lang, titles[], signal)` via `wikidataTransport`/`readCache` (clé = endpoint + paramètres), regroupement par lots de 50, résultat `{ src, width, height, file } | null`.
2. **Composable `useWikipediaThumbnail(titles)`** : déclenché seulement à l'ouverture/survol de la bulle (pas au rendu de la grille, qui peut contenir des centaines d'éléments). Option : préchargement groupé des éléments visibles d'une frise en un ou deux appels.
3. **Rendu dans `EventCard`** : `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="">` avec `width/height` réservés pour éviter les sauts de mise en page ; masqué au repos en mode réduit/comparaison comme le reste du détail. Pour les périodes, il n'y a pas de bulle aujourd'hui : l'image irait dans les fiches, ou une bulle de période serait à concevoir (décision produit).
4. **États** : chargement discret, absence d'image = rien affiché, panne = rien affiché sans erreur bloquante (enrichissement facultatif, cf. règle 25 ; ne pas confondre panne et « pas d'image » dans le cache).
5. **Crédit** : lien « Image : Wikimedia Commons » vers la page du fichier (`commons.wikimedia.org/wiki/File:{name}`), construit à partir du nom, rien stocké.

## Risques et points à trancher

- **Licences (important).** Les images Commons sont sous licences libres (CC BY-SA, etc.) qui exigent **auteur + licence**. Un simple lien vers la page Commons est la pratique minimale tolérée ; l'attribution complète demande un appel `prop=imageinfo&iiprop=extmetadata` (Artist, LicenseShortName) à la volée. Côté FR, PageImages ne retient que des images libres ; certaines pages EN peuvent avoir une image non libre (fair use) — à exclure (`pilicense=free`, valeur par défaut, à forcer explicitement).
- **RGPD.** Charger une image depuis `upload.wikimedia.org` transmet l'adresse IP du visiteur à la Wikimedia Foundation (sans cookie). C'est un transfert vers un tiers à mentionner dans `src/lib/legalDocuments.ts` (politique de confidentialité / cookies). `referrerpolicy="no-referrer"` évite de révéler la page consultée. Alternative plus protectrice : un proxy `/api/wikipedia-image` qui relaie l'image sans la stocker (coût en bande passante Vercel, cache CDN possible) — à décider.
- **Pertinence.** L'image principale d'un article n'est pas toujours parlante (cartes, drapeaux, logos, schémas). Accepter tel quel, ou prévoir plus tard un masquage manuel (qui, lui, demanderait un champ en base — hors contrainte actuelle).
- **Couverture.** Seules les fiches qui ont un titre Wikipédia afficheront une image ; mesurer la proportion avant de lancer (requête de comptage en lecture seule).
- **Volume / politesse API.** Wikimedia demande un `Api-User-Agent` identifiable et un usage raisonnable : chargement à la demande + lots de 50 + cache mémoire suffisent.
- **Mise en page.** Les bulles sont bornées par `frameWidth` et ont un pont de survol (règle 34) : l'image doit avoir une hauteur fixe pour ne pas déplacer le pont ni le scroll de la pile.
- **Analytics.** Aucun événement à ajouter ; si on en ajoute, mettre à jour `Documentation/PLAN-ANALYSE.md`.

## Tests à prévoir

Unitaires : construction des requêtes (lots, encodage, redirections), cache/annulation, absence d'image vs panne. Composant : bulle avec/sans image, dimensions réservées, texte alternatif, crédit présent. Vérification visuelle en vue seule, comparaison et petit écran.
