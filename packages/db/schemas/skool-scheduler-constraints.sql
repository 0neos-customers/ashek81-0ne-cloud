-- =============================================================================
-- SKOOL POST SCHEDULER - UNIQUE CONSTRAINTS
-- Add constraints needed for upsert operations during import
-- Run: psql "$DATABASE_URL" -f packages/db/schemas/skool-scheduler-constraints.sql
-- =============================================================================

-- Unique constraint on scheduled posts (one slot per category/day/time)
-- This enables upsert operations to avoid duplicates
ALTER TABLE skool_scheduled_posts
  ADD CONSTRAINT unique_schedule_slot
  UNIQUE (category, day_of_week, time);

-- Note: Posts do NOT have a unique constraint because multiple variations
-- can exist for the same category/day/time combination. That's intentional -
-- the system rotates through them.
