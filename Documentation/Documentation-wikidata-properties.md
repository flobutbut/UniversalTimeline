# Documentation des propriétés Wikidata

## Propriétés principales

### Identification et classification
- `P31` (instance of) : Type de période (ex: période archéologique, éon, ère, etc.)
- `P361` (part of) : Relation hiérarchique entre les périodes
- `P373` (Commons category) : Catégorie Commons associée
- `P646` (Freebase ID) : Identifiant Freebase

### Dates et chronologie
- `P580` (start time) : Date de début
- `P582` (end time) : Date de fin
- `P1269` (facet of) : Aspect spécifique de la période
- `P1417` (Encyclopædia Britannica Online ID) : Référence Britannica

### Localisation et contexte géographique
- `P276` (location) : Localisation géographique principale
- `P155` (follows) : Période précédente
- `P156` (followed by) : Période suivante

### Description et documentation
- `P227` (GND ID) : Identifiant GND
- `P2581` (BabelNet ID) : Identifiant BabelNet
- `P18` (image) : Image représentative
- `P527` (has part(s)) : Sous-périodes ou éléments constitutifs

## Exemples d'utilisation

### Pour une période géologique
Dans les requêtes du type « enfant → parent », **`wdt:P361 ?parent`** sur l’**enfant** signifie que l’item courant est *part of* le parent (bon sens pour remonter au parent). Pour **lister les enfants** d’un item, on utilise la **direction inverse** (parent connu, variables enfants) — ne pas inverser mentalement parent et enfant lors de la lecture des résultats.

```sparql
?item wdt:P31 wd:Q4005761;  # exemple : geochronological unit (à adapter)
    wdt:P580 ?startDate;
    wdt:P582 ?endDate;
    wdt:P276 ?location;
    wdt:P361 ?parentPeriod.
```

### Pour une période archéologique
```sparql
?item wdt:P31 wd:Q15401633;  # exemple : archaeological period (à adapter)
    wdt:P580 ?startDate;
    wdt:P582 ?endDate;
    wdt:P276 ?location;
    wdt:P155 ?previousPeriod;
    wdt:P156 ?nextPeriod.
```

*(**P61** *discoverer or inventor* : surtout pertinent pour d’autres types d’items Wikidata ; peu utilisé pour une période archéologique — retiré des exemples « période » génériques.)*

## Notes importantes

1. **Hiérarchie des périodes**
   - Rappel pédagogique : éon → ère → période → époque → âge (taxonomie courante en géologie).
   - **Dans l’application** : le filtre effectif sur les enfants chargés via SPARQL repose sur **P31** et les **classes racines temporelles** (voir section *Enfants P361* et `WIKIDATA_TEMPORAL_PERIOD_ROOT_CLASSES` dans `WikidataQueryService.ts`) — on ne force pas toute la taxonomie stricte pour chaque item Wikidata.

2. **Localisation**
   - Pour les périodes globales (ex: éons), pas de localisation spécifique
   - Pour les périodes régionales (ex: âges du bronze), utiliser P276
   - Pour les périodes culturelles, utiliser P276 pour la région principale

3. **Dates**
   - Les dates sont stockées au format ISO 8601
   - Les dates négatives sont utilisées pour les dates avant notre ère
   - La précision peut varier (année, mois, jour)

4. **Relations entre périodes**
   - P361 (part of) pour la hiérarchie principale
   - P155/P156 pour la chronologie
   - P527 pour les éléments constitutifs

## Problèmes connus

1. **Localisation**
   - Certaines périodes peuvent avoir plusieurs localisations
   - La propriété P276 peut ne pas être définie pour les périodes globales
   - Besoin de gérer le cas "Toute la Terre" vs localisation spécifique

2. **Dates**
   - Certaines périodes peuvent avoir des dates approximatives
   - Les dates peuvent être exprimées en années avant notre ère
   - Besoin de gérer différents formats de dates

3. **Hiérarchie**
   - Certaines périodes peuvent appartenir à plusieurs catégories
   - Les relations parent/enfant peuvent être complexes
   - Besoin de gérer les cas de chevauchement temporel

### Enfants P361 côté application (finder / timeline)

Pour ne pas charger des entités liées par **P361** (part of) mais qui ne sont pas des **intervalles temporels** (ex. provinces romaines, sites), la requête SPARQL des enfants impose que `?child` ait un **P31** (instance of) sous l’une des classes racines suivantes, en suivant **P279** (sous-classe de) de façon transitive dans la requête (`wdt:P279*`) :

- **Q4005761** — geochronological unit  
- **Q4005689** — chronostratigraphic unit  
- **Q11514315** — historical period  
- **Q15401633** — archaeological period  

Le comptage des petits-enfants (`childCount`) utilise le même critère sur `?grandChild`. Liste maintenue dans **`WikidataQueryService.ts`** (`WIKIDATA_TEMPORAL_PERIOD_ROOT_CLASSES`). Pour la recherche d’entités côté UI, voir aussi **`WikidataSearchService.ts`**.