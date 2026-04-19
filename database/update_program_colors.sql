-- Assign color schemes to programs using CTE (PostgreSQL compatible)
WITH color_assignments AS (
  SELECT 
    id,
    ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 AS scheme_id,
    CASE 
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 1 THEN 'fa-code'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 2 THEN 'fa-brain'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 3 THEN 'fa-server'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 4 THEN 'fa-palette'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 5 THEN 'fa-rocket'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 6 THEN 'fa-cloud'
      ELSE 'fa-code'
    END AS icon_val
  FROM programs
  WHERE deleted_at IS NULL
)
UPDATE programs
SET 
  color_scheme_id = color_assignments.scheme_id,
  icon_class = color_assignments.icon_val,
  updated_at = NOW()
FROM color_assignments
WHERE programs.id = color_assignments.id
  AND programs.deleted_at IS NULL;

-- Verify assignments
SELECT id, title, color_scheme_id, icon_class FROM programs WHERE deleted_at IS NULL ORDER BY id;
