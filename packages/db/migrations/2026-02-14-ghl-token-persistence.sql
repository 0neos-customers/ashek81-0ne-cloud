-- =============================================
-- GHL TOKEN PERSISTENCE
-- =============================================
-- Add OAuth token columns to dm_sync_config
-- Tokens are stored encrypted and rotated automatically on each use
-- Run in Supabase SQL Editor

-- Add token columns to dm_sync_config
ALTER TABLE dm_sync_config
ADD COLUMN IF NOT EXISTS ghl_access_token TEXT,
ADD COLUMN IF NOT EXISTS ghl_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS ghl_token_expires_at TIMESTAMPTZ;

-- Add index for token expiry lookup (useful for proactive refresh)
CREATE INDEX IF NOT EXISTS idx_dm_sync_config_token_expiry
ON dm_sync_config(ghl_token_expires_at)
WHERE ghl_token_expires_at IS NOT NULL;

-- Comment explaining the token rotation
COMMENT ON COLUMN dm_sync_config.ghl_refresh_token IS 'GHL refresh tokens are single-use. After each token refresh, the new refresh_token must be stored.';
