-- Migration: Add columns for Skool export data
-- Run this before running the import-member-export.ts script

-- Add engagement tracking columns
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS ace_score TEXT;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS ace_score_explanation TEXT;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS lifespan_days INTEGER;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0;
ALTER TABLE skool_members ADD COLUMN IF NOT EXISTS mrr_status TEXT;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_skool_members_ace_score ON skool_members(ace_score);
CREATE INDEX IF NOT EXISTS idx_skool_members_role ON skool_members(role);
CREATE INDEX IF NOT EXISTS idx_skool_members_attribution ON skool_members(attribution_source);
CREATE INDEX IF NOT EXISTS idx_skool_members_member_since ON skool_members(member_since);
