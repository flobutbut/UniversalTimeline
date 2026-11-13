# Frise « Guerre de Sécession » (86)

Date : 13 novembre 2026. Création d’une frise sous Histoire des États-Unis (50), appliquée en production après accord.

## Point de départ

La base contenait la période « Guerre de Sécession » (Q8676) sur les frises 50 et 78 (Lincoln), et huit événements liés à Lincoln ou à l’émancipation. Aucune bataille, campagne ni cause de la guerre n’était présente ; aucun des Q-id du lot n’était pris.

## Choix

- **Bornes** : de 1850 à 1865. La crise des années 1850 fait partie du récit ; la Reconstruction (1865-1877) reste sur la frise 50, comme sujet distinct.
- **Périodes** : *Crise de l’Union* (1850 – 12 avril 1861, avec *Kansas sanglant*) et *Guerre de Sécession* (fiche existante, gardée car la frise est plus large qu’elle), qui se suivent sur une ligne. Sous la guerre, cinq campagnes : Vicksburg, Overland, Atlanta, Petersburg, marche de Sherman ; les campagnes simultanées de 1864 occupent trois lignes.
- **Événements** : 34, dont 26 nouveaux et 8 repris (élection et réélection de Lincoln, débats Lincoln-Douglas, émancipation, Gettysburg, discours de Gettysburg, assassinat, XIIIe amendement). Inventions et techniques : corps aérostatique, Hampton Roads (premier duel de cuirassés), exposition Brady, brevet Gatling, Hunley.
- **Écartés** : événements « prise d’Atlanta » et « chute de Vicksburg » (même date que la fin de leur période) ; Homestead Act et Morrill Act (politique intérieure, frise 50) ; théâtres oriental et occidental (deux bandes de la largeur de la guerre).
- **Majeurs (12)** : Dred Scott, élection de Lincoln, Fort Sumter, Hampton Roads, Antietam, Gatling, émancipation, Gettysburg, Hunley, Appomattox, assassinat de Lincoln, XIIIe amendement. Tags de frise : Conflits, Pouvoir & institutions.
- **Accès** : 50 et 78 vers 86 depuis leur période « Guerre de Sécession » ; 41 (L’esclavage) vers 86 depuis le XIIIe amendement ; 86 vers 78 depuis l’élection de Lincoln et vers 41 depuis le XIIIe amendement. Rattachement historique à la frise 50 sur la période de la guerre.

## Sources

Q-id, dates et titres Wikipédia repris de Wikidata (`wbsearchentities`, `wbgetentities`) et vérifiés avant écriture. Sans Q-id : fondation du Parti républicain (année 1854), sécession de la Caroline du Sud (20 décembre 1860, lien vers l’article sur l’ordonnance de sécession), exposition « The Dead of Antietam » (octobre 1862, sans lien). Article anglais seul : Hunley, Appomattox ; aucun article : capture de Jefferson Davis.

## Lot

[Contenu et générateur](../database/data/20261113_guerre_secession_source/content.mjs), [JSON](../database/data/20261113_guerre_secession.json), [transaction](../database/data/20261113_guerre_secession.sql) et [retour arrière](../database/data/20261113_guerre_secession_rollback.sql). Dates calculées par `storedYearsBeforePresent`, sous-périodes contrôlées dans leur parent, jumeaux refusés.

Sur PostgreSQL 17 jetable (baseline et identifiants de production) : application, refus d’une seconde exécution, retour arrière ramenant une empreinte identique à l’état initial. L’inverse n’a pas été exécuté en production.

## Vérification en production

Frise 86, publique, signée du même auteur que la frise 50 : 8 périodes, 34 événements dont 12 majeurs, 5 accès, 1 rattachement, aucune ancre cassée, aucun jumeau. Sur le site, l’ouverture montre *Crise de l’Union* et *Guerre de Sécession* avec « L’essentiel » ; la période de la guerre ouvre ses cinq campagnes.

## Non vérifié

- La date exacte d’ouverture de l’exposition Brady (octobre 1862).
- Les accès depuis les frises 50, 78 et 41 n’ont été contrôlés qu’en base, pas parcourus dans l’exploration.
