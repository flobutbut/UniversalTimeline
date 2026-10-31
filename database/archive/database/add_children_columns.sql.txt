-- Ajout des colonnes has_parent et children à la table periods
ALTER TABLE periods.periods
ADD COLUMN IF NOT EXISTS has_parent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS children JSONB DEFAULT '[]'::jsonb;

-- Mise à jour des valeurs de has_parent basée sur parent_id
UPDATE periods.periods
SET has_parent = (parent_id IS NOT NULL);

-- Mise à jour des valeurs de children basée sur parent_id
UPDATE periods.periods p1
SET children = (
  SELECT jsonb_agg(p2.id)
  FROM periods.periods p2
  WHERE p2.parent_id = p1.id
)
WHERE EXISTS (
  SELECT 1
  FROM periods.periods p2
  WHERE p2.parent_id = p1.id
);

-- Suppression de la colonne parent_id
ALTER TABLE periods.periods
DROP COLUMN IF EXISTS parent_id;

-- Création d'un index sur la colonne children
CREATE INDEX IF NOT EXISTS idx_periods_children ON periods.periods USING GIN (children); 