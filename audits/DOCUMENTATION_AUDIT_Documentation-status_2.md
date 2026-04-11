# Audit — `Documentation/Documentation-status 2.md` vs code (2026-04-11)

## Constat

Ce fichier est une **variante raccourcie** de **`Documentation-status.md`** (même en-tête « État du Projet », mêmes mentions **`useDatabaseDataStore`**, **`DatabaseQueryService`**, etc.).

## Problème principal

- **Duplication** : deux sources de vérité pour l’état du projet → risque de mise à jour partielle (c’est déjà le cas : contenu obsolète identique à `Documentation-status.md`).

## Corrections nécessaires

1. **Décision produit** : **supprimer** `Documentation-status 2.md` **ou** le renommer en archive datée (`archive/Documentation-status_2025-06-26.md`) avec une ligne en tête : « Document obsolète, ne pas utiliser ».  
2. Si conservation : appliquer **les mêmes corrections** que pour `audits/DOCUMENTATION_AUDIT_Documentation-status.md` (Pinia, services API, pas de `useConflictResolution`).  
3. **Éviter** à l’avenir les noms de fichier avec espace + suffixe `2` ; préférer Git / historique pour les versions.

## Recommandation

Une seule fichier **`Documentation/Documentation-status.md`** maintenu ; retirer la copie `Documentation-status 2.md` après fusion éventuelle d’une phrase unique qu’elle contiendrait et que l’autre n’aurait pas.
