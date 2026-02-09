-- Skool Community Activity Daily Table
-- Tracks daily community engagement and active member counts for date-filtered reporting

CREATE TABLE IF NOT EXISTS skool_community_activity_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_slug TEXT NOT NULL,
  date DATE NOT NULL,

  -- Community engagement (posts, comments, reactions, etc.)
  activity_count INTEGER NOT NULL DEFAULT 0,

  -- Daily active members (unique members who were active that day)
  -- Note: This comes from admin-metrics "active_members" array (daily view)
  -- Different from monthly active which is a rolling 30-day count
  daily_active_members INTEGER DEFAULT NULL,

  -- Metadata
  source TEXT DEFAULT 'skool_api', -- 'skool_api', 'estimated'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT skool_community_activity_daily_unique UNIQUE (group_slug, date)
);

CREATE INDEX IF NOT EXISTS idx_skool_community_activity_daily_group_date
  ON skool_community_activity_daily(group_slug, date);

COMMENT ON TABLE skool_community_activity_daily IS 'Daily community activity (engagement + active members) from Skool admin-metrics API';
