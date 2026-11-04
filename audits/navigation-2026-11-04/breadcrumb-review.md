# Fil des frises compact

Le fil des frises de l’exploration conserve au maximum les trois dernières étapes, dont la position courante. Un sélecteur natif « … » placé au début donne accès aux étapes précédentes avec leurs intitulés complets et leurs indices de navigation d’origine.

Le nombre d’étapes visibles diminue avec la largeur disponible. La ligne ne se replie plus ; les intitulés longs utilisent des points de suspension et conservent leur texte complet pour l’accessibilité et au survol. Le fil des périodes garde son comportement existant.

Vérification dans l’onglet utilisateur sur Révolutions industrielles et énergie : six frises dans le chemin, trois visibles et trois dans le sélecteur. Le choix « Les premiers hominines » retrouve bien cette frise ; l’historique du navigateur restaure ensuite la frise et la période initiales. [Capture à la taille normale](breadcrumb-compact.jpg).

À 390 px : seule la frise courante reste visible, les cinq précédentes restent dans le sélecteur. Aucun débordement du fil (largeur et scrollWidth : 207 px). La taille habituelle du navigateur a été restaurée. [Capture mobile](breadcrumb-mobile.jpg).

Validation : 56 tests ciblés réussis, dont quatre nouveaux tests du repli, des indices d’origine, du focus et du redimensionnement. Build frontend, TypeScript et contrôles du design réussis. Aucune écriture en base ni mise en ligne.
