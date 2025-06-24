#!/bin/bash

# Script pour lister et gérer les sauvegardes de la base de données
# Usage: ./list_backups.sh [option]

BACKUP_DIR="database/backups"

# Fonction d'aide
show_help() {
    echo "📋 Gestionnaire de sauvegardes de la base de données Wikidata"
    echo ""
    echo "Usage: ./list_backups.sh [option]"
    echo ""
    echo "Options:"
    echo "  (aucune)     - Lister toutes les sauvegardes"
    echo "  --size       - Afficher la taille totale des sauvegardes"
    echo "  --clean      - Nettoyer les anciennes sauvegardes (garder les 10 plus récentes)"
    echo "  --help       - Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./list_backups.sh"
    echo "  ./list_backups.sh --size"
    echo "  ./list_backups.sh --clean"
}

# Vérifier si le dossier existe
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Le dossier de sauvegardes '$BACKUP_DIR' n'existe pas"
    exit 1
fi

# Traitement des options
case "${1:-}" in
    "--size")
        echo "📊 Taille totale des sauvegardes:"
        du -sh "$BACKUP_DIR"
        echo ""
        echo "📋 Détail par fichier:"
        ls -lht "$BACKUP_DIR"/*.sql 2>/dev/null || echo "Aucune sauvegarde trouvée"
        ;;
    "--clean")
        echo "🧹 Nettoyage des anciennes sauvegardes..."
        echo "📋 Sauvegardes actuelles:"
        ls -lht "$BACKUP_DIR"/*.sql 2>/dev/null || {
            echo "Aucune sauvegarde trouvée"
            exit 0
        }
        
        # Compter le nombre total de sauvegardes
        total_backups=$(ls "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l)
        
        if [ "$total_backups" -le 10 ]; then
            echo "✅ Il n'y a que $total_backups sauvegardes, aucune suppression nécessaire"
            exit 0
        fi
        
        echo ""
        echo "🗑️  Suppression des sauvegardes les plus anciennes (garder les 10 plus récentes)..."
        
        # Supprimer les anciennes sauvegardes
        ls -t "$BACKUP_DIR"/*.sql | tail -n +11 | xargs rm -v
        
        echo ""
        echo "✅ Nettoyage terminé. Sauvegardes restantes:"
        ls -lht "$BACKUP_DIR"/*.sql 2>/dev/null
        ;;
    "--help"|"-h")
        show_help
        ;;
    "")
        echo "📋 Sauvegardes disponibles:"
        if ls "$BACKUP_DIR"/*.sql >/dev/null 2>&1; then
            ls -lht "$BACKUP_DIR"/*.sql
            echo ""
            echo "📊 Informations:"
            echo "   Total: $(ls "$BACKUP_DIR"/*.sql | wc -l) sauvegardes"
            echo "   Taille totale: $(du -sh "$BACKUP_DIR" | cut -f1)"
            echo "   Plus récente: $(ls -t "$BACKUP_DIR"/*.sql | head -1 | xargs basename)"
            echo "   Plus ancienne: $(ls -t "$BACKUP_DIR"/*.sql | tail -1 | xargs basename)"
        else
            echo "❌ Aucune sauvegarde trouvée dans $BACKUP_DIR"
        fi
        ;;
    *)
        echo "❌ Option inconnue: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 