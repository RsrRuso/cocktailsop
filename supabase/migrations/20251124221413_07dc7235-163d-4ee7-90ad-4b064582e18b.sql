-- Fix comment count issue: Remove duplicate triggers causing 3x counting
-- Currently there are 3 triggers incrementing comment_count on insert:
-- 1. reel_comment_inserted
-- 2. reel_comment_count_trigger  
-- 3. update_reel_comment_count_trigger

-- Drop duplicate triggers, keep only the proper pair
DROP TRIGGER IF EXISTS update_reel_comment_count_trigger ON reel_comments;
DROP TRIGGER IF EXISTS reel_comment_count_trigger ON reel_comments;

-- Keep only these two triggers for proper counting:
-- reel_comment_inserted (calls increment_reel_comment_count on INSERT)
-- reel_comment_deleted (calls decrement_reel_comment_count on DELETE)

-- Fix existing miscounted data by recalculating actual counts
UPDATE reels r
SET comment_count = (
  SELECT COUNT(*) 
  FROM reel_comments rc 
  WHERE rc.reel_id = r.id
)
WHERE comment_count != (
  SELECT COUNT(*) 
  FROM reel_comments rc 
  WHERE rc.reel_id = r.id
);