#!/bin/bash
set -e

# Attendre que pgAdmin soit prêt
sleep 5

# Définir les permissions correctes
chown pgadmin:root /pgadmin4/servers.json
chmod 600 /pgadmin4/servers.json

# Créer le répertoire de stockage si nécessaire
mkdir -p /var/lib/pgadmin/storage
chown -R pgadmin:root /var/lib/pgadmin
chmod -R 700 /var/lib/pgadmin 