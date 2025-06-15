-- 1. Vérification de l'intégrité des données

-- Vérifier les périodes sans parent mais avec has_parent = true
SELECT id, label_fr, parent_id, has_parent, children
FROM periods.periods
WHERE parent_id IS NULL AND has_parent = true;

-- Vérifier les périodes avec parent mais has_parent = false
SELECT id, label_fr, parent_id, has_parent, children
FROM periods.periods
WHERE parent_id IS NOT NULL AND has_parent = false;

-- Vérifier les incohérences dans children
SELECT p.id, p.label_fr, p.children
FROM periods.periods p
WHERE p.children IS NOT NULL
  AND NOT (
    jsonb_typeof(p.children) = 'array' AND
    NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(p.children) AS child_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM periods.periods
        WHERE id = child_id::text
      )
    )
  );

-- 2. Nettoyage des données incohérentes

-- Corriger children
UPDATE periods.periods p
SET children = NULL
WHERE children IS NOT NULL
  AND NOT (
    jsonb_typeof(children) = 'array' AND
    NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(children) AS child_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM periods.periods
        WHERE id = child_id::text
      )
    )
  );

-- 3. Contraintes supplémentaires

-- Ajouter une contrainte pour children
ALTER TABLE periods.periods
ADD CONSTRAINT check_children
CHECK (
    children IS NULL OR
    jsonb_typeof(children) = 'array' AND
    NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(children) AS child_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM periods.periods
            WHERE id = child_id::text
        )
    )
);

-- 4. Index pour optimiser les performances

-- Index sur has_parent pour les requêtes de racines
CREATE INDEX IF NOT EXISTS idx_periods_has_parent ON periods.periods(has_parent);

-- Index sur children pour les recherches de relations
CREATE INDEX IF NOT EXISTS idx_periods_children ON periods.periods USING gin(children);

-- 5. Fonction de maintenance périodique

CREATE OR REPLACE FUNCTION periods.maintain_period_relations()
RETURNS void AS $$
BEGIN
    -- Vérifier et corriger les références circulaires dans children
    WITH RECURSIVE cycle_check AS (
        SELECT id, children, ARRAY[id] as path
        FROM periods.periods
        WHERE children IS NOT NULL
        UNION ALL
        SELECT p.id, p.children, cc.path || p.id
        FROM periods.periods p
        JOIN cycle_check cc ON p.id = ANY(cc.children)
        WHERE NOT p.id = ANY(cc.path)
    )
    UPDATE periods.periods
    SET children = (
        SELECT jsonb_agg(child_id)
        FROM jsonb_array_elements_text(children) AS child_id
        WHERE NOT child_id = ANY(
            SELECT path[array_position(path, id):]
            FROM cycle_check
            WHERE id = periods.periods.id
        )
    )
    WHERE id IN (
        SELECT id
        FROM cycle_check
        WHERE id = ANY(path[array_position(path, id):])
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Exemple d'utilisation

-- Exécuter la maintenance
SELECT periods.maintain_period_relations();

-- Vérifier les résultats
SELECT id, label_fr, has_parent, children
FROM periods.periods
ORDER BY id;

-- Suppression des contraintes et index liés à parent_id
ALTER TABLE periods.periods DROP CONSTRAINT IF EXISTS periods_parent_id_fkey;
DROP INDEX IF EXISTS idx_periods_parent_id;

-- Suppression de la colonne parent_id
ALTER TABLE periods.periods DROP COLUMN IF EXISTS parent_id;

-- Mise à jour de la fonction de maintenance
CREATE OR REPLACE FUNCTION periods.maintain_period_relations()
RETURNS void AS $$
BEGIN
    -- Vérifier et corriger les références circulaires dans children
    WITH RECURSIVE cycle_check AS (
        SELECT id, children, ARRAY[id] as path
        FROM periods.periods
        WHERE children IS NOT NULL
        UNION ALL
        SELECT p.id, p.children, cc.path || p.id
        FROM periods.periods p
        JOIN cycle_check cc ON p.id = ANY(cc.children)
        WHERE NOT p.id = ANY(cc.path)
    )
    UPDATE periods.periods
    SET children = (
        SELECT jsonb_agg(child_id)
        FROM jsonb_array_elements_text(children) AS child_id
        WHERE NOT child_id = ANY(
            SELECT path[array_position(path, id):]
            FROM cycle_check
            WHERE id = periods.periods.id
        )
    )
    WHERE id IN (
        SELECT id
        FROM cycle_check
        WHERE id = ANY(path[array_position(path, id):])
    );
END;
$$ LANGUAGE plpgsql; 