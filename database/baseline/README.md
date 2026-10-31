# Installation vide — état applicatif du 29 octobre 2026

`application.sql` prépare les dix tables applicatives d’un **nouveau projet Supabase PostgreSQL 17 ou ultérieur**. Il reprend les types, colonnes, identité des stories, contraintes, index, quatre triggers et 21 policies observés dans le projet actuel. Il ne contient aucun compte, contenu, mot de passe ni compteur de la base distante.

Le script est transactionnel et refuse de s’appliquer si un objet applicatif existe déjà. Il exige l’infrastructure Auth et les rôles gérés par Supabase. Il n’est jamais lancé au démarrage de l’API, ni par les tests sur le projet distant. Ne pas l’utiliser pour réparer ou réinitialiser le projet Universal-Timeline existant.

Les trois fichiers de `../migrations/` sont l’historique des changements déjà inclus dans cet état initial ; **ne pas les rejouer après la baseline**. Les changements futurs devront avoir leurs propres migrations revues. Aucune ligne d’historique de migration distante n’est inventée par cette préparation.

Différences volontaires pour une nouvelle installation :

- La routine historique inutilisée `maintain_period_relations`, incompatible avec le modèle courant, n’est pas réinstallée. Le projet existant conserve sa routine restreinte.
- Aucune colonne applicative n’utilise PostGIS. Cette extension facultative et les schémas internes Supabase ne sont pas copiés. S’il est nécessaire d’installer PostGIS, utiliser le schéma extensions, hors des schémas exposés.
- Les séquences ne donnent aucun accès à anon ; authenticated reçoit seulement USAGE, suffisant pour les créations. Le modèle historique donnait des droits supplémentaires inutiles. Le schéma public n’est pas créable par les rôles clients. Ces restrictions s’appliquent à la baseline, sans modifier les droits du projet existant.

## Vérifier

Depuis la racine, `yarn verify:clean` (ou `node scripts/check-clean.mjs`) installe les dépendances verrouillées dans une image jetable et utilise PostgreSQL 17 sans port TCP publié. Les tests comparent le catalogue à `server/test/fixtures/application-schema.json`, puis exercent les vrais handlers, RLS, contraintes, triggers et séquences. La baseline est aussi refusée lors d’un second passage, sans changement des données fictives.

La suite sauvegarde les seuls schémas de test public/auth, avec ACL, puis les restaure dans une autre base jetable et vérifie données, règles d’accès et reprise des compteurs. Le schéma auth de test est une doublure minimale : cette vérification ne constitue pas une restauration d’un projet Supabase complet, de ses comptes réels ou des fichiers Storage. Les autres suites vérifient séparément les migrations historiques.

Les conteneurs, leurs bases et volumes de test sont supprimés après la passe. Aucune variable .env du poste n’entre dans l’image ; aucune copie de travail parallèle du dépôt n’est créée.

Préparation du service et configuration : [MISE-EN-SERVICE.md](../../Documentation/MISE-EN-SERVICE.md).
