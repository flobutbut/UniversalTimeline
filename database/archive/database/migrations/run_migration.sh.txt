#!/bin/bash

# Configuration
DB_CONTAINER="wikidata_db"
DB_USER="wikidata_user"
DB_NAME="wikidata_db"
BACKUP_DIR="database/backups"
MIGRATION_FILE="database/migrations/20250617_convert_to_uuid.sql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Création du dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Vérification de la connexion à la base de données
echo "Vérification de la connexion à la base de données..."
if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
    echo "Erreur : Impossible de se connecter à la base de données"
    exit 1
fi

# Sauvegarde de la base de données
echo "Création d'une sauvegarde de la base de données..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
if [ $? -ne 0 ]; then
    echo "Erreur : Échec de la sauvegarde"
    exit 1
fi
echo "Sauvegarde créée : $BACKUP_FILE"

# Exécution de la migration
echo "Exécution de la migration..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE"
if [ $? -ne 0 ]; then
    echo "Erreur : Échec de la migration"
    echo "Restauration de la sauvegarde..."
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
    echo "Base de données restaurée depuis la sauvegarde"
    exit 1
fi

echo "Migration terminée avec succès" 