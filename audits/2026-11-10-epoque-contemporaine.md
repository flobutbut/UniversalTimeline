# Époque contemporaine — 10 novembre 2026

Correction appliquée à la frise 37 dans la base active Universal-Timeline, après signalement d’une ouverture presque vide. Aucun changement du code applicatif ni du schéma.

## Diagnostic vérifié

La frise avait une seule période, la Révolution française, et 32 événements. Ses huit accès à d’autres récits étaient essentiellement à la racine, dans des menus. Le filtre « L’essentiel » privilégiait les découvertes scientifiques, les autres sujets étant surtout présents parmi les événements normaux. En l’absence de période allant jusqu’à aujourd’hui, le cadrage se terminait au dernier événement, le 11 mars 2020.

## Résultat appliqué

- Cinq phases principales contiguës, sur une même ligne : Révolutions et Empire napoléonien (1789–1815), Industrialisation et empires coloniaux (1815–1914), Guerres mondiales et crises (1914–1945), Guerre froide et décolonisations (1945–1991), Mondialisation et défis contemporains (1991–aujourd’hui).
- La période partagée Révolution française devient une sous-période de la première phase dans cette frise seulement : six appartenances de périodes au total. Ses autres usages restent identiques.
- 53 événements, dont 21 repris du catalogue existant. Aucun nouvel événement ni doublon de fiche créé.
- Dix nouveaux accès et cinq accès déplacés vers la phase pertinente ; les huit destinations d’origine restent accessibles, soit dix-huit accès sortants.
- La dernière phase se termine par `TODAY` : le cadrage va désormais jusqu’à aujourd’hui.

Les cinq phases sont un découpage éditorial de lecture, et non des entités historiographiques universelles. Elles n’ont ni Q-id ni titre Wikipédia attribué artificiellement. Les dates précises servant de bornes sont l’ouverture des États généraux, la seconde abdication de Napoléon, le début de la Première Guerre mondiale, la capitulation du Japon et la dissolution de l’URSS. Les descriptions sont disponibles en français et en anglais. Ces périodes de cadrage sont `non_thematic=true`, sans tag thématique ; la catégorie historique existante `CAT_HIST` leur est associée.

## Jalons repris

Déclaration des droits de l’homme et du citoyen, indépendance d’Haïti, congrès de Vienne, ligne Liverpool–Manchester, révolution de février 1848, abolition de l’esclavage en France, canal de Suez, conférence de Berlin, Cinématographe, révolution d’Octobre, traité de Versailles, partition des Indes, proclamation de la République populaire de Chine, Bandung, traité de Rome, Gagarine, Apollo 11, Civil Rights Act, premier choc pétrolier, disparition de l’URSS et faillite de Lehman Brothers.

Les faits, descriptions, dates, identifiants et tags de toutes ces fiches partagées sont inchangés. Apollo 11 conserve sa date de lancement et son nom de mission ; il n’a pas été renommé en premier pas sur la Lune. Les événements retenus comme nouveaux repères et neuf événements déjà présents (ONU, droits humains, Web, climat, santé, Bretton Woods) sont majeurs dans cette frise, pour rester visibles dans « L’essentiel ». Les importances des autres frises sont conservées. Aucun tag thématique n’a été ajouté à cette frise définie par une époque.

## Relations

Cinq accès existants ont été déplacés depuis la racine : Révolutions industrielles vers la phase 1815–1914 ; Guerres modernes vers 1914–1945 ; Conquête spatiale et Décolonisation vers 1945–1991 ; Climat vers 1991–aujourd’hui. Les Régimes politiques français et les États-Unis restent des récits transversaux à la racine. L’accès initial à l’Âge des révolutions depuis la Révolution française est conservé.

Nouveaux accès : Âge des révolutions et Napoléon depuis la première phase ; Empire britannique depuis la deuxième ; Guerre froide depuis la quatrième ; Techniques depuis la cinquième. Les deux guerres mondiales ouvrent leurs récits depuis leurs événements ; l’abolition de 1848 ouvre l’Esclavage, la partition ouvre l’Inde, et la proclamation de 1949 ouvre la Chine. Ces accès restent des badges explicites : aucune période chapeau ni copie des subdivisions des récits détaillés n’a été ajoutée.

## Sources de cadrage

- [Assemblée nationale, dates de fonction de Napoléon](https://www.assemblee-nationale.fr/gouv_parl/fiches_personnalites/Bonaparte.asp) et [archives de l’abdication du 22 juin 1815](https://www2.assemblee-nationale.fr/static/evenements/Napoleon_2021.pdf).
- [Réseau Canopé, chronologie de la Première Guerre mondiale](https://cdn.reseau-canope.fr/archivage/valid/136004/136004-17448-22629.pdf).
- [National Archives, acte de capitulation du Japon](https://www.archives.gov/milestone-documents/surrender-of-japan).
- [Nations unies, historique](https://www.un.org/en/about-us/history-of-the-un) et [décolonisation](https://www.un.org/dppa/decolonization/en/node/644).
- [Sénat, disparition de l’URSS](https://www.senat.fr/rap/1993-1994/i1993_1994_0567.pdf).
- [Parlement européen, traités de Rome](https://www.europarl.europa.eu/about-parliament/en/in-the-past/the-parliament-and-the-treaties/treaty-of-rome), [Élysée, déclaration de 1789](https://www.elysee.fr/la-presidence/la-declaration-des-droits-de-l-homme-et-du-citoyen), [Commission bancaire, crise de 2008](https://acpr.banque-france.fr/system/files/2025-03/2008_rapport_annuel_commission_bancaire.pdf).

Les événements sélectionnés proviennent du catalogue déjà audité ; ce lot n’est pas une nouvelle vérification scientifique ou historique exhaustive de chacune de leurs fiches.

## Vérifications

Répétition sur PostgreSQL 17.11 local jetable, avec baseline, contraintes et triggers réels, et une doublure Auth anonymisée : application complète, cinq racines et 53 événements ; conservation des destinations initiales ; lecture publique sous RLS ; double application refusée ; retour arrière refusé si une phase est réutilisée ailleurs ; retour arrière exact hors `updated_at` ; refus d’un état périmé sans insertion partielle.

La première tentative distante a été intégralement annulée par le contrôle de la coordonnée numérique de Vostok 1 : la conversion JSON en nombre JavaScript ne conserve pas tous les chiffres d’un `numeric` PostgreSQL. Le contrôle compare désormais les coordonnées à la précision `double precision` du transport, tout en comparant exactement les dates texte et horodatages typés. Aucune coordonnée existante n’a été réécrite. Version finale revérifiée localement avant application.

Après application distante : cinq nouvelles fiches de périodes, 21 nouvelles appartenances d’événements, une modification de parent local, neuf importances propres à la frise, cinq déplacements d’accès et dix ajouts. Aucune suppression ; aucune fiche événementielle ni période préexistante modifiée ; aucun changement d’autre frise. Les nouvelles fiches, appartenances et relations correspondent au lot JSON. Zéro accès orphelin.

Sur le site public : cinq phases visibles à l’ouverture sur une seule ligne, borne « Aujourd’hui », repères politiques et sociaux dans « L’essentiel », entrée dans Guerre froide et décolonisations et ses trois accès vers Guerre froide, Conquête spatiale et Décolonisation. [Capture de l’ouverture](2026-11-10-contemporain-overview.png).

## Fichiers

- [État avant intervention](2026-11-10-contemporain-before.json), sans identifiant de compte propriétaire.
- [Données et sources](../database/data/20261110_epoque_contemporaine.json).
- [SQL appliqué](../database/data/20261110_epoque_contemporaine.sql), à ne pas rejouer.
- [Retour arrière](../database/data/20261110_epoque_contemporaine_rollback.sql), testé localement et non appliqué à distance. Refuse les phases réutilisées et les relations modifiées ; ne rétablit pas les anciens horodatages `updated_at`.
