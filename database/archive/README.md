# Archives historiques — ne pas exécuter

Ces fichiers décrivent les anciennes bases Docker et le modèle Prisma abandonné. Ils ne constituent pas une chaîne de migrations pour le projet Supabase actuel. L’extension `.txt` et leur emplacement hors des sources/runners les excluent des compilations, images et migrations courantes.

Le manifeste conserve le chemin d’origine, la taille et le SHA-256 de chaque fichier déplacé, sans modification de son contenu. Les anciens dumps sont conservés pour leur valeur historique ; ne pas les réimporter dans Supabase. Certains scripts effacent des tables, remplacent les IDs ou retirent parent_id. Les sauvegardes ne sont pas des gabarits à publier.

Constat du 29 octobre 2026, vérifié par lecture des métadonnées : dix tables applicatives dans public ; périodes/événements/catégories en varchar, stories en integer avec propriétaire UUID. Le modèle Prisma visait une table Event avec label/date/source, sans mapping vers public.events et ses colonnes bilingues. Il n’est pas utilisé par l’API, qui emploie pg.

- `database/` : initialiseurs/imports et maintenance pour anciens schémas, runners Docker/pgAdmin, anciennes migrations et dumps.
- `server/` : ancien schéma/migrations Prisma, updater de dates et son lecteur Wikidata avec ses tests historiques. Les reprises de lecture actives restent couvertes par shared/readOperation et les tests du transport navigateur.
- `manifest.json` : intégrité des déplacements, vérifiée par le test de maintenance.

Les migrations d’accès et de durcissement appliquées au projet sont conservées à leurs chemins dans `database/migrations/`. Les opérations explicites d’attribution restent dans `database/operations/`. Aucune archive n’a été rejouée, aucune fonction distante ni donnée Supabase modifiée pendant ce nettoyage.
