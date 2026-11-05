# Prototype local de génération Wikidata

Ouvrir `/prototype/generation?wikidata=Q5593` avec le serveur Vite de développement. La route est limitée au développement ; elle n'est pas exposée par le build de production. Aucun accès en écriture au catalogue ni enregistrement de frise.

## Essayer

- Neuf exemples chargent instantanément des copies de déclarations publiques Wikidata collectées pendant l'audit du 5 novembre 2026. Les fichiers JSON conservent les dates, leur précision, les identifiants de déclaration et le nombre de références. Les autres propriétés sont retirées pour limiter le volume.
- « Actualiser depuis Wikidata » relit le sujet et ses relations avec le transport existant. Un nom ou Q-id permet de tester un autre sujet. La famille est choisie explicitement dans le panneau des règles.
- Comparer les moteurs, changer les règles, inspecter la provenance, modifier la sélection et ouvrir son aperçu chronologique. Le JSON exporté conserve les données et réglages du prototype, sans utiliser le format d'enregistrement de production.

## Ce qui est expérimental

- Les profils constituent des heuristiques explicites, pas une garantie de pertinence historique. Le nombre de liens Wikimedia sert de signal de classement pour les candidats historiques ; il ne mesure pas leur exactitude.
- La recherche historique filtre les classes via P31/P279. La découverte est bornée à 120 candidats, la lecture à 160 fiches. Les autres profils utilisent principalement les relations directes ; les artistes utilisent les œuvres majeures P800.
- Les faits dérivés ont une identité par déclaration, séparée du Q-id du sujet. Les doublons simples entre propriétés de mission, étapes qualifiées et fiches d'événements sont expliqués dans les éléments écartés.
- Les siècles et décennies restent approximatifs. Leur position dans l'aperçu est indicative ; ils ne sont pas transformés en dates annuelles précises. Le contrôle des bornes est suspendu pour une borne approximative.
- Une période sans fin reste à vérifier. Une description contenant « obsolete » ou « obsolète » signale une subdivision à écarter ; cette règle ne remplace pas l'identification d'un référentiel scientifique.
- Une collecte inverse indisponible produit un avertissement de couverture partielle. Un échec de comparaison avec le moteur actuel est affiché séparément.

## Vérification

`yarn test src/dev/generation-prototype/__tests__`

Les tests utilisent les déclarations publiques capturées et couvrent notamment les identités biographiques, les étapes répétées, les doublons, les bornes à l'année, les siècles et les subdivisions obsolètes.
