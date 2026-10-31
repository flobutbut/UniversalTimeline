# Sauvegarde et restauration Supabase

Les anciens scripts backup_database.sh/restore_database.sh visaient des conteneurs et schémas abandonnés. Ils sont archivés comme textes dans archive/ et ne sont plus des commandes de maintenance du projet.

Pour la base active, consulter Database → Backups du projet Supabase et vérifier les sauvegardes réellement disponibles selon son offre. Une sauvegarde logique peut être préparée avec la CLI Supabase selon [la procédure officielle](https://supabase.com/docs/guides/platform/backups). Les sauvegardes SQL ne contiennent pas les fichiers Storage ; prévoir leur protection séparément si cette fonctionnalité est utilisée.

Avant de restaurer, définir précisément le projet cible et le point de reprise, puis vérifier sur un environnement dédié le schéma, les clés étrangères, les propriétaires de stories, les rôles Auth/RLS et les comptes. Une restauration distante nécessite une autorisation explicite pour cette cible et peut rendre le projet indisponible pendant l’opération.

Conserver les exports récents hors du dépôt dans un emplacement protégé ; ne pas ajouter de secrets ni de nouveaux dumps à Git. Les dumps historiques conservés dans archive/ ne sont pas des sauvegardes de l’état courant et ne doivent pas être réimportés. Aucun backup ou restore n’a été lancé dans le lot 27 ; la passe du lot 28 sauvegarde/restaure uniquement des données fictives dans un PostgreSQL 17 jetable, avec vérification des lignes, contraintes, RLS, ACL et compteurs. Cette preuve ne remplace pas une stratégie de reprise du projet Supabase complet avant déploiement.
