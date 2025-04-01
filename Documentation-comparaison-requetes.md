Ce que je veux
Si on a qu'un seul start time et qu'un seul end time
- On capte la localisation
- On créé un objet : Title + Start time + End time + Localisation

Si on a plusieurs start time et plusieurs end time
- on capte la localisation pour chaque start time
- on capte la localisation pour chaque end time
- On regroupe les localisations commune pour associer les sart time et les end time
- On créé un objet part localisation commune : Title + Start time + End time + Localisation

Est ce que c'est possible ? ne me propose pas de modifications tout de suite

Je comprends votre besoin. Analysons la situation actuelle et ce que vous souhaitez :
Situation actuelle :
Pour une période simple (ex: Jurassique) :
Un seul objet avec dates globales et localisation globale
Structure simple et claire
Pour une période complexe (ex: Âge du Bronze) :
Un objet principal avec dates globales
Un tableau temporalLocations qui regroupe les dates et localisations
Les localisations sont groupées par dates communes
Ce que vous voulez :
Pour une période simple :
Un seul objet avec : Titre + Dates + Localisation
Structure identique à l'actuelle
Pour une période complexe :
Au lieu d'avoir un objet principal + tableau de temporalLocations
Vous voulez créer plusieurs objets distincts
Chaque objet correspond à une combinaison unique de dates et localisations communes
Chaque objet aura : Titre + Dates spécifiques + Localisations spécifiques
C'est tout à fait possible de restructurer les données de cette manière. Cela permettrait d'avoir une structure plus uniforme, où chaque objet représente une période unique avec ses dates et localisations spécifiques.
Voulez-vous que je propose une solution pour implémenter cette restructuration ?