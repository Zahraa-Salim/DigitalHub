-- QUICK WINS: Add missing fields
-- =========================

-- Programs: Add featured flag and SEO fields
ALTER TABLE IF EXISTS programs
ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS programs
ADD COLUMN IF NOT EXISTS featured_rank INTEGER;

ALTER TABLE IF EXISTS programs
ADD COLUMN IF NOT EXISTS meta_title TEXT;

ALTER TABLE IF EXISTS programs
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Programs: Add featured image for Priority 2 (Content Richness)
ALTER TABLE IF EXISTS programs
ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_programs_featured
  ON programs (featured, featured_rank) WHERE featured = TRUE;

-- Instructor Profiles: Add sort order
ALTER TABLE IF EXISTS instructor_profiles
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_sort_order
  ON instructor_profiles (sort_order);

-- Priority 2: Events - Add capacity and featured image fields
ALTER TABLE IF EXISTS events
ADD COLUMN IF NOT EXISTS capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0);

ALTER TABLE IF EXISTS events
ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

-- Announcements: optional linked event for richer website cards
ALTER TABLE IF EXISTS announcements
ADD COLUMN IF NOT EXISTS event_id BIGINT;

ALTER TABLE IF EXISTS cohorts
ADD COLUMN IF NOT EXISTS auto_announce BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS events
ADD COLUMN IF NOT EXISTS auto_announce BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;

---
