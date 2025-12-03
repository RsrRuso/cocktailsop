
-- ============================================
-- COMPREHENSIVE DUPLICATE TRIGGER CLEANUP
-- This removes ALL duplicate triggers system-wide
-- ============================================

-- 1. FOLLOWS TABLE - Remove duplicate notification triggers (keep only one)
DROP TRIGGER IF EXISTS new_follower_notification ON follows;
DROP TRIGGER IF EXISTS on_new_follower ON follows;
DROP TRIGGER IF EXISTS trigger_notify_new_follower ON follows;
DROP TRIGGER IF EXISTS on_unfollow ON follows;
DROP TRIGGER IF EXISTS trigger_notify_unfollow ON follows;

-- Create single notification triggers for follows
CREATE TRIGGER single_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

CREATE TRIGGER single_unfollow_notification
  AFTER DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_unfollow();

-- 2. EVENT_ATTENDEES - Remove duplicates
DROP TRIGGER IF EXISTS event_attendees_delete_trigger ON event_attendees;
DROP TRIGGER IF EXISTS event_attendees_insert_trigger ON event_attendees;
DROP TRIGGER IF EXISTS update_event_attendee_count_trigger ON event_attendees;
DROP TRIGGER IF EXISTS update_event_attendees_count ON event_attendees;
DROP TRIGGER IF EXISTS on_event_attendance ON event_attendees;

CREATE TRIGGER single_event_attendee_trigger
  AFTER INSERT OR DELETE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendee_count();

-- 3. EVENT_COMMENTS - Remove duplicates
DROP TRIGGER IF EXISTS event_comments_delete_trigger ON event_comments;
DROP TRIGGER IF EXISTS event_comments_insert_trigger ON event_comments;
DROP TRIGGER IF EXISTS update_event_comment_count_trigger ON event_comments;
DROP TRIGGER IF EXISTS update_event_comments_count ON event_comments;
DROP TRIGGER IF EXISTS on_event_comment ON event_comments;

CREATE TRIGGER single_event_comment_count_trigger
  AFTER INSERT OR DELETE ON event_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_event_comment_count();

CREATE TRIGGER single_event_comment_notification
  AFTER INSERT ON event_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_comment();

-- 4. EVENT_LIKES - Remove duplicates  
DROP TRIGGER IF EXISTS event_likes_delete_trigger ON event_likes;
DROP TRIGGER IF EXISTS event_likes_insert_trigger ON event_likes;
DROP TRIGGER IF EXISTS update_event_like_count_trigger ON event_likes;
DROP TRIGGER IF EXISTS update_event_likes_count ON event_likes;
DROP TRIGGER IF EXISTS on_event_like ON event_likes;

CREATE TRIGGER single_event_like_trigger
  AFTER INSERT OR DELETE ON event_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_event_like_count();

-- 5. ACCESS_REQUESTS - Remove duplicates
DROP TRIGGER IF EXISTS notify_workspace_owner_on_access_request ON access_requests;
DROP TRIGGER IF EXISTS notify_workspace_owner_on_new_request ON access_requests;
DROP TRIGGER IF EXISTS on_access_request_created ON access_requests;

CREATE TRIGGER single_access_request_notification
  AFTER INSERT ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_workspace_owner_access_request();

-- 6. PROFILE_VIEWS - Check and fix
DROP TRIGGER IF EXISTS on_profile_view ON profile_views;
DROP TRIGGER IF EXISTS notify_profile_view_trigger ON profile_views;
DROP TRIGGER IF EXISTS trigger_notify_profile_view ON profile_views;

CREATE TRIGGER single_profile_view_notification
  AFTER INSERT ON profile_views
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_view();

-- 7. MESSAGES - Check and fix
DROP TRIGGER IF EXISTS on_new_message ON messages;
DROP TRIGGER IF EXISTS notify_new_message_trigger ON messages;
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;

-- 8. REEL_COMMENTS - Fix duplicates
DROP TRIGGER IF EXISTS on_reel_comment ON reel_comments;
DROP TRIGGER IF EXISTS reel_comment_notification ON reel_comments;
DROP TRIGGER IF EXISTS trigger_reel_comment_notification ON reel_comments;
DROP TRIGGER IF EXISTS reel_comments_insert_trigger ON reel_comments;
DROP TRIGGER IF EXISTS reel_comments_delete_trigger ON reel_comments;
DROP TRIGGER IF EXISTS update_reel_comment_count_trigger ON reel_comments;

-- 9. POST_COMMENTS - Fix duplicates
DROP TRIGGER IF EXISTS on_post_comment ON post_comments;
DROP TRIGGER IF EXISTS post_comment_notification ON post_comments;
DROP TRIGGER IF EXISTS trigger_post_comment_notification ON post_comments;
DROP TRIGGER IF EXISTS post_comments_insert_trigger ON post_comments;
DROP TRIGGER IF EXISTS post_comments_delete_trigger ON post_comments;
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON post_comments;

-- 10. STORY_COMMENTS - Fix duplicates
DROP TRIGGER IF EXISTS on_story_comment ON story_comments;
DROP TRIGGER IF EXISTS story_comment_notification ON story_comments;
DROP TRIGGER IF EXISTS trigger_story_comment_notification ON story_comments;

-- 11. MUSIC_SHARE_COMMENTS - Fix duplicates
DROP TRIGGER IF EXISTS on_music_share_comment ON music_share_comments;
DROP TRIGGER IF EXISTS music_share_comment_notification ON music_share_comments;

-- 12. DELETE ALL DUPLICATE NOTIFICATIONS from the database
-- Delete duplicates keeping only the first one per unique combination
DELETE FROM notifications n1
USING notifications n2
WHERE n1.id > n2.id
  AND n1.user_id = n2.user_id
  AND n1.type = n2.type
  AND n1.content = n2.content
  AND n1.created_at = n2.created_at;

-- 13. Add unique constraint to prevent future duplicates
-- First drop if exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_unique_event;

-- Create unique index for deduplication (allows multiple notifications of same type but not exact duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup_idx 
ON notifications (user_id, type, content, created_at);
