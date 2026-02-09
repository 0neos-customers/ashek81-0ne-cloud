-- Skool Members History Tables
-- Tracks daily and monthly member counts for date-filtered reporting

-- =============================================================================
-- MONTHLY MEMBER DATA (Source of Truth from Skool)
-- =============================================================================

CREATE TABLE IF NOT EXISTS skool_members_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_slug TEXT NOT NULL,
  month DATE NOT NULL, -- First day of month (e.g., 2025-06-01)

  -- Member breakdown
  new_members INTEGER NOT NULL DEFAULT 0,
  existing_members INTEGER NOT NULL DEFAULT 0,
  churned_members INTEGER NOT NULL DEFAULT 0,
  total_members INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  source TEXT DEFAULT 'skool_api', -- 'skool_api', 'estimated', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT skool_members_monthly_unique UNIQUE (group_slug, month)
);

CREATE INDEX IF NOT EXISTS idx_skool_members_monthly_group_month
  ON skool_members_monthly(group_slug, month);

-- =============================================================================
-- DAILY MEMBER DATA
-- =============================================================================

CREATE TABLE IF NOT EXISTS skool_members_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_slug TEXT NOT NULL,
  date DATE NOT NULL,

  -- Member counts
  total_members INTEGER NOT NULL DEFAULT 0,
  active_members INTEGER, -- Daily active (may be null for historical data)
  new_members INTEGER, -- Calculated: today's total - yesterday's total

  -- Metadata
  source TEXT DEFAULT 'skool_api', -- 'skool_api', 'interpolated', 'ghl_estimated'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT skool_members_daily_unique UNIQUE (group_slug, date)
);

CREATE INDEX IF NOT EXISTS idx_skool_members_daily_group_date
  ON skool_members_daily(group_slug, date);

-- =============================================================================
-- HELPER FUNCTION: Get member count for a date range
-- =============================================================================

CREATE OR REPLACE FUNCTION get_member_count_for_period(
  p_group_slug TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  start_count INTEGER,
  end_count INTEGER,
  new_members_in_period INTEGER,
  avg_daily_members NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH period_data AS (
    SELECT
      date,
      total_members,
      new_members
    FROM skool_members_daily
    WHERE group_slug = p_group_slug
      AND date BETWEEN p_start_date AND p_end_date
    ORDER BY date
  ),
  first_last AS (
    SELECT
      (SELECT total_members FROM period_data ORDER BY date ASC LIMIT 1) as start_count,
      (SELECT total_members FROM period_data ORDER BY date DESC LIMIT 1) as end_count
  )
  SELECT
    first_last.start_count,
    first_last.end_count,
    COALESCE(SUM(period_data.new_members), first_last.end_count - first_last.start_count)::INTEGER as new_members_in_period,
    AVG(period_data.total_members)::NUMERIC as avg_daily_members
  FROM first_last
  LEFT JOIN period_data ON true
  GROUP BY first_last.start_count, first_last.end_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER FUNCTION: Interpolate daily values from monthly totals
-- =============================================================================

CREATE OR REPLACE FUNCTION interpolate_daily_members(
  p_group_slug TEXT,
  p_month DATE
)
RETURNS SETOF skool_members_daily AS $$
DECLARE
  v_monthly_record skool_members_monthly%ROWTYPE;
  v_prev_monthly_record skool_members_monthly%ROWTYPE;
  v_start_total INTEGER;
  v_end_total INTEGER;
  v_daily_growth NUMERIC;
  v_days_in_month INTEGER;
  v_current_date DATE;
  v_current_total INTEGER;
BEGIN
  -- Get the monthly data
  SELECT * INTO v_monthly_record
  FROM skool_members_monthly
  WHERE group_slug = p_group_slug AND month = p_month;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get previous month's ending total
  SELECT * INTO v_prev_monthly_record
  FROM skool_members_monthly
  WHERE group_slug = p_group_slug AND month = p_month - INTERVAL '1 month'
  ORDER BY month DESC LIMIT 1;

  -- Calculate start and end totals
  IF v_prev_monthly_record IS NOT NULL THEN
    v_start_total := v_prev_monthly_record.total_members;
  ELSE
    v_start_total := 0;
  END IF;
  v_end_total := v_monthly_record.total_members;

  -- Calculate days and daily growth
  v_days_in_month := DATE_PART('day', (p_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
  v_daily_growth := (v_end_total - v_start_total)::NUMERIC / v_days_in_month;

  -- Generate daily records
  FOR i IN 0..(v_days_in_month - 1) LOOP
    v_current_date := p_month + (i || ' days')::INTERVAL;
    v_current_total := v_start_total + ROUND(v_daily_growth * (i + 1));

    RETURN NEXT (
      gen_random_uuid(),
      p_group_slug,
      v_current_date,
      v_current_total,
      NULL, -- active_members not available for interpolated data
      CASE WHEN i = 0 THEN 0 ELSE ROUND(v_daily_growth) END, -- new_members
      'interpolated',
      NOW(),
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE skool_members_monthly IS 'Monthly member breakdown from Skool API (source of truth)';
COMMENT ON TABLE skool_members_daily IS 'Daily member counts - from API (last 30d) or interpolated from monthly';
COMMENT ON FUNCTION get_member_count_for_period IS 'Get member statistics for a date range';
COMMENT ON FUNCTION interpolate_daily_members IS 'Generate daily estimates from monthly totals';
