# Performance et corrections du catalogue — 2 novembre 2026

## Chargement des frises

Les en-têtes de production situaient l’API à Washington (`iad1`) alors que Supabase est à Francfort (`eu-central-1`). `vercel.json` fixe désormais les fonctions à `fra1`, conformément à la [configuration régionale Vercel](https://vercel.com/docs/functions/configuring-functions/region). Le frontend reste distribué par le CDN.

Trois échantillons publics avant optimisation, en millisecondes, via `fetch` depuis le même environnement :

| Appel | Premier relevé | Relevé suivant | Troisième relevé | Médiane |
| --- | ---: | ---: | ---: | ---: |
| `/api/stories` | 2189 | 1439 | 1448 | 1448 |
| `/api/stories/1` | 4845 | 2544 | 2461 | 2544 |
| `/api/stories/1/periods` | 1324 | 605 | 606 | 606 |
| `/api/stories/1/events` | 1324 | 605 | 606 | 606 |

Le premier relevé peut inclure un démarrage à froid. Trois appels ne constituent pas un percentile de charge ni une mesure du rendu navigateur. Pour reproduire l’échantillon après déploiement : `node scripts/benchmark-api.mjs`. Une origine de prévisualisation ou locale peut être passée en argument.

Le détail d’une frise provient maintenant d’une seule requête SQL, avec catégories, parents locaux, enfants, ancres et autres frises partageant ses contenus. Auparavant, ses cinq requêtes ouvraient chacune une transaction et réinstallaient le rôle et les claims. Le nouveau détail utilise une transaction et un instantané RLS. La liste des frises calcule ses bornes à partir des aperçus déjà chargés, sans relire les mêmes appartenances.

La timeline partage ce détail dans le cache du compte courant. Son ouverture effectue deux appels parallèles (liste et détail), puis un seul détail pour une frise encore inconnue. Les badges, le nombre de frises associées, la sélection d’un événement et l’exploration locale réutilisent les données. Le chargement initial précédent pouvait effectuer cinq appels, puis deux lectures supplémentaires à chaque sélection d’événement.

Les réponses restent `no-store`. Aucun cache partagé entre comptes n’est ajouté. La réinitialisation du store invalide les lectures anciennes, et une mutation invalide aussi les instantanés dont les passerelles peuvent avoir changé. Les tests PostgreSQL vérifient les résultats anonymes, ceux du propriétaire et ceux d’un autre compte.

Les événements situés exactement sur une borne sont comparés avec les dates textuelles reconnues à un même instant de référence. Des coordonnées BP enregistrées à des moments différents ne doivent pas exclure un événement pourtant daté du même jour que la borne.

## Textes et sources

Les 17 descriptions françaises de périodes et 29 descriptions françaises d’événements manquantes ont été complétées, ainsi que les 43 versions anglaises absentes. Les textes précisent les incertitudes cosmologiques, géologiques et archéologiques. Les versions déjà remplies sont conservées, sauf corrections explicitement recensées, notamment la confusion entre les doctrines Jdanov de 1946 et de 1947 et la borne occidentale de l’Empire romain.

Les textes et leurs sources sont versionnés dans [le manifeste d’enrichissement](../database/data/20261102_catalogue_enrichment.json). Les corrections de faits, anciennes valeurs attendues et décisions de navigation sont détaillées dans [le manifeste des relations](../database/data/20261102_catalogue_relations.json).

Les libellés de la lignée humaine et de la maîtrise du feu évitent de confondre une famille entière avec une divergence évolutive, ou un usage répandu avec une première occurrence certaine. Les mammaliaformes disposent d’un repère approximatif du Trias supérieur. Les âges approximatifs humains utilisent `K300` et `K400` ; trois dates romaines sont corrigées conformément à la numérotation astronomique ISO avec année zéro.

## Relations réparées

| Signalement de l’audit | Correction |
| --- | --- |
| Ancre invalide d’Époque moderne | Le parent Moyen Âge est conservé ; l’ancre devient sa période Moyen Âge, réellement présente. |
| Conquête spatiale | Le parent Époque moderne demandé par l’utilisateur est rétabli. Histoire contemporaine, ajoutée à cette frise, sert d’ancre explicite. |
| Parcours publics séparés | Moyen Âge est relié à Antiquité ; Guerres modernes à Histoire contemporaine ; Renaissance au Moyen Âge tardif. Les 16 frises publiques rejoignent Univers moderne. |
| Andromède, Anthropocène, Histoire contemporaine, Révolution française isolés | Classements respectifs dans Univers moderne, Histoire géologique de la Terre et le parcours Époque moderne. Le statut informel de l’Anthropocène est explicité. |
| Renaissance peu remplie et sans catégorie | Catégories Histoire et Art, plus trois événements existants : imprimerie, Constantinople et arrivée de Colomb. |
| Périodes partagées sans passerelle | Les badges proposent aussi les frises lisibles qui contiennent la période, avec déduplication. |

Les onze associations temporelles ont été reprises :

- Les deux signalements portant sur une date identique à une borne (Armistice et début de la Seconde Guerre mondiale dans Guerres modernes) sont traités par la comparaison commune des dates.
- L’assassinat de François-Ferdinand reste dans les deux frises concernées ; une période de contexte du 28 juin au 28 juillet 1914 le rend accessible.
- Les trois événements antérieurs à l’Empire romain disposent d’un contexte comprenant Antiquité romaine, Royauté et République, tout en conservant les périodes impériales.
- Les bornes conventionnelles concernées sont alignées sur le 4 septembre 476, le 12 octobre 1492 et le 26 décembre 1991. Il s’agit des repères éditoriaux de ces parcours, sans imposer une inclusion chronologique aux frises enfants.
- Le jalon des premiers primates quitte Genre Homo, mais reste dans les frises de la vie et de la géologie.

## Application et vérifications

Le [lot SQL](../database/data/20261102_catalogue_enrichment.sql) a été appliqué au projet Supabase Universal-Timeline. Il ne modifie aucun schéma, rôle ou droit d’accès. Il verrouille les fiches concernées, vérifie les anciennes valeurs, préserve les descriptions remplies entre-temps et refuse les changements factuels concurrents. Il est réexécutable sans doublons.

Un [retour arrière contrôlé](../database/data/20261102_catalogue_rollback.sql) est conservé. Il refuse les modifications ultérieures de contenu ou de relations ; les dates d’édition restent celles du retour arrière. Les identifiants internes des ancres recréées peuvent changer. Ces deux fichiers sont des corrections d’un catalogue existant, pas des migrations à rejouer sur une base vide.

La copie locale du catalogue public a servi à vérifier l’application, la réexécution, le retour arrière, le refus d’une modification factuelle concurrente et la préservation d’un texte déjà rempli. Les propriétaires utilisés dans ces essais sont fictifs.

Contrôle après application réelle : **114 périodes, 104 événements, 16 frises publiques, 152 appartenances de périodes et 159 appartenances d’événements**. Aucune description FR ou EN manquante, aucun parent local absent, aucun cycle, aucune ancre publique invalide et aucun événement hors de toutes les périodes de sa frise selon la comparaison temporelle commune. L’analyseur de sécurité Supabase ne signale aucun avertissement.

Les autres dates et liens Wikidata historiques ne font pas l’objet d’une conversion générale. Les périodes cosmologiques subsecondes restent limitées par la précision des dates du catalogue.
