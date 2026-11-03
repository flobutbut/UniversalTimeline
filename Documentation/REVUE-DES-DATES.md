# Revue des dates — 3 novembre 2026

Conversion, appliquée en production, des 284 dates écrites en horodatage ISO (`…T00:00:00Z`) vers les formats canoniques décrits dans [CREATION-DE-FRISES.md](CREATION-DE-FRISES.md), section 5. Chaque conversion était protégée par la valeur précédente ; les années stockées ont été recalculées ensuite avec `temporal.ts`.

## Ce qui a été corrigé

- **Années av. J.-C. décalées d'un an** (44 dates) : écrites `-N` selon la convention de l'API JSON de Wikidata (sans an 0), elles étaient lues par le moteur en année astronomique et s'affichaient un an trop tôt. Elles deviennent `N BCE`. Marathon, connue au jour près, devient `-0489-08-12` (12 août 490 av. J.-C.).
- **Dates déjà corrigées à la main** (6) : Rome (21 avril 753), César (15 mars 44), Actium (2 septembre 31), début de l'Empire et du Haut-Empire (27 av. J.-C.), Khéops (2560 av. J.-C.). Leur valeur est conservée, au format canonique.
- **Préhistoire au-delà de 20 000 ans** (4) : exprimée en milliers d'années (`K30`, `K40`, `K50`), comme dans les sources.
- **Temps profond** (113 dates) : conversion mécanique vers `G`, `M` ou `K`, qui comptent depuis aujourd'hui ; l'écart de 2 026 ans dû au comptage depuis l'an 0 disparaît. Les six ères primordiales de la frise Big Bang gardent leur échelonnement d'un an dans les années stockées.
- **Dates après J.-C.** (114) : heure retirée ; les 14 dates au 1er janvier, qui étaient des années seules, passent au format `AAAA` (fin du « 1 janvier » parasite). La Peste noire passe au mois (`1347-10`). Apollo 11 garde son heure réelle.

## Décisions au cas par cas

| Fiche | Borne | Avant | Après | Écart (ans) | Motif |
| --- | --- | --- | --- | --- | --- |
| Extinction de l'Holocène | date | `-10000-01-01T00:00:00Z` | `10000 BCE` | +1.0 | début conventionnel de l’extinction de l’Holocène |
| Homme de Denisova | end | `-30000-01-01T00:00:00Z` | `K30` | +2026.2 | disparition des Dénisoviens, vers 30 000 ans |
| Premières peintures pariétales | date | `-38000-01-01T00:00:00Z` | `K40` | +26.0 | premières peintures pariétales, vers 40 000 ans |
| Homo neanderthalensis | end | `-40000-01-01T00:00:00Z` | `K40` | +2026.0 | disparition de Néandertal, vers 40 000 ans |
| Homo floresiensis | end | `-50000-01-01T00:00:00Z` | `K50` | +2025.8 | disparition d’Homo floresiensis, vers 50 000 ans |
| Naissance de Jésus | date | `-0004-01-01T00:00:00Z` | `4 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Empire romain | start | `-0026-01-01T00:00:00Z` | `27 BCE` | 0.0 | déjà corrigée : −0026 astronomique = 27 av. J.-C. (Auguste) |
| Haut-Empire romain | start | `-0026-01-01T00:00:00Z` | `27 BCE` | 0.0 | déjà corrigée : 27 av. J.-C. (Auguste) |
| République romaine | end | `-0027-01-01T00:00:00Z` | `27 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période ptolémaïque | end | `-0030-01-01T00:00:00Z` | `30 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Bataille d'Actium | date | `-0030-09-02T00:00:00Z` | `-0030-09-02` | 0.0 | déjà corrigée : 2 septembre 31 av. J.-C., heure retirée |
| Antiquité grecque | end | `-0031-01-01T00:00:00Z` | `31 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période hellénistique | end | `-0031-01-01T00:00:00Z` | `31 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Assassinat de Jules César | date | `-0043-03-15T00:00:00Z` | `-0043-03-15` | 0.0 | déjà corrigée : ides de mars 44 av. J.-C., heure retirée |
| Période classique grecque | end | `-0323-01-01T00:00:00Z` | `323 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période hellénistique | start | `-0323-01-01T00:00:00Z` | `323 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période tardive de l'Égypte antique | end | `-0332-01-01T00:00:00Z` | `332 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période ptolémaïque | start | `-0332-01-01T00:00:00Z` | `332 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période classique grecque | start | `-0480-01-01T00:00:00Z` | `480 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période archaïque grecque | end | `-0480-01-01T00:00:00Z` | `480 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Bataille de Marathon | date | `-0490-08-12T00:00:00Z` | `-0489-08-12` | +1.0 | 490 av. J.-C. écrit −0490 (convention Wikidata) : affichait 491 |
| Siddhartha Gautama (Bouddha) | date | `-0500-01-01T00:00:00Z` | `500 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Royauté romaine | end | `-0509-01-01T00:00:00Z` | `509 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| République romaine | start | `-0509-01-01T00:00:00Z` | `509 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Troisième Période intermédiaire | end | `-0664-01-01T00:00:00Z` | `664 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période tardive de l'Égypte antique | start | `-0664-01-01T00:00:00Z` | `664 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Fondation de Rome | date | `-0752-04-21T00:00:00Z` | `-0752-04-21` | 0.0 | déjà corrigée à la main : 21 avril 753 av. J.-C. (année astronomique −752), heure retirée |
| Royauté romaine | start | `-0753-01-01T00:00:00Z` | `753 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Antiquité romaine | start | `-0753-01-01T00:00:00Z` | `753 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période archaïque grecque | start | `-0800-01-01T00:00:00Z` | `800 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Âge sombre grec | end | `-0800-01-01T00:00:00Z` | `800 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Troisième Période intermédiaire | start | `-1069-01-01T00:00:00Z` | `1069 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Nouvel Empire égyptien | end | `-1069-01-01T00:00:00Z` | `1069 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Âge sombre grec | start | `-1100-01-01T00:00:00Z` | `1100 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période mycénienne | end | `-1100-01-01T00:00:00Z` | `1100 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Nouvel Empire égyptien | start | `-1550-01-01T00:00:00Z` | `1550 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Deuxième Période intermédiaire | end | `-1550-01-01T00:00:00Z` | `1550 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Antiquité grecque | start | `-1600-01-01T00:00:00Z` | `1600 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période mycénienne | start | `-1600-01-01T00:00:00Z` | `1600 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Deuxième Période intermédiaire | start | `-1650-01-01T00:00:00Z` | `1650 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Moyen Empire égyptien | end | `-1650-01-01T00:00:00Z` | `1650 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Code de Hammurabi | date | `-1754-01-01T00:00:00Z` | `1754 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Moyen Empire égyptien | start | `-2055-01-01T00:00:00Z` | `2055 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Première Période intermédiaire | end | `-2055-01-01T00:00:00Z` | `2055 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Ancien Empire égyptien | end | `-2181-01-01T00:00:00Z` | `2181 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Première Période intermédiaire | start | `-2181-01-01T00:00:00Z` | `2181 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Construction de la pyramide de Khéops | date | `-2559-01-01T00:00:00Z` | `2560 BCE` | 0.0 | déjà corrigée : −2559 astronomique = 2560 av. J.-C. |
| Période thinite | end | `-2686-01-01T00:00:00Z` | `2686 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Ancien Empire égyptien | start | `-2686-01-01T00:00:00Z` | `2686 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Période thinite | start | `-3100-01-01T00:00:00Z` | `3100 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Égypte prédynastique | end | `-3100-01-01T00:00:00Z` | `3100 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Antiquité | start | `-3200-01-01T00:00:00Z` | `3200 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Invention de l'écriture | date | `-3200-01-01T00:00:00Z` | `3200 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Égypte prédynastique | start | `-5500-01-01T00:00:00Z` | `5500 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Débuts de l'agriculture | date | `-8000-01-01T00:00:00Z` | `8000 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Construction de Göbekli Tepe | date | `-9600-01-01T00:00:00Z` | `9600 BCE` | +1.0 | convention Wikidata (sans an 0) : affichait un an plus tôt |
| Peste Noire | date | `1347-10-01T00:00:00Z` | `1347-10` | 0.0 | arrivée à Messine en octobre 1347 : le jour n’est pas connu |
| Anthropocène | start | `-8000` | `8000 BCE` | +1.0 | année signée −8000 lue comme 8001 av. J.-C. |
