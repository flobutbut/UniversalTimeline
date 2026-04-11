# Audit — `Documentation/Documentation-database.md` vs code (2026-04-11)

## Structure du projet

- Le schéma de dossiers **`api_Wikidata/`** ne correspond pas au dépôt : racine **`web-chronologie-univers-2/`** (ou nom du clone), backend sous **`server/`**.  
- **`database/supabase-init.sql`** est la référence citée ailleurs pour le schéma réel ; **`init-all.sql`** existe aussi — **clarifier** lequel est la source de vérité pour une nouvelle installation (éviter deux chemins contradictoires).

## Schéma SQL documenté vs `database/supabase-init.sql`

### Table `periods.periods`

- La doc montre **`parent_id`** + `start_date` / `end_date` en **TIMESTAMP**.  
- Dans **`supabase-init.sql`** (extrait actuel) : pas de **`parent_id`** ; colonnes **`has_parent`**, **`children` (jsonb)** ; **`start_date` / `end_date` en `text`**.  
- **Action** : remplacer le bloc SQL par un extrait fidèle à **`supabase-init.sql`** (ou renvoyer explicitement : « ne pas dupliquer, voir fichier »).

### Table `stories.stories`

- Le dump dans **`supabase-init.sql`** montre encore **`id integer`** ; le front et **`src/types/database.ts`** utilisent des **UUID** string — des **migrations** (`database/migrations/20250617_convert_stories_to_uuid.sql`, etc.) peuvent avoir divergé de ce dump.  
- **Action** : documenter l’état **après migrations** (UUID) ou indiquer « dump de référence + migration obligatoire ».

### Schéma `categories`

- Les `CREATE TABLE` simplifiés sans préfixe de schéma **`categories.`** peuvent prêter à confusion ; les index de la doc utilisent déjà **`categories.categories`** — **harmoniser** tout le chapitre sur les noms qualifiés (`categories.*`, `periods.*`, `events.*`, `stories.*`).

## Prisma

- Le bloc **`model Event`** du document ne reflète **pas** le modèle métier API (labels FR/EN, `wikidata_id`, tables SQL). Le fichier réel **`server/prisma/schema.prisma`** est un **vestige partiel** (confirmé aussi par la doc technique).  
- **Action** : indiquer clairement « **non aligné avec la production** » ou retirer l’extrait Prisma trompeur ; renvoyer vers `database.ts` + SQL.

## API Endpoints

- Liste incomplète vs **`server/src/api/routes.ts`** : manquent notamment **`GET /api/periods/:id/children`**, **`GET /api/stories/temporal-bounds`**, **`PUT /api/stories/:id`**, **`GET /api/search`**, routes Wikidata proxy, etc.  
- **Action** : table courte + lien « source : `routes.ts` ».

## Configuration `database.ts`

- La doc omet **`DB_SSL`** présent dans **`server/src/api/database.ts`**.  
- **`max: 20`**, **`connectionTimeoutMillis`** du document : **vérifier** si le `Pool` réel les définit (le fichier lu ne les montre pas dans les premières lignes) — aligner extrait de code ou retirer les chiffres.

## Scripts (fin de fichier)

- Référence **`migrate_to_iso8602.sh`** / chemins : vérifier qu’ils existent et qu’ils ne contredisent pas **`server/prisma/migrations/`** + scripts SQL actuels.

## Action globale

Traiter ce fichier comme **« schéma + ops infra »** avec **une seule source SQL** (fichier versionné) et une section **« état Prisma »** honnête ; synchroniser les types TypeScript avec **`src/types/database.ts`**.
