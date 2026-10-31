#!/bin/bash

# Script pour exécuter les migrations des catégories
# Date: 2025-06-17

echo "🚀 Début des migrations des catégories..."

# Variables de configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-wikidata_timeline}
DB_USER=${DB_USER:-postgres}

echo "📊 Connexion à la base de données: $DB_HOST:$DB_PORT/$DB_NAME"

# 1. Créer les tables de liaison
echo "📋 Création des tables de liaison..."
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f migrations/20250617_add_category_relations.sql

if [ $? -eq 0 ]; then
    echo "✅ Tables de liaison créées avec succès"
else
    echo "❌ Erreur lors de la création des tables de liaison"
    exit 1
fi

# 2. Insérer les catégories par défaut
echo "📝 Insertion des catégories par défaut..."
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f migrations/20250617_insert_default_categories.sql

if [ $? -eq 0 ]; then
    echo "✅ Catégories par défaut insérées avec succès"
else
    echo "❌ Erreur lors de l'insertion des catégories"
    exit 1
fi

# 3. Vérification
echo "🔍 Vérification des migrations..."
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -c "
SELECT 
    'period_categories' as table_name,
    COUNT(*) as row_count
FROM period_categories
UNION ALL
SELECT 
    'event_categories' as table_name,
    COUNT(*) as row_count
FROM event_categories
UNION ALL
SELECT 
    'story_categories' as table_name,
    COUNT(*) as row_count
FROM story_categories
UNION ALL
SELECT 
    'categories' as table_name,
    COUNT(*) as row_count
FROM categories.categories;
"

echo "🎉 Migrations des catégories terminées avec succès!"
echo ""
echo "📋 Résumé des modifications:"
echo "   - Tables de liaison créées: period_categories, event_categories, story_categories"
echo "   - 18 catégories par défaut insérées"
echo "   - Index de performance créés"
echo "   - Contraintes de clés étrangères configurées" 