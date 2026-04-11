# LACUNA — Prompts de session Cursor

*Deux blocs à coller dans le chat : **début** puis **fin** de session. Le catalogue des audits et corrections ciblées est dans `Documentation/CURSOR_CLEANUP_PROMPTS.md`.*

---

## 1. Début de session — amorçage

*À coller au démarrage d’une session de travail.*

```
Avant d'écrire du code aujourd'hui, lis les fichiers suivants :
- Documentation/Documentation-technique.md (structure du projet, conventions)
- Documentation/Documentation-fonctionnelle.md (si présent et pertinent)
- Tout design system du projet (ex. fichier ou dossier documenté dans Documentation-technique.md)

Règles à respecter impérativement :
- Toute logique réutilisable → composable (src/composables/useXxx.ts) ou lib/
- Toute couleur, font, espacement → token CSS via var(--...) lorsque le projet en définit
- Aucun @import entre fichiers CSS si la convention du projet impose les imports via main.ts
- Si tu vois du code qui devrait être ailleurs, note-le dans audits/TODO_REFACTO.md
  sans le corriger — sauf si je te le demande explicitement

Avant de créer un nouveau composable, vérifie les existants dans src/composables/
(liste maintenue dans Documentation/Documentation-technique.md si disponible).
```

---

## 2. Fin de session — clôture

*À coller avant de terminer la session.*

```
Avant de terminer cette session :

Liste les fichiers que tu as modifiés ou créés aujourd'hui.

Pour chacun, réponds à ces trois questions :
1. Y a-t-il une fonction que tu as créée qui devrait aller dans un composable
   ou dans lib/ plutôt que dans ce fichier ?
2. Y a-t-il un import que tu as ajouté qui duplique quelque chose d'existant ?
3. Y a-t-il une valeur CSS que tu as écrite en dur au lieu d'utiliser un token ?

Si oui pour l'un de ces points, note-le dans audits/TODO_REFACTO.md
(créer le fichier s'il n'existe pas) avec le fichier et la ligne concernés.
Ne corrige rien maintenant.
```

