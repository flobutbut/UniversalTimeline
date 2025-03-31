# Documentation Fonctionnelle

## Vue d'ensemble

L'application permet de naviguer dans l'échelle des temps géologiques en utilisant les données de Wikidata. Elle offre une interface intuitive pour explorer les différentes périodes géologiques, de l'Hadéen jusqu'aux époques les plus récentes.

## Fonctionnalités

### Navigation Hiérarchique

- Affichage des éons principaux (Hadéen, Archéen, Protérozoïque, Phanérozoïque)
- Navigation dans les sous-périodes
- Fil d'Ariane pour suivre le chemin de navigation
- Bouton de retour pour remonter dans la hiérarchie

### Affichage des Informations

Pour chaque période, l'application affiche :
- Le nom de la période
- Les dates de début et de fin (si disponibles)
- La localisation géographique (si disponible)
- Le nombre de sous-périodes
- Un indicateur visuel si la période a des sous-périodes

### États de l'Interface

- État de chargement avec spinner
- Messages d'erreur clairs
- Bouton de réessai en cas d'erreur
- Indicateurs visuels pour les périodes avec sous-périodes

### Support Multilingue

- Affichage des noms dans la langue sélectionnée
- Support des caractères spéciaux
- Fallback sur l'anglais si la traduction n'est pas disponible

## Scénarios d'Utilisation

### Navigation de Base

1. L'utilisateur arrive sur la page principale
2. Les éons principaux sont affichés
3. L'utilisateur peut cliquer sur un éon pour voir ses sous-périodes
4. La navigation se fait de manière intuitive avec le fil d'Ariane

### Gestion des Erreurs

1. En cas d'erreur de chargement :
   - Un message d'erreur clair est affiché
   - Un bouton permet de réessayer
   - L'état précédent est conservé

2. En cas de timeout :
   - L'utilisateur est notifié
   - Une nouvelle tentative est possible
   - Les données précédemment chargées restent visibles

### Performance

1. Chargement progressif :
   - Les éons principaux sont chargés en premier
   - Les sous-périodes sont chargées à la demande
   - Un indicateur de chargement est affiché

2. Mise en cache :
   - Les données sont mises en cache pendant 5 minutes
   - Les requêtes sont limitées pour éviter la surcharge
   - Le cache est invalidé automatiquement

## Interface Utilisateur

### Composants Principaux

1. Barre de Navigation
   - Fil d'Ariane
   - Bouton de retour
   - Indicateur de niveau

2. Grille de Périodes
   - Affichage en grille responsive
   - Cartes pour chaque période
   - Indicateurs visuels d'état

3. Carte de Période
   - Titre
   - Dates
   - Localisation
   - Nombre de sous-périodes
   - États de chargement et d'erreur

### Responsive Design

- Adaptation à tous les écrans
- Grille flexible
- Tailles de police adaptatives
- Espacement optimisé

## Limitations

- Maximum 100 sous-périodes par requête
- Cache de 5 minutes
- Dépendance à l'API Wikidata
- Temps de réponse variable selon la charge

## Évolutions Futures

### Court Terme

- Amélioration des performances
- Optimisation des requêtes
- Tests de performance
- Documentation des APIs

### Moyen Terme

- Recherche de périodes
- Filtrage par date
- Visualisation temporelle
- Export des données

### Long Terme

- Événements géologiques
- Intégration de médias
- Mode hors ligne
- API publique 