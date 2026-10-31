#!/bin/bash

# Script de restauration de la base de données Wikidata
# Usage: ./restore_database.sh [fichier_sauvegarde]

# Configuration
DB_CONTAINER="wikidata_db"
DB_USER="wikidata_user"
DB_NAME="wikidata_db"
BACKUP_DIR="database/backups"

# Vérifier si un fichier de sauvegarde est fourni
if [ -z "$1" ]; then
    echo "❌ Erreur: Veuillez spécifier un fichier de sauvegarde"
    echo "💡 Usage: ./restore_database.sh [fichier_sauvegarde]"
    echo ""
    echo "📋 Sauvegardes disponibles:"
    ls -lht "$BACKUP_DIR"/*.sql 2>/dev/null || echo "Aucune sauvegarde trouvée dans $BACKUP_DIR"
    exit 1
fi

# Déterminer le chemin complet du fichier
if [[ "$1" == /* ]]; then
    # Chemin absolu
    BACKUP_FILE="$1"
else
    # Chemin relatif
    if [[ "$1" == *".sql" ]]; then
        BACKUP_FILE="$BACKUP_DIR/$1"
    else
        BACKUP_FILE="$BACKUP_DIR/$1.sql"
    fi
fi

# Vérifier que le fichier existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erreur: Le fichier de sauvegarde '$BACKUP_FILE' n'existe pas"
    echo "💡 Sauvegardes disponibles:"
    ls -lht "$BACKUP_DIR"/*.sql 2>/dev/null || echo "Aucune sauvegarde trouvée dans $BACKUP_DIR"
    exit 1
fi

echo "🔄 Début de la restauration de la base de données..."
echo "📁 Fichier de sauvegarde: $BACKUP_FILE"
echo "📊 Taille du fichier: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"

# Vérifier si le conteneur Docker est en cours d'exécution
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "❌ Erreur: Le conteneur $DB_CONTAINER n'est pas en cours d'exécution"
    echo "💡 Démarrez d'abord les conteneurs avec: docker-compose up -d"
    exit 1
fi

# Demander confirmation
echo ""
echo "⚠️  ATTENTION: Cette opération va remplacer complètement la base de données actuelle!"
echo "📋 Fichier de sauvegarde: $BACKUP_FILE"
echo "📅 Date de sauvegarde: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE")"
echo ""
read -p "🤔 Êtes-vous sûr de vouloir continuer? (oui/non): " confirm

if [[ "$confirm" != "oui" && "$confirm" != "o" && "$confirm" != "yes" && "$confirm" != "y" ]]; then
    echo "❌ Restauration annulée"
    exit 0
fi

echo ""
echo "💾 Restauration en cours..."

# Effectuer la restauration
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres < "$BACKUP_FILE"

# Vérifier le succès de la restauration
if [ $? -eq 0 ]; then
    echo "✅ Restauration terminée avec succès!"
    echo "📅 Date: $(date)"
    echo "🔄 La base de données a été restaurée depuis: $BACKUP_FILE"
else
    echo "❌ Erreur lors de la restauration"
    exit 1
fi 