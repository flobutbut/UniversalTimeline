# Vérification dans l’onglet d’exploration de l’utilisateur

Test manuel dans le navigateur interne, connecté au compte déjà ouvert, avec l’API et les données réelles. Aucun jeu de réponses simulées, aucune écriture de données, aucun déploiement.

## Parcours vérifiés

- Univers → Voie Lactée → Système solaire : exploration locale et accès aux trois récits associés à Terre.
- Depuis la carte Terre visible dans Système solaire → Géologie : repère Terre sans dates, périodes géologiques conservées, deux autres récits accessibles.
- Géologie → Climat via ce repère : les dates climatiques restent propres au récit ; aucune flèche de changement de sujet n’est ajoutée.
- Rechargement dans Climat : le chemin conserve Univers → Géologie → Climat. Les deux retours successifs retrouvent Géologie, puis exactement la vue Système solaire quittée au départ.
- Grandes périodes de l’histoire européenne → Moyen Âge → Époque moderne : transitions chronologiques ; le Moyen Âge ne devient pas un ancêtre de l’Époque moderne.
- Moyen Âge central → Moyen Âge tardif : voisins locaux, fin annoncée au 12 octobre 1492, sans saut vers un autre sujet.
- Genre Homo ouvert dans un onglet neuf : aucun historique fictif ; l’accès racine à Techniques est absent dans les données actuelles, conformément au lot de données encore en attente. Cet onglet de contrôle a été fermé.

## Défaut trouvé et corrigé

Avec les anciennes périodes chapeau encore présentes, le bouton de retour d’Époque moderne ouvrait la vue globale du parcours historique au lieu de retrouver la position Moyen Âge d’origine. Le retour depuis une période de référence utilise désormais le chemin réellement visité lorsqu’il existe, comme le retour d’un récit sans chapeau.

Un test de régression a d’abord reproduit l’échec, puis passe après correction. Le même parcours a été rejoué dans l’onglet utilisateur : arrivée confirmée sur `/timeline?story=24&period=Q12554&context=24`, avec la période Moyen Âge sélectionnée. La [capture](browser-return-fixed.jpg) montre cet état. Le navigateur utilisateur reste sur cette position.

Validation après correction : 1 504 tests réussis et build frontend avec vérification TypeScript réussi. Aucun message d’erreur dans la console du navigateur contrôlée pendant le parcours.

## Limites encore visibles

Les quatre anciennes appartenances de référence sont toujours présentes en base et l’entrée racine Genre Homo → Techniques n’est pas encore créée. Les tester après leur nettoyage nécessite la mise en ligne coordonnée précédemment signalée.

Le repère partagé « Terre » reste affiché dans Climat lorsqu’on y arrive depuis Géologie, tandis que le bouton revient réellement à Géologie. Le fonctionnement du retour est correct, mais son libellé pourrait annoncer plus explicitement sa destination ; aucune modification supplémentaire d’interface n’a été ajoutée pendant ce contrôle.
