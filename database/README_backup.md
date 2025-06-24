# Sauvegarde et Restauration de la Base de Données

Ce dossier contient les scripts et sauvegardes de la base de données PostgreSQL du projet Wikidata.

## Structure

```
database/
├── backups/                    # Dossier des sauvegardes
│   ├── backup_YYYYMMDD_HHMMSS.sql
│   └── ...
├── backup_database.sh          # Script de sauvegarde
├── restore_database.sh         # Script de restauration
└── README_backup.md           # Ce fichier
```

## Scripts Disponibles

### 1. Sauvegarde : `backup_database.sh`

**Usage :**
```bash
# Sauvegarde avec nom automatique (timestamp)
./database/backup_database.sh

# Sauvegarde avec nom personnalisé
./database/backup_database.sh avant_migration
./database/backup_database.sh version_1_0
```

**Fonctionnalités :**
- ✅ Vérification que le conteneur Docker est en cours d'exécution
- ✅ Sauvegarde complète avec structure et données
- ✅ Nommage automatique avec timestamp
- ✅ Support des noms personnalisés
- ✅ Affichage des informations de sauvegarde
- ✅ Liste des sauvegardes récentes

**Exemple de sortie :**
```
🔄 Début de la sauvegarde de la base de données...
📁 Fichier de sauvegarde: database/backups/backup_avant_migration_20250625_000138.sql
💾 Sauvegarde en cours...
✅ Sauvegarde terminée avec succès!
📊 Taille du fichier: 75K
📅 Date: Mer 25 jui 2025 00:01:38 CEST
📍 Emplacement: database/backups/backup_avant_migration_20250625_000138.sql
```

### 2. Restauration : `restore_database.sh`

**Usage :**
```bash
# Restauration avec nom de fichier complet
./database/restore_database.sh backup_20250625_000138.sql

# Restauration avec nom sans extension
./database/restore_database.sh backup_20250625_000138

# Restauration avec chemin complet
./database/restore_database.sh /chemin/complet/vers/sauvegarde.sql
```

**Fonctionnalités :**
- ✅ Vérification de l'existence du fichier de sauvegarde
- ✅ Vérification que le conteneur Docker est en cours d'exécution
- ✅ Demande de confirmation avant restauration
- ✅ Affichage des informations de sauvegarde
- ✅ Liste des sauvegardes disponibles si aucun fichier spécifié
- ✅ Restauration complète de la base de données

**Exemple de sortie :**
```
🔄 Début de la restauration de la base de données...
📁 Fichier de sauvegarde: database/backups/backup_20250625_000138.sql
📊 Taille du fichier: 75K

⚠️  ATTENTION: Cette opération va remplacer complètement la base de données actuelle!
📋 Fichier de sauvegarde: database/backups/backup_20250625_000138.sql
📅 Date de sauvegarde: 2025-06-25 00:01:38

🤔 Êtes-vous sûr de vouloir continuer? (oui/non): oui

💾 Restauration en cours...
✅ Restauration terminée avec succès!
📅 Date: Mer 25 jui 2025 00:02:15 CEST
🔄 La base de données a été restaurée depuis: database/backups/backup_20250625_000138.sql
```

## Configuration

Les scripts utilisent la configuration suivante :
- **Conteneur Docker** : `wikidata_db`
- **Utilisateur** : `wikidata_user`
- **Base de données** : `wikidata_db`
- **Dossier de sauvegardes** : `database/backups/`

## Prérequis

1. **Docker en cours d'exécution** :
   ```bash
   docker-compose up -d
   ```

2. **Conteneur de base de données actif** :
   ```bash
   docker ps | grep wikidata_db
   ```

## Bonnes Pratiques

### Sauvegarde
- 🔄 **Sauvegardes régulières** : Avant chaque déploiement ou modification importante
- 📝 **Nommage explicite** : Utilisez des noms descriptifs pour les sauvegardes importantes
- 💾 **Espace disque** : Surveillez l'espace disque dans le dossier `backups/`
- 🔒 **Sécurité** : Les sauvegardes contiennent des données sensibles, protégez-les

### Restauration
- ⚠️ **Test de restauration** : Testez la restauration sur un environnement de développement
- 🔍 **Vérification** : Vérifiez l'intégrité des données après restauration
- 📋 **Documentation** : Documentez les raisons et le contexte de la restauration

## Commandes Utiles

### Lister les sauvegardes
```bash
ls -lht database/backups/
```

### Vérifier la taille des sauvegardes
```bash
du -sh database/backups/
```

### Nettoyer les anciennes sauvegardes
```bash
# Garder seulement les 10 dernières sauvegardes
ls -t database/backups/*.sql | tail -n +11 | xargs rm
```

### Vérifier l'intégrité d'une sauvegarde
```bash
# Vérifier que le fichier SQL est valide
head -20 database/backups/backup_YYYYMMDD_HHMMSS.sql
```

## Dépannage

### Erreur : "Le conteneur n'est pas en cours d'exécution"
```bash
# Démarrer les conteneurs
docker-compose up -d

# Vérifier le statut
docker ps
```

### Erreur : "Permission denied"
```bash
# Rendre les scripts exécutables
chmod +x database/backup_database.sh
chmod +x database/restore_database.sh
```

### Erreur : "Fichier de sauvegarde introuvable"
```bash
# Lister les sauvegardes disponibles
ls -la database/backups/

# Vérifier le nom exact du fichier
ls database/backups/ | grep "partie_du_nom"
```

## Support

En cas de problème avec les scripts de sauvegarde :
1. Vérifiez que Docker est en cours d'exécution
2. Vérifiez que le conteneur `wikidata_db` est actif
3. Consultez les logs Docker : `docker logs wikidata_db`
4. Vérifiez les permissions des scripts 