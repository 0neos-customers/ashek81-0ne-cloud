-- =============================================================================
-- SKOOL VARIATION GROUPS
-- Flexible post grouping for content rotation across multiple scheduler slots
-- Run: psql "$DATABASE_URL" -f packages/db/schemas/skool-variation-groups.sql
-- =============================================================================

-- =============================================================================
-- TABLE: SKOOL_VARIATION_GROUPS
-- =============================================================================
-- Groups of post variations that can be assigned to multiple scheduler slots

CREATE TABLE IF NOT EXISTS skool_variation_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,                   -- e.g., "Money Room Reminder", "Funding Club Live Now"
  description TEXT,                     -- Optional longer description

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ALTER EXISTING TABLES
-- =============================================================================

-- Add variation_group_id to schedulers (for content source)
ALTER TABLE skool_scheduled_posts
ADD COLUMN IF NOT EXISTS variation_group_id UUID REFERENCES skool_variation_groups(id);

-- Add variation_group_id to post library (for matching)
ALTER TABLE skool_post_library
ADD COLUMN IF NOT EXISTS variation_group_id UUID REFERENCES skool_variation_groups(id);

-- Make day_of_week and time nullable in post library (legacy, not used for matching)
ALTER TABLE skool_post_library
ALTER COLUMN day_of_week DROP NOT NULL;

ALTER TABLE skool_post_library
ALTER COLUMN time DROP NOT NULL;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Variation groups
CREATE INDEX IF NOT EXISTS idx_skool_variation_groups_active
  ON skool_variation_groups(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_skool_variation_groups_name
  ON skool_variation_groups(name);

-- Post library by variation group (for efficient matching)
CREATE INDEX IF NOT EXISTS idx_skool_post_library_variation_group
  ON skool_post_library(variation_group_id, is_active)
  WHERE is_active = true;

-- Schedulers by variation group
CREATE INDEX IF NOT EXISTS idx_skool_scheduled_posts_variation_group
  ON skool_scheduled_posts(variation_group_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE skool_variation_groups ENABLE ROW LEVEL SECURITY;

-- Allow all for service role (auth handled via Clerk)
CREATE POLICY "Service role full access" ON skool_variation_groups FOR ALL USING (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get the next post content for a variation group
-- Returns the oldest-used active post in the group
CREATE OR REPLACE FUNCTION get_next_post_for_variation_group(
  p_variation_group_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  body TEXT,
  image_url TEXT,
  video_url TEXT,
  use_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id,
    pl.title,
    pl.body,
    pl.image_url,
    pl.video_url,
    pl.use_count
  FROM skool_post_library pl
  WHERE pl.variation_group_id = p_variation_group_id
    AND pl.is_active = true
  ORDER BY pl.last_used_at NULLS FIRST, pl.use_count ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get post count for a variation group
CREATE OR REPLACE FUNCTION get_variation_group_post_count(
  p_variation_group_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  post_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO post_count
  FROM skool_post_library
  WHERE variation_group_id = p_variation_group_id
    AND is_active = true;
  RETURN post_count;
END;
$$ LANGUAGE plpgsql;
