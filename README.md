# Timeline Géologique - Wikidata

Une application web interactive pour explorer les périodes géologiques à partir des données Wikidata.

## Caractéristiques

- Navigation hiérarchique dans les périodes géologiques
- Affichage horizontal avec défilement fluide
- Support multilingue (Français et Anglais)
- Interface utilisateur moderne et responsive
- Gestion des erreurs avec retry
- Formatage intelligent des dates

## Technologies

- Vue.js 3
- TypeScript
- Vite
- Yarn
- Wikidata API

## Installation

```bash
# Cloner le projet
git clone https://github.com/votre-username/timeline-geologique.git

# Installer les dépendances
yarn install

# Lancer le serveur de développement
yarn dev
```

## Structure du Projet

```
src/
  components/     # Composants Vue
  services/      # Services (Wikidata, etc.)
  styles/        # Styles CSS
  types/         # Types TypeScript
  utils/         # Utilitaires
  App.vue        # Composant racine
  main.ts        # Point d'entrée
```

## Design System

Le projet utilise un design system moderne avec :
- Taille de base de police : 13px
- Système de couleurs harmonieux
- Espacement basé sur 8px
- Typographie responsive
- Support du mode sombre/clair
- Classes utilitaires pour le développement rapide

## Documentation

- [Documentation Technique](Documentation-technique.md)
- [Documentation Fonctionnelle](Documentation-fonctionnelle.md)
- [État du Projet](Documentation-status.md)

## Contribution

Les contributions sont les bienvenues. N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

MIT
