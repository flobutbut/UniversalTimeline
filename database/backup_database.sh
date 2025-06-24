#!/bin/bash

# Script de sauvegarde de la base de données Wikidata
# Usage: ./backup_database.sh [nom_personnalise]

# Configuration
DB_CONTAINER="wikidata_db"
DB_USER="wikidata_user"
DB_NAME="wikidata_db"
BACKUP_DIR="database/backups"

# Créer le répertoire de sauvegarde s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Nom du fichier de sauvegarde
if [ -n "$1" ]; then
    # Si un nom personnalisé est fourni
    BACKUP_FILE="$BACKUP_DIR/backup_$1_$(date +%Y%m%d_%H%M%S).sql"
else
    # Nom automatique avec timestamp
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
fi

echo "🔄 Début de la sauvegarde de la base de données..."
echo "📁 Fichier de sauvegarde: $BACKUP_FILE"

# Vérifier si le conteneur Docker est en cours d'exécution
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "❌ Erreur: Le conteneur $DB_CONTAINER n'est pas en cours d'exécution"
    echo "💡 Démarrez d'abord les conteneurs avec: docker-compose up -d"
    exit 1
fi

# Effectuer la sauvegarde
echo "💾 Sauvegarde en cours..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    > "$BACKUP_FILE"

# Vérifier le succès de la sauvegarde
if [ $? -eq 0 ]; then
    echo "✅ Sauvegarde terminée avec succès!"
    echo "📊 Taille du fichier: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
    echo "📅 Date: $(date)"
    echo "📍 Emplacement: $BACKUP_FILE"
    
    # Afficher un résumé des sauvegardes récentes
    echo ""
    echo "📋 Sauvegardes récentes:"
    ls -lht "$BACKUP_DIR"/*.sql | head -5
else
    echo "❌ Erreur lors de la sauvegarde"
    exit 1
fi 