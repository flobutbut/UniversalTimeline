#!/bin/bash

echo "Début de la migration vers le format ISO8602..."

# Exécution du script SQL de migration
docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db < ./migrate_to_iso8602.sql

echo "Migration terminée !" 