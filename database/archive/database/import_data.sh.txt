#!/bin/bash

# Import des données dans la base
echo "Import des données..."
docker exec -i wikidata_db psql -U wikidata_user -d wikidata_db < ./import_data.sql

echo "Import terminé !" 