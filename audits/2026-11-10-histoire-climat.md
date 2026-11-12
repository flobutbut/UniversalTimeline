# Histoire du climat — enrichissement du 10 novembre 2026

Enrichissement **appliqué** au projet Supabase Universal-Timeline (`ftubzndxivponqoihrsu`), frise 23, à la demande de compléter ses données et ses relations. Guide suivi : `Documentation/CREATION-DE-FRISES.md` et modèle de relations local à chaque frise. Aucun changement de schéma ni de code applicatif.

## Résultat

| Mesure | Avant | Après |
| --- | ---: | ---: |
| Périodes de la frise | 18 | 25 |
| Événements de la frise | 12 | 32 |
| Points d’entrée entrants ou sortants | 8 | 22 |

Cinq périodes et onze événements créés dans le catalogue ; deux périodes et neuf événements existants réutilisés. Dix périodes à la racine ; subdivisions conservées sous le Pléistocène et l’Holocène, minimum de Maunder sous le Petit Âge glaciaire, Grande accélération sous le réchauffement actuel. Aucun chapeau de navigation ajouté.

## Périodes

- Optimum climatique du Miocène moyen : environ 17–14,7 Ma.
- Période chaude du Pliocène moyen : environ 3,3–3,0 Ma.
- Interstade de Bølling-Allerød : environ 14 700 ans à 10 900 av. J.-C., sous le Pléistocène.
- Refroidissement de 8200 ans avant le présent : environ 6300–6140 av. J.-C., sous l’Holocène.
- Minimum de Maunder : 1645–1715, sous le Petit Âge glaciaire.
- Reprises : épisode pluvial du Carnien (234–232 Ma) et Grande accélération (1950–aujourd’hui).

Les coordonnées numériques des nouvelles fiches ont été calculées par `storedYearsBeforePresent()` à un instant commun. Les comparaisons de bornes utilisent `comparableYearsBeforePresent()` ; aucune date de fiche partagée n’a été recalculée pour la mise en page. Les dates AP des publications scientifiques sont référées à 1950 : le refroidissement de 8200 AP est traduit en années civiles ; les bornes de Bølling-Allerød sont des repères arrondis compatibles avec le Dryas récent déjà présent, sans prétendre dater ses transitions à l’année près.

Les descriptions partagées de l’Éémien et de l’optimum holocène ont été corrigées : référence préindustrielle plutôt qu’un « aujourd’hui » mobile, caractère régional et absence de maximum thermique mondial synchrone pour l’Holocène. Leurs dates, identifiants et appartenances restent identiques.

## Événements

Nouveaux : Fourier (1824), Foote (1856), Tyndall (1859), Callendar (avril 1938), synthèse de Milanković (1941), modèle de Manabe et Wetherald (mai 1967), confirmation des rythmes orbitaux par les sédiments marins (1976), premier rapport du GIEC (1990), adoption de la CCNUCC (9 mai 1992), volet physique du sixième rapport du GIEC (9 août 2021), première année civile à plus de +1,5 °C selon Copernicus (2024).

Repris sans nouvelle fiche : Arrhenius, hiver volcanique de 536, Samalas, Laki, Pinatubo, Chicxulub, extinction Permien-Trias, extinction Ordovicien-Silurien, effondrement de la forêt tropicale du Carbonifère.

Les découvertes scientifiques et les principaux jalons du récit sont majeurs dans cette frise. La prévisualisation a révélé que l’événement ordovicien restait caché dans « L’essentiel » ; lui et le Pinatubo ont donc été marqués majeurs après l’insertion initiale. Le fichier SQL et son inverse représentent l’état final, revérifié localement. L’ouverture montre 28 événements sur 32 ; le filtre « Tous les sujets » permet d’afficher aussi les autres événements de contexte. Les importances des autres frises sont préservées.

Le texte sur 2024 distingue explicitement une moyenne annuelle du seuil de Paris à long terme. La CCNUCC est datée de son adoption à New York, sans la confondre avec son ouverture à la signature à Rio. Foote est décrite par son expérience au soleil, distincte de la mesure du rayonnement thermique par Tyndall. Le minimum solaire n’est pas présenté comme la cause unique du Petit Âge glaciaire.

## Accès ajoutés

| Origine | Emplacement | Destination |
| --- | --- | --- |
| Climat | Glaciation ordovicienne | Cinq grandes extinctions |
| Cinq grandes extinctions | Glaciation ordovicienne | Climat |
| Climat | Extinction Permien-Trias | Cinq grandes extinctions |
| Cinq grandes extinctions | Extinction Permien-Trias | Climat |
| Climat | Épisode pluvial du Carnien | Temps des dinosaures |
| Climat | Pinatubo | Histoire géologique |
| Révolutions industrielles | Réchauffement actuel | Climat |
| Climat | Grande accélération | Révolutions industrielles |
| Climat | Optimum médiéval | Moyen Âge |
| Climat | Petit Âge glaciaire | Époque moderne |
| Moyen Âge | Racine | Climat |
| Époque moderne | Racine | Climat |
| Époque contemporaine | Racine | Climat |
| Révolutions industrielles | Arrhenius | Climat |

Les huit accès existants sont préservés, notamment depuis la Géologie et le Tambora, ainsi que les liens avec Néolithique et âges des métaux et les Migrations. Les accès racine n’imposent pas de période commune aux récits. Aucun parent historique, propriétaire ou statut public n’a changé.

## Sources et identité

Les sources de chaque nouvelle fiche et leurs valeurs exactes sont conservées dans [le lot JSON](../database/data/20261110_histoire_climat.json).

- [GIEC, archives paléoclimatiques AR5](https://archive.ipcc.ch/pdf/assessment-report/ar5/wg1/WG1AR5_Chapter05_FINAL.pdf) et [AR6, état du système climatique](https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-2/) : phases anciennes, Pliocène, interglaciaires et hétérogénéité holocène.
- [Middle Miocene Climatic Optimum, étude AGU](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025GL118302) : bornes 17–14,7 Ma.
- [Climate of the Past, événement de 8,2 ka](https://cp.copernicus.org/articles/10/1887/2014/cp-10-1887-2014.html) : durée et circulation océanique.
- [NASA, minimum de Maunder](https://science.nasa.gov/earth/climate-change/there-is-no-impending-mini-ice-age/) : rôle solaire et causes multiples du refroidissement.
- [GIEC, histoire de l’effet de serre](https://archive.ipcc.ch/publications_and_data/ar4/wg1/en/ch1s1-4.html), [APS, Foote](https://www.aps.org/apsnews/2023/07/carbon-dioxide-atmosphere-eunice-foote), [article de Callendar](https://rmets.onlinelibrary.wiley.com/doi/abs/10.1002/qj.49706427503), [EGU, Milanković](https://www.egu.eu/egs/milankovic.htm), [article de Manabe et Wetherald](https://www.gfdl.noaa.gov/bibliography/related_files/sm6701.pdf), [Lamont-Doherty, archives orbitales](https://news.climate.columbia.edu/2021/07/09/lamont-doherty-earth-observatory-milestones-in-climate-studies/) : découvertes scientifiques.
- [GIEC, historique des rapports](https://www.ipcc.ch/about/history/), [CCNUCC, adoption de la Convention](https://unfccc.int/process-and-meetings/united-nations-framework-convention-on-climate-change), [Copernicus, rapport physique AR6](https://climate.copernicus.eu/support-ipcc-wg1-6th-assessment-report) et [bilan 2024](https://climate.copernicus.eu/global-climate-highlights-2024) : jalons institutionnels et observation annuelle.
- [USGS, volcanisme et climat](https://www.usgs.gov/programs/VHP/volcanoes-can-affect-climate) et [étude sur l’épisode carnien](https://pmc.ncbi.nlm.nih.gov/articles/PMC7494334/) : sélection des fiches de contexte réutilisées.

Les Q-id et titres Wikipédia ont été lus dans l’API publique de Wikidata par titres d’articles anglais, puis comparés au catalogue existant. Aucun Q-id de personne n’a été attribué à un événement scientifique. Les liens Wikipédia de Fourier, Foote, Tyndall, Callendar, Milanković et AR6 ouvrent des articles de contexte ; les identités de ces événements restent sans Q-id. Bølling-Allerød conserve seulement l’article anglais vérifié et aucun Q-id : l’élément retourné associait aussi le Tardiglaciaire français, de portée différente. Les événements sans article propre peuvent rester sans lien Wikipédia.

## Validation

Répétition sur PostgreSQL 17.11 local jetable, avec la baseline réelle, contraintes et triggers actifs, et une doublure Auth anonymisée :

1. Application complète, 25 périodes et 32 événements.
2. Double application refusée sans modification.
3. Retour arrière refusé si une nouvelle fiche a été réutilisée dans une autre frise.
4. Retour arrière exact hors horodatages de modification.
5. Lot périmé refusé sans insertion partielle.

Après application distante : comparaison de toutes les nouvelles fiches et relations avec le lot ; aucune suppression ; seules la description de la frise, les deux descriptions de périodes et les importances propres à la frise 23 ont changé parmi les anciennes lignes. Les tags préexistants, autres appartenances, dates et autres frises restent identiques. Cinq catégories Géologie et onze catégories Histoire posées parmi les catégories existantes ; cinq tags de période et vingt et un tags d’événement ajoutés. Zéro point d’entrée orphelin.

Vérification du site public : nouvelles périodes à la racine, filtre « L’essentiel », événements scientifiques, ouverture Climat → Glaciation ordovicienne → Cinq grandes extinctions et retour au contexte d’origine. Voir les captures associées à cet audit. Aucun déploiement applicatif nécessaire.

## Fichiers et annulation

- [État avant intervention](2026-11-10-climat-before.json) : extrait ciblé du catalogue et de ses relations, sans identifiant de compte propriétaire.
- [Contenu et sources](../database/data/20261110_histoire_climat.json).
- [Lot SQL final](../database/data/20261110_histoire_climat.sql), déjà appliqué : ne pas rejouer.
- [Retour arrière](../database/data/20261110_histoire_climat_rollback.sql), préparé et validé localement, non exécuté à distance. Il refuse les contenus ou relations modifiés depuis ce lot, et les nouvelles fiches réutilisées ailleurs ; il ne rétablit pas les anciens `updated_at`.

La frise reste une synthèse : aucun catalogue ne peut épuiser tous les épisodes climatiques. Pistes de détail ultérieures : mousson et Sahara vert, événements de Heinrich et Dansgaard-Oeschger, archives glaciaires et paléoclimatologie, histoire des COP après Paris.
