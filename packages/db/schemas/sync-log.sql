-- =============================================================================
-- UNIFIED SYNC ACTIVITY LOG
-- Tracks all sync job executions across the system
-- Run: psql "$DATABASE_URL" -f packages/db/schemas/sync-log.sql
-- =============================================================================

-- Drop the old ghl_sync_log if migrating (optional - uncomment if needed)
-- DROP TABLE IF EXISTS ghl_sync_log;

-- =============================================================================
-- SYNC ACTIVITY LOG TABLE
-- =============================================================================
-- Unified table for tracking all sync job executions

CREATE TABLE IF NOT EXISTS sync_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sync identification
  sync_type TEXT NOT NULL, -- 'ghl_contacts', 'ghl_payments', 'skool', 'skool_analytics', 'skool_member_history', 'meta'

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Results
  records_synced INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  error_message TEXT,

  -- Metadata (optional context)
  metadata JSONB, -- Additional sync-specific data (e.g., mode: 'full' vs 'incremental')

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary query patterns: filter by sync_type, sort by started_at
CREATE INDEX IF NOT EXISTS idx_sync_activity_log_type
  ON sync_activity_log(sync_type);

CREATE INDEX IF NOT EXISTS idx_sync_activity_log_started_at
  ON sync_activity_log(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_activity_log_type_started
  ON sync_activity_log(sync_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_activity_log_status
  ON sync_activity_log(status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE sync_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all for service role (auth handled via Clerk)
CREATE POLICY "Service role full access" ON sync_activity_log FOR ALL USING (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get the last successful sync for a given type
CREATE OR REPLACE FUNCTION get_last_sync(p_sync_type TEXT)
RETURNS TABLE (
  id UUID,
  sync_type TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  records_synced INTEGER,
  duration_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.sync_type,
    s.started_at,
    s.completed_at,
    s.records_synced,
    EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::NUMERIC as duration_seconds
  FROM sync_activity_log s
  WHERE s.sync_type = p_sync_type
    AND s.status = 'completed'
  ORDER BY s.started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get sync stats for a given type
CREATE OR REPLACE FUNCTION get_sync_stats(p_sync_type TEXT, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_syncs INTEGER,
  successful_syncs INTEGER,
  failed_syncs INTEGER,
  avg_records_synced NUMERIC,
  avg_duration_seconds NUMERIC,
  last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_syncs,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as successful_syncs,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_syncs,
    ROUND(AVG(records_synced) FILTER (WHERE status = 'completed'), 2) as avg_records_synced,
    ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed'), 2) as avg_duration_seconds,
    MAX(started_at) as last_sync_at
  FROM sync_activity_log
  WHERE sync_type = p_sync_type
    AND started_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION: Copy existing ghl_sync_log data (run once if migrating)
-- =============================================================================
-- Uncomment and run if you want to migrate existing ghl_sync_log data:
/*
INSERT INTO sync_activity_log (sync_type, started_at, completed_at, records_synced, status, error_message, created_at)
SELECT
  CASE
    WHEN sync_type = 'transactions' THEN 'ghl_payments'
    WHEN sync_type = 'contacts' THEN 'ghl_contacts'
    ELSE sync_type
  END as sync_type,
  started_at,
  completed_at,
  records_synced,
  status,
  error_message,
  created_at
FROM ghl_sync_log
ON CONFLICT DO NOTHING;
*/
