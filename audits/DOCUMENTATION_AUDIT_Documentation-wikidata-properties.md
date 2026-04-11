# Audit — `Documentation/Documentation-wikidata-properties.md` vs code (2026-04-11)

## Alignement fort avec le code

- La section **« Enfants P361 côté application »** avec les classes **`Q4005761`**, **`Q4005689`**, **`Q11514315`**, **`Q15401633`** et la transitivité **`P279*`** est **cohérente** avec **`WIKIDATA_TEMPORAL_PERIOD_ROOT_CLASSES`** dans **`src/services/WikidataQueryService.ts`**.

## Points à corriger ou préciser

1. **`P361` dans les exemples SPARQL**  
   Les exemples utilisent `wdt:P361 ?parentPeriod` sur l’**item période** : sémantiquement « part of » = l’item est une **partie** du parent — correct pour « enfant → parent ». En revanche, pour **lister les enfants** d’un item, la requête inverse ce sens ; la doc application parle bien des **enfants** chargés via SPARQL : ajouter une phrase pour éviter la confusion **parent vs enfant** dans les deux sens de navigation.

2. **`P61` (discoverer or inventor)**  
   Présenté dans « localisation et contexte géographique » à côté de **P276**. Sur Wikidata, **P61** est surtout pertinent pour certains types d’entités (ex. éléments chimiques) ; pour une **période archéologique**, la pertinence est limitée. **Déplacer** vers une note « propriétés parfois présentes sur les items » ou retirer des exemples génériques « période archéologique » si non utilisés dans le code.

3. **Exemples `wd:Q1235409`**  
   Valeur d’exemple répétée ; préférer des Q-id réalistes commentés (ex. type d’unité géochronologique) pour limiter les copies erronées.

4. **Hiérarchie « éons → ères → … »**  
   Utile comme rappel pédagogique ; préciser que **l’application** ne force pas cette taxonomie stricte pour tous les items Wikidata — le filtre effectif est **P31 / sous-classes de** la liste des quatre racines temporelles.

## Action suggérée

Garder ce fichier comme référence **Wikidata + contraintes métier** ; petites retouches de structure (sections « utilisé dans le code » vs « généralités ») et lien explicite vers **`WikidataQueryService`** / **`WikidataSearchService`**.
