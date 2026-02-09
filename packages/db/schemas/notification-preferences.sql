-- ============================================
-- Notification Preferences Schema
-- User settings for daily snapshots and alerts
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- NOTIFICATION_PREFERENCES
-- Stores per-user notification settings
-- ============================================
CREATE TABLE notification_preferences (
  -- Primary key is Clerk user ID (text, not UUID)
  user_id TEXT PRIMARY KEY,

  -- Daily Snapshot Settings
  daily_snapshot_enabled BOOLEAN DEFAULT false,
  delivery_time TIME DEFAULT '08:00:00',
  delivery_email TEXT, -- Nullable, falls back to Clerk user email
  delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'sms', 'both')),

  -- Metrics Configuration (which metrics to include in snapshots)
  -- Example: {"revenue": true, "leads": true, "clients": true, "adSpend": false}
  metrics_config JSONB DEFAULT '{
    "revenue": true,
    "leads": true,
    "clients": true,
    "fundedAmount": true,
    "adSpend": true,
    "costPerLead": true,
    "skoolMembers": true,
    "skoolConversion": true
  }'::jsonb,

  -- Alert Thresholds (trigger alerts when metrics cross these thresholds)
  -- Example: {"revenue": {"min": 1000, "max": null}, "adSpend": {"min": null, "max": 500}}
  alert_thresholds JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying users with snapshots enabled (for cron job)
CREATE INDEX idx_notification_prefs_enabled ON notification_preferences(daily_snapshot_enabled)
  WHERE daily_snapshot_enabled = true;

-- Index for delivery time (for scheduling)
CREATE INDEX idx_notification_prefs_delivery_time ON notification_preferences(delivery_time);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Service role has full access (we handle auth via Clerk)
CREATE POLICY "Service role full access" ON notification_preferences FOR ALL USING (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
