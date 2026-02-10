-- =============================================================================
-- DATA MIGRATION: VARIATION GROUPS
-- Links existing schedulers and posts to variation groups
-- Run AFTER skool-variation-groups.sql
-- =============================================================================

-- Step 1: Create variation groups from existing scheduler patterns
-- Uses category + time to create meaningful group names
-- Note: "09:00" = Reminder posts, "18:55" = Live Now posts

INSERT INTO skool_variation_groups (name, description, is_active)
SELECT DISTINCT
  CASE
    WHEN time = '09:00' THEN category || ' - Reminder'
    WHEN time = '18:55' THEN category || ' - Live Now'
    ELSE category || ' - ' || time
  END AS name,
  'Auto-created from existing scheduler pattern: ' || category || ' at ' || time AS description,
  true AS is_active
FROM skool_scheduled_posts
ORDER BY name;

-- Step 2: Link schedulers to their variation groups
UPDATE skool_scheduled_posts s
SET variation_group_id = vg.id
FROM skool_variation_groups vg
WHERE vg.name = CASE
    WHEN s.time = '09:00' THEN s.category || ' - Reminder'
    WHEN s.time = '18:55' THEN s.category || ' - Live Now'
    ELSE s.category || ' - ' || s.time
  END;

-- Step 3: Link posts to their variation groups (match on category + day_of_week + time)
UPDATE skool_post_library p
SET variation_group_id = s.variation_group_id
FROM skool_scheduled_posts s
WHERE p.category = s.category
  AND p.day_of_week = s.day_of_week
  AND p.time = s.time
  AND s.variation_group_id IS NOT NULL;

-- Verification queries
SELECT 'Variation Groups Created:' as status, COUNT(*) as count FROM skool_variation_groups;
SELECT 'Schedulers Linked:' as status, COUNT(*) as count FROM skool_scheduled_posts WHERE variation_group_id IS NOT NULL;
SELECT 'Posts Linked:' as status, COUNT(*) as count FROM skool_post_library WHERE variation_group_id IS NOT NULL;
SELECT 'Posts Unlinked:' as status, COUNT(*) as count FROM skool_post_library WHERE variation_group_id IS NULL;

-- Show the variation groups with their counts
SELECT
  vg.name,
  COUNT(DISTINCT s.id) as scheduler_count,
  COUNT(DISTINCT p.id) as post_count
FROM skool_variation_groups vg
LEFT JOIN skool_scheduled_posts s ON s.variation_group_id = vg.id
LEFT JOIN skool_post_library p ON p.variation_group_id = vg.id
GROUP BY vg.id, vg.name
ORDER BY vg.name;
