# Cartes de frises associées — 4 novembre 2026

Le menu commun aux cartes propose Voir la frise, Déplacer, Afficher comme une période / Afficher dans le badge, et Supprimer uniquement le lien à cet endroit.

Le chevron ouvre les périodes de la cible dans les colonnes suivantes. Ces colonnes indiquent Lecture seule, utilisent les couleurs atténuées, désactivent le glisser-déposer et ne proposent aucune action d’écriture. La frise source et ses périodes restent inchangées.

Le mode période appartient à une occurrence de navigation (`story_entry_points.display_as_period`). La migration additive est appliquée sur Supabase ; les liens existants restent en mode badge par défaut. Les droits INSERT/DELETE existants sont conservés, sans nouveau droit UPDATE. Aucun fait du catalogue n’est créé. Les cartes utilisent les dates réelles de la cible et sont projetées dans la fenêtre active sans l’étendre. Leur clic ouvre la frise cible avec le retour habituel.

Validation complète isolée : 1557 tests, 192 tests PostgreSQL 17 avec restauration, builds frontend/API et zéro vulnérabilité aux deux audits de dépendances. Les conseillers de sécurité Supabase ne signalent aucun problème.

Contrôle dans le navigateur : Époque moderne → L’âge des révolutions ; ouverture de deux colonnes de lecture seule (8 périodes affichées, aucune ligne déplaçable ni action d’édition), menu au clavier, activation du mode période, persistance après rechargement, carte limitée à la fenêtre 1492–1789, ouverture de la cible 27. Le lien testé a été remis dans son mode badge initial.

Captures : [menu et lecture seule](2026-11-04-linked-story-menu-readonly.jpg), [carte dans l’exploration](2026-11-04-linked-story-as-period.jpg).
