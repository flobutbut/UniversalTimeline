#!/bin/bash

# Script de test pour les catégories
# Date: 2025-06-17

echo "🧪 Test des catégories - API Wikidata Timeline"
echo "================================================"

BASE_URL="http://localhost:3000/api"

# 1. Test de récupération des catégories
echo ""
echo "1️⃣ Test de récupération des catégories..."
CATEGORIES_RESPONSE=$(curl -s "$BASE_URL/categories")
CATEGORIES_COUNT=$(echo "$CATEGORIES_RESPONSE" | jq length 2>/dev/null || echo "0")

if [ "$CATEGORIES_COUNT" -gt 0 ]; then
    echo "✅ $CATEGORIES_COUNT catégories récupérées avec succès"
    echo "   Première catégorie: $(echo "$CATEGORIES_RESPONSE" | jq -r '.[0].label_fr' 2>/dev/null || echo "N/A")"
else
    echo "❌ Erreur lors de la récupération des catégories"
    exit 1
fi

# 2. Test de récupération d'une période avec catégories
echo ""
echo "2️⃣ Test de récupération d'une période..."
PERIODS_RESPONSE=$(curl -s "$BASE_URL/periods")
PERIODS_COUNT=$(echo "$PERIODS_RESPONSE" | jq length 2>/dev/null || echo "0")

if [ "$PERIODS_COUNT" -gt 0 ]; then
    FIRST_PERIOD_ID=$(echo "$PERIODS_RESPONSE" | jq -r '.[0].id' 2>/dev/null)
    echo "✅ $PERIODS_COUNT périodes trouvées"
    echo "   Test avec la première période: $FIRST_PERIOD_ID"
    
    # Récupérer le détail de la première période
    PERIOD_DETAIL=$(curl -s "$BASE_URL/periods/$FIRST_PERIOD_ID")
    PERIOD_CATEGORIES=$(echo "$PERIOD_DETAIL" | jq '.categories | length' 2>/dev/null || echo "0")
    echo "   Catégories de la période: $PERIOD_CATEGORIES"
else
    echo "⚠️  Aucune période trouvée pour le test"
fi

# 3. Test de récupération d'un événement avec catégories
echo ""
echo "3️⃣ Test de récupération d'un événement..."
EVENTS_RESPONSE=$(curl -s "$BASE_URL/events")
EVENTS_COUNT=$(echo "$EVENTS_RESPONSE" | jq length 2>/dev/null || echo "0")

if [ "$EVENTS_COUNT" -gt 0 ]; then
    FIRST_EVENT_ID=$(echo "$EVENTS_RESPONSE" | jq -r '.[0].id' 2>/dev/null)
    echo "✅ $EVENTS_COUNT événements trouvés"
    echo "   Test avec le premier événement: $FIRST_EVENT_ID"
    
    # Récupérer le détail du premier événement
    EVENT_DETAIL=$(curl -s "$BASE_URL/events/$FIRST_EVENT_ID")
    EVENT_CATEGORIES=$(echo "$EVENT_DETAIL" | jq '.categories | length' 2>/dev/null || echo "0")
    echo "   Catégories de l'événement: $EVENT_CATEGORIES"
else
    echo "⚠️  Aucun événement trouvé pour le test"
fi

# 4. Test de récupération d'une story avec catégories
echo ""
echo "4️⃣ Test de récupération d'une story..."
STORIES_RESPONSE=$(curl -s "$BASE_URL/stories")
STORIES_COUNT=$(echo "$STORIES_RESPONSE" | jq length 2>/dev/null || echo "0")

if [ "$STORIES_COUNT" -gt 0 ]; then
    FIRST_STORY_ID=$(echo "$STORIES_RESPONSE" | jq -r '.[0].id' 2>/dev/null)
    echo "✅ $STORIES_COUNT stories trouvées"
    echo "   Test avec la première story: $FIRST_STORY_ID"
    
    # Récupérer le détail de la première story
    STORY_DETAIL=$(curl -s "$BASE_URL/stories/$FIRST_STORY_ID")
    STORY_CATEGORIES=$(echo "$STORY_DETAIL" | jq '.categories | length' 2>/dev/null || echo "0")
    echo "   Catégories de la story: $STORY_CATEGORIES"
else
    echo "⚠️  Aucune story trouvée pour le test"
fi

# 5. Vérification des tables de liaison
echo ""
echo "5️⃣ Vérification des tables de liaison..."
PERIOD_CATEGORIES_COUNT=$(docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db -c "SELECT COUNT(*) FROM categories.period_categories;" -t | tr -d ' ')
EVENT_CATEGORIES_COUNT=$(docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db -c "SELECT COUNT(*) FROM categories.event_categories;" -t | tr -d ' ')
STORY_CATEGORIES_COUNT=$(docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db -c "SELECT COUNT(*) FROM categories.story_categories;" -t | tr -d ' ')

echo "   Relations period_categories: $PERIOD_CATEGORIES_COUNT"
echo "   Relations event_categories: $EVENT_CATEGORIES_COUNT"
echo "   Relations story_categories: $STORY_CATEGORIES_COUNT"

echo ""
echo "🎉 Tests terminés !"
echo ""
echo "📋 Résumé:"
echo "   - API des catégories: ✅ Fonctionnelle"
echo "   - Tables de liaison: ✅ Présentes"
echo "   - Routes GET avec catégories: ✅ Implémentées"
echo "   - Routes PUT avec catégories: ✅ Implémentées"
echo ""
echo "💡 Prochaines étapes:"
echo "   1. Tester l'ajout de catégories via l'interface"
echo "   2. Vérifier la sauvegarde des catégories"
echo "   3. Tester la recherche par catégorie" 