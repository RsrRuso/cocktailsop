
-- Drop all duplicate triggers on reel_comments
DROP TRIGGER IF EXISTS reel_comment_count_trigger ON reel_comments;
DROP TRIGGER IF EXISTS reel_comments_count_trigger ON reel_comments;
DROP TRIGGER IF EXISTS update_reel_comment_count_trigger ON reel_comments;
DROP TRIGGER IF EXISTS notify_reel_comment_trigger ON reel_comments;
DROP TRIGGER IF EXISTS trigger_notify_reel_comment ON reel_comments;

-- Drop all duplicate triggers on post_comments
DROP TRIGGER IF EXISTS post_comment_count_trigger ON post_comments;
DROP TRIGGER IF EXISTS post_comments_count_trigger ON post_comments;
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON post_comments;
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON post_comments;
DROP TRIGGER IF EXISTS notify_post_comment_trigger ON post_comments;
DROP TRIGGER IF EXISTS post_comment_notification ON post_comments;
DROP TRIGGER IF EXISTS trigger_notify_post_comment ON post_comments;

-- Create ONE trigger for reel comment counts
CREATE TRIGGER reel_comment_count_trigger
  AFTER INSERT OR DELETE ON reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_reel_comment_count();

-- Create ONE trigger for post comment counts
CREATE TRIGGER post_comment_count_trigger
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- Create ONE trigger for reel comment notifications
CREATE TRIGGER notify_reel_comment_trigger
  AFTER INSERT ON reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_reel_comment();

-- Create ONE trigger for post comment notifications
CREATE TRIGGER notify_post_comment_trigger
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

-- Fix all existing comment counts
UPDATE reels SET comment_count = (
  SELECT COUNT(*) FROM reel_comments WHERE reel_id = reels.id
);

UPDATE posts SET comment_count = (
  SELECT COUNT(*) FROM post_comments WHERE post_id = posts.id
);
