# Prompts d’audit et de correction (Cursor)

*Stack : Vue 3 Composition API · Pinia · Vite · Supabase*

**Prompts début / fin de session** : `Documentation/CURSOR_SESSION_PROMPTING.md` (§ 1 amorçage, § 2 clôture).

---

## Convention de nommage des fichiers d’audit

```
audits/
  AUDIT_imports.md           ← résultat 1A
  AUDIT_composables.md       ← résultat 1B
  AUDIT_doublons.md          ← résultat 1C
  AUDIT_code_mort.md         ← résultat 1D
  AUDIT_css.md               ← résultats 3A et 3B
  AUDIT_doc_technique.md     ← résultat 5A bis
```

Avant une correction, demander à l’agent de **lire** le fichier d’audit correspondant dans `audits/`.

---

## Règles communes (audits et corrections)

- **Audit d’abord** : prompts 1A–1D et audits CSS (3A–3B) en lecture seule dans `audits/*.md` ; valider les résultats avant corrections ciblées.
- **Corrections** : relire l’audit concerné au lieu de refaire l’analyse.
- **Plan** : lorsque le prompt l’exige, l’agent présente uniquement le plan puis s’arrête.
- **⛔ STOP** : sans **« valide »** ou **« go »**, pas d’écriture ni d’enchaînement sur le point suivant.
- **Diff** : afficher le diff (ou le bloc modifié) avant écriture lorsque le prompt le prévoit ; **un fichier** (ou un cas) à la fois si le risque est élevé ; ne pas **réécrire un fichier en entier** sans nécessité ou demande explicite.
- **Suivi** : après correction confirmée, **✅** en début de ligne dans le fichier d’audit quand le prompt le prévoit.
- **2B / 2C** : remplacer les crochets `[NOM — issu du fichier d'audit]` par le contenu réel de `audits/`.
- `**audits/TODO_REFACTO.md`** : alimenté par la clôture de session (§ 2 du fichier session) ; à vider ou archiver en début de session de nettoyage dédiée.

---

## Étape 1 — Audit (lecture seule, aucune modification)

### ✅ 1A — Cartographie des imports inutilisés

```
Mode : audit uniquement — ne touche à aucun fichier source.

Parcoure tous les fichiers dans src/ (composants, composables, stores, lib, constants, views).

Pour chaque fichier, liste :
- Les imports déclarés mais jamais utilisés dans le fichier
- Les variables, fonctions ou refs déclarées mais jamais utilisées
- Les props déclarées mais jamais lues dans le template ou le script

Format de sortie :
FICHIER : src/FolderName/FileName.vue
  → Import inutilisé : useRoute (importé, jamais appelé)
  → Variable inutilisée : localCount (déclarée, jamais lue)

Écris le résultat complet dans audits/AUDIT_imports.md.
En-tête du fichier : date du jour + "Audit imports inutilisés".
Écrase le fichier s'il existe déjà.
Ne propose aucune correction. Confirme quand le fichier est écrit.
```

---

### ✅ 1B — Fonctions hors composables

```
Mode : audit uniquement — ne touche à aucun fichier source.

Parcoure tous les fichiers dans src/components/ et src/views/.

Identifie toutes les fonctions définies dans un <script setup> qui :
- Ne manipulent pas directement le DOM ou le template du composant
- Ne dépendent pas de refs locales au composant
- Pourraient être déplacées dans un composable (src/composables/) ou dans src/lib/

Format de sortie :
FICHIER : src/FolderName/FileName.vue
  → Fonction : formatDistance(d) — calcul pur, appartient à lib/formatUtils.js
  → Fonction : buildLabel(system) — logique partageable, appartient à un composable

Écris le résultat complet dans audits/AUDIT_composables.md.
En-tête du fichier : date du jour + "Audit fonctions hors composables".
Écrase le fichier s'il existe déjà.
Ne propose aucune correction. Confirme quand le fichier est écrit.
```

---

### ✅ 1C — Doublons entre fichiers

```
Mode : audit uniquement — ne touche à aucun fichier source.

Parcoure l'ensemble de src/. Cherche les fonctions ou blocs de logique qui font
la même chose dans plusieurs fichiers différents — même logique, noms différents,
ou copier-coller légèrement modifié.

Exemples typiques à détecter :
- Formatage de distances ou de dates recalculé dans plusieurs composants
- Requêtes Supabase identiques dans plusieurs stores ou composables
- Calculs de couleur ou de taille répétés dans plusieurs modules

Format de sortie :
DOUBLON détecté :
  → src/lib/formatUtils.js : formatDistance(d)
  → src/components/Example.vue : getDistanceLabel(d) (logique identique)
  Recommandation : consolider dans formatUtils.js

Écris le résultat complet dans audits/AUDIT_doublons.md.
En-tête du fichier : date du jour + "Audit doublons".
Écrase le fichier s'il existe déjà.
Ne propose aucune correction. Confirme quand le fichier est écrit.
```

---

### ✅ 1D — Composants legacy et code mort

```
Mode : audit uniquement — ne touche à aucun fichier source.

Vérifie :
Y a-t-il des fichiers dans src/ qui ne sont importés nulle part et ne sont pas des points d'entrée (main.ts, router/index.ts) ?

Format de sortie :
src/FolderName/FileName.vue
  → Importé dans : [aucun] → PEUT ÊTRE SUPPRIMÉ

Écris le résultat complet dans audits/AUDIT_code_mort.md.
En-tête du fichier : date du jour + "Audit code mort et legacy".
Écrase le fichier s'il existe déjà.
Ne propose aucune correction. Confirme quand le fichier est écrit.
```

---

## Étape 2 — Corrections ciblées (un domaine à la fois)

*Règles communes : section « Règles communes (audits et corrections) » ci-dessus.*

### ✅ 2A — Nettoyer les imports inutilisés

```
Lis audits/AUDIT_imports.md.

À partir de ce fichier, supprime les imports et variables inutilisés.

Règles strictes :
- Ne modifier QUE les lignes d'import et les déclarations listées dans l'audit
- Ne pas réécrire la logique existante
- Ne pas reformater le fichier
- Ne pas déplacer de fonctions

Pour chaque fichier modifié, affiche le diff exact (lignes supprimées uniquement).

⛔ STOP OBLIGATOIRE après chaque diff — n'écris rien, n'ouvre aucun fichier,
n'enchaîne pas sur le suivant. Attends le mot "valide" ou "go" avant de continuer.
```

*Commencer par les fichiers avec le plus d'imports inutilisés.*

---

### ✅ 2B — Consolider un doublon (un seul à la fois)

```
Lis audits/AUDIT_doublons.md.

Traite UN SEUL doublon à la fois.

Commence par : [NOM DU DOUBLON — issu du fichier d'audit]

Plan à valider avant toute modification :
1. Quelle version de la fonction est la plus complète / robuste ?
2. Où sera la version canonique (lib/ ou composable/) ?
3. Quels fichiers devront importer la version canonique ?
4. Y a-t-il un risque de régression à signaler ?

Présente le plan uniquement.

⛔ STOP OBLIGATOIRE — n'écris aucun code, n'ouvre aucun fichier, n'applique
aucune modification tant que tu n'as pas reçu le mot "valide" ou "go".
```

---

### ✅ 2C — Extraire une fonction vers lib/ ou composable/

```
Lis audits/AUDIT_composables.md.

Déplace UNE SEULE fonction identifiée dans ce fichier.

Fonction à déplacer : [NOM — issu du fichier d'audit]
Fichier source : [CHEMIN]
Destination proposée : [lib/xxx.ts ou composables/useXxx.ts]

Avant de modifier quoi que ce soit, confirme :
1. La fonction n'a pas de dépendance sur une ref ou un composant local ?
2. Le fichier de destination existe déjà — dois-je y ajouter l'export, ou créer le fichier ?
3. Quels fichiers importent actuellement la version locale — devront être mis à jour ?

Présente le plan complet uniquement.

⛔ STOP OBLIGATOIRE — n'écris aucun code, n'ouvre aucun fichier, n'applique
aucune modification tant que tu n'as pas reçu le mot "valide" ou "go".

Une fois validé : modifier la source, modifier la destination, mettre à jour les imports,
marque les lignes du fichier AUDIT_composables.md avec ✅
Un seul fichier à la fois, diff visible avant chaque écriture.
```

---

## Étape 3 — Refactoring CSS

### ✅ 3A — Valeurs hors tokens

```
Mode : audit uniquement — ne touche à aucun fichier source.

Parcoure tous les fichiers .vue dans src/ et tous les fichiers dans src/assets/.

Identifie toutes les valeurs CSS hardcodées qui devraient utiliser un token de
tokens.css à la place :
- Couleurs hexadécimales (#03060d, #00e5ff, etc.) utilisées dans <style> ou style=""
- Valeurs de font-family écrites en dur
- Espacements récurrents (ex: padding: 12px répété dans 8 fichiers)

Format de sortie :
FICHIER : src/FolderName/FileName.vue
  → color: #00e5ff → devrait être var(--color-cyan)
  → font-family: 'Share Tech Mono' → devrait être var(--font-mono)

Écris le résultat dans audits/AUDIT_css.md, section "Valeurs hors tokens".
En-tête du fichier : date du jour + "Audit CSS".
Crée ou écrase le fichier.
Ne propose aucune correction. Confirme quand le fichier est écrit.
```

---

### ✅ 3B — Styles inline à extraire

```
Mode : audit uniquement — ne touche à aucun fichier source.

Dans les templates .vue, identifie les attributs style="" complexes (plus de
2 propriétés, ou répétés dans plusieurs éléments) qui devraient être des classes CSS.

Rappel des règles du projet :
- Les fichiers CSS sont importés dans main.ts (pas de @import entre fichiers CSS)
- Un nouveau fichier CSS doit être ajouté dans main.ts après les imports existants
- Les tokens sont dans tokens.css et doivent être utilisés via var(--...)

Format de sortie :
FICHIER : src/FolderName/FileName.vue
  → style="display: flex; flex-direction: column; gap: 8px; padding: 12px"
     répété 3 fois → extraire en classe utilitaire

Ajoute le résultat dans audits/AUDIT_css.md, section "Styles inline à extraire".
(Le fichier a été créé par le prompt 3A — ajoute la section sans écraser le reste.)
Ne propose aucune correction. Confirme quand la section est ajoutée.
```

---

### 3C — Remplacer les valeurs hors tokens

```
Lis audits/AUDIT_css.md, section "Valeurs hors tokens".

Traite UN SEUL fichier à la fois.

Commence par le fichier avec le plus d'occurrences.

Pour chaque occurrence identifiée dans l'audit :
- Remplace la valeur hardcodée par la variable CSS correspondante (var(--...))
- Ne touche qu'aux lignes listées dans l'audit
- Ne reformate pas le fichier
- Ne modifie pas la logique ou la structure des règles CSS

Affiche le diff exact avant d'écrire.

⛔ STOP OBLIGATOIRE après chaque diff — n'écris rien, n'ouvre aucun fichier,
n'enchaîne pas sur le suivant. Attends le mot "valide" ou "go" avant de continuer.

Une fois la correction appliquée et confirmée, marque le fichier correspondant
dans audits/AUDIT_css.md avec ✅ en début de ligne.
```

---

### 3D — Extraire les styles inline vers des classes CSS

```
Lis audits/AUDIT_css.md, section "Styles inline à extraire".

Traite UN SEUL cas à la fois.

Commence par le style inline le plus répété.

Plan à valider avant toute modification :
1. Quel nom de classe CSS donner à ce style ? (convention kebab-case, préfixe du composant)
2. Dans quel fichier CSS existant l'ajouter — ou faut-il créer un nouveau fichier ?
   Rappel : tout nouveau fichier CSS doit être ajouté dans main.ts après les imports existants.
3. Combien d'occurrences du style inline seront remplacées et dans quels fichiers ?

Présente le plan uniquement.

⛔ STOP OBLIGATOIRE — n'écris aucun code, n'ouvre aucun fichier, n'applique
aucune modification tant que tu n'as pas reçu le mot "valide" ou "go".

Une fois validé :
- Ajouter la classe dans le fichier CSS cible (et main.ts si nouveau fichier)
- Remplacer les occurrences style="" dans les templates
- Un fichier à la fois, diff visible avant chaque écriture

Une fois la correction appliquée et confirmée, marque le cas correspondant
dans audits/AUDIT_css.md avec ✅ en début de ligne.
```

---

## Étape 5 — Mise à jour de la documentation après corrections

À faire en fin de session de nettoyage, une fois les corrections validées.

### 5A — Mises à jour structurelles (Cursor écrit directement)

*Ce que Cursor peut mettre à jour sans validation : structure de fichiers, listes de composables, stores, constantes.*

```
Les corrections de cette session sont terminées. Mets à jour la documentation
technique pour qu'elle reflète l'état actuel du code.

Lis d'abord :
- Documentation/Documentation-technique.md
- audits/ (tous les fichiers présents)

Mets à jour uniquement les sections suivantes de Documentation/Documentation-technique.md :

1. Structure du projet (arbre src/) :
   - Ajouter les fichiers créés pendant la session
   - Supprimer les fichiers supprimés (code mort, legacy vidé)
   - Corriger les descriptions si un fichier a changé de rôle

2. Liste des composables dans src/composables/ :
   - Ajouter les nouveaux composables créés
   - Mettre à jour la description si le rôle a évolué

3. Liste des fichiers dans src/lib/ :
   - Même chose — ajouter, supprimer, corriger

4. Liste des stores dans src/stores/ :
   - Même chose

Pour chaque modification, affiche le diff avant d'écrire.

⛔ STOP OBLIGATOIRE après chaque diff — n'écris rien tant que tu n'as pas
reçu le mot "valide" ou "go". Traite une section à la fois.

Ne touche pas aux sections Architecture, Stack technique, Base de données,
Design system, ou tout bloc explicitement métier — celles-ci nécessitent une validation manuelle.
```

---

### ✅ 5A bis — Détection des informations obsolètes (audit, lecture seule)

*Ce que Cursor repère mais ne corrige pas : règles, conventions ou descriptions qui ne correspondent plus au code réel.*

```
Mode : audit uniquement — ne touche à aucun fichier source.

Lis Documentation/Documentation-technique.md dans son intégralité.

Pour chaque section, vérifie si les affirmations du document correspondent
encore au code réel dans src/. Signale tout passage qui :

- Décrit une règle qui n'est plus respectée dans le code
- Mentionne un fichier, une fonction ou une convention qui a disparu ou changé
- Décrit un comportement que le code implémente différemment aujourd'hui
- Contient une information qui était vraie avant cette session mais ne l'est plus

Format de sortie :
SECTION : Design system et CSS
PASSAGE : "Règle impérative : tous les fichiers CSS sont importés directement dans main.ts"
OBSOLÈTE : src/components/XxxYyy.vue contient un @import en ligne depuis cette session
PROPOSITION : [texte de remplacement suggéré, ou "à supprimer"]

Ne modifie aucun fichier source. Produis uniquement la liste des écarts.
Écris le résultat dans audits/AUDIT_doc_technique.md.
En-tête : date du jour + "Audit obsolescence Documentation-technique.md".
Confirme quand le fichier est écrit.
```

---

### 5B — Revue documentaire hors périmètre 5A (audit, lecture seule)

*Ce que Cursor ne peut pas décider seul : règles métier, conventions d'architecture, design system.*

```
Sur la base des corrections effectuées cette session, identifie les passages
des documents suivants qui ne correspondent plus au code réel :

- Documentation/Documentation-fonctionnelle.md
- Documentation/Documentation-technique.md (sections non couvertes par 5A)
- Tout fichier design system référencé par la documentation

Pour chaque écart détecté, présente :

DOCUMENT : Documentation/Documentation-fonctionnelle.md
SECTION : Interface > Modules
ÉCART : [description]
PROPOSITION : [texte de remplacement suggéré]
ACTION REQUISE : validation avant modification

Ne modifie aucun fichier. Produis uniquement la liste des écarts et propositions.
```

---

### 5D — Corriger la documentation technique (à partir de l'audit d'obsolescence)

*Après **5A bis** : appliquer les corrections listées dans `AUDIT_doc_technique.md`, sur le même principe que **3D** pour le CSS.*

```
Lis audits/AUDIT_doc_technique.md (résultat du prompt 5A bis).

Traite UN SEUL écart à la fois.

Commence par l'écart le plus impactant (ou le premier non encore marqué ✅).

Plan à valider avant toute modification :
1. Quelle section ou passage de Documentation/Documentation-technique.md est concerné
   (titre de section + extrait court) ?
2. Action : remplacer un passage, le supprimer, ou ajouter un paragraphe — et pourquoi
   (référence au code dans src/ si utile) ?
3. Quel est le texte cible proposé (résumé ou proposition issue de PROPOSITION dans l'audit) ?
4. Faut-il toucher un autre fichier (lien, chemin, doc croisée) — lesquels ?

Présente le plan uniquement.

⛔ STOP OBLIGATOIRE — n'écris aucun code, n'ouvre aucun fichier, n'applique
aucune modification tant que tu n'as pas reçu le mot "valide" ou "go".

Une fois validé :
- Modifier uniquement le ou les fichiers validés dans le plan
  (en pratique souvent Documentation/Documentation-technique.md)
- Remplacer ou supprimer le passage obsolète listé dans l'audit — sans réécrire le document en entier
- Un fichier à la fois, diff visible avant chaque écriture

Une fois la correction appliquée et confirmée, marque l'écart correspondant
dans audits/AUDIT_doc_technique.md avec ✅ en début de ligne.
```

---

### 5C — Mise à jour du prompt d'amorçage de session

*À faire si de nouveaux composables ont été créés pendant la session.*

```
Le prompt d'amorçage (Documentation/CURSOR_SESSION_PROMPTING.md, section 1)
s'appuie sur la structure du projet.

Compare la liste des composables mentionnée dans Documentation/Documentation-technique.md
avec le contenu actuel de src/composables/.
Si des composables ont été ajoutés ou supprimés, propose les mises à jour nécessaires
(phrase ou liste dans la doc, ou instruction à intégrer dans le bloc § 1).

Ne modifie pas les fichiers. Affiche uniquement la correction à apporter.
```

---

Pour les prompts **2B** et **2C**, remplacer les crochets par le contenu réel de `audits/` — voir la section « Règles communes » en tête de ce fichier.