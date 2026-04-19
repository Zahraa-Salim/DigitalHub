-- =========================================================
-- Assign Color Schemes to Programs (Sequential Assignment)
-- =========================================================
-- This script assigns color_scheme_id and icon_class to all programs sequentially
-- Color Scheme 1 (Blue Tech - fa-code): Full Stack, Backend
-- Color Scheme 2 (Purple AI - fa-brain): AI, Data, Analytics
-- Color Scheme 3 (Green Dev - fa-server): DevOps, Infrastructure
-- Color Scheme 4 (Orange Creator - fa-palette): Design, UX/UI, Creative
-- Color Scheme 5 (Red Innovation - fa-rocket): Startup, Innovation
-- Color Scheme 6 (Teal Future - fa-cloud): Cloud, Modern Tech

-- Use row_number() to assign color schemes sequentially (1-6) and cycle through
UPDATE programs
SET 
  color_scheme_id = ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1,
  icon_class = CASE 
    WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 1 THEN 'fa-code'
    WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 2 THEN 'fa-brain'
    WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 3 THEN 'fa-server'
    WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 4 THEN 'fa-palette'
    WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 5 THEN 'fa-rocket'
    WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 6 THEN 'fa-cloud'
    ELSE 'fa-code'
  END,
  updated_at = NOW()
WHERE color_scheme_id IS NULL OR color_scheme_id = 0
  AND deleted_at IS NULL;

-- Verify the assignments
SELECT id, title, color_scheme_id, icon_class FROM programs WHERE deleted_at IS NULL ORDER BY id;
