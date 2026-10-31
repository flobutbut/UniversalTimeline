# Userflows — exploration de UniversalTimeline

Complément de `AUDIT-UX-EXPLORATION.md` (30 octobre 2026). Les parcours **existants** décrivent le comportement constaté pendant l'audit ; les parcours **proposés** sont des décisions de conception, non implémentées. Les identifiants UXnn renvoient aux constats de l'audit.

Légende : rouge = impasse ou comportement imprévisible ; vert = destination ouverte par la proposition ; pointillé = lien proposé non encore existant.

---

## Partie 1 — Parcours existants

### E1. Cliquer une période (feuille ou non) — UX01, UX02, UX06

```mermaid
flowchart TD
    A([Frise Terre, story Univers moderne]) --> B[Clic sur une période]
    B --> C{La période a-t-elle<br/>des enfants dans la story ?}
    C -- Oui --> D[Descente dans la période<br/>fil d'Ariane mis à jour]
    D --> B
    C -- "Non (feuille)" --> E{Combien de suggestions ?<br/>story enfant ET ancre requises}
    E -- 0 --> F[Aucun résultat visible]:::bad
    E -- 1 --> G[Bascule automatique<br/>vers la story suggérée]:::warn
    E -- "2 ou plus" --> H[Menu de choix de story]
    F --> I([Impasse perçue :<br/>fin du parcours = fin du contenu]):::bad
    G --> J([Nouvelle story, sans choix de l'utilisateur]):::warn
    H --> J

    classDef bad fill:#fde2e2,stroke:#c0392b,color:#7b1d12
    classDef warn fill:#fff3cd,stroke:#d4a017,color:#6b4e00
```

Constat : le même geste produit trois effets (rien, bascule, menu). Hadéen n'ouvre aucune continuation. Archéen, Protérozoïque et Phanérozoïque sont des feuilles alors que leurs enfants (4, 3, 3) existent dans d'autres stories.

### E2. Cliquer un événement — UX03, UX04, UX07

```mermaid
flowchart TD
    A([Frise Terre]) --> B[Clic sur un événement<br/>ex. Premières traces de vie]
    B --> C[Petite bulle :<br/>titre, date, stories liées]
    C --> D{Stories liées ?}
    D -- Non --> E["« Aucune story liée »"]:::bad
    D -- Oui --> F[Second contrôle :<br/>développer les stories]
    F --> G[Choisir une story liée]
    G --> H([Changement de story])
    B --> I[Mise en évidence des événements<br/>de même catégorie]
    I --> J{Catégories reçues<br/>de /stories/1/events ?}
    J -- "Non : champ absent (14/14)" --> K[Liste vide :<br/>rien n'est mis en évidence]:::bad
    J -- Oui --> L[Autres événements du thème<br/>mis en évidence, couleur seule]
    C -. "Aucune catégorie cliquable<br/>dans la fiche" .-> M([Thème visible par la couleur,<br/>non suivable]):::bad
    E --> N([Impasse]):::bad

    classDef bad fill:#fde2e2,stroke:#c0392b,color:#7b1d12
```

### E3. Changer de sujet ou de story — UX05

```mermaid
flowchart TD
    A([Je lis la frise]) --> B{Je veux un autre sujet}
    B --> C[Quitter la timeline]
    C --> D[Page Stories :<br/>interface de gestion]
    D --> E[Aucune action « lancer dans la frise »]:::bad
    B --> F[Recherche]
    F --> G[Pages Periods / Events]
    G --> H{Compte connecté ?}
    H -- Oui --> I[Fiche trouvée, sans retour<br/>à la position dans la frise]:::warn
    H -- Non --> J([Visiteur public sans voie<br/>de découverte]):::bad
    B --> K[Fil d'Ariane]
    K --> L[Remonter la hiérarchie<br/>uniquement]
    L --> M["Pas d'historique de visite<br/>pas d'URL restaurable (UX08)"]:::warn

    classDef bad fill:#fde2e2,stroke:#c0392b,color:#7b1d12
    classDef warn fill:#fff3cd,stroke:#d4a017,color:#6b4e00
```

### E4. Vue d'ensemble de l'existant

```mermaid
flowchart LR
    S[(Story : seul périmètre<br/>des données chargées)] --> P[Périodes de la story]
    S --> V[Événements de la story]
    P --> F{Feuille ?}
    F -- Non --> D[Descendre]
    F -- Oui --> G[Suggestion = story enfant + ancre]
    G --> X["2 stories atteignables sur 11<br/>depuis Univers moderne"]:::bad
    V --> B[Bulle événement]
    B --> G
    W[Wikidata : finder Periods]:::off -. non relié à la frise .-> P

    classDef bad fill:#fde2e2,stroke:#c0392b,color:#7b1d12
    classDef off fill:#eee,stroke:#999,color:#555,stroke-dasharray: 4 3
```

---

## Partie 2 — Parcours proposés

### P1. Modèle global : deux cadres, un carrefour — modèle d'exploration

```mermaid
flowchart LR
    subgraph Cadres
        L[Exploration libre<br/>catalogue accessible,<br/>thème + fenêtre temporelle]:::good
        G[Parcours guidé<br/>périmètre d'une story nommée]
    end
    G -- "Continuer en exploration libre<br/>(même point temporel)" --> L
    L -- "Ouvrir un parcours pertinent" --> G
    L --> E[Période ou événement<br/>= carrefour]
    G --> E
    E --> A[Approfondir<br/>enfants du catalogue]:::good
    E --> T[Suivre un autre thème]:::good
    E --> S[Parcours pertinents<br/>raison du lien affichée]:::good
    E --> W[Découvertes externes<br/>sourcées, à la demande]:::good
    A --> E
    T --> L
    S --> G
    W --> E

    classDef good fill:#e3f4e6,stroke:#2e7d32,color:#14401a
```

Accès direct à l'exploration libre permanent ; le parcours actuel reste l'accueil pendant la transition (choix final à valider en recette).

### P2. Cliquer une période — destinations toujours explicites (UX01, UX02, UX06)

```mermaid
flowchart TD
    A([Clic sur une période]) --> B[Panneau de destinations<br/>jamais de bascule automatique]:::good
    B --> C[Approfondir<br/>enfants du catalogue,<br/>provenance indiquée]:::good
    B --> D[Autres parcours<br/>même sans ancre]:::good
    B --> E[Même thème<br/>à cette époque]:::good
    B --> F[Chercher une suite externe]:::good
    D --> G{Ancre éditoriale ?}
    G -- Oui --> H[Recommandé en tête]
    G -- Non --> I[Rapprochement automatique<br/>avec raison affichée]
    C --> J{Enfants trouvés ?}
    J -- Oui --> K([Descente, périmètre annoncé])
    J -- Non --> L[Explication + proposer<br/>découvertes externes]
    L --> F

    classDef good fill:#e3f4e6,stroke:#2e7d32,color:#14401a
```

Exemple de recette : depuis Archéen dans Univers moderne, retrouver ses 4 enfants connus.

### P3. Fiche d'événement stable et thèmes cliquables — UX04, UX07

```mermaid
flowchart TD
    A([Sélection d'un événement]) --> B[Fiche de lecture stable<br/>compacte ou latérale]:::good
    B --> C[Date + description]
    B --> D[Thèmes cliquables<br/>libellé + couleur]:::good
    B --> E[Actions nommées]:::good
    D --> F["« Explorer la biologie évolutive<br/>à cette époque »"]
    F --> G[Sélecteur Thème = Biologie évolutive<br/>fenêtre temporelle conservée]
    E --> H[Approfondir cette époque]
    E --> I[Voir les parcours pertinents]
    E --> J[Demander des découvertes externes]
    E --> K[Revenir au cadrage précédent]
    G --> L{Résultats dans la fenêtre ?}
    L -- Oui --> M[Événements du thème en avant,<br/>repères de périodes conservés]
    L -- Non --> N[Explication de la portée :<br/>élargir les dates ou aller au plus proche]
    N --> O["Aucun déplacement temporel silencieux"]

    classDef good fill:#e3f4e6,stroke:#2e7d32,color:#14401a
```

### P4. Sélecteur Thème selon le cadre — rôle du sélecteur de catégorie

```mermaid
flowchart TD
    A[Thème : Tous les thèmes ▾] --> B{Cadre actif}
    B -- Exploration libre --> C[Résultats du catalogue accessible<br/>au-delà de la story d'origine]:::good
    B -- "Parcours guidé" --> D["Périmètre annoncé :<br/>« Dans ce parcours »"]
    D --> E["« Explorer ce thème<br/>au-delà du parcours »"]
    E --> C
    C --> F[Fenêtre temporelle conservée<br/>si pertinente]
    D --> F
    F --> G{Résultat ?}
    G -- Oui --> H[Afficher les événements du thème]
    G -- Non --> I[Expliquer + élargir ou plus proche]
    C --> J[Rapprochements de stories<br/>entités partagées, catégories, recouvrement]
    J --> K[Raison du lien affichée<br/>non validée éditorialement]

    classDef good fill:#e3f4e6,stroke:#2e7d32,color:#14401a
```

### P5. Choisir un parcours depuis la frise — UX05

```mermaid
flowchart TD
    A([Je connais le nom d'une story]) --> B[Accès « Parcours »<br/>dans la timeline]:::good
    B --> C{Visiteur ?}
    C -- Public --> D[Parcours publics et accessibles]
    C -- Autorisé --> E[Publics + privés autorisés]
    D --> F[Ouvrir dans la frise<br/>périmètre annoncé]
    E --> F
    F --> G[Parcours guidé]
    G --> H["Continuer en exploration libre<br/>au même point temporel"]
    G --> I[Choisir un autre parcours]
    J[Espace de gestion :<br/>création / édition] -. reste séparé .-> B

    classDef good fill:#e3f4e6,stroke:#2e7d32,color:#14401a
```

### P6. Découverte externe progressive (Wikidata) — UX10

```mermaid
flowchart TD
    A([Action explicite :<br/>« Demander la suite »<br/>entité + thème + contexte temporel]) --> B[Chargement limité et progressif]:::good
    B --> C{Résultat}
    C -- Propositions --> D[Liste sourcée<br/>statut « externe » affiché]
    C -- Aucun résultat --> E[Message dédié + autre direction]
    C -- Limite atteinte --> F[Charger la suite]
    C -- Source indisponible --> G[Erreur + reprise]
    C -- Date impossible à placer --> H[Hors axe, date « inconnue »<br/>jamais remplacée par aujourd'hui]
    F --> B
    G --> B
    D --> I[Dédoublonnage par identifiant canonique<br/>local / externe]
    I --> J[Consulter une proposition]
    J --> K[Fiche carrefour de l'entité externe]
    K --> L{Boucle de parcours ?}
    L -- Oui --> M[Signaler et éviter la répétition]
    L -- Non --> A
    J -. "aucune importation implicite" .-> N[(Catalogue local / story)]:::off
    J --> O[Action distincte :<br/>composer un parcours<br/>dans l'espace utilisateur]

    classDef good fill:#e3f4e6,stroke:#2e7d32,color:#14401a
    classDef off fill:#eee,stroke:#999,color:#555,stroke-dasharray: 4 3
```

### P7. Retour, historique et partage — UX08, UX09

```mermaid
flowchart LR
    A[Hiérarchie<br/>fil d'Ariane] --- B[Historique de visite<br/>précédent / suivant]:::good
    B --> C[Bifurcation :<br/>autre thème, parcours, externe]
    C --> D[Retour]
    D --> E[Même thème + même cadrage]:::good
    F[URL /timeline] --> G["Encode au minimum :<br/>parcours, période ou événement,<br/>thème, fenêtre temporelle"]:::good
    G --> H[Rechargement ou partage<br/>restaure le point exploré]
    I[Fortes densités] --> J[Repères d'échelle<br/>+ regroupement d'événements]:::good
    J --> K[Distinguer concentration<br/>et événement unique]

    classDef good fill:#e3f4e6,stroke:#2e7d32,color:#14401a
```

### P8. Scénario complet : « Je suis sur Terre, je veux suivre l'apparition de la vie »

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Frise (Terre)
    participant K as Fiche événement
    participant C as Catalogue
    participant S as Parcours
    participant X as Wikidata

    U->>F: Sélectionne « Premières traces de vie »
    F->>K: Ouvre la fiche stable
    K-->>U: Date, description, thèmes (Biologie évolutive, Microbiologie)
    U->>K: « Explorer la biologie évolutive à cette époque »
    K->>C: Thème + fenêtre temporelle conservés
    C-->>U: Événements du thème, repères de périodes
    U->>K: « Voir les parcours pertinents »
    K->>S: Rapprochements (entités, catégories, temps)
    S-->>U: Histoire de la vie sur terre (raison affichée)
    U->>S: Ouvrir le parcours
    S-->>U: Parcours guidé, périmètre annoncé
    U->>S: « Continuer en exploration libre »
    S->>C: Même point temporel
    U->>C: « Chercher une suite externe »
    C->>X: Demande limitée et progressive
    X-->>U: Propositions sourcées, statut externe
    U->>F: Revenir
    F-->>U: Terre, même thème et même cadrage
```

---

## Correspondance flux ↔ lots de réalisation

| Flux | Constats | Lot |
|---|---|---|
| P5, P2 (destinations), E1/E3 corrigés | UX02, UX05, UX06, UX03 | UX-A |
| P2 (approfondir), P3, P4 | UX01, UX04, UX07 | UX-B |
| P7 | UX08, UX09 | UX-C |
| P6 | UX10 | UX-D |
