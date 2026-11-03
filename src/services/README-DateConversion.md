# Domaine temporel partagé

La source unique est `server/src/shared/temporal.ts`. Elle est pure et sans dépendance : l’API la compile avec ses sources habituelles, y compris dans Docker ; le frontend importe exactement le même fichier via l’alias `@temporal` de Vite, Vitest et TypeScript. Aucun second parser, paquet ou fichier généré à synchroniser.

`DateService` est seulement l’adaptateur d’affichage français/anglais. `DateConversionService`, `useDateConversion`, `DateFormatter` et l’ancienne copie backend ont été retirés au lot 24. Les tests de leurs familles d’entrées utiles ont été migrés vers `server/test/temporal.test.ts` ; leurs anciens objets de sortie, options et conversions de stockage sans consommateur ne font plus partie de l’API du projet.

## Interprétation

- G/M/K/A (ex. `G4.6`, `M65`, `K11.7`, `A230`) et géologique historique (`4.5 Ga`, `65 Ma`, `40 ka`, `40000 ans`, virgule décimale et suffixes ago/avant/BP).
- Année, année-mois, date ISO, timestamps avec secondes/fraction/fuseau et timestamps PostgreSQL avec espace. Les dates sans fuseau sont interprétées en UTC ; le parseur contrôle jours/mois/années bissextiles, sans normalisation silencieuse des dates impossibles.
- Dates françaises textuelles ou JJ/MM/AAAA, mois anglais, années BCE explicites et anciens encodages annuels G/H/M. Pas de conversion automatique de langage naturel ambigu.
- `NOW`/`TODAY`, insensibles à la casse, sont les seuls tokens de présent. Une chaîne vide, une expression inconnue ou une date impossible a une coordonnée indéterminée (`null`), jamais le nombre zéro.
- Les nombres BP calculés suivent la convention historique du projet : années avant l’instant courant fourni, à 365,25 jours par an, pas l’époque scientifique 1950. Une date future a une valeur négative. Pour les années Wikidata hors de la plage de Date, on garde une approximation à l’année plutôt qu’une fausse précision civile.
- Les bornes numériques explicites d’un enregistrement importé restent prioritaires lorsqu’elles sont finies et que le texte n’est pas explicitement non interprétable. NOW/TODAY vaut toujours 0. Ce lot ne réécrit ni les textes ni les colonnes numériques déjà présentes en base et ne déduit pas une époque différente pour des données historiques.

## Précision et limites de provenance

L’ISO utilise la numérotation astronomique, avec année zéro ; un libellé explicite `800 BCE` devient donc l’année ISO -0799. Les chaînes ISO signées sont interprétées telles quelles. Wikibase JSON et les littéraux RDF n’utilisent pas la même numérotation BCE ; une chaîne seule ne fournit ni ce contexte ni le modèle calendaire. Les imports doivent conserver leur provenance s’ils ajoutent ultérieurement précision/calendrier. Un timestamp Wikibase comportant des champs 00 non spécifiés est conservé comme texte non positionnable, plutôt que transformé artificiellement en 1er janvier.

Référence : [format officiel des temps Wikibase](https://doc.wikimedia.org/Wikibase/master/php/docs_topics_json.html#time). Le schéma actuel ne transporte pas de modèle julien ou de précision Wikibase séparée ; le parseur n’invente pas ces métadonnées.

## Fonctions

`parseTemporal` retourne un résultat typé (âge, calendrier, présent ou inconnu), avec texte conservé et précision déclarée. `yearsBeforePresent` fournit number ou null ; `resolveYearsBeforePresent` applique la priorité des colonnes importées. `periodDateErrors` contrôle les bornes connues, sur l’interface et avant SQL : début strictement antérieur à fin. Les expressions historiques non reconnues restent enregistrables sans coordonnée inventée. Une date calendaire reconnue mais impossible est refusée.

`temporalBounds` agrège une seule fois les candidats, avec le même instant de référence pour toute la liste. Le calcul des bornes de stories dans l’API et l’interface le réutilise. Tri et filtres distinguent les coordonnées nulles ; une frise conserve les éléments non positionnables dans une zone séparée et accessible, avec les mêmes actions de consultation et de navigation.

Les champs de dates de génération et d’édition utilisent `DateInput` : après 800 ms sans frappe, ou à la sortie du champ, une saisie reconnue est normalisée pour l’édition (`14/07/1789` → `1789-07-14`, `65 Ma` → `M65`, `TODAY` → `NOW`). L’année ou le mois seuls gardent leur précision ; les timestamps conservent leur fuseau et toutes leurs décimales. Les saisies invalides, incomplètes ou inconnues restent intactes. Seules les saisies manuelles sont normalisées ; un import ou le remplacement du brouillon annule le traitement en attente. Les aperçus restent des valeurs calculées et s’effacent dès que le champ est effacé. Aucun appel de sauvegarde n’est relancé automatiquement.

Tests : `yarn test --run` ; intégrations locales avec `yarn --cwd server test:atomic` et le socket/base jetables documentés dans SUIVI-AUDIT. Ne jamais exécuter une écriture de test sur Supabase.
