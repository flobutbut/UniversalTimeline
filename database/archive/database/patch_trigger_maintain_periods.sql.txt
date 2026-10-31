-- Patch : Trigger de maintenance automatique pour periods.periods

-- 1. Fonction de maintenance (si pas déjà créée)
CREATE OR REPLACE FUNCTION periods.maintain_period_relations()
RETURNS TRIGGER AS $$
BEGIN
    -- Met à jour has_parent pour la période modifiée
    NEW.has_parent := (NEW.parent_id IS NOT NULL);

    -- Met à jour children pour l'ancien parent (si changement)
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id AND OLD.parent_id IS NOT NULL THEN
        UPDATE periods.periods
        SET children = (
            SELECT jsonb_agg(id)
            FROM periods.periods
            WHERE parent_id = OLD.parent_id
        )
        WHERE id = OLD.parent_id;
    END IF;

    -- Met à jour children pour le nouveau parent (si applicable)
    IF NEW.parent_id IS NOT NULL THEN
        UPDATE periods.periods
        SET children = (
            SELECT jsonb_agg(id)
            FROM periods.periods
            WHERE parent_id = NEW.parent_id
        )
        WHERE id = NEW.parent_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger sur UPDATE du champ parent_id
DROP TRIGGER IF EXISTS trg_maintain_period_relations ON periods.periods;

CREATE TRIGGER trg_maintain_period_relations
AFTER UPDATE OF parent_id ON periods.periods
FOR EACH ROW
EXECUTE FUNCTION periods.maintain_period_relations();

-- 3. Correction immédiate de toutes les incohérences existantes
-- (à exécuter manuellement si besoin)
-- SELECT periods.maintain_period_relations(); 