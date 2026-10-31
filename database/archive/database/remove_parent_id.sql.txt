-- Suppression des contraintes et index liés à parent_id
ALTER TABLE periods.periods DROP CONSTRAINT IF EXISTS periods_parent_id_fkey;
DROP INDEX IF EXISTS idx_periods_parent_id;

-- Suppression de la colonne parent_id
ALTER TABLE periods.periods DROP COLUMN IF EXISTS parent_id;

-- Suppression de la contrainte check_has_parent
ALTER TABLE periods.periods DROP CONSTRAINT IF EXISTS check_has_parent;

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