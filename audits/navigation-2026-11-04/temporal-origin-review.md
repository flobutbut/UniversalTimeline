# Origine de navigation et fenêtre temporelle

Correction du 4 novembre 2026, à la suite du cas Genre Homo signalé dans le navigateur utilisateur. Elle remplace la règle précédente qui masquait les dates du repère et lui donnait toute la largeur.

## Cause et règle corrigée

Une entrée par événement ou racine utilisait le titre de la frise source comme une période fictive sans dates. Dans le cas signalé, l’événement « Apparition du genre Homo » dans Les premiers hominines ouvrait Genre Homo avec une fausse barre « Les premiers hominines ».

Cette barre disparaît. Le retour à la frise source reste dans l’en-tête, à côté des autres commandes de navigation. Il ne constitue pas un contenu temporel.

Une vraie période d’origine conserve ses dates et ses coordonnées. Elle est placée sur la même échelle que les périodes et événements du récit, sans étendre la fenêtre. Sa partie hors fenêtre n’est pas dessinée ; si aucune partie n’est visible, ou si les dates manquent, la barre est absente et le retour reste dans l’en-tête. Les appartenances du récit et les dates du catalogue ne sont pas modifiées.

## Contrôles

- Onze cas supplémentaires vérifient le chevauchement partiel, la couverture complète, les origines plus anciennes ou futures, les dates absentes, l’entrée par événement et la conservation du retour.
- Suite complète : **1 515 tests réussis**. Build frontend et vérification TypeScript réussis.
- Dans l’onglet utilisateur : retour Genre Homo → Les premiers hominines vérifié, puis entrée par le même événement rejouée. Aucune fausse période « Les premiers hominines » ; le bouton « Retour à Les premiers hominines » est visible dans l’en-tête. [Capture](homo-without-false-origin.jpg).
- Dans le même onglet : Vie → Quaternaire → Genre Homo. La fenêtre débute à 2,8 Ma, la référence Quaternaire à 2,58 Ma. Mesures DOM : décalage **7,85714 %**, largeur **92,1429 %**. Le récit Genre Homo garde son début à 2,8 Ma. [Capture](partial-origin-in-homo.jpg).

L’onglet est revenu sur le cas initial Genre Homo depuis Les premiers hominines. Aucune écriture en base ni mise en ligne n’a été effectuée pour ce correctif.
