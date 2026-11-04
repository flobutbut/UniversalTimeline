# Navigation sans période chapeau — mise en œuvre

État au 4 novembre 2026 : code implémenté et testé ; schéma Supabase migré. Le nettoyage des appartenances est préparé, pas exécuté en production. La revue automatique refuse le déploiement Vercel sans accord explicite de mise en production ; les données attendent ce déploiement pour préserver le fonctionnement de la version active.

## Comportement

- L’interface existante est conservée. La première ligne peut afficher une vraie période d’origine avec ses dates, limitée à son intersection avec la fenêtre du récit. Elle ne devient pas une appartenance et ne modifie pas les bornes du récit. Les entrées par événement ou racine et les origines hors fenêtre gardent leur retour dans l’en-tête.
- Le retour suit l’origine réelle, y compris lors d’entrées multiples ; l’historique du navigateur conserve ce chemin après rechargement.
- Les flèches restent exclusivement temporelles. Une présentation explicite permet la continuité entre récits, même sans période chapeau commune ; les subdivisions suivent leur ordre local.
- Les liens à la racine ont un emplacement explicite et un badge dans l’en-tête. Ils coexistent avec d’autres ancres et permettent des durées différentes entre source et destination.
- Les liens directs et anciennes URL continuent à fonctionner lorsqu’une présentation valide la référence. Aucune visite fictive n’est créée pour une entrée directe.
- Créer une frise depuis une période déplace ses sous-périodes sans recopier cette période dans la cible. Une présentation extérieure ne change plus de cible à cause d’un retrait d’appartenance.
- Les éditeurs de relations proposent la racine ; les éditeurs de parcours proposent les périodes de la source sans imposer de copie dans la cible.

Aucun zoom, niveau global ou changement de sujet via les flèches n’est ajouté.

## Base distante : fait et en attente

La migration `database/migrations/20261104132539_navigation_without_wrapper_periods.sql` est appliquée sur `Universal-Timeline` sous la version distante `20261104134742`. Elle permet les entrées racine et découple le rattachement chronologique des appartenances de la cible. Les règles de visibilité et d’édition restent en vigueur. Contrôles distants : aucun avis de sécurité, quatre références conservées, toutes les données initiales encore présentes ; détails dans [schema-applied.json](schema-applied.json).

La transaction [de données](../../database/data/20261104_navigation_without_wrappers.sql), non exécutée à distance, retire les appartenances utilisées dans le prototype :

| Frise | Référence retirée de son récit |
|---|---|
| Antiquité et premières civilisations | Antiquité |
| Moyen Âge | Moyen Âge |
| Époque moderne | Époque moderne |
| Époque contemporaine | Histoire contemporaine |

La référence reste dans « Grandes périodes de l’histoire européenne ». Cinq sous-périodes deviennent racines locales ; huit anciennes ancres sont remplacées par des entrées racine conservant leurs destinations. Une neuvième entrée relie Genre Homo à Histoire des techniques. Les deux entrées Terre → Vie / Climat existaient déjà dans la sauvegarde et sont conservées. Les autres candidats de l’audit ne sont pas supprimés automatiquement.

| Données | Avant / production actuelle | Après la transaction répétée localement |
|---|---:|---:|
| Frises | 39 | 39 |
| Périodes du catalogue | 366 | 366 |
| Événements du catalogue | 421 | 421 |
| Appartenances de périodes | 418 | 414 |
| Appartenances d’événements | 555 | 555 |
| Ancres historiques | 35 | 27 |
| Points d’entrée | 24 | 33 |
| Présentations chronologiques | 4 | 4 |

## Validation

La dernière vérification isolée `node scripts/check-clean.mjs` passe : installation vierge, 1 524 tests, contrôles du design, configuration et symboles inutilisés, builds frontend et API, zéro vulnérabilité aux deux audits de dépendances. Après le contrôle dans le navigateur utilisateur, un défaut de retour avec les anciens chapeaux a été corrigé et la suite complète ainsi que le build frontend ont été repassés ; voir [le contrôle réel](browser-review.md). Les quatorze suites PostgreSQL 17 isolées et le contrôle de restauration totalisent 182 tests réussis ; les six parcours de navigateur passent sans erreur de page. Résumé : [validation.json](validation.json).

La répétition utilise PostgreSQL 17 local par socket, une copie aux propriétaires anonymisés et aucun identifiant de connexion distant. Tous les faits, événements et destinations restent identiques. Le retour arrière [rollback-data.sql](rollback-data.sql) a restauré exactement toutes les lignes d’origine ; [rehearsal.json](rehearsal.json) en conserve le résultat.

Les tests couvrent notamment Terre → Géologie, un récit climatique plus court, les deux origines de Climat, les passages chronologiques sans chapeau, une frise avec seulement des événements, les entrées racine, le rechargement et les anciennes URL. L’interface réelle `/timeline` est testée avec les réponses de l’API issues de la répétition, sans écriture distante. Les captures [Géologie](geology.png) et [Moyen Âge](middle-ages.png) montrent cette interface.

La sauvegarde ciblée [before.json](before.json), le [plan détaillé](data-plan.json), le générateur `prepare-data.mjs` et les outils de répétition sont conservés localement. Les audits et sauvegardes sont exclus de l’envoi Vercel par `.vercelignore`.

## Mise en ligne restante

1. Obtenir l’accord explicite de déploiement Vercel demandé par la revue automatique.
2. Déployer l’API et le frontend ensemble, puis vérifier leur disponibilité avec les données encore inchangées.
3. Contrôler à nouveau les quatre appartenances et appliquer la transaction de données déjà autorisée. Elle verrouille brièvement les relations, refuse une cible modifiée et vérifie la conservation des faits et présentations avant commit.
4. Contrôler les parcours réels et enregistrer les effectifs après application.

Ne pas appliquer le nettoyage avant le nouveau code en production. Le retour arrière de données reste compatible avec le nouveau schéma ; il n’est pas nécessaire de retirer les contraintes de compatibilité.

Le [correctif de cadrage des origines](temporal-origin-review.md) remplace l’ancien repère sans dates : aucune frise n’est présentée comme une période fictive.

## Infobulles et petites périodes

Cliquer sur le contenu d’une infobulle, y compris sa date ou sa description, fige l’événement ; son titre offre la même action au clavier. Les liens vers les frises gardent leur action propre. Le nombre de frises associées reste visible à l’état figé ; zéro ou nombre inconnu ne sont pas affichés. Une petite période reste étendue tant que son menu de frises associées est ouvert, y compris lorsque le focus passe dans le panneau téléporté.

Contrôle sur l’onglet utilisateur, Cénozoïque : clic sur la date d’« Apparition du genre Homo », compteur de trois autres frises, ouverture puis fermeture du menu du Quaternaire sans changement de sa largeur étendue (26,14446 %). [Capture](event-pin-and-period-menu.jpg).

Le menu reste au-dessus de l’infobulle figée dans leur zone de chevauchement : les événements possèdent leur contexte de superposition local. Ce point est vérifié dans le DOM du navigateur et dans la capture.
