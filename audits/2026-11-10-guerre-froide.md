# Guerre froide (12) — révision du 10 novembre 2026

**Appliqué et relu en base.** La frise publique passait de 1947 à 1991 en neuf événements sans période. Le nouveau récit commence à Yalta comme prologue : les Alliés y coopèrent encore. La borne finale reste la dissolution de l’URSS.

| Contenu de la frise | Avant | Après |
| --- | ---: | ---: |
| Phases à la racine | 0 | 4 |
| Sous-périodes | 0 | 3 |
| Événements | 9 | 32 |
| Points d’entrée explicites sortants / entrants | 1 / 4 | 6 / 5 |

La signature du pacte de Varsovie, l’Acte final d’Helsinki et l’arrivée de Gorbatchev délimitent quatre phases éditoriales. Le blocus de Berlin puis la guerre de Corée sont rattachés à la première ; la guerre du Vietnam à la deuxième. Les mouvements non alignés sont présents à Bandung et à Belgrade ; les trajectoires africaines apparaissent à Suez, au Congo et en Angola. La frise compte dix événements et deux périodes repris du catalogue, en plus des neuf événements conservés. Treize événements, le blocus et les quatre phases ont été créés en français et en anglais. Les dates des fiches partagées sont conservées.

La description de Cuba précise ce qui se produit à la date portée par la fiche. Pour Helsinki, la qualification de traité est remplacée par celle d’engagement politique ; pour le mur, l’ouverture des passages est distinguée de la démolition. Ce sont les trois seules descriptions de faits partagés modifiées.

Depuis Yalta, Truman, Spoutnik, Belgrade et Nixon en Chine, cinq nouveaux liens ouvrent les récits de la Seconde Guerre mondiale, des États-Unis, de la conquête spatiale, de la décolonisation et de la Chine. Un sixième ouvre la guerre froide depuis la période « Course à l’espace » de la frise spatiale. Conservation des cinq points d’entrée préexistants, y compris celui de l’Époque contemporaine, et de l’ancre historique des Guerres modernes.

## Sources de vérification

- Constitution des blocs : [discours de Truman](https://history.state.gov/milestones/1945-1952/truman-doctrine), [fondation de l’OTAN](https://history.state.gov/milestones/1945-1952/nato), [blocus selon la Ville de Berlin](https://www.berlin.de/rbmskzl/politik/senat/buergermeistergalerie/artikel.4559.php), [chronologie de Berlin et du pacte de Varsovie](https://www.nato.int/nato_static_fl2014/assets/pdf/pdf_history/20161020_Berlin_Timeline_1945-1991_HR.pdf).
- Crises et détente : [dépêche de Budapest](https://history.state.gov/historicaldocuments/frus1955-57v25/d98), [entrée des troupes en Tchécoslovaquie](https://history.state.gov/historicaldocuments/frus1964-68v14/d289), [accord SALT à Moscou](https://history.state.gov/historicaldocuments/frus1969-76v32/d317), [nature et contenu de l’Acte final d’Helsinki, OSCE](https://www.osce.org/secretariat/52566).
- Dernières décennies : [intervention en Afghanistan](https://history.state.gov/milestones/1977-1980/soviet-invasion-afghanistan), [retrait suivi par l’ONU](https://peacekeeping.un.org/sites/default/files/past/ungomap/background.html), [traité FNI, bibliothèque présidentielle Reagan](https://www.reaganlibrary.gov/archives/speech/statement-assistant-president-press-relations-fitzwater-soviet-united-states-4), [ouverture à Bornholmer Straße](https://www.stiftung-berliner-mauer.de/en/node/2007), [chronologie de l’unité allemande](https://www.bundesstiftung-aufarbeitung.de/de/recherche/dossiers/198990-friedliche-revolution-und-deutsche-einheit/chronik).
- Identifiants Wikidata et titres d’articles contrôlés sur les sitelinks français et anglais pour les entités correspondantes. Aucun lien de personne, de bâtiment ou d’alliance attribué à un événement qui n’en est qu’un jalon.

## Validation et fichiers

[État initial ciblé](2026-11-10-guerre-froide-before.json), [contenu bilingue](../database/data/20261110_guerre_froide.json), [transaction](../database/data/20261110_guerre_froide.sql) et [inverse](../database/data/20261110_guerre_froide_rollback.sql). Sur PostgreSQL 17 local : application, refus d’une seconde application, refus de l’inverse après réutilisation d’une fiche, restauration de l’état initial hors dates de modification et refus d’un état initial périmé. L’inverse n’a pas été exécuté en production.

Après application, relecture distante : sept périodes, dont quatre racines, 32 événements dont 27 majeurs, onze points d’entrée touchant la frise ; les cinq anciens gardent leurs identifiants et emplacements. Vérification du contenu créé et des trois descriptions ; contrôle des ancres dans la transaction. L’ouverture directe du site public affiche les quatre phases avec « L’essentiel » ; le bouton « Étendre » révèle les trois sous-périodes. [Capture de la vue étendue](2026-11-10-guerre-froide.png).
